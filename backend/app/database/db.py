"""Backward-compatible database imports.

The application uses :mod:`app.database.database` as the single source of
truth. Keeping this module as a re-export prevents an accidental second
SQLAlchemy ``Base``/engine from being created by legacy imports.
"""

from app.database.database import Base, SessionLocal, engine, get_db

__all__ = ["Base", "SessionLocal", "engine", "get_db"]
