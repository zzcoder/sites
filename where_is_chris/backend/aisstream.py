from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from websockets.asyncio.client import connect as websocket_connect

from .collector import SHIP_ID, evaluate_freshness, number, parse_datetime
from .database import connect, insert_position, latest_position, record_run, utc_now_iso
from .neon import best_effort_sync, is_configured, mirror_position


AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream"
POSITION_MESSAGE_TYPES = (
    "PositionReport",
    "StandardClassBPositionReport",
    "ExtendedClassBPositionReport",
)
NAVIGATION_STATUSES = {
    0: "Under way using engine",
    1: "At anchor",
    2: "Not under command",
    3: "Restricted manoeuvrability",
    4: "Constrained by draught",
    5: "Moored",
    6: "Aground",
    7: "Engaged in fishing",
    8: "Under way sailing",
    14: "AIS-SART active",
    15: "Not defined",
}


def parse_aisstream_datetime(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    text = str(value).strip()
    if text.endswith(" UTC"):
        text = text[:-4]
    for pattern in ("%Y-%m-%d %H:%M:%S.%f %z", "%Y-%m-%d %H:%M:%S %z"):
        try:
            return datetime.strptime(text, pattern).astimezone(UTC)
        except ValueError:
            pass
    return parse_datetime(text)


def normalized_heading(value: Any) -> float | None:
    heading = number(value)
    return heading if heading is not None and 0 <= heading < 360 else None


def normalized_course(value: Any) -> float | None:
    course = number(value)
    return course if course is not None and 0 <= course < 360 else None


def normalized_speed(value: Any) -> float | None:
    speed = number(value)
    return speed if speed is not None and 0 <= speed < 102.3 else None


def normalize_aisstream_position(payload: Any, fetched_at: str | None = None) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("AISStream message is not a JSON object")
    message_type = str(payload.get("MessageType") or "")
    if message_type not in POSITION_MESSAGE_TYPES:
        raise ValueError(f"Unsupported AISStream message type: {message_type or 'missing'}")

    message_envelope = payload.get("Message")
    message = message_envelope.get(message_type) if isinstance(message_envelope, dict) else None
    if not isinstance(message, dict):
        raise ValueError("AISStream message body is missing")
    metadata = payload.get("MetaData") if isinstance(payload.get("MetaData"), dict) else {}

    latitude = number(message.get("Latitude", metadata.get("latitude")))
    longitude = number(message.get("Longitude", metadata.get("longitude")))
    if latitude is None or longitude is None or not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise ValueError("AISStream message did not contain valid coordinates")

    timestamp = parse_aisstream_datetime(metadata.get("time_utc"))
    if timestamp is None:
        timestamp = datetime.now(UTC)

    mmsi = str(message.get("UserID") or metadata.get("MMSI") or "").strip()
    navigation_code = message.get("NavigationalStatus")
    try:
        navigation_status = NAVIGATION_STATUSES.get(int(navigation_code), str(navigation_code))
    except (TypeError, ValueError):
        navigation_status = None

    ship_name = str(metadata.get("ShipName") or os.environ.get("AISSTREAM_SHIP_NAME", "")).strip() or None
    return {
        "ship_id": SHIP_ID,
        "mmsi": mmsi or None,
        "imo": None,
        "ship_name": ship_name,
        "latitude": latitude,
        "longitude": longitude,
        "speed_knots": normalized_speed(message.get("Sog")),
        "course_deg": normalized_course(message.get("Cog")),
        "heading_deg": normalized_heading(message.get("TrueHeading")),
        "navigation_status": navigation_status,
        "destination": None,
        "eta": None,
        "current_port": None,
        "last_port": None,
        "source": "AISStream",
        "ais_timestamp": timestamp.isoformat().replace("+00:00", "Z"),
        "fetched_at": fetched_at or utc_now_iso(),
        "raw_json": json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
    }


def subscription(api_key: str, mmsi: str) -> dict[str, Any]:
    return {
        "APIKey": api_key,
        "BoundingBoxes": [[[-90, -180], [90, 180]]],
        "FiltersShipMMSI": [mmsi],
        "FilterMessageTypes": list(POSITION_MESSAGE_TYPES),
    }


async def listen_forever(api_key: str, mmsi: str, database: Path | str | None = None) -> None:
    connection = connect(database)
    retry_seconds = 5
    try:
        while True:
            try:
                async with websocket_connect(
                    AISSTREAM_URL,
                    open_timeout=25,
                    ping_interval=None,
                    close_timeout=10,
                    max_queue=64,
                ) as websocket:
                    await websocket.send(json.dumps(subscription(api_key, mmsi)))
                    record_run(connection, True, False, "AISStream connected")
                    print(f"AISStream connected for MMSI {mmsi}.", flush=True)
                    retry_seconds = 5

                    while True:
                        try:
                            raw_message = await asyncio.wait_for(websocket.recv(), timeout=600)
                        except TimeoutError as exc:
                            raise RuntimeError("AISStream sent no matching messages for 10 minutes") from exc
                        payload = json.loads(raw_message)
                        if isinstance(payload, dict) and payload.get("error"):
                            raise RuntimeError(f"AISStream rejected the subscription: {payload['error']}")
                        if payload.get("MessageType") not in POSITION_MESSAGE_TYPES:
                            continue
                        position = normalize_aisstream_position(payload)
                        if position.get("mmsi") != mmsi:
                            continue
                        inserted = insert_position(connection, position)
                        if inserted:
                            try:
                                mirror_position(position, inserted)
                            except Exception as exc:
                                print(f"Neon mirror error: {exc}", file=sys.stderr, flush=True)
                        record_run(
                            connection,
                            True,
                            inserted,
                            "AISStream position inserted" if inserted else "AISStream report unchanged",
                        )
                        evaluate_freshness(connection, latest_position(connection, SHIP_ID))
                        if inserted:
                            print(
                                f"Stored AISStream position {position['latitude']:.5f}, "
                                f"{position['longitude']:.5f} at {position['ais_timestamp']}.",
                                flush=True,
                            )
                        elif is_configured():
                            best_effort_sync(str(database) if database else None)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                status_code = getattr(getattr(exc, "response", None), "status_code", None)
                if status_code == 429:
                    retry_seconds = max(retry_seconds, 60)
                record_run(connection, False, False, f"AISStream error: {exc}")
                evaluate_freshness(connection, latest_position(connection, SHIP_ID))
                print(f"AISStream error: {exc}; reconnecting in {retry_seconds}s.", file=sys.stderr, flush=True)
                await asyncio.sleep(retry_seconds)
                retry_seconds = min(retry_seconds * 2, 300 if status_code == 429 else 60)
    finally:
        connection.close()


def main() -> int:
    api_key = os.environ.get("AISSTREAM_API_KEY", "").strip()
    mmsi = os.environ.get("AISSTREAM_MMSI", "367482180").strip()
    if not api_key:
        print("AISSTREAM_API_KEY is not configured.", file=sys.stderr)
        return 2
    if len(mmsi) != 9 or not mmsi.isdigit():
        print("AISSTREAM_MMSI must be a 9-digit MMSI.", file=sys.stderr)
        return 2
    try:
        asyncio.run(listen_forever(api_key, mmsi))
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
