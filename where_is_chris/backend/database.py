from __future__ import annotations

import json
import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


DEFAULT_DB_PATH = Path(__file__).resolve().parents[1] / "data" / "positions.db"


def db_path() -> Path:
    return Path(os.environ.get("WHERE_IS_CHRIS_DB", DEFAULT_DB_PATH)).expanduser().resolve()


def connect(path: Path | str | None = None) -> sqlite3.Connection:
    target = Path(path or db_path())
    target.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(target, timeout=15)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA foreign_keys=ON")
    ensure_schema(connection)
    return connection


def ensure_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ship_id INTEGER NOT NULL,
            mmsi TEXT,
            imo TEXT,
            ship_name TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            speed_knots REAL,
            course_deg REAL,
            heading_deg REAL,
            navigation_status TEXT,
            destination TEXT,
            eta TEXT,
            current_port TEXT,
            last_port TEXT,
            source TEXT NOT NULL DEFAULT 'MarineTraffic',
            ais_timestamp TEXT NOT NULL,
            fetched_at TEXT NOT NULL,
            raw_json TEXT NOT NULL,
            UNIQUE(ship_id, ais_timestamp, latitude, longitude)
        );

        CREATE INDEX IF NOT EXISTS positions_timestamp_idx
            ON positions(ship_id, ais_timestamp DESC);

        CREATE TABLE IF NOT EXISTS collector_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ran_at TEXT NOT NULL,
            success INTEGER NOT NULL,
            inserted INTEGER NOT NULL DEFAULT 0,
            message TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """
    )
    connection.commit()


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def insert_position(connection: sqlite3.Connection, position: dict[str, Any]) -> bool:
    cursor = connection.execute(
        """
        INSERT OR IGNORE INTO positions (
            ship_id, mmsi, imo, ship_name, latitude, longitude, speed_knots,
            course_deg, heading_deg, navigation_status, destination, eta,
            current_port, last_port, source, ais_timestamp, fetched_at, raw_json
        ) VALUES (
            :ship_id, :mmsi, :imo, :ship_name, :latitude, :longitude, :speed_knots,
            :course_deg, :heading_deg, :navigation_status, :destination, :eta,
            :current_port, :last_port, :source, :ais_timestamp, :fetched_at, :raw_json
        )
        """,
        position,
    )
    connection.commit()
    return cursor.rowcount == 1


def record_run(connection: sqlite3.Connection, success: bool, inserted: bool, message: str = "") -> None:
    connection.execute(
        "INSERT INTO collector_runs (ran_at, success, inserted, message) VALUES (?, ?, ?, ?)",
        (utc_now_iso(), int(success), int(inserted), message[:1000]),
    )
    connection.commit()


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row else None


def latest_position(connection: sqlite3.Connection, ship_id: int) -> dict[str, Any] | None:
    row = connection.execute(
        "SELECT * FROM positions WHERE ship_id = ? ORDER BY ais_timestamp DESC, id DESC LIMIT 1",
        (ship_id,),
    ).fetchone()
    result = row_to_dict(row)
    if result:
        result.pop("raw_json", None)
    return result


def position_history(connection: sqlite3.Connection, ship_id: int, limit: int = 2500) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT id, ship_id, mmsi, imo, ship_name, latitude, longitude, speed_knots,
               course_deg, heading_deg, navigation_status, destination, eta,
               current_port, last_port, source, ais_timestamp, fetched_at
        FROM (
            SELECT * FROM positions WHERE ship_id = ? ORDER BY ais_timestamp DESC, id DESC LIMIT ?
        ) ORDER BY ais_timestamp ASC, id ASC
        """,
        (ship_id, limit),
    ).fetchall()
    return [dict(row) for row in rows]


def latest_run(connection: sqlite3.Connection) -> dict[str, Any] | None:
    return row_to_dict(connection.execute("SELECT * FROM collector_runs ORDER BY id DESC LIMIT 1").fetchone())


def get_setting(connection: sqlite3.Connection, key: str, default: Any = None) -> Any:
    row = connection.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    if not row:
        return default
    try:
        return json.loads(row["value"])
    except json.JSONDecodeError:
        return row["value"]


def set_setting(connection: sqlite3.Connection, key: str, value: Any) -> None:
    connection.execute(
        """
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        """,
        (key, json.dumps(value), utc_now_iso()),
    )
    connection.commit()
