from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Float,
    ForeignKey,
    Text,
)

from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.database.database import Base


class Scan(Base):
    __tablename__ = "scans"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=False
    )

    status = Column(
        String,
        nullable=False,
        default="pending"
    )

    # These fields are updated by the worker as it performs real work.  They
    # are intentionally persisted rather than inferred by the web client.
    stage = Column(String, nullable=False, default="queued")
    progress_percent = Column(Float, nullable=False, default=0.0)
    files_discovered = Column(Integer, nullable=False, default=0)
    files_processed = Column(Integer, nullable=False, default=0)
    current_file = Column(String, nullable=True)
    ai_completed = Column(Integer, nullable=False, default=0)
    ai_total = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)

    clone_duration_seconds = Column(Float, nullable=True)
    discovery_duration_seconds = Column(Float, nullable=True)
    static_analysis_duration_seconds = Column(Float, nullable=True)
    ai_duration_seconds = Column(Float, nullable=True)
    persistence_duration_seconds = Column(Float, nullable=True)

    repository_url = Column(
        String,
        nullable=True
    )

    branch = Column(
        String,
        nullable=True
    )

    started_at = Column(
        DateTime,
        nullable=True
    )

    completed_at = Column(
        DateTime,
        nullable=True
    )

    files_scanned = Column(
        Integer,
        nullable=True
    )

    vulnerabilities_found = Column(
        Integer,
        nullable=True
    )

    risk_score = Column(
        Float,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=utc_now
    )

    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    @property
    def duration_seconds(self):
        if not self.started_at:
            return None
        end_time = self.completed_at or utc_now()
        return max(0.0, (end_time - self.started_at).total_seconds())

    project = relationship(
        "Project",
        back_populates="scans"
    )
    vulnerabilities = relationship(
    "Vulnerability",
    back_populates="scan",
    cascade="all, delete-orphan"
)
