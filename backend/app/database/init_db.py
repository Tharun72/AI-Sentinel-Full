from sqlalchemy import inspect

from app.database.database import Base, engine
from app.database.base import *


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
}


def _ensure_scan_progress_columns() -> None:
    """Add the progress columns for deployments created before this release.

    This is deliberately a narrow, idempotent compatibility migration.  The
    application still uses Alembic for broader schema work; this keeps an
    existing local installation observable on its next safe startup.
    """

    inspector = inspect(engine)
    if "scans" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("scans")}
    missing = {
        name: sql_type for name, sql_type in SCAN_PROGRESS_COLUMNS.items()
        if name not in existing
    }
    if not missing:
        return
    with engine.begin() as connection:
        for name, sql_type in missing.items():
            connection.exec_driver_sql(
                f"ALTER TABLE scans ADD COLUMN {name} {sql_type}"
            )


def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_scan_progress_columns()
    # A process restart cannot resume an in-memory BackgroundTask.  Mark only
    # genuinely stale jobs terminal so the dashboard never polls forever.
    from app.services.background_scan import (
        normalize_legacy_terminal_scans,
        recover_stale_scans,
    )

    recover_stale_scans()
    normalize_legacy_terminal_scans()
