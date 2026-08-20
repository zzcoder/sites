import os
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import patch

from backend.collector import evaluate_freshness, normalize_position, run_collection
from backend.database import connect, get_setting, latest_position


PAYLOAD = [
    {
        "MMSI": "367123456",
        "IMO": "0",
        "SHIP_ID": "447122",
        "LAT": "29.8630",
        "LON": "-81.2650",
        "SPEED": "64",
        "HEADING": "112",
        "COURSE": "108",
        "STATUS": "0",
        "TIMESTAMP": "2026-08-20T14:00:00Z",
        "SHIPNAME": "TEST SAILBOAT",
        "DESTINATION": "ST AUGUSTINE",
    }
]


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.database = Path(self.tmp.name) / "positions.db"

    def tearDown(self):
        self.tmp.cleanup()

    def test_normalizes_marinetraffic_units(self):
        position = normalize_position(PAYLOAD)
        self.assertEqual(position["ship_id"], 447122)
        self.assertEqual(position["speed_knots"], 6.4)
        self.assertEqual(position["course_deg"], 108)
        self.assertEqual(position["ais_timestamp"], "2026-08-20T14:00:00Z")

    def test_collection_deduplicates_same_ais_report(self):
        fetcher = lambda _key, _ship_id: normalize_position(PAYLOAD)
        with patch.dict(os.environ, {"MARINETRAFFIC_API_KEY": "a" * 40, "STALE_AFTER_MINUTES": "999999"}):
            self.assertEqual(run_collection(self.database, fetcher, lambda _message: True), 0)
            self.assertEqual(run_collection(self.database, fetcher, lambda _message: True), 0)
        connection = connect(self.database)
        count = connection.execute("SELECT COUNT(*) FROM positions").fetchone()[0]
        self.assertEqual(count, 1)

    def test_stale_and_recovery_alert_once(self):
        messages = []
        notifier = lambda message: messages.append(message) or True
        connection = connect(self.database)
        stale_time = datetime.now(UTC) - timedelta(minutes=45)
        latest = {
            "ship_id": 447122,
            "ship_name": "TEST SAILBOAT",
            "latitude": 29.86,
            "longitude": -81.26,
            "ais_timestamp": stale_time.isoformat().replace("+00:00", "Z"),
        }
        with patch.dict(os.environ, {"STALE_AFTER_MINUTES": "20"}):
            self.assertTrue(evaluate_freshness(connection, latest, notifier))
            self.assertTrue(evaluate_freshness(connection, latest, notifier))
            latest["ais_timestamp"] = datetime.now(UTC).isoformat().replace("+00:00", "Z")
            self.assertFalse(evaluate_freshness(connection, latest, notifier))
        self.assertEqual(len(messages), 2)
        self.assertEqual(get_setting(connection, "signal_state"), "fresh")

    def test_missing_key_is_idle_not_failure(self):
        with patch.dict(os.environ, {"MARINETRAFFIC_API_KEY": ""}):
            self.assertEqual(run_collection(self.database), 0)
        self.assertIsNone(latest_position(connect(self.database), 447122))


if __name__ == "__main__":
    unittest.main()
