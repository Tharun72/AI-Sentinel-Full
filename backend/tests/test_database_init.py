import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, inspect

from app.database.database import Base
from app.database.init_db import init_db


class DatabaseInitializationTests(unittest.TestCase):
    def test_existing_database_gets_revision_column_and_secure_fix_table(self):
        engine = create_engine("sqlite://")
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
            with engine.connect() as connection:
                inspector = inspect(connection)
                columns = {column["name"] for column in inspector.get_columns("scans")}
                table_names = inspector.get_table_names()
            self.assertIn("repository_revision", columns)
            self.assertIn("secure_fixes", table_names)
            self.assertIn("audit_events", table_names)
            self.assertIn("audit_chains", table_names)
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
