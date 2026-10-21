from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class SecureFixCreate(BaseModel):
    vulnerability_id: int = Field(gt=0)
    source_revision: str = Field(min_length=1, max_length=128)
    file_path: str = Field(min_length=1, max_length=1024)
    patch_text: str = Field(min_length=1, max_length=1_000_000)

    @field_validator("source_revision", "file_path", "patch_text")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Value cannot be blank.")
        return normalized


class SecureFixResponse(BaseModel):
    id: int
    project_id: int
    scan_id: int
    vulnerability_id: int
    source_revision: str
    file_path: str
    patch_text: str
    status: str
    validation_message: str | None = None
    approved_at: datetime | None = None
    applied_at: datetime | None = None
    rolled_back_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
