import shutil
import tempfile
import unittest
from pathlib import Path
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
from app.services.secure_fix_service import validate_secure_fix


class SecureFixTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        db = self.Session()
        self.owner = User(full_name="Owner", email="owner@example.com", hashed_password="unused")
        self.other = User(full_name="Other", email="other@example.com", hashed_password="unused")
        db.add_all([self.owner, self.other])
        db.flush()
        self.project = Project(name="Project", repository_url="https://github.com/example/repo.git", owner_id=self.owner.id)
        db.add(self.project)
        db.flush()
        self.scan = Scan(project_id=self.project.id, repository_url=self.project.repository_url, branch="main", status="completed", repository_revision="abc123")
        db.add(self.scan)
        db.flush()
        self.finding = Vulnerability(scan_id=self.scan.id, vulnerability_type="SQL Injection", file_path="app.py", line_number=1)
        db.add(self.finding)
        db.commit()
        db.refresh(self.owner)
        db.refresh(self.other)
        db.refresh(self.project)
        db.refresh(self.scan)
        db.refresh(self.finding)
        db.close()

        def override_db():
            session = self.Session()
            try:
                yield session
            finally:
                session.close()
        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: self.owner
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def test_proposal_binds_exact_finding_and_rejects_mismatched_finding(self):
        response = self.client.post(f"/projects/{self.project.id}/fixes", json={
            "vulnerability_id": self.finding.id,
            "source_revision": "abc123",
            "file_path": "app.py",
            "patch_text": "diff --git a/app.py b/app.py\n",
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["status"], "proposed")
        response = self.client.post(f"/projects/{self.project.id}/fixes", json={
            "vulnerability_id": 99999,
            "source_revision": "abc123",
            "file_path": "app.py",
            "patch_text": "diff --git a/app.py b/app.py\n",
        })
        self.assertEqual(response.status_code, 404)
        response = self.client.post(f"/projects/{self.project.id}/fixes", json={
            "vulnerability_id": self.finding.id,
            "source_revision": "abc123",
            "file_path": "other.py",
            "patch_text": "diff --git a/other.py b/other.py\n",
        })
        self.assertEqual(response.status_code, 422)
        response = self.client.post(f"/projects/{self.project.id}/fixes", json={
            "vulnerability_id": self.finding.id,
            "source_revision": "wrong-revision",
            "file_path": "app.py",
            "patch_text": "diff --git a/app.py b/app.py\n",
        })
        self.assertEqual(response.status_code, 422)

    def test_other_user_cannot_create_or_list_project_fixes(self):
        app.dependency_overrides[get_current_user] = lambda: self.other
        payload = {"vulnerability_id": self.finding.id, "source_revision": "abc123", "file_path": "app.py", "patch_text": "diff --git a/app.py b/app.py\n"}
        self.assertEqual(self.client.post(f"/projects/{self.project.id}/fixes", json=payload).status_code, 404)
        self.assertEqual(self.client.get(f"/projects/{self.project.id}/fixes").status_code, 404)

    def test_validation_uses_temporary_checkout_and_cleans_it(self):
        db = self.Session()
        fix_payload = {"vulnerability_id": self.finding.id, "source_revision": "abc123", "file_path": "app.py", "patch_text": "diff --git a/app.py b/app.py\n--- a/app.py\n+++ b/app.py\n@@ -1 +1 @@\n-old\n+new\n"}
        response = self.client.post(f"/projects/{self.project.id}/fixes", json=fix_payload)
        fix_id = response.json()["id"]
        fix = db.get(__import__("app.models.secure_fix", fromlist=["SecureFix"]).SecureFix, fix_id)
        temporary_root = Path(tempfile.mkdtemp(prefix="ai_sentinel_fix_test_"))
        (temporary_root / "repository").mkdir()
        with patch("app.services.secure_fix_service.tempfile.mkdtemp", return_value=str(temporary_root)), patch("app.services.secure_fix_service.subprocess.run") as run:
            run.side_effect = [None, type("Result", (), {"stdout": "abc123\n"})(), None]
            validated = validate_secure_fix(fix)
        self.assertEqual(validated.status, "validated")
        self.assertFalse(temporary_root.exists())
        db.close()


if __name__ == "__main__":
    unittest.main()
