from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Float,
    ForeignKey
)

from sqlalchemy.orm import relationship
from datetime import datetime

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
        default=datetime.utcnow
    )

    project = relationship(
        "Project",
        back_populates="scans"
    )
    vulnerabilities = relationship(
    "Vulnerability",
    back_populates="scan",
    cascade="all, delete-orphan"
)