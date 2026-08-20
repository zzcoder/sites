from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .database import (
    connect,
    get_setting,
    insert_position,
    latest_position,
    record_run,
    set_setting,
    utc_now_iso,
)


SHIP_ID = int(os.environ.get("MARINETRAFFIC_SHIP_ID", "447122"))
API_ROOT = "https://services.marinetraffic.com/api/exportvessel"


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = str(value).strip().replace(" ", "T")
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    return parsed.replace(tzinfo=parsed.tzinfo or UTC).astimezone(UTC)


def number(value: Any) -> float | None:
    if value in (None, "", "N/A", "null"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def first_record(payload: Any) -> dict[str, Any]:
    records = payload.get("DATA") if isinstance(payload, dict) else payload
    if isinstance(records, dict):
        records = [records]
    if not isinstance(records, list) or not records or not isinstance(records[0], dict):
        raise ValueError("MarineTraffic returned no vessel position")
    return records[0]


def normalize_position(payload: Any, fetched_at: str | None = None) -> dict[str, Any]:
    raw = first_record(payload)
    lookup = {str(key).upper(): value for key, value in raw.items()}
    latitude = number(lookup.get("LAT"))
    longitude = number(lookup.get("LON"))
    if latitude is None or longitude is None:
        raise ValueError("MarineTraffic response did not contain valid coordinates")
    timestamp = parse_datetime(lookup.get("TIMESTAMP"))
    if timestamp is None:
        raise ValueError("MarineTraffic response did not contain a valid AIS timestamp")
    speed_raw = number(lookup.get("SPEED"))
    return {
        "ship_id": int(lookup.get("SHIP_ID") or SHIP_ID),
        "mmsi": str(lookup.get("MMSI") or "") or None,
        "imo": str(lookup.get("IMO") or "") or None,
        "ship_name": str(lookup.get("SHIPNAME") or "").strip() or None,
        "latitude": latitude,
        "longitude": longitude,
        "speed_knots": speed_raw / 10 if speed_raw is not None else None,
        "course_deg": number(lookup.get("COURSE")),
        "heading_deg": number(lookup.get("HEADING")),
        "navigation_status": str(lookup.get("STATUS") or "").strip() or None,
        "destination": str(lookup.get("DESTINATION") or "").strip() or None,
        "eta": str(lookup.get("ETA") or lookup.get("ETA_CALC") or "").strip() or None,
        "current_port": str(lookup.get("CURRENT_PORT") or "").strip() or None,
        "last_port": str(lookup.get("LAST_PORT") or "").strip() or None,
        "source": "MarineTraffic",
        "ais_timestamp": timestamp.isoformat().replace("+00:00", "Z"),
        "fetched_at": fetched_at or utc_now_iso(),
        "raw_json": json.dumps(raw, ensure_ascii=False, separators=(",", ":")),
    }


def fetch_position(api_key: str, ship_id: int = SHIP_ID) -> dict[str, Any]:
    query = urlencode({"v": 6, "shipid": ship_id, "timespan": 1440, "protocol": "jsono", "msgtype": "extended"})
    request = Request(
        f"{API_ROOT}/{api_key}?{query}",
        headers={"Accept": "application/json", "User-Agent": "WhereIsChris/1.0 (+private vessel tracker)"},
    )
    try:
        with urlopen(request, timeout=40) as response:
            payload = json.load(response)
    except HTTPError as exc:
        raise RuntimeError(f"MarineTraffic API returned HTTP {exc.code}") from exc
    except URLError as exc:
        raise RuntimeError(f"MarineTraffic API connection failed: {exc.reason}") from exc
    return normalize_position(payload)


def send_openclaw_alert(message: str) -> bool:
    command = [
        os.environ.get("OPENCLAW_BIN", "/home/zhihongz/.openclaw/bin/openclaw"),
        "message",
        "send",
        "--channel",
        "slack",
        "--target",
        os.environ.get("OPENCLAW_SLACK_TARGET", "channel:C01QX86KMCN"),
        "--message",
        message,
        "--json",
    ]
    if os.environ.get("OPENCLAW_ALERT_DRY_RUN") == "1":
        command.append("--dry-run")
    try:
        subprocess.run(command, check=True, capture_output=True, text=True, timeout=45)
        return True
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return False


def evaluate_freshness(
    connection,
    latest: dict[str, Any] | None,
    notifier: Callable[[str], bool] = send_openclaw_alert,
    now: datetime | None = None,
) -> bool:
    if not latest:
        return False
    current = now or datetime.now(UTC)
    timestamp = parse_datetime(latest.get("ais_timestamp"))
    threshold = timedelta(minutes=int(os.environ.get("STALE_AFTER_MINUTES", "20")))
    stale = timestamp is None or current - timestamp > threshold
    previous_state = get_setting(connection, "signal_state", "unknown")
    vessel_name = latest.get("ship_name") or f"ship {latest.get('ship_id', SHIP_ID)}"
    source = latest.get("source") or "AIS"

    if stale and previous_state != "stale":
        age_minutes = int((current - timestamp).total_seconds() // 60) if timestamp else "unknown"
        message = (
            f"⚠️ Where is Chris alert: {source} location for {vessel_name} has not updated "
            f"for {age_minutes} minutes. Last position: {latest['latitude']:.5f}, {latest['longitude']:.5f}."
        )
        if notifier(message):
            set_setting(connection, "last_stale_alert_at", utc_now_iso())
        set_setting(connection, "signal_state", "stale")
    elif not stale and previous_state == "stale":
        message = f"✅ Where is Chris: {source} updates for {vessel_name} have resumed."
        if notifier(message):
            set_setting(connection, "last_recovery_alert_at", utc_now_iso())
        set_setting(connection, "signal_state", "fresh")
    elif previous_state == "unknown":
        set_setting(connection, "signal_state", "stale" if stale else "fresh")
    return stale


def run_collection(
    database: Path | str | None = None,
    fetcher: Callable[[str, int], dict[str, Any]] = fetch_position,
    notifier: Callable[[str], bool] = send_openclaw_alert,
) -> int:
    connection = connect(database)
    api_key = os.environ.get("MARINETRAFFIC_API_KEY", "").strip()
    if not api_key:
        if os.environ.get("AISSTREAM_API_KEY", "").strip():
            evaluate_freshness(connection, latest_position(connection, SHIP_ID), notifier)
            record_run(connection, True, False, "AISStream freshness check")
            print("AISStream freshness check complete; MarineTraffic API fallback is not configured.")
            return 0
        record_run(connection, False, False, "No AIS provider is configured")
        print("No AIS provider is configured; collector is idle.")
        return 0

    try:
        position = fetcher(api_key, SHIP_ID)
        inserted = insert_position(connection, position)
        record_run(connection, True, inserted, "Position inserted" if inserted else "AIS report unchanged")
    except Exception as exc:  # network/provider errors must still trigger freshness checks
        record_run(connection, False, False, str(exc))
        evaluate_freshness(connection, latest_position(connection, SHIP_ID), notifier)
        print(f"Collector error: {exc}", file=sys.stderr)
        return 1

    evaluate_freshness(connection, latest_position(connection, SHIP_ID), notifier)
    print("Stored a new AIS position." if inserted else "AIS position is unchanged; duplicate skipped.")
    return 0


def main() -> int:
    return run_collection()


if __name__ == "__main__":
    raise SystemExit(main())
