"""Database-compatible UTC timestamps."""

from datetime import UTC, datetime


def utc_now() -> datetime:
    """Return a naive UTC value for existing ``TIMESTAMP`` database columns."""

    return datetime.now(UTC).replace(tzinfo=None)
