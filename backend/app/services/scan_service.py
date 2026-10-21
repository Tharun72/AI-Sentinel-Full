import logging

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models.project import Project
from app.models.scan import Scan
from app.models.vulnerability import Vulnerability

logger = logging.getLogger(__name__)


def create_scan(
    db: Session,
    project: Project,
    branch: str
):
    scan = Scan(
        project_id=project.id,
        repository_url=project.repository_url,
        branch=branch,
        status="pending",
    )

    try:
        db.add(scan)
        db.commit()
        db.refresh(scan)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not create scan for project %s", project.id)
        raise

    return scan


def persist_static_scan_results(
    db: Session,
    scan: Scan,
    results: dict,
    *,
    commit: bool = True,
):
    """Commit deterministic findings before any optional AI work begins.

    ``source_item`` is returned only to the background worker so it can pass
    limited code context to Ollama.  Source context is never persisted.
    """
    scan.files_discovered = results.get("files_discovered", results.get("files_scanned", 0))
    scan.files_processed = results.get("files_processed", results.get("files_scanned", 0))
    scan.files_scanned = results.get(
        "files_scanned",
        scan.files_processed,
    )

    scan.vulnerabilities_found = results.get(
        "vulnerabilities_found",
        0
    )

    scan.risk_score = results.get(
        "risk_score",
        0.0
    )

    persisted: list[tuple[Vulnerability, dict]] = []
    for item in results.get("vulnerabilities", []):
        vulnerability = Vulnerability(
            scan_id=scan.id,

            vulnerability_type=item.get("type", "Unknown finding"),

            file_path=item.get(
                "file"
            ),

            line_number=item.get("line_number"),

            count=item.get(
                "count",
                1
            ),

            severity=item.get(
                "severity"
            ),

            cvss=item.get(
                "cvss"
            ),

            description=item.get(
                "description"
            ),

            recommendation=item.get(
                "recommendation"
            ),

        )
        db.add(vulnerability)
        persisted.append((vulnerability, item))

    try:
        db.flush()
        if commit:
            db.commit()
            db.refresh(scan)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not persist static results for scan %s", scan.id)
        raise
    return scan, persisted


def save_scan_results(db: Session, scan: Scan, results: dict, *, commit: bool = True):
    """Backward-compatible name for persistence of static scan results only."""

    persisted_scan, _ = persist_static_scan_results(db, scan, results, commit=commit)
    return persisted_scan


def persist_ai_analysis(
    db: Session,
    vulnerability_id: int,
    analysis: dict[str, str],
) -> None:
    """Persist one completed AI attempt without touching static finding data."""

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


def get_project_scans(
    db: Session,
    project_id: int
):
    return (
        db.query(Scan)
        .options(selectinload(Scan.vulnerabilities))
        .filter(
            Scan.project_id == project_id
        )
        .order_by(
            Scan.created_at.desc()
        )
        .all()
    )


def get_scan(
    db: Session,
    scan_id: int
):
    return (
        db.query(Scan)
        .options(selectinload(Scan.vulnerabilities))
        .filter(
            Scan.id == scan_id
        )
        .first()
    )
