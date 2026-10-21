from pydantic import BaseModel, Field, field_validator
from datetime import datetime

from app.schemas.vulnerability import VulnerabilityResponse
from app.services.repository_validation import validate_branch_name


class ScanCreate(BaseModel):
    branch: str = Field(default="main", min_length=1, max_length=255)

    @field_validator("branch")
    @classmethod
    def validate_branch(cls, branch: str) -> str:
        return validate_branch_name(branch)


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

    stage: str | None = None
    progress_percent: float | None = None
    files_discovered: int | None = None
    files_processed: int | None = None
    current_file: str | None = None
    ai_completed: int | None = None
    ai_total: int | None = None
    duration_seconds: float | None = None
    error_message: str | None = None

    clone_duration_seconds: float | None = None
    discovery_duration_seconds: float | None = None
    static_analysis_duration_seconds: float | None = None
    ai_duration_seconds: float | None = None
    persistence_duration_seconds: float | None = None

    created_at: datetime | None = None

    vulnerabilities: list[VulnerabilityResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ScanProgressResponse(BaseModel):
    id: int
    status: str
    stage: str | None = None
    progress_percent: float | None = None
    files_discovered: int | None = None
    files_processed: int | None = None
    current_file: str | None = None
    vulnerabilities_found: int | None = None
    ai_completed: int | None = None
    ai_total: int | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_seconds: float | None = None
    error_message: str | None = None

    class Config:
        from_attributes = True
