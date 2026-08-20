from __future__ import annotations

import json
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path

from backend.database import connect, insert_position


def main() -> None:
    database = Path(os.environ["WHERE_IS_CHRIS_DB"])
    connection = connect(database)
    now = datetime.now(UTC)
    points = [
        (29.9820, -81.2580),
        (29.9560, -81.2490),
        (29.9310, -81.2660),
        (29.9050, -81.2710),
        (29.8810, -81.2650),
        (29.8630, -81.2600),
        (29.8420, -81.2470),
    ]
    for index, (latitude, longitude) in enumerate(points):
        timestamp = now - timedelta(minutes=(len(points) - 1 - index) * 10)
        raw = {
            "SHIP_ID": "447122",
            "SHIPNAME": "CHRIS' SAILBOAT",
            "LAT": str(latitude),
            "LON": str(longitude),
            "SPEED": "64",
            "COURSE": "112",
            "DESTINATION": "ST AUGUSTINE, FL",
            "TIMESTAMP": timestamp.isoformat().replace("+00:00", "Z"),
        }
        insert_position(
            connection,
            {
                "ship_id": 447122,
                "mmsi": "367123456",
                "imo": None,
                "ship_name": "CHRIS' SAILBOAT",
                "latitude": latitude,
                "longitude": longitude,
                "speed_knots": 6.4,
                "course_deg": 112.0,
                "heading_deg": 110.0,
                "navigation_status": "0",
                "destination": "ST AUGUSTINE, FL",
                "eta": None,
                "current_port": None,
                "last_port": "JACKSONVILLE, FL",
                "source": "MarineTraffic",
                "ais_timestamp": timestamp.isoformat().replace("+00:00", "Z"),
                "fetched_at": now.isoformat().replace("+00:00", "Z"),
                "raw_json": json.dumps(raw),
            },
        )


if __name__ == "__main__":
    main()
