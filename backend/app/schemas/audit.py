from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AuditEventResponse(BaseModel):
    id: int
    sequence: int
    event_type: str
    outcome: str
    actor_id: int | None = None
    project_id: int | None = None
    resource_type: str
    resource_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    previous_hash: str | None = None
    event_hash: str
    created_at: datetime


class AuditEventListResponse(BaseModel):
    events: list[AuditEventResponse]
    total: int
    limit: int
    offset: int


class AuditVerificationResponse(BaseModel):
    verified: bool
    verified_events: int
    scopes: int
    errors: list[str] = Field(default_factory=list)
