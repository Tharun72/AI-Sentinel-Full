import csv
import json
import unittest
from datetime import datetime
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.dependencies import get_current_user
from app.database.database import Base, get_db
from app.main import app
from app.models.project import Project
from app.models.scan import Scan
from app.models.user import User
from app.models.vulnerability import Vulnerability


class ReportApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        session = self.Session()
        self.owner = User(full_name="Owner", email="owner@example.com", hashed_password="unused")
        other = User(full_name="Other", email="other@example.com", hashed_password="unused")
        session.add_all([self.owner, other])
        session.flush()
        self.project = Project(
            name="Owned project",
            repository_url="https://github.com/example/repository.git",
            owner_id=self.owner.id,
        )
        self.other_project = Project(
            name="Other project",
            repository_url="https://github.com/example/other.git",
            owner_id=other.id,
        )
        session.add_all([self.project, self.other_project])
        session.flush()
        scan = Scan(
            project_id=self.project.id,
            repository_url=self.project.repository_url,
            branch="main",
            status="completed",
            files_scanned=2,
            vulnerabilities_found=1,
            risk_score=9.0,
            created_at=datetime(2026, 1, 1),
        )
        session.add(scan)
        session.flush()
        session.add(Vulnerability(
            scan_id=scan.id,
            vulnerability_type="SQL Injection",
            file_path="app.py",
            line_number=4,
            count=1,
            severity="critical",
            cvss=9.0,
            description="Unsafe query construction.",
            recommendation="Use parameters.",
        ))
        session.commit()
        session.refresh(self.owner)
        session.close()

        def override_db():
            db = self.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: self.owner
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def test_requires_authentication(self):
        app.dependency_overrides.pop(get_current_user)
        response = self.client.get("/projects/reports")
        self.assertEqual(response.status_code, 401)

    def test_json_report_is_owner_scoped(self):
        response = self.client.get("/projects/reports?format=json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment", response.headers["content-disposition"])
        payload = response.json()
        self.assertEqual([project["name"] for project in payload["projects"]], ["Owned project"])
        self.assertEqual(len(payload["scans"]), 1)
        self.assertEqual(payload["scans"][0]["vulnerabilities"][0]["file_path"], "app.py")

    def test_csv_and_sarif_reports_are_valid(self):
        csv_response = self.client.get("/projects/reports?format=csv")
        self.assertEqual(csv_response.status_code, 200)
        rows = list(csv.DictReader(csv_response.text.splitlines()))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["vulnerability_type"], "SQL Injection")

        sarif_response = self.client.get("/projects/reports?format=sarif")
        self.assertEqual(sarif_response.status_code, 200)
        sarif = sarif_response.json()
        self.assertEqual(sarif["version"], "2.1.0")
        self.assertEqual(sarif["runs"][0]["results"][0]["ruleId"], "SQL Injection")
        self.assertEqual(sarif["runs"][0]["results"][0]["level"], "error")

    def test_invalid_report_format_is_rejected(self):
        response = self.client.get("/projects/reports?format=pdf")
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
