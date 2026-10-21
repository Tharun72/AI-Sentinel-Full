"""Validation for repository inputs used by the Git clone worker."""

from __future__ import annotations

import ipaddress
import re
from urllib.parse import urlparse

from app.core.config import settings


_BRANCH_INVALID_CHARACTERS = re.compile(r"[\s~^:?*\[\]\\]")


def validate_repository_url(repository_url: str | None) -> str:
    """Return a safe public HTTPS Git URL or raise ``ValueError``.

    The scanner intentionally does not accept local paths, ``file://`` URLs,
    SSH remotes, embedded credentials, or arbitrary protocols. This prevents a
    scan request from turning the server into a local-file reader or an
    unintended network pivot. Additional trusted Git hosts are configurable
    through ``GIT_ALLOWED_HOSTS``.
    """

    if not isinstance(repository_url, str) or not repository_url.strip():
        raise ValueError("A repository URL is required to start a scan.")

    normalized = repository_url.strip()
    parsed = urlparse(normalized)

    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("Only public HTTPS repository URLs are supported.")

    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("Repository URLs cannot contain credentials, queries, or fragments.")

    host = parsed.hostname.lower().rstrip(".")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError("Repository URLs must use a configured host name, not an IP address.")

    allowed_hosts = {
        allowed_host.strip().lower().rstrip(".")
        for allowed_host in settings.GIT_ALLOWED_HOSTS.split(",")
        if allowed_host.strip()
    }
    if allowed_hosts and host not in allowed_hosts:
        raise ValueError("Repository host is not permitted for scanning.")

    try:
        port = parsed.port
    except ValueError as exc:
        raise ValueError("Repository URL contains an invalid port.") from exc

    if port not in (None, 443):
        raise ValueError("Repository URLs must use the HTTPS default port.")

    if not parsed.path or parsed.path == "/":
        raise ValueError("Repository URL must include a repository path.")

    return normalized


def validate_branch_name(branch: str | None) -> str:
    """Validate a branch value before it is passed to Git."""

    if not isinstance(branch, str):
        raise ValueError("A branch name is required.")

    normalized = branch.strip()
    if (
        not normalized
        or len(normalized) > 255
        or normalized.startswith("-")
        or normalized.startswith("/")
        or normalized.endswith(("/", "."))
        or ".." in normalized
        or "//" in normalized
        or "@{" in normalized
        or _BRANCH_INVALID_CHARACTERS.search(normalized)
    ):
        raise ValueError("Invalid branch name.")

    return normalized
