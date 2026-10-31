from sqlalchemy import inspect

from app.database.base import *  # noqa: F401,F403 - registers all ORM models.
from app.database.database import Base, engine


SCAN_PROGRESS_COLUMNS = {
    "stage": "VARCHAR(64) DEFAULT 'queued' NOT NULL",
    "progress_percent": "FLOAT DEFAULT 0 NOT NULL",
    "files_discovered": "INTEGER DEFAULT 0 NOT NULL",
    "files_processed": "INTEGER DEFAULT 0 NOT NULL",
    "current_file": "VARCHAR(1024)",
    "ai_completed": "INTEGER DEFAULT 0 NOT NULL",
    "ai_total": "INTEGER DEFAULT 0 NOT NULL",
    "error_message": "TEXT",
    "clone_duration_seconds": "FLOAT",
    "discovery_duration_seconds": "FLOAT",
    "static_analysis_duration_seconds": "FLOAT",
    "ai_duration_seconds": "FLOAT",
    "persistence_duration_seconds": "FLOAT",
    "updated_at": "TIMESTAMP",
    "repository_revision": "VARCHAR(128)",
}

SECURE_FIX_COLUMNS = {
    "created_by_id": "INTEGER",
    "approved_by_id": "INTEGER",
    "validation_status": "VARCHAR(32) DEFAULT 'not_run' NOT NULL",
    "rejected_by_id": "INTEGER",
    "rejected_at": "TIMESTAMP",
    "rejection_reason": "TEXT",
}

VULNERABILITY_COLUMNS = {
    "evidence": "TEXT",
}


def _ensure_columns(table_name: str, required_columns: dict[str, str]) -> None:
    """Apply narrow, idempotent compatibility additions to legacy installs."""

    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns(table_name)}
    missing = {name: sql_type for name, sql_type in required_columns.items() if name not in existing}
    if not missing:
        return
    with engine.begin() as connection:
        for name, sql_type in missing.items():
            connection.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {name} {sql_type}")


def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_columns("scans", SCAN_PROGRESS_COLUMNS)
    _ensure_columns("secure_fixes", SECURE_FIX_COLUMNS)
    _ensure_columns("vulnerabilities", VULNERABILITY_COLUMNS)

    # A process restart cannot resume an in-memory BackgroundTask. Mark only
    # genuinely stale jobs terminal so the dashboard never polls forever.
    from app.services.background_scan import normalize_legacy_terminal_scans, recover_stale_scans

    recover_stale_scans()
    normalize_legacy_terminal_scans()
