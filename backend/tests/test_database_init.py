import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import create_engine, inspect, text

from app.database.database import Base
from app.database.init_db import init_db


class DatabaseInitializationTests(unittest.TestCase):
    def test_existing_database_gets_revision_column_and_secure_fix_table(self):
        database_path = Path(tempfile.mkstemp(prefix="ai_sentinel_db_", suffix=".sqlite")[1])
        engine = create_engine(f"sqlite:///{database_path}")
        try:
            with engine.begin() as connection:
                connection.exec_driver_sql("CREATE TABLE users (id INTEGER PRIMARY KEY)")
                connection.exec_driver_sql("CREATE TABLE projects (id INTEGER PRIMARY KEY, owner_id INTEGER)")
                connection.exec_driver_sql("CREATE TABLE scans (id INTEGER PRIMARY KEY, project_id INTEGER)")
                connection.exec_driver_sql("CREATE TABLE vulnerabilities (id INTEGER PRIMARY KEY, scan_id INTEGER)")
            with patch("app.database.init_db.engine", engine), patch(
                "app.services.background_scan.recover_stale_scans", return_value=0
            ), patch("app.services.background_scan.normalize_legacy_terminal_scans", return_value=0):
                init_db()
            columns = {column["name"] for column in inspect(engine).get_columns("scans")}
            self.assertIn("repository_revision", columns)
            self.assertIn("secure_fixes", inspect(engine).get_table_names())
        finally:
            engine.dispose()
            database_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
