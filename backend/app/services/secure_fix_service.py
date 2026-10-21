from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path, PurePosixPath

from app.core.config import settings
from app.core.time import utc_now
from app.models.project import Project
from app.models.scan import Scan
from app.models.secure_fix import SecureFix
from app.models.vulnerability import Vulnerability
from app.services.repository_validation import validate_branch_name, validate_repository_url


TERMINAL_STATUSES = {"proposed", "validated", "approved", "applied", "rolled_back", "rejected"}


def create_secure_fix(
    db,
    project: Project,
    scan: Scan,
    vulnerability: Vulnerability,
    source_revision: str,
    file_path: str,
    patch_text: str,
) -> SecureFix:
    if vulnerability.scan_id != scan.id or scan.project_id != project.id:
        raise ValueError("Finding does not belong to the selected scan and project.")
    if scan.status != "completed" or not scan.repository_revision:
        raise ValueError("Secure fixes require a completed scan with a persisted repository revision.")
    if not source_revision.strip() or len(source_revision) > 128:
        raise ValueError("A source revision is required.")
    if source_revision.strip() != scan.repository_revision:
        raise ValueError("Patch revision must match the completed scan revision.")
    normalized_file_path = file_path.strip().replace("\\", "/")
    path_parts = PurePosixPath(normalized_file_path).parts
    if (
        not normalized_file_path
        or PurePosixPath(normalized_file_path).is_absolute()
        or any(part in {"", ".", ".."} for part in path_parts)
        or normalized_file_path != vulnerability.file_path
    ):
        raise ValueError("Patch file path must match the persisted finding path.")
    if not patch_text.strip() or len(patch_text.encode("utf-8")) > 1_000_000:
        raise ValueError("Patch text is empty or too large.")
    fix = SecureFix(
        project_id=project.id,
        scan_id=scan.id,
        vulnerability_id=vulnerability.id,
        source_revision=source_revision.strip(),
        file_path=normalized_file_path,
        patch_text=patch_text,
        status="proposed",
    )
    db.add(fix)
    db.commit()
    db.refresh(fix)
    return fix


def validate_secure_fix(fix: SecureFix) -> SecureFix:
    """Validate a patch in a temporary checkout without modifying the real repo."""

    if fix.status not in {"proposed", "validated"}:
        raise ValueError("Only proposed fixes can be validated.")
    repository_url = validate_repository_url(fix.project.repository_url)
    branch = validate_branch_name(fix.scan.branch or "main")
    temporary_root = Path(tempfile.mkdtemp(prefix="ai_sentinel_fix_"))
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
        checkout_revision = subprocess.run(
            ["git", "-C", str(repository_path), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
            env=environment,
        ).stdout.strip()
        if fix.source_revision != checkout_revision:
            raise ValueError("Patch revision does not match the checked-out repository revision.")
        patch_file = temporary_root / "proposal.patch"
        patch_file.write_text(fix.patch_text, encoding="utf-8")
        patch_targets = set()
        for line in fix.patch_text.splitlines():
            if line.startswith("+++ b/"):
                patch_targets.add(line[6:])
        if patch_targets != {fix.file_path}:
            raise ValueError("Patch must target only the persisted finding file.")
        subprocess.run(
            ["git", "-C", str(repository_path), "apply", "--check", "--whitespace=error", str(patch_file)],
            check=True,
            capture_output=True,
            text=True,
            timeout=30,
            env=environment,
        )
        fix.status = "validated"
        fix.validation_message = "Patch applies cleanly in an isolated temporary checkout. No repository was modified."
    except subprocess.TimeoutExpired as exc:
        fix.status = "proposed"
        fix.validation_message = "Patch validation timed out."
        raise TimeoutError(fix.validation_message) from exc
    except ValueError as exc:
        fix.status = "proposed"
        fix.validation_message = str(exc)[:2_000]
        raise
    except subprocess.CalledProcessError as exc:
        fix.status = "proposed"
        details = (exc.stderr or "").strip()
        fix.validation_message = details[:2_000] or "Patch does not apply cleanly in the isolated checkout."
        raise ValueError(fix.validation_message) from exc
    finally:
        shutil.rmtree(temporary_root, ignore_errors=True)
    return fix


def approve_secure_fix(db, fix: SecureFix) -> SecureFix:
    if fix.status != "validated":
        raise ValueError("Only validated fixes can be approved.")
    fix.status = "approved"
    fix.approved_at = utc_now()
    db.commit()
    db.refresh(fix)
    return fix
