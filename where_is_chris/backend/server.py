from __future__ import annotations

import argparse
import json
import mimetypes
import os
import subprocess
from datetime import UTC, datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from .collector import SHIP_ID, parse_datetime
from .database import connect, latest_position, latest_run, position_history


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DIST_DIR = PROJECT_ROOT / "dist"
PUBLIC_PATH = os.environ.get("WHERE_IS_CHRIS_PUBLIC_PATH", "/where-is-chris").rstrip("/")
_maps_key_cache: str | None = None


def google_maps_key() -> str:
    global _maps_key_cache
    if _maps_key_cache is not None:
        return _maps_key_cache
    direct = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if direct:
        _maps_key_cache = direct
        return direct
    key_id = os.environ.get("GOOGLE_MAPS_API_KEY_ID", "").strip()
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    if not key_id or not project:
        _maps_key_cache = ""
        return ""
    command = [
        os.environ.get("GCLOUD_BIN", "/home/zhihongz/.openclaw/bin/gcloud"),
        "services",
        "api-keys",
        "get-key-string",
        key_id,
        f"--project={project}",
        "--format=value(keyString)",
    ]
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=20)
        _maps_key_cache = result.stdout.strip()
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        _maps_key_cache = ""
    return _maps_key_cache


def tracker_payload() -> dict:
    connection = connect()
    try:
        positions = position_history(connection, SHIP_ID, limit=5000)
        latest = positions[-1] if positions else latest_position(connection, SHIP_ID)
        threshold_minutes = int(os.environ.get("STALE_AFTER_MINUTES", "20"))
        stale = False
        if latest:
            timestamp = parse_datetime(latest.get("ais_timestamp"))
            stale = timestamp is None or (datetime.now(UTC) - timestamp).total_seconds() > threshold_minutes * 60
        history_days = 0
        if len(positions) >= 2:
            first = parse_datetime(positions[0].get("ais_timestamp"))
            last = parse_datetime(positions[-1].get("ais_timestamp"))
            if first and last:
                history_days = max(1, (last.date() - first.date()).days + 1)
        return {
            "ship_id": SHIP_ID,
            "latest": latest,
            "positions": positions,
            "collector": latest_run(connection),
            "stale": stale,
            "configured": bool(
                os.environ.get("MARINETRAFFIC_API_KEY", "").strip()
                or os.environ.get("AISSTREAM_API_KEY", "").strip()
            ),
            "history_days": history_days,
            "stale_after_minutes": threshold_minutes,
        }
    finally:
        connection.close()


class TrackerHandler(SimpleHTTPRequestHandler):
    server_version = "WhereIsChris/1.0"

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        super().end_headers()

    def send_json(self, payload: dict, status: int = 200) -> None:
        data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def normalized_path(self) -> str:
        path = urlparse(self.path).path
        if PUBLIC_PATH and path.startswith(f"{PUBLIC_PATH}/"):
            path = path[len(PUBLIC_PATH) :]
        elif PUBLIC_PATH and path == PUBLIC_PATH:
            path = "/"
        return path or "/"

    def do_GET(self) -> None:  # noqa: N802
        path = self.normalized_path()
        if path == "/api/health":
            self.send_json({"ok": True})
            return
        if path == "/api/status":
            try:
                self.send_json(tracker_payload())
            except Exception as exc:
                self.send_json({"error": "Unable to read tracker database", "detail": str(exc)}, 500)
            return
        if path == "/api/config":
            self.send_json({"google_maps_api_key": google_maps_key()})
            return
        if path == "/" or not (DIST_DIR / path.lstrip("/")).is_file():
            self.path = "/index.html"
        else:
            self.path = path
        super().do_GET()

    def log_message(self, format: str, *args) -> None:
        print(f"{self.address_string()} - {format % args}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve the Where is Chris dashboard and API")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    if not DIST_DIR.is_dir():
        raise SystemExit(f"Frontend build is missing: run npm run build in {PROJECT_ROOT}")
    mimetypes.add_type("application/javascript", ".js")
    handler = partial(TrackerHandler, directory=str(DIST_DIR))
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Where is Chris listening on http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
