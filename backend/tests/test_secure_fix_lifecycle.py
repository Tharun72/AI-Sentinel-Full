import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base
from app.models.project import Project
from app.models.scan import Scan
from app.models.secure_fix import SecureFix
from app.models.user import User
from app.models.vulnerability import Vulnerability
from app.services.secure_fix_service import reject_secure_fix


class SecureFixLifecycleTests(unittest.TestCase):
    def test_reject_records_reason_and_actor_without_applying_code(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        session = sessionmaker(bind=engine)()
        user = User(full_name="Owner", email="owner@example.com", hashed_password="unused")
        session.add(user); session.flush()
        project = Project(name="Project", repository_url="https://github.com/example/repo.git", owner_id=user.id)
        session.add(project); session.flush()
        scan = Scan(project_id=project.id, repository_url=project.repository_url, branch="main", status="completed", repository_revision="abc")
        session.add(scan); session.flush()
        finding = Vulnerability(scan_id=scan.id, vulnerability_type="SQL Injection", file_path="app.py")
        session.add(finding); session.flush()
        fix = SecureFix(project_id=project.id, scan_id=scan.id, vulnerability_id=finding.id, source_revision="abc", file_path="app.py", patch_text="diff --git a/app.py b/app.py", status="proposed")
        session.add(fix); session.commit()
        rejected = reject_secure_fix(session, fix, "Unsafe behavior change.", actor_id=user.id)
        self.assertEqual(rejected.status, "rejected")
        self.assertEqual(rejected.rejection_reason, "Unsafe behavior change.")
        self.assertEqual(rejected.rejected_by_id, user.id)
        self.assertIsNone(rejected.applied_at)
        session.close(); engine.dispose()


if __name__ == "__main__":
    unittest.main()
