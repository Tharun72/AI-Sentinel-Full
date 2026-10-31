from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path, PurePosixPath

from app.core.config import settings
from app.core.time import utc_now
from app.ai.ollama_service import generate_secure_fix_patch
from app.models.project import Project
from app.models.scan import Scan
from app.models.secure_fix import SecureFix
from app.models.vulnerability import Vulnerability
from app.services.audit_service import record_audit_event
from app.services.repository_validation import validate_branch_name, validate_repository_url


def create_secure_fix(
    db,
    project: Project,
    scan: Scan,
    vulnerability: Vulnerability,
    source_revision: str,
    file_path: str,
    patch_text: str,
    *,
    actor_id: int | None = None,
    origin: str = "manual",
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
        created_by_id=actor_id,
        source_revision=source_revision.strip(),
        file_path=normalized_file_path,
        patch_text=patch_text,
        status="proposed",
    )
    db.add(fix)
    db.flush()
    record_audit_event(
        db,
        event_type="secure_fix.proposed",
        resource_type="secure_fix",
        resource_id=fix.id,
        project_id=project.id,
        actor_id=actor_id,
        metadata={
            "scan_id": scan.id,
            "vulnerability_id": vulnerability.id,
            "file_path": normalized_file_path,
            "source_revision": source_revision.strip(),
            "origin": origin,
        },
    )
    db.commit()
    db.refresh(fix)
    return fix


def generate_secure_fix(db, project: Project, scan: Scan, vulnerability: Vulnerability, *, actor_id: int | None = None) -> SecureFix:
    """Generate an untrusted proposal from the exact revision a scan inspected."""
    if vulnerability.scan_id != scan.id or scan.project_id != project.id:
        raise ValueError("Finding does not belong to the selected scan and project.")
    if scan.status != "completed" or not scan.repository_revision or not vulnerability.file_path:
        raise ValueError("AI fix generation requires a completed scan with a revision and finding path.")
    repository_url = validate_repository_url(project.repository_url)
    branch = validate_branch_name(scan.branch or "main")
    path = PurePosixPath(vulnerability.file_path)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise ValueError("The persisted finding path is not safe to retrieve.")
    temporary_root = Path(tempfile.mkdtemp(prefix="ai_sentinel_generate_fix_"))
    repository_path = temporary_root / "repository"
    try:
        environment = os.environ.copy()
        environment.update({"GIT_TERMINAL_PROMPT": "0", "GIT_ALLOW_PROTOCOL": "https:http"})
        subprocess.run(["git", "-c", "protocol.file.allow=never", "clone", "--depth", "1", "--no-tags", "--single-branch", "--branch", branch, "--", repository_url, str(repository_path)], check=True, capture_output=True, text=True, timeout=settings.GIT_CLONE_TIMEOUT_SECONDS, env=environment)
        checkout_revision = subprocess.run(["git", "-C", str(repository_path), "rev-parse", "HEAD"], check=True, capture_output=True, text=True, timeout=10, env=environment).stdout.strip()
        if checkout_revision != scan.repository_revision:
            raise ValueError("Repository HEAD no longer matches this scan. Run a new scan before generating a fix.")
        source_file = repository_path.joinpath(*path.parts)
        if source_file.is_symlink() or not source_file.is_file():
            raise ValueError("The finding source file is unavailable at the scanned revision.")
        if source_file.stat().st_size > settings.SCAN_MAX_FILE_SIZE_BYTES:
            raise ValueError("The finding source file is too large for safe AI fix generation.")
        source = source_file.read_text(encoding="utf-8", errors="replace")
        # Prefer the actual finding neighborhood over the beginning of a long
        # file so the model sees the evidence that the scan recorded.
        if vulnerability.line_number:
            lines = source.splitlines(keepends=True)
            start = max(0, vulnerability.line_number - 61)
            end = min(len(lines), vulnerability.line_number + 60)
            source = "".join(lines[start:end])
        patch = generate_secure_fix_patch(vulnerability.vulnerability_type, vulnerability.file_path, vulnerability.line_number, vulnerability.description, vulnerability.recommendation, source)
        patch_targets = {line[6:] for line in patch.splitlines() if line.startswith("+++ b/")}
        if patch_targets != {vulnerability.file_path} or "--- a/" not in patch:
            raise ValueError("AI returned an invalid multi-file or non-unified patch. No proposal was saved.")
        return create_secure_fix(db, project, scan, vulnerability, scan.repository_revision, vulnerability.file_path, patch, actor_id=actor_id, origin="ai")
    except subprocess.TimeoutExpired as exc:
        raise TimeoutError("AI fix generation timed out before a proposal was saved.") from exc
    except subprocess.CalledProcessError as exc:
        raise ValueError("The scanned repository revision could not be retrieved. No proposal was saved.") from exc
    finally:
        shutil.rmtree(temporary_root, ignore_errors=True)


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
            check=True, capture_output=True, text=True,
            timeout=settings.GIT_CLONE_TIMEOUT_SECONDS, env=environment,
        )
        checkout_revision = subprocess.run(
            ["git", "-C", str(repository_path), "rev-parse", "HEAD"],
            check=True, capture_output=True, text=True, timeout=10, env=environment,
        ).stdout.strip()
        if fix.source_revision != checkout_revision:
            raise ValueError("Patch revision does not match the checked-out repository revision.")
        patch_file = temporary_root / "proposal.patch"
        patch_file.write_text(fix.patch_text, encoding="utf-8")
        patch_targets = {line[6:] for line in fix.patch_text.splitlines() if line.startswith("+++ b/")}
        if patch_targets != {fix.file_path}:
            raise ValueError("Patch must target only the persisted finding file.")
        subprocess.run(
            ["git", "-C", str(repository_path), "apply", "--check", "--whitespace=error", str(patch_file)],
            check=True, capture_output=True, text=True, timeout=30, env=environment,
        )
        fix.status = "validated"
        fix.validation_status = "passed"
        fix.validation_message = "Patch structure and isolated git apply --check passed (exit code 0). Tests were not run; no repository was modified."
    except subprocess.TimeoutExpired as exc:
        fix.status = "proposed"
        fix.validation_status = "failed"
        fix.validation_message = "Patch validation timed out."
        raise TimeoutError(fix.validation_message) from exc
    except ValueError as exc:
        fix.status = "proposed"
        fix.validation_status = "failed"
        fix.validation_message = str(exc)[:2_000]
        raise
    except subprocess.CalledProcessError as exc:
        fix.status = "proposed"
        fix.validation_status = "failed"
        # Keep potentially sensitive clone/tool output in server logs, not a
        # response or audit record.
        fix.validation_message = "Patch does not apply cleanly in the isolated checkout."
        raise ValueError(fix.validation_message) from exc
    finally:
        shutil.rmtree(temporary_root, ignore_errors=True)
    return fix


def approve_secure_fix(db, fix: SecureFix, *, actor_id: int | None = None) -> SecureFix:
    if fix.status != "validated":
        raise ValueError("Only validated fixes can be approved.")
    fix.status = "approved"
    fix.approved_at = utc_now()
    fix.approved_by_id = actor_id
    record_audit_event(
        db,
        event_type="secure_fix.approved",
        resource_type="secure_fix",
        resource_id=fix.id,
        project_id=fix.project_id,
        actor_id=actor_id,
        metadata={"scan_id": fix.scan_id, "vulnerability_id": fix.vulnerability_id, "file_path": fix.file_path},
    )
    db.commit()
    db.refresh(fix)
    return fix


def reject_secure_fix(db, fix: SecureFix, reason: str, *, actor_id: int | None = None) -> SecureFix:
    if fix.status not in {"proposed", "validated"}:
        raise ValueError("Only proposed or validated fixes can be rejected.")
    fix.status = "rejected"
    fix.rejection_reason = reason
    fix.rejected_at = utc_now()
    fix.rejected_by_id = actor_id
    record_audit_event(db, event_type="secure_fix.rejected", resource_type="secure_fix", resource_id=fix.id, project_id=fix.project_id, actor_id=actor_id, metadata={"scan_id": fix.scan_id, "vulnerability_id": fix.vulnerability_id, "file_path": fix.file_path})
    db.commit()
    db.refresh(fix)
    return fix
