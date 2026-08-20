from __future__ import annotations

import argparse
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .collector import SHIP_ID, number
from .database import connect, insert_position, record_run, utc_now_iso
from .neon import best_effort_sync, mirror_position


def position_from_har(payload: Any, fetched_at: str | None = None) -> dict[str, Any]:
    entries = payload.get("log", {}).get("entries", []) if isinstance(payload, dict) else []
    expected_suffix = f"/en/vessels/{SHIP_ID}/position"
    for entry in reversed(entries):
        request = entry.get("request", {})
        if str(request.get("url", "")).split("?", 1)[0].endswith(expected_suffix):
            text = entry.get("response", {}).get("content", {}).get("text")
            if text:
                data = json.loads(text)
                break
    else:
        raise ValueError(f"HAR does not contain the MarineTraffic position endpoint for ship {SHIP_ID}")

    latitude = number(data.get("lat"))
    longitude = number(data.get("lon"))
    timestamp = number(data.get("timestamp"))
    if latitude is None or longitude is None or not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise ValueError("MarineTraffic HAR position has invalid coordinates")
    if timestamp is None:
        raise ValueError("MarineTraffic HAR position has no timestamp")

    ais_timestamp = datetime.fromtimestamp(timestamp, UTC).isoformat().replace("+00:00", "Z")
    return {
        "ship_id": SHIP_ID,
        "mmsi": os.environ.get("AISSTREAM_MMSI", "367482180"),
        "imo": None,
        "ship_name": os.environ.get("AISSTREAM_SHIP_NAME", "BLUE SKY MESSENGER"),
        "latitude": latitude,
        "longitude": longitude,
        "speed_knots": number(data.get("speed")),
        "course_deg": number(data.get("course")),
        "heading_deg": number(data.get("heading")),
        "navigation_status": str(data.get("navigationalStatus") or "").strip() or None,
        "destination": None,
        "eta": None,
        "current_port": None,
        "last_port": None,
        "source": "MarineTraffic Firefox backup",
        "ais_timestamp": ais_timestamp,
        "fetched_at": fetched_at or utc_now_iso(),
        "raw_json": json.dumps(data, ensure_ascii=False, separators=(",", ":")),
    }


def import_har(path: Path | str, database: Path | str | None = None) -> bool:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    position = position_from_har(payload)
    connection = connect(database)
    try:
        inserted = insert_position(connection, position)
        record_run(
            connection,
            True,
            inserted,
            "MarineTraffic Firefox backup inserted" if inserted else "MarineTraffic Firefox backup unchanged",
        )
        if inserted:
            try:
                mirror_position(position, inserted)
            except Exception:
                best_effort_sync(str(database) if database else None)
        return inserted
    finally:
        connection.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Import a position from a Firefox MarineTraffic HAR capture")
    parser.add_argument("har", type=Path)
    args = parser.parse_args()
    inserted = import_har(args.har)
    print("Imported Firefox backup position." if inserted else "Firefox backup position was already stored.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
