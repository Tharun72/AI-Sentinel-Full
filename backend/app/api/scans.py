import shutil
import subprocess
import tempfile
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database.database import get_db
from app.models.project import Project
from app.schemas.scan import ScanCreate, ScanResponse
from app.services.scan_service import (
    create_scan,
    save_scan_results,
    get_project_scans,
    get_scan,
)
from app.scanners.scanner import SecurityScanner


router = APIRouter(
    prefix="/projects",
    tags=["Scans"]
)


@router.post(
    "/{project_id}/scans",
    response_model=ScanResponse,
    status_code=status.HTTP_201_CREATED
)
def start_scan(
    project_id: int,
    request: ScanCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    # 1. Find project owned by current user
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    # 2. Create scan record
    scan = create_scan(
        db=db,
        project=project,
        branch=request.branch
    )

    # 3. Create temporary directory
    temp_dir = tempfile.mkdtemp(
        prefix="ai_sentinel_scan_"
    )

    try:

        # 4. Mark scan as running
        scan.status = "running"
        scan.started_at = datetime.utcnow()

        db.commit()
        db.refresh(scan)

        # 5. Clone repository
        clone_command = [
            "git",
            "clone",
            "--branch",
            request.branch.strip(),
            "--single-branch",
            project.repository_url.strip(),
            temp_dir,
        ]

        subprocess.run(
            clone_command,
            check=True,
            capture_output=True,
            text=True
        )

        # 6. Run security scanner
        scanner = SecurityScanner()

        results = scanner.scan(temp_dir)

        print("Scanner results:")
        print(results)

        # 7. Save scanner results
        scan = save_scan_results(
            db=db,
            scan=scan,
            results=results
        )

        # 8. Mark completed
        scan.status = "completed"
        scan.completed_at = datetime.utcnow()

        db.commit()
        db.refresh(scan)

        return scan

    except subprocess.CalledProcessError as e:
        scan.status = "failed"
        scan.completed_at = datetime.utcnow()
        db.commit()

        print("Git clone failed")
        print("Command:", e.cmd)
        print("Return code:", e.returncode)
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr)

        raise HTTPException(
            status_code=400,
            detail=f"Git clone failed: {e.stderr.strip() or 'Unknown Git error'}"
        )

    except Exception as e:

        scan.status = "failed"
        scan.completed_at = datetime.utcnow()

        db.commit()

        print(f"Scan failed: {e}")

        raise HTTPException(
            status_code=500,
            detail="Security scan failed"
        )

    finally:

        # 9. Delete temporary repository
        shutil.rmtree(
            temp_dir,
            ignore_errors=True
        )


@router.get(
    "/{project_id}/scans",
    response_model=list[ScanResponse]
)
def list_scans(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    return get_project_scans(
        db=db,
        project_id=project_id
    )


@router.get(
    "/scans/{scan_id}",
    response_model=ScanResponse
)
def get_single_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    scan = get_scan(
        db=db,
        scan_id=scan_id
    )

    if not scan:
        raise HTTPException(
            status_code=404,
            detail="Scan not found"
        )

    if scan.project.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Scan not found"
        )

    return scan