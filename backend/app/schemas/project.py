from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    repository_url: str | None = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str | None
    repository_url: str | None
    owner_id: int
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True