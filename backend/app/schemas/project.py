from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.services.repository_validation import validate_repository_url


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4_000)
    repository_url: str | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, name: str) -> str:
        normalized = name.strip()
        if not normalized:
            raise ValueError("Project name cannot be blank.")
        return normalized

    @field_validator("repository_url")
    @classmethod
    def validate_repository(cls, repository_url: str | None) -> str | None:
        if repository_url is None:
            return None
        return validate_repository_url(repository_url)


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
