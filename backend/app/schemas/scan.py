from pydantic import BaseModel
from datetime import datetime

from app.schemas.vulnerability import VulnerabilityResponse


class ScanCreate(BaseModel):
    branch: str = "main"


class ScanResponse(BaseModel):
    id: int
    project_id: int
    status: str

    repository_url: str | None = None
    branch: str | None = None

    started_at: datetime | None = None
    completed_at: datetime | None = None

    files_scanned: int | None = None
    vulnerabilities_found: int | None = None
    risk_score: float | None = None

    created_at: datetime | None = None

    vulnerabilities: list[VulnerabilityResponse] = []

    class Config:
        from_attributes = True