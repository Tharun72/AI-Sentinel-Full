"""Bounded source retrieval for authenticated repository inspection."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path, PurePosixPath

from app.core.config import settings
from app.services.repository_validation import validate_branch_name, validate_repository_url


_SOURCE_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".cpp", ".c", ".h",
    ".hpp", ".go", ".rs", ".php", ".rb", ".json", ".yaml", ".yml",
    ".env", ".txt", ".md", ".toml", ".ini", ".cfg", ".conf", ".xml",
    ".html", ".css", ".properties",
}


def _safe_relative_path(file_path: str) -> str:
    if not isinstance(file_path, str) or not file_path.strip():
        raise ValueError("A source file path is required.")
    normalized = file_path.strip().replace("\\", "/")
    candidate = PurePosixPath(normalized)
    if candidate.is_absolute() or any(part in {"", ".", ".."} for part in candidate.parts):
        raise ValueError("Invalid source file path.")
    if len(normalized) > 1_024:
        raise ValueError("Source file path is too long.")
    return str(candidate)


def retrieve_repository_source(repository_url: str, branch: str, file_path: str) -> dict[str, object]:
    """Clone a bounded public repository and return one text source file.

    The checkout is temporary and no repository code is executed by this service.
    """

    repository_url = validate_repository_url(repository_url)
    branch = validate_branch_name(branch)
    relative_path = _safe_relative_path(file_path)
    if Path(relative_path).suffix.lower() not in _SOURCE_EXTENSIONS:
        raise ValueError("This file type is not available for source retrieval.")

    temporary_root = Path(tempfile.mkdtemp(prefix="ai_sentinel_source_"))
    repository_path = temporary_root / "repository"
    try:
        environment = os.environ.copy()
        environment.update({"GIT_TERMINAL_PROMPT": "0", "GIT_ALLOW_PROTOCOL": "https:http"})
        subprocess.run(
            [
                "git", "-c", "protocol.file.allow=never", "clone", "--depth", "1",
                "--no-tags", "--single-branch", "--branch", branch, "--",
                repository_url, str(repository_path),
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=settings.GIT_CLONE_TIMEOUT_SECONDS,
            env=environment,
        )
        resolved_root = repository_path.resolve()
        resolved_file = (repository_path / relative_path).resolve()
        if resolved_file != resolved_root and resolved_root not in resolved_file.parents:
            raise ValueError("Invalid source file path.")
        if not resolved_file.is_file():
            raise FileNotFoundError("Source file was not found in the requested branch.")
        if resolved_file.stat().st_size > settings.SCAN_MAX_FILE_SIZE_BYTES:
            raise ValueError("Source file exceeds the configured size limit.")
        try:
            content = resolved_file.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError("Source file is not valid UTF-8 text.") from exc
        return {
            "path": relative_path,
            "branch": branch,
            "content": content,
            "size_bytes": resolved_file.stat().st_size,
        }
    except subprocess.TimeoutExpired as exc:
        raise TimeoutError("Source retrieval exceeded the configured time limit.") from exc
    except subprocess.CalledProcessError as exc:
        raise FileNotFoundError("Unable to clone the repository or check out the requested branch.") from exc
    finally:
        shutil.rmtree(temporary_root, ignore_errors=True)
