"""Bounded, observable background worker for public repository scans."""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
import time
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from datetime import timedelta
from pathlib import Path

from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError

from app.ai.ollama_service import analyze_vulnerability, empty_analysis
from app.core.config import settings
from app.core.time import utc_now
from app.database.database import SessionLocal
from app.models.scan import Scan
from app.scanners.scanner import ScanDeadlineExceeded, ScanLimitExceeded, SecurityScanner
from app.services.repository_validation import validate_branch_name, validate_repository_url
from app.services.scan_service import persist_ai_analysis, persist_static_scan_results


logger = logging.getLogger(__name__)
TERMINAL_STATUSES = {"completed", "failed", "cancelled"}


class ScanInterrupted(RuntimeError):
    """The row was terminalized by another worker or recovery process."""


def _safe_error_message(error: Exception) -> str:
    if isinstance(error, subprocess.TimeoutExpired):
        return "Repository clone exceeded the configured time limit."
    if isinstance(error, ScanDeadlineExceeded):
        return "Scan exceeded the configured total time limit."
    if isinstance(error, ScanLimitExceeded):
        return str(error)
    if isinstance(error, subprocess.CalledProcessError):
        return "Unable to clone the repository or check out the requested branch."
    if isinstance(error, FileNotFoundError):
        return "The scan worker could not access a required local tool or workspace."
    if isinstance(error, ValueError):
        return str(error)
    return "Scan failed unexpectedly. Review the server logs for diagnostic details."


def _remaining_seconds(deadline: float) -> float:
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise ScanDeadlineExceeded("The scan exceeded its total time limit.")
    return remaining


def _repository_source_size(path: Path, deadline: float) -> int:
    """Measure checkout source files without counting Git object storage."""

    size = 0
    for directory, directory_names, file_names in os.walk(path):
        _remaining_seconds(deadline)
        directory_names[:] = [
            name for name in directory_names
            if name not in SecurityScanner.ignored_directories
        ]
        for file_name in file_names:
            try:
                size += (Path(directory) / file_name).stat().st_size
            except OSError:
                continue
            if size > settings.SCAN_MAX_REPOSITORY_SIZE_BYTES:
                raise ScanLimitExceeded(
                    "Repository source exceeds the configured size limit."
                )
    return size


def _update_progress(
    db,
    scan_id: int,
    *,
    stage: str,
    progress_percent: float,
    files_discovered: int | None = None,
    files_processed: int | None = None,
    current_file: str | None = None,
    ai_completed: int | None = None,
    ai_total: int | None = None,
    **values,
) -> bool:
    """Persist a real worker event and return false if work was interrupted."""

    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan or scan.status in TERMINAL_STATUSES:
        db.rollback()
        return False
    scan.stage = stage
    scan.progress_percent = min(100.0, max(0.0, progress_percent))
    if files_discovered is not None:
        scan.files_discovered = max(0, files_discovered)
    if files_processed is not None:
        # A processed-file count can never exceed discovered candidates.
        scan.files_processed = min(max(0, files_processed), scan.files_discovered or 0)
        scan.files_scanned = scan.files_processed
    scan.current_file = current_file
    if ai_total is not None:
        scan.ai_total = max(0, ai_total)
    if ai_completed is not None:
        scan.ai_completed = min(max(0, ai_completed), scan.ai_total or 0)
    for field, value in values.items():
        setattr(scan, field, value)
    db.commit()
    return True


def _mark_scan_failed(db, scan_id: int, error: Exception) -> None:
    """Best-effort terminal failure state, including safe user-facing context."""

    try:
        db.rollback()
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan and scan.status not in TERMINAL_STATUSES:
            scan.status = "failed"
            scan.stage = "failed"
            scan.current_file = None
            scan.error_message = _safe_error_message(error)
            scan.completed_at = utc_now()
            db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not mark scan %s as failed", scan_id)


def recover_stale_scans() -> int:
    """Terminalize abandoned jobs left by a stopped worker on application start."""

    db = SessionLocal()
    try:
        cutoff = utc_now() - timedelta(seconds=settings.STALE_SCAN_TIMEOUT_SECONDS)
        stale_scans = (
            db.query(Scan)
            .filter(Scan.status.in_(("pending", "running")))
            .filter(
                or_(
                    Scan.started_at < cutoff,
                    (Scan.started_at.is_(None) & (Scan.created_at < cutoff)),
                )
            )
            .all()
        )
        for scan in stale_scans:
            scan.status = "failed"
            scan.stage = "failed"
            scan.current_file = None
            scan.error_message = (
                "Worker interrupted or timed out; start a new scan to retry."
            )
            scan.completed_at = utc_now()
        if stale_scans:
            db.commit()
            logger.warning("Recovered %s stale scan(s)", len(stale_scans))
        return len(stale_scans)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not recover stale scans")
        return 0
    finally:
        db.close()


def normalize_legacy_terminal_scans() -> int:
    """Backfill display-only progress for scans completed by the older worker.

    The values are copied only from their already persisted terminal counters;
    they are not estimates of historical work.
    """

    db = SessionLocal()
    try:
        legacy_scans = (
            db.query(Scan)
            .filter(Scan.status.in_(("completed", "failed", "cancelled")))
            .filter(Scan.stage == "queued")
            .all()
        )
        for scan in legacy_scans:
            scan.stage = "completed" if scan.status == "completed" else scan.status
            if scan.status == "completed":
                scan.progress_percent = 100.0
                actual_files = scan.files_scanned or 0
                scan.files_discovered = actual_files
                scan.files_processed = actual_files
            scan.current_file = None
        if legacy_scans:
            db.commit()
            logger.info("Normalized %s legacy terminal scan(s)", len(legacy_scans))
        return len(legacy_scans)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not normalize legacy terminal scans")
        return 0
    finally:
        db.close()


def _analyze_item(item: dict) -> dict[str, str]:
    try:
        return analyze_vulnerability(
            vulnerability_type=item.get("type", "Unknown finding"),
            file_path=item.get("file", ""),
            line_number=item.get("line_number"),
            severity=item.get("severity"),
            cvss=item.get("cvss"),
            vulnerable_code=item.get("code"),
        )
    except Exception:
        # The model is an isolated optional capability.  This should be rare
        # because the Ollama client already turns network errors into blanks.
        logger.exception("Unexpected AI analysis failure for %s", item.get("type"))
        return empty_analysis()


def run_scan_background(scan_id: int) -> None:
    """Clone, statically persist, then optionally enrich one pending scan."""

    db = SessionLocal()
    temporary_root: str | None = None
    executor: ThreadPoolExecutor | None = None
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            logger.warning("Background scan %s no longer exists", scan_id)
            return
        if scan.status != "pending":
            logger.warning("Ignoring scan %s with status %s", scan_id, scan.status)
            return

        started_monotonic = time.monotonic()
        deadline = started_monotonic + settings.SCAN_TOTAL_TIMEOUT_SECONDS
        scan.status = "running"
        scan.started_at = utc_now()
        scan.stage = "validating_repository"
        scan.progress_percent = 0.0
        scan.error_message = None
        db.commit()

        repository_url = validate_repository_url(scan.repository_url)
        branch = validate_branch_name(scan.branch)
        if not _update_progress(db, scan_id, stage="cloning_repository", progress_percent=5.0):
            raise ScanInterrupted()

        temporary_root = tempfile.mkdtemp(prefix="ai_sentinel_scan_")
        repository_path = Path(temporary_root) / "repository"
        git_environment = os.environ.copy()
        git_environment.update({"GIT_TERMINAL_PROMPT": "0", "GIT_ALLOW_PROTOCOL": "https:http"})
        clone_command = [
            "git", "-c", "protocol.file.allow=never", "clone", "--depth", "1",
            "--no-tags", "--single-branch", "--branch", branch, "--", repository_url,
            str(repository_path),
        ]
        phase_started = time.monotonic()
        subprocess.run(
            clone_command,
            check=True,
            capture_output=True,
            text=True,
            timeout=min(settings.GIT_CLONE_TIMEOUT_SECONDS, _remaining_seconds(deadline)),
            env=git_environment,
        )
        revision_result = subprocess.run(
            ["git", "-C", str(repository_path), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
            timeout=min(10, _remaining_seconds(deadline)),
            env=git_environment,
        )
        revision = revision_result.stdout.strip() if isinstance(revision_result.stdout, str) else None
        scan.repository_revision = revision[:128] if revision else None
        db.commit()
        clone_duration = time.monotonic() - phase_started
        _repository_source_size(repository_path, deadline)
        if not _update_progress(
            db, scan_id, stage="file_discovery", progress_percent=25.0,
            clone_duration_seconds=clone_duration,
        ):
            raise ScanInterrupted()

        discovery_started = time.monotonic()
        static_started: float | None = None
        last_progress_at = 0.0

        def scanner_progress(discovered: int, processed: int, current_file: str | None) -> None:
            nonlocal static_started, last_progress_at
            now = time.monotonic()
            if static_started is None:
                static_started = now
                should_write = True
            else:
                should_write = (
                    processed >= discovered
                    or now - last_progress_at >= settings.SCAN_PROGRESS_UPDATE_INTERVAL_SECONDS
                )
            if not should_write:
                return
            progress = 35.0 if not discovered else 35.0 + 40.0 * (processed / discovered)
            if not _update_progress(
                db,
                scan_id,
                stage="static_analysis",
                progress_percent=progress,
                files_discovered=discovered,
                files_processed=processed,
                current_file=current_file,
                discovery_duration_seconds=(static_started - discovery_started),
            ):
                raise ScanInterrupted()
            last_progress_at = now

        results = SecurityScanner().scan(
            str(repository_path), progress_callback=scanner_progress, deadline=deadline
        )
        if static_started is None:
            static_started = time.monotonic()
            scanner_progress(0, 0, None)
        static_duration = time.monotonic() - static_started
        if not _update_progress(
            db, scan_id, stage="result_persistence", progress_percent=76.0,
            files_discovered=results["files_discovered"],
            files_processed=results["files_processed"],
            current_file=None,
            static_analysis_duration_seconds=static_duration,
        ):
            raise ScanInterrupted()

        phase_started = time.monotonic()
        scan = db.query(Scan).filter(Scan.id == scan_id).one()
        _, persisted_findings = persist_static_scan_results(db, scan, results)
        static_persistence_duration = time.monotonic() - phase_started

        ai_pairs = persisted_findings[: settings.AI_MAX_FINDINGS] if settings.AI_ENABLED else []
        ai_total = len(ai_pairs)
        note: str | None = None
        if settings.AI_ENABLED and len(persisted_findings) > ai_total:
            note = f"AI enrichment is limited to the first {settings.AI_MAX_FINDINGS} findings."
        if not _update_progress(
            db, scan_id, stage="ai_enrichment" if ai_total else "result_persistence",
            progress_percent=80.0 if ai_total else 95.0,
            ai_total=ai_total, ai_completed=0,
            persistence_duration_seconds=static_persistence_duration,
        ):
            raise ScanInterrupted()

        ai_started = time.monotonic()
        ai_completed = 0
        if ai_pairs:
            executor = ThreadPoolExecutor(
                max_workers=max(1, settings.AI_ENRICHMENT_CONCURRENCY),
                thread_name_prefix="ai-sentinel-ai",
            )
            futures: dict[Future, int] = {
                executor.submit(_analyze_item, item): vulnerability.id
                for vulnerability, item in ai_pairs
            }
            ai_deadline = min(
                deadline,
                ai_started + settings.AI_MAX_DURATION_SECONDS,
            )
            while futures:
                remaining = ai_deadline - time.monotonic()
                if remaining <= 0:
                    for future in futures:
                        future.cancel()
                    note = "Static scan completed; AI enrichment reached its time limit."
                    break
                completed, _ = wait(
                    futures, timeout=remaining, return_when=FIRST_COMPLETED
                )
                if not completed:
                    for future in futures:
                        future.cancel()
                    note = "Static scan completed; AI enrichment reached its time limit."
                    break
                for future in completed:
                    vulnerability_id = futures.pop(future)
                    try:
                        analysis = future.result()
                    except Exception:
                        logger.exception("AI worker failed for scan %s", scan_id)
                        analysis = empty_analysis()
                    persist_ai_analysis(db, vulnerability_id, analysis)
                    ai_completed += 1
                    progress = 80.0 + 15.0 * (ai_completed / ai_total)
                    if not _update_progress(
                        db, scan_id, stage="ai_enrichment", progress_percent=progress,
                        ai_completed=ai_completed, ai_total=ai_total,
                    ):
                        raise ScanInterrupted()
            executor.shutdown(wait=False, cancel_futures=True)
            executor = None

        ai_duration = time.monotonic() - ai_started
        final_persistence_started = time.monotonic()
        scan = db.query(Scan).filter(Scan.id == scan_id).one()
        if scan.status in TERMINAL_STATUSES:
            raise ScanInterrupted()
        scan.status = "completed"
        scan.stage = "completed"
        scan.progress_percent = 100.0
        scan.current_file = None
        scan.ai_completed = ai_completed
        scan.ai_total = ai_total
        scan.ai_duration_seconds = ai_duration
        scan.persistence_duration_seconds = static_persistence_duration + (
            time.monotonic() - final_persistence_started
        )
        scan.error_message = note
        scan.completed_at = utc_now()
        db.commit()
        logger.info("Scan %s completed", scan_id)

    except ScanInterrupted:
        logger.info("Scan %s stopped after it was terminalized elsewhere", scan_id)
    except Exception as exc:
        logger.exception("Background scan %s failed (%s)", scan_id, type(exc).__name__)
        _mark_scan_failed(db, scan_id, exc)
    finally:
        if executor is not None:
            executor.shutdown(wait=False, cancel_futures=True)
        if temporary_root:
            shutil.rmtree(temporary_root, ignore_errors=True)
        db.close()
