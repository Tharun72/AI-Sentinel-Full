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
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    source_revision = Column(String(128), nullable=False)
    file_path = Column(String(1024), nullable=False)
    patch_text = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="proposed")
    validation_message = Column(Text, nullable=True)
    validation_status = Column(String(32), nullable=False, default="not_run")
    rejected_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    applied_at = Column(DateTime, nullable=True)
    rolled_back_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    project = relationship("Project")
    scan = relationship("Scan")
    vulnerability = relationship("Vulnerability")
    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    rejected_by = relationship("User", foreign_keys=[rejected_by_id])

    @property
    def finding_type(self):
        return self.vulnerability.vulnerability_type if self.vulnerability else None

    @property
    def finding_severity(self):
        return self.vulnerability.severity if self.vulnerability else None

    @property
    def finding_description(self):
        return self.vulnerability.description if self.vulnerability else None

    @property
    def finding_evidence(self):
        return self.vulnerability.evidence if self.vulnerability else None
