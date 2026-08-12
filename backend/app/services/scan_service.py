from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.scan import Scan
from app.models.vulnerability import Vulnerability


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

    db.add(scan)
    db.commit()
    db.refresh(scan)

    return scan


def save_scan_results(
    db: Session,
    scan: Scan,
    results: dict
):
    scan.files_scanned = results.get(
        "files_scanned",
        0
    )

    scan.vulnerabilities_found = results.get(
        "vulnerabilities_found",
        0
    )

    scan.risk_score = results.get(
        "risk_score",
        0.0
    )

    for item in results.get(
        "vulnerabilities",
        []
    ):

        vulnerability = Vulnerability(
            scan_id=scan.id,

            vulnerability_type=item["type"],

            file_path=item.get(
                "file"
            ),

            line_number=item.get(
                "line_number"
            ),

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

    db.commit()
    db.refresh(scan)

    return scan


def get_project_scans(
    db: Session,
    project_id: int
):
    return (
        db.query(Scan)
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
        .filter(
            Scan.id == scan_id
        )
        .first()
    )