import unittest

from backend.aisstream import normalize_aisstream_position, subscription


CLASS_B_MESSAGE = {
    "MessageType": "StandardClassBPositionReport",
    "MetaData": {
        "MMSI": 367482180,
        "ShipName": "BLUE SKY MESSENGER  ",
        "latitude": 35.52562,
        "longitude": -74.810463,
        "time_utc": "2026-08-20 15:25:49.000000 +0000 UTC",
    },
    "Message": {
        "StandardClassBPositionReport": {
            "UserID": 367482180,
            "Latitude": 35.52562,
            "Longitude": -74.810463,
            "Sog": 5.0,
            "Cog": 80.0,
            "TrueHeading": 511,
        }
    },
}


class AISStreamTests(unittest.TestCase):
    def test_normalizes_class_b_position(self):
        position = normalize_aisstream_position(CLASS_B_MESSAGE, fetched_at="2026-08-20T15:26:00Z")
        self.assertEqual(position["ship_id"], 447122)
        self.assertEqual(position["mmsi"], "367482180")
        self.assertEqual(position["ship_name"], "BLUE SKY MESSENGER")
        self.assertEqual(position["latitude"], 35.52562)
        self.assertEqual(position["speed_knots"], 5.0)
        self.assertEqual(position["course_deg"], 80.0)
        self.assertIsNone(position["heading_deg"])
        self.assertEqual(position["ais_timestamp"], "2026-08-20T15:25:49Z")
        self.assertEqual(position["source"], "AISStream")

    def test_subscription_filters_the_target_mmsi_and_all_position_types(self):
        message = subscription("secret", "367482180")
        self.assertEqual(message["FiltersShipMMSI"], ["367482180"])
        self.assertIn("PositionReport", message["FilterMessageTypes"])
        self.assertIn("StandardClassBPositionReport", message["FilterMessageTypes"])
        self.assertIn("ExtendedClassBPositionReport", message["FilterMessageTypes"])


if __name__ == "__main__":
    unittest.main()
