import json
import unittest

from backend.marinetraffic_har import position_from_har


class MarineTrafficHarTests(unittest.TestCase):
    def test_imports_position_response_without_request_secrets(self):
        response = {
            "shipId": 447122,
            "lat": 35.52562,
            "lon": -74.810463,
            "speed": 5,
            "course": 80,
            "heading": None,
            "timestamp": 1787239549,
            "navigationalStatus": "Class B",
        }
        har = {
            "log": {
                "entries": [
                    {
                        "request": {
                            "url": "https://www.marinetraffic.com/en/vessels/447122/position",
                            "headers": [{"name": "Cookie", "value": "private"}],
                        },
                        "response": {"content": {"text": json.dumps(response)}},
                    }
                ]
            }
        }
        position = position_from_har(har, fetched_at="2026-08-20T15:30:00Z")
        self.assertEqual(position["latitude"], 35.52562)
        self.assertEqual(position["longitude"], -74.810463)
        self.assertEqual(position["ais_timestamp"], "2026-08-20T15:25:49Z")
        self.assertEqual(position["source"], "MarineTraffic Firefox backup")
        self.assertNotIn("private", position["raw_json"])


if __name__ == "__main__":
    unittest.main()
