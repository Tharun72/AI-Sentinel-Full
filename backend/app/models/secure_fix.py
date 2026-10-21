from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.time import utc_now
from app.database.database import Base


class SecureFix(Base):
    __tablename__ = "secure_fixes"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"), nullable=False, index=True)
    vulnerability_id = Column(Integer, ForeignKey("vulnerabilities.id"), nullable=False, index=True)
    source_revision = Column(String(128), nullable=False)
    file_path = Column(String(1024), nullable=False)
    patch_text = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="proposed")
    validation_message = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    applied_at = Column(DateTime, nullable=True)
    rolled_back_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    project = relationship("Project")
    scan = relationship("Scan")
    vulnerability = relationship("Vulnerability")
