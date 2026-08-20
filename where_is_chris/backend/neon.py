from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any, Callable

import psycopg
from psycopg.types.json import Jsonb

from .database import connect as connect_sqlite


SCHEMA_STATEMENTS = (
    """
    CREATE TABLE IF NOT EXISTS where_is_chris_positions (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        origin_position_id BIGINT UNIQUE,
        ship_id BIGINT NOT NULL,
        mmsi TEXT,
        imo TEXT,
        ship_name TEXT,
        latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
        longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
        speed_knots DOUBLE PRECISION CHECK (speed_knots IS NULL OR speed_knots >= 0),
        course_deg DOUBLE PRECISION CHECK (course_deg IS NULL OR course_deg BETWEEN 0 AND 360),
        heading_deg DOUBLE PRECISION CHECK (heading_deg IS NULL OR heading_deg BETWEEN 0 AND 360),
        navigation_status TEXT,
        destination TEXT,
        eta TEXT,
        current_port TEXT,
        last_port TEXT,
        source TEXT NOT NULL,
        ais_timestamp TIMESTAMPTZ NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL,
        raw_json JSONB NOT NULL,
        UNIQUE (ship_id, ais_timestamp, latitude, longitude)
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS where_is_chris_positions_ship_time_idx
    ON where_is_chris_positions (ship_id, ais_timestamp DESC, id DESC)
    """,
    """
    CREATE TABLE IF NOT EXISTS where_is_chris_collector_runs (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        origin_run_id BIGINT UNIQUE,
        ran_at TIMESTAMPTZ NOT NULL,
        success BOOLEAN NOT NULL,
        inserted BOOLEAN NOT NULL DEFAULT FALSE,
        message TEXT NOT NULL DEFAULT ''
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS where_is_chris_collector_runs_time_idx
    ON where_is_chris_collector_runs (ran_at DESC, id DESC)
    """,
)

_connection: psycopg.Connection | None = None
_schema_ready = False


def database_url() -> str:
    direct = os.environ.get("DATABASE_URL", "").strip()
    if direct and direct != "[SENSITIVE]":
        return direct
    shared_env_file = os.environ.get("NEON_SHARED_ENV_FILE", "").strip()
    if not shared_env_file:
        return ""
    try:
        lines = Path(shared_env_file).expanduser().read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise RuntimeError(f"Unable to read NEON_SHARED_ENV_FILE: {exc}") from exc
    for line in lines:
        if line.startswith("DATABASE_URL="):
            value = line.partition("=")[2].strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]
            if value and value != "[SENSITIVE]":
                os.environ["DATABASE_URL"] = value
                return value
    raise RuntimeError("DATABASE_URL was not found in NEON_SHARED_ENV_FILE")


def is_configured() -> bool:
    return bool(database_url())


def reset_connection() -> None:
    global _connection, _schema_ready
    if _connection is not None:
        try:
            _connection.close()
        except Exception:
            pass
    _connection = None
    _schema_ready = False


def connection() -> psycopg.Connection:
    global _connection, _schema_ready
    if not is_configured():
        raise RuntimeError("DATABASE_URL is not configured")
    if _connection is None or _connection.closed:
        _connection = psycopg.connect(database_url(), connect_timeout=15, autocommit=True)
        _connection.prepare_threshold = None
        _schema_ready = False
    if not _schema_ready:
        with _connection.cursor() as cursor:
            for statement in SCHEMA_STATEMENTS:
                cursor.execute(statement)
        _schema_ready = True
    return _connection


def with_reconnect(operation: Callable[[psycopg.Connection], Any]) -> Any:
    for attempt in range(2):
        try:
            return operation(connection())
        except (psycopg.InterfaceError, psycopg.OperationalError):
            reset_connection()
            if attempt:
                raise
    raise RuntimeError("Neon operation failed")


def json_value(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {"raw": value}
    return value


def insert_remote_position(remote: psycopg.Connection, position: dict[str, Any], origin_position_id: int | None) -> bool:
    with remote.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO where_is_chris_positions (
                origin_position_id, ship_id, mmsi, imo, ship_name, latitude, longitude,
                speed_knots, course_deg, heading_deg, navigation_status, destination,
                eta, current_port, last_port, source, ais_timestamp, fetched_at, raw_json
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s
            )
            ON CONFLICT (ship_id, ais_timestamp, latitude, longitude) DO UPDATE SET
                origin_position_id = COALESCE(
                    where_is_chris_positions.origin_position_id,
                    EXCLUDED.origin_position_id
                )
            RETURNING id
            """,
            (
                origin_position_id,
                position["ship_id"],
                position.get("mmsi"),
                position.get("imo"),
                position.get("ship_name"),
                position["latitude"],
                position["longitude"],
                position.get("speed_knots"),
                position.get("course_deg"),
                position.get("heading_deg"),
                position.get("navigation_status"),
                position.get("destination"),
                position.get("eta"),
                position.get("current_port"),
                position.get("last_port"),
                position["source"],
                position["ais_timestamp"],
                position["fetched_at"],
                Jsonb(json_value(position["raw_json"])),
            ),
        )
        return cursor.fetchone() is not None


def mirror_position(position: dict[str, Any], origin_position_id: int | None = None) -> bool:
    if not is_configured():
        return False
    return bool(with_reconnect(lambda remote: insert_remote_position(remote, position, origin_position_id)))


def insert_remote_run(remote: psycopg.Connection, run: dict[str, Any]) -> bool:
    with remote.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO where_is_chris_collector_runs (
                origin_run_id, ran_at, success, inserted, message
            ) VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (origin_run_id) DO NOTHING
            RETURNING id
            """,
            (
                run.get("id"),
                run["ran_at"],
                bool(run["success"]),
                bool(run["inserted"]),
                str(run.get("message") or "")[:1000],
            ),
        )
        return cursor.fetchone() is not None


def mirror_run(run: dict[str, Any]) -> bool:
    if not is_configured():
        return False
    return bool(with_reconnect(lambda remote: insert_remote_run(remote, run)))


def sync_sqlite_to_neon(path: str | None = None) -> tuple[int, int]:
    if not is_configured():
        raise RuntimeError("DATABASE_URL is not configured")
    local = connect_sqlite(path)
    positions_inserted = 0
    runs_inserted = 0
    try:
        positions = [dict(row) for row in local.execute("SELECT * FROM positions ORDER BY id")]
        runs = [dict(row) for row in local.execute("SELECT * FROM collector_runs ORDER BY id")]

        def sync(remote: psycopg.Connection) -> tuple[int, int]:
            nonlocal positions_inserted, runs_inserted
            with remote.transaction():
                for position in positions:
                    if insert_remote_position(remote, position, position["id"]):
                        positions_inserted += 1
                for run in runs:
                    if insert_remote_run(remote, run):
                        runs_inserted += 1
            return positions_inserted, runs_inserted

        return with_reconnect(sync)
    finally:
        local.close()


def best_effort_sync(path: str | None = None) -> bool:
    if not is_configured():
        return False
    try:
        sync_sqlite_to_neon(path)
        return True
    except Exception as exc:
        print(f"Neon mirror error: {exc}", file=sys.stderr)
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Synchronize the local AIS SQLite database to Neon Postgres")
    parser.add_argument("--database", default=None)
    args = parser.parse_args()
    positions, runs = sync_sqlite_to_neon(args.database)
    print(f"Neon sync complete: {positions} positions and {runs} collector runs inserted.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
