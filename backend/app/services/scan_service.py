import logging
from collections import Counter

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models.project import Project
from app.models.scan import Scan
from app.models.vulnerability import Vulnerability
from app.services.audit_service import record_audit_event


logger = logging.getLogger(__name__)


def create_scan(db: Session, project: Project, branch: str, *, actor_id: int | None = None):
    scan = Scan(
        project_id=project.id,
        repository_url=project.repository_url,
        branch=branch,
        status="pending",
    )
    try:
        db.add(scan)
        db.flush()
        record_audit_event(
            db,
            event_type="scan.created",
            resource_type="scan",
            resource_id=scan.id,
            project_id=project.id,
            actor_id=actor_id,
            outcome="pending",
            metadata={"branch": branch},
        )
        db.commit()
        db.refresh(scan)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not create scan for project %s", project.id)
        raise
    return scan


def persist_static_scan_results(db: Session, scan: Scan, results: dict, *, commit: bool = True):
    """Persist deterministic findings before optional AI enrichment.

    Source snippets are returned only in memory to the worker and are never
    included in either vulnerability rows or audit metadata.
    """

    scan.files_discovered = results.get("files_discovered", results.get("files_scanned", 0))
    scan.files_processed = results.get("files_processed", results.get("files_scanned", 0))
    scan.files_scanned = results.get("files_scanned", scan.files_processed)
    scan.vulnerabilities_found = results.get("vulnerabilities_found", 0)
    scan.risk_score = results.get("risk_score", 0.0)

    persisted: list[tuple[Vulnerability, dict]] = []
    for item in results.get("vulnerabilities", []):
        vulnerability = Vulnerability(
            scan_id=scan.id,
            vulnerability_type=item.get("type", "Unknown finding"),
            file_path=item.get("file"),
            line_number=item.get("line_number"),
            count=item.get("count", 1),
            severity=item.get("severity"),
            cvss=item.get("cvss"),
            description=item.get("description"),
            evidence=item.get("evidence"),
            recommendation=item.get("recommendation"),
        )
        db.add(vulnerability)
        persisted.append((vulnerability, item))

    try:
        db.flush()
        severity_counts = Counter(
            str(item.get("severity") or "unknown").lower() for _, item in persisted
        )
        owner_id = scan.project.owner_id if scan.project is not None else None
        record_audit_event(
            db,
            event_type="scan.findings_recorded",
            resource_type="scan",
            resource_id=scan.id,
            project_id=scan.project_id,
            actor_id=owner_id,
            metadata={
                "findings": scan.vulnerabilities_found or 0,
                "severity_summary": dict(sorted(severity_counts.items())),
                "files_scanned": scan.files_scanned or 0,
                "risk_score": scan.risk_score or 0.0,
            },
        )
        if commit:
            db.commit()
            db.refresh(scan)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not persist static results for scan %s", scan.id)
        raise
    return scan, persisted


def save_scan_results(db: Session, scan: Scan, results: dict, *, commit: bool = True):
    """Backward-compatible name for static finding persistence."""

    persisted_scan, _ = persist_static_scan_results(db, scan, results, commit=commit)
    return persisted_scan


def persist_ai_analysis(db: Session, vulnerability_id: int, analysis: dict[str, str]) -> None:
    """Persist one AI attempt without overwriting deterministic finding fields."""

    try:
        vulnerability = db.query(Vulnerability).filter(Vulnerability.id == vulnerability_id).one()
        vulnerability.ai_explanation = analysis.get("explanation") or None
        vulnerability.ai_impact = analysis.get("impact") or None
        vulnerability.ai_attack_scenario = analysis.get("attack_scenario") or None
        vulnerability.ai_remediation = analysis.get("remediation") or None
        vulnerability.ai_secure_coding_advice = analysis.get("secure_coding_advice") or None
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not persist AI analysis for finding %s", vulnerability_id)
        raise


def get_project_scans(db: Session, project_id: int):
    return (
        db.query(Scan)
        .options(selectinload(Scan.vulnerabilities))
        .filter(Scan.project_id == project_id)
        .order_by(Scan.created_at.desc())
        .all()
    )


def get_scan(db: Session, scan_id: int):
    return (
        db.query(Scan)
        .options(selectinload(Scan.vulnerabilities))
        .filter(Scan.id == scan_id)
        .first()
    )
