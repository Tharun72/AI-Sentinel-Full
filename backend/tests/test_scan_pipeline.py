import json
import subprocess
import unittest
from datetime import timedelta
from pathlib import Path
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.ai.ollama_service import ANALYSIS_FIELDS, analyze_vulnerability
from app.core.security import create_access_token
from app.core.time import utc_now
from app.database.database import Base
from app.main import app
from app.models.project import Project
from app.models.scan import Scan
from app.models.user import User
from app.scanners.scanner import SecurityScanner
from app.services.background_scan import (
    _update_progress,
    recover_stale_scans,
    run_scan_background,
)
from app.services.repository_validation import validate_branch_name, validate_repository_url
from app.services.scan_service import persist_static_scan_results


def empty_analysis() -> dict[str, str]:
    return {field: "" for field in ANALYSIS_FIELDS}


def finding_results() -> dict:
    return {
        "files_discovered": 1,
        "files_processed": 1,
        "files_scanned": 1,
        "vulnerabilities_found": 1,
        "risk_score": 9.0,
        "vulnerabilities": [{
            "type": "SQL Injection",
            "file": "app.py",
            "line_number": 7,
            "count": 1,
            "severity": "critical",
            "cvss": 9.0,
            "description": "Unsafe query construction.",
            "recommendation": "Use query parameters.",
            "code": "6: # context\n7: query = 'SELECT ' + user_input\n8: execute(query)",
        }],
    }


class SecurityScannerTests(unittest.TestCase):
    def test_finding_contains_canonical_line_number_and_limited_context(self):
        fixture_directory = Path(__file__).resolve().parents[1] / "scanner_test_repo"
        events: list[tuple[int, int, str | None]] = []
        results = SecurityScanner().scan(
            str(fixture_directory), progress_callback=lambda *event: events.append(event)
        )

        finding = next(item for item in results["vulnerabilities"] if item["type"] == "Hardcoded Secret Key")
        self.assertEqual(finding["line_number"], 3)
        self.assertEqual(finding["file"], "test_secret.py")
        self.assertIn("3: API_KEY =", finding["code"])
        self.assertEqual(events[-1][0], events[-1][1])
        self.assertLessEqual(events[-1][1], results["files_discovered"])

    def test_empty_repository_returns_real_zero_counts(self):
        fixture_directory = Path(__file__).resolve().parents[1] / "scanner_test_repo"
        scanner = SecurityScanner()
        scanner.allowed_extensions = {".not-an-eligible-extension"}
        results = scanner.scan(str(fixture_directory))
        self.assertEqual(results["files_discovered"], 0)
        self.assertEqual(results["files_processed"], 0)
        self.assertEqual(results["vulnerabilities_found"], 0)


class RepositoryValidationTests(unittest.TestCase):
    def test_allows_configured_public_https_repository(self):
        self.assertEqual(
            validate_repository_url("https://github.com/example/repository.git"),
            "https://github.com/example/repository.git",
        )

    def test_rejects_unsafe_repository_locations_and_branches(self):
        for unsafe_url in (
            "file:///etc/passwd",
            "https://user:token@github.com/example/repository.git",
            "https://127.0.0.1/repository.git",
            "https://example.invalid/repository.git",
        ):
            with self.assertRaises(ValueError):
                validate_repository_url(unsafe_url)
        for unsafe_branch in ("", "--upload-pack=x", "main..old", "feature branch"):
            with self.assertRaises(ValueError):
                validate_branch_name(unsafe_branch)


class OllamaServiceTests(unittest.TestCase):
    @patch("app.ai.ollama_service.requests.post")
    def test_timeout_degrades_to_empty_analysis(self, post: Mock):
        post.side_effect = __import__("requests").Timeout()
        result = analyze_vulnerability("SQL Injection", "app.py", 5, "critical", 9.0)
        self.assertEqual(result, empty_analysis())

    @patch("app.ai.ollama_service.requests.post")
    def test_normalizes_missing_and_invalid_analysis_fields(self, post: Mock):
        response = Mock()
        response.json.return_value = {
            "response": json.dumps({"explanation": "  Valid finding.  ", "impact": None})
        }
        post.return_value = response
        result = analyze_vulnerability("SQL Injection", "app.py", 5, "critical", 9.0)
        self.assertEqual(result["explanation"], "Valid finding.")
        self.assertEqual(result["impact"], "")
        self.assertEqual(set(result), set(ANALYSIS_FIELDS))


class ScanPipelineTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def tearDown(self):
        self.engine.dispose()

    def create_scan(self, *, status: str = "pending", branch: str = "main") -> tuple[object, Scan]:
        session = self.Session()
        project = Project(
            name="Example", repository_url="https://github.com/example/repository.git", owner_id=1
        )
        session.add(project)
        session.flush()
        scan = Scan(
            project_id=project.id, repository_url=project.repository_url, branch=branch, status=status
        )
        session.add(scan)
        session.commit()
        return session, scan

    def worker_patches(self):
        return (
            patch("app.services.background_scan.SessionLocal", self.Session),
            patch("app.services.background_scan.tempfile.mkdtemp", return_value="unused-test-directory"),
            patch("app.services.background_scan.subprocess.run"),
        )

    def test_static_findings_persist_before_ai_and_keep_line_numbers(self):
        session, scan = self.create_scan()
        _, persisted = persist_static_scan_results(session, scan, finding_results())
        stored = session.query(Scan).filter_by(id=scan.id).one().vulnerabilities[0]
        self.assertEqual(stored.line_number, 7)
        self.assertEqual(stored.file_path, "app.py")
        self.assertIsNone(stored.ai_explanation)
        self.assertEqual(persisted[0][1]["code"].splitlines()[1], "7: query = 'SELECT ' + user_input")

    def test_worker_marks_clone_failures_as_terminal_failed(self):
        session, scan = self.create_scan()
        scan_id = scan.id
        session.close()
        with (
            patch("app.services.background_scan.SessionLocal", self.Session),
            patch("app.services.background_scan.tempfile.mkdtemp", return_value="unused-test-directory"),
            patch("app.services.background_scan.subprocess.run", side_effect=subprocess.TimeoutExpired("git", 1)),
        ):
            run_scan_background(scan_id)
        stored = self.Session().query(Scan).filter_by(id=scan_id).one()
        self.assertEqual(stored.status, "failed")
        self.assertEqual(stored.stage, "failed")
        self.assertIsNotNone(stored.completed_at)
        self.assertIn("clone", stored.error_message.lower())

    def test_invalid_branch_and_scanner_exception_both_reach_terminal_state(self):
        session, invalid_scan = self.create_scan(branch="--invalid")
        invalid_id = invalid_scan.id
        session.close()
        with patch("app.services.background_scan.SessionLocal", self.Session):
            run_scan_background(invalid_id)
        self.assertEqual(self.Session().get(Scan, invalid_id).status, "failed")

        session, scan = self.create_scan()
        scan_id = scan.id
        session.close()
        with (
            patch("app.services.background_scan.SessionLocal", self.Session),
            patch("app.services.background_scan.tempfile.mkdtemp", return_value="unused-test-directory"),
            patch("app.services.background_scan.subprocess.run"),
            patch("app.services.background_scan.SecurityScanner") as scanner_class,
        ):
            scanner_class.return_value.scan.side_effect = RuntimeError("scanner failure")
            run_scan_background(scan_id)
        stored = self.Session().get(Scan, scan_id)
        self.assertEqual(stored.status, "failed")
        self.assertEqual(stored.stage, "failed")

    def test_ai_timeout_does_not_discard_static_findings(self):
        session, scan = self.create_scan()
        scan_id = scan.id
        session.close()
        with (
            patch("app.services.background_scan.SessionLocal", self.Session),
            patch("app.services.background_scan.tempfile.mkdtemp", return_value="unused-test-directory"),
            patch("app.services.background_scan.subprocess.run"),
            patch("app.services.background_scan.SecurityScanner") as scanner_class,
            patch("app.services.background_scan.analyze_vulnerability", return_value=empty_analysis()),
        ):
            scanner_class.return_value.scan.return_value = finding_results()
            run_scan_background(scan_id)
        stored = self.Session().get(Scan, scan_id)
        self.assertEqual(stored.status, "completed")
        self.assertEqual(stored.vulnerabilities_found, 1)
        self.assertEqual(len(stored.vulnerabilities), 1)
        self.assertEqual(stored.ai_completed, 1)

    def test_static_persistence_failure_rolls_back_and_records_failure(self):
        session, scan = self.create_scan()
        scan_id = scan.id
        session.close()
        with (
            patch("app.services.background_scan.SessionLocal", self.Session),
            patch("app.services.background_scan.tempfile.mkdtemp", return_value="unused-test-directory"),
            patch("app.services.background_scan.subprocess.run"),
            patch("app.services.background_scan.SecurityScanner") as scanner_class,
            patch("app.services.background_scan.persist_static_scan_results", side_effect=SQLAlchemyError()),
        ):
            scanner_class.return_value.scan.return_value = finding_results()
            run_scan_background(scan_id)
        stored = self.Session().get(Scan, scan_id)
        self.assertEqual(stored.status, "failed")
        self.assertEqual(len(stored.vulnerabilities), 0)

    def test_progress_counters_are_clamped_and_stale_work_is_recovered(self):
        session, scan = self.create_scan(status="running")
        scan.started_at = utc_now() - timedelta(hours=1)
        session.commit()
        scan_id = scan.id
        self.assertTrue(
            _update_progress(
                session, scan_id, stage="static_analysis", progress_percent=150,
                files_discovered=2, files_processed=99, ai_total=1, ai_completed=9,
            )
        )
        stored = session.get(Scan, scan_id)
        self.assertEqual(stored.progress_percent, 100.0)
        self.assertEqual(stored.files_processed, 2)
        self.assertEqual(stored.ai_completed, 1)
        session.close()
        with patch("app.services.background_scan.SessionLocal", self.Session):
            self.assertEqual(recover_stale_scans(), 1)
        stored = self.Session().get(Scan, scan_id)
        self.assertEqual(stored.status, "failed")
        self.assertIsNotNone(stored.completed_at)

    def test_progress_api_returns_persisted_status_and_start_api_dispatches(self):
        session = self.Session()
        user = User(full_name="Test User", email="test@example.com", hashed_password="not-used")
        session.add(user)
        session.flush()
        project = Project(
            name="Example", repository_url="https://github.com/example/repository.git", owner_id=user.id
        )
        session.add(project)
        session.commit()
        token = create_access_token({"sub": str(user.id), "email": user.email})
        project_id = project.id
        session.close()
        headers = {"Authorization": f"Bearer {token}"}
        with (
            patch("app.database.database.SessionLocal", self.Session),
            patch("app.main.init_db"),
            patch("app.api.scans.run_scan_background") as worker,
        ):
            with TestClient(app) as client:
                response = client.post(f"/projects/{project_id}/scans", headers=headers, json={"branch": "main"})
                self.assertEqual(response.status_code, 201)
                scan_id = response.json()["id"]
                progress = client.get(f"/projects/scans/{scan_id}/progress", headers=headers)
        self.assertEqual(progress.status_code, 200)
        self.assertEqual(progress.json()["status"], "pending")
        self.assertEqual(progress.json()["stage"], "queued")
        worker.assert_called_once_with(scan_id)


if __name__ == "__main__":
    unittest.main()
