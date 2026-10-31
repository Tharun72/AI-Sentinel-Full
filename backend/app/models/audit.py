"""Append-only application audit records.

The database remains the source of truth. The hash chain makes accidental or
partial changes evident to the verification endpoint, but is not a substitute
for database access control, backups, or external notarisation.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.time import utc_now
from app.database.database import Base


class AuditChain(Base):
    """The locked head of one serialized audit-event chain."""

    __tablename__ = "audit_chains"

    scope_key = Column(String(128), primary_key=True)
    last_hash = Column(String(64), nullable=True)
    next_sequence = Column(Integer, nullable=False, default=1)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        UniqueConstraint("scope_key", "sequence", name="uq_audit_events_scope_sequence"),
    )

    id = Column(Integer, primary_key=True, index=True)
    scope_key = Column(String(128), nullable=False, index=True)
    sequence = Column(Integer, nullable=False)
    event_type = Column(String(96), nullable=False, index=True)
    outcome = Column(String(16), nullable=False, default="success", index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(128), nullable=True)
    metadata_json = Column(Text, nullable=False, default="{}")
    previous_hash = Column(String(64), nullable=True)
    event_hash = Column(String(64), nullable=False, unique=True)
    created_at = Column(DateTime, nullable=False, default=utc_now, index=True)

    actor = relationship("User", foreign_keys=[actor_id])
    project = relationship("Project", foreign_keys=[project_id])
