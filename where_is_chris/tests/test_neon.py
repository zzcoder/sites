import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.neon import database_url, json_value


class NeonTests(unittest.TestCase):
    def test_database_url_prefers_direct_environment_value(self):
        with patch.dict(
            os.environ,
            {"DATABASE_URL": "postgresql://direct.example/db", "NEON_SHARED_ENV_FILE": "/missing"},
            clear=True,
        ):
            self.assertEqual(database_url(), "postgresql://direct.example/db")

    def test_database_url_reads_only_database_url_from_shared_file(self):
        with tempfile.TemporaryDirectory() as directory:
            env_file = Path(directory) / ".env.local"
            env_file.write_text(
                "UNRELATED_SECRET=do-not-load\nDATABASE_URL='postgresql://shared.example/db'\n",
                encoding="utf-8",
            )
            with patch.dict(os.environ, {"NEON_SHARED_ENV_FILE": str(env_file)}, clear=True):
                self.assertEqual(database_url(), "postgresql://shared.example/db")
                self.assertNotIn("UNRELATED_SECRET", os.environ)

    def test_json_value_preserves_json_and_wraps_plain_text(self):
        self.assertEqual(json_value('{"source":"test"}'), {"source": "test"})
        self.assertEqual(json_value("not-json"), {"raw": "not-json"})


if __name__ == "__main__":
    unittest.main()
