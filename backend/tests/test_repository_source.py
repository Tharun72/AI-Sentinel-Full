import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.database.database import Base, get_db
from app.main import app
from app.models.project import Project
from app.models.user import User
from app.services.repository_source import retrieve_repository_source


class RepositorySourceServiceTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="ai_sentinel_source_test_"))
        self.repository = self.root / "repository"
        self.repository.mkdir()
        (self.repository / "src").mkdir()
        (self.repository / "src" / "app.py").write_text("print('safe')\n", encoding="utf-8")

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_retrieves_text_source_and_cleans_temporary_checkout(self):
        temporary_root = self.root / "checkout"
        temporary_root.mkdir()
        (temporary_root / "repository").mkdir()
        (temporary_root / "repository" / "src").mkdir()
        (temporary_root / "repository" / "src" / "app.py").write_text(
            "print('safe')\n", encoding="utf-8"
        )
        with patch("app.services.repository_source.tempfile.mkdtemp", return_value=str(temporary_root)), patch(
            "app.services.repository_source.subprocess.run"
        ) as run:
            result = retrieve_repository_source(
                "https://github.com/example/repository.git", "main", "src/app.py"
            )
        self.assertEqual(result["path"], "src/app.py")
        self.assertEqual(result["content"], "print('safe')\n")
        run.assert_called_once()
        self.assertFalse(temporary_root.exists())

    def test_rejects_path_traversal_and_unsupported_extension_before_clone(self):
        for path in ("../secret.py", "src/../../secret.py", "/etc/passwd"):
            with self.subTest(path=path), patch(
                "app.services.repository_source.subprocess.run"
            ) as run:
                with self.assertRaises(ValueError):
                    retrieve_repository_source(
                        "https://github.com/example/repository.git", "main", path
                    )
                run.assert_not_called()
        with patch("app.services.repository_source.subprocess.run") as run:
            with self.assertRaises(ValueError):
                retrieve_repository_source(
                    "https://github.com/example/repository.git", "main", "image.png"
                )
            run.assert_not_called()

    def test_rejects_oversized_source_and_cleans_checkout(self):
        temporary_root = self.root / "large-checkout"
        temporary_root.mkdir()
        (temporary_root / "repository").mkdir()
        source = temporary_root / "repository" / "large.py"
        source.write_text("x" * 20, encoding="utf-8")
        original_limit = settings.SCAN_MAX_FILE_SIZE_BYTES
        settings.SCAN_MAX_FILE_SIZE_BYTES = 10
        try:
            with patch("app.services.repository_source.tempfile.mkdtemp", return_value=str(temporary_root)), patch(
                "app.services.repository_source.subprocess.run"
            ):
                with self.assertRaises(ValueError):
                    retrieve_repository_source(
                        "https://github.com/example/repository.git", "main", "large.py"
                    )
            self.assertFalse(temporary_root.exists())
        finally:
            settings.SCAN_MAX_FILE_SIZE_BYTES = original_limit

    def test_clone_timeout_is_safe_and_cleans_checkout(self):
        temporary_root = self.root / "timeout-checkout"
        temporary_root.mkdir()
        with patch("app.services.repository_source.tempfile.mkdtemp", return_value=str(temporary_root)), patch(
            "app.services.repository_source.subprocess.run",
            side_effect=subprocess.TimeoutExpired("git", 1),
        ):
            with self.assertRaises(TimeoutError):
                retrieve_repository_source(
                    "https://github.com/example/repository.git", "main", "app.py"
                )
        self.assertFalse(temporary_root.exists())


class RepositorySourceApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        self.owner = User(full_name="Owner", email="owner@example.com", hashed_password="unused")
        self.other_user = User(
            full_name="Other", email="other@example.com", hashed_password="unused"
        )
        self.db.add_all([self.owner, self.other_user])
        self.db.flush()
        self.project = Project(
            name="Owned project",
            repository_url="https://github.com/example/repository.git",
            owner_id=self.owner.id,
        )
        self.db.add(self.project)
        self.db.commit()
        self.db.refresh(self.project)

        def override_db():
            session = self.Session()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def test_requires_authentication(self):
        response = self.client.get(f"/projects/{self.project.id}/source?path=app.py")
        self.assertEqual(response.status_code, 401)

    def test_rejects_project_owned_by_another_user(self):
        app.dependency_overrides[get_current_user] = lambda: self.other_user
        with patch("app.api.projects.retrieve_repository_source") as retrieve:
            response = self.client.get(f"/projects/{self.project.id}/source?path=app.py")
        self.assertEqual(response.status_code, 404)
        retrieve.assert_not_called()

    def test_returns_source_for_authenticated_owner(self):
        app.dependency_overrides[get_current_user] = lambda: self.owner
        expected = {
            "path": "app.py",
            "branch": "main",
            "content": "print('safe')\n",
            "size_bytes": 15,
        }
        with patch(
            "app.api.projects.retrieve_repository_source", return_value=expected
        ) as retrieve:
            response = self.client.get(f"/projects/{self.project.id}/source?path=app.py")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), expected)
        retrieve.assert_called_once_with(
            self.project.repository_url, "main", "app.py"
        )

    def test_maps_source_validation_and_timeout_errors(self):
        app.dependency_overrides[get_current_user] = lambda: self.owner
        cases = (
            (ValueError("Invalid source file path."), 422),
            (FileNotFoundError("Source file was not found in the requested branch."), 404),
            (TimeoutError("Source retrieval exceeded the configured time limit."), 504),
        )
        for error, expected_status in cases:
            with self.subTest(expected_status=expected_status), patch(
                "app.api.projects.retrieve_repository_source", side_effect=error
            ):
                response = self.client.get(
                    f"/projects/{self.project.id}/source?path=app.py"
                )
            self.assertEqual(response.status_code, expected_status)


if __name__ == "__main__":
    unittest.main()
