import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.audit import list_audit_events, verify_audit_history
from app.database.database import Base
from app.models.audit import AuditChain, AuditEvent
from app.models.project import Project
from app.models.user import User
from app.services.audit_service import record_audit_event, verify_audit_events


class AuditHistoryTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        self.Session = sessionmaker(bind=engine)
        self.engine = engine
        self.db = self.Session()
        self.owner = User(full_name="Owner", email="owner@example.com", hashed_password="unused")
        self.other = User(full_name="Other", email="other@example.com", hashed_password="unused")
        self.db.add_all([self.owner, self.other])
        self.db.flush()
        self.project = Project(name="Owned", repository_url="https://github.com/example/repo.git", owner_id=self.owner.id)
        self.db.add(self.project)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _record(self, event_type: str):
        event = record_audit_event(
            self.db,
            event_type=event_type,
            resource_type="project",
            resource_id=self.project.id,
            project_id=self.project.id,
            actor_id=self.owner.id,
            metadata={"secret": "must-not-be-stored", "count": 1},
        )
        self.db.commit()
        return event

    def test_hash_chain_is_ordered_redacts_metadata_and_detects_tampering(self):
        first = self._record("project.created")
        second = self._record("scan.created")
        self.assertEqual(first.sequence, 1)
        self.assertEqual(second.sequence, 2)
        self.assertEqual(second.previous_hash, first.event_hash)
        self.assertIn("[redacted]", first.metadata_json)

        events = self.db.query(AuditEvent).order_by(AuditEvent.sequence).all()
        chains = self.db.query(AuditChain).all()
        self.assertTrue(verify_audit_events(events, chains)["verified"])
        events[1].metadata_json = '{"count":2}'
        self.assertFalse(verify_audit_events(events, chains)["verified"])

    def test_list_and_verification_are_owner_scoped(self):
        self._record("project.created")
        owner_page = list_audit_events(
            db=self.db, current_user=self.owner, project_id=None, event_type=None,
            outcome=None, limit=50, offset=0,
        )
        self.assertEqual(owner_page.total, 1)
        self.assertEqual(owner_page.events[0].project_id, self.project.id)
        self.assertTrue(verify_audit_history(db=self.db, current_user=self.owner, project_id=None).verified)

        other_page = list_audit_events(
            db=self.db, current_user=self.other, project_id=None, event_type=None,
            outcome=None, limit=50, offset=0,
        )
        self.assertEqual(other_page.total, 0)
        with self.assertRaises(HTTPException) as context:
            list_audit_events(
                db=self.db, current_user=self.other, project_id=self.project.id, event_type=None,
                outcome=None, limit=50, offset=0,
            )
        self.assertEqual(context.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
