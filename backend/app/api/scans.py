from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database.database import get_db
from app.models.project import Project
from app.schemas.scan import ScanCreate, ScanResponse

from app.services.scan_service import (
    create_scan,
    get_project_scans,
    get_scan,
)

from app.services.background_scan import (
    run_scan_background,
)


router = APIRouter(
    prefix="/projects",
    tags=["Scans"],
)


# =========================================================
# START SCAN
# =========================================================

@router.post(
    "/{project_id}/scans",
    response_model=ScanResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_scan(
    project_id: int,
    request: ScanCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    # -----------------------------------------------------
    # 1. Find project owned by current user
    # -----------------------------------------------------

    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id,
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    # -----------------------------------------------------
    # 2. Create scan record
    # -----------------------------------------------------

    scan = create_scan(
        db=db,
        project=project,
        branch=request.branch,
    )

    # -----------------------------------------------------
    # 3. Start background scan
    # -----------------------------------------------------

    background_tasks.add_task(
        run_scan_background,
        scan.id,
        project.repository_url,
        request.branch,
    )

    # -----------------------------------------------------
    # 4. Return immediately
    # -----------------------------------------------------

    return scan


# =========================================================
# LIST PROJECT SCANS
# =========================================================

@router.get(
    "/{project_id}/scans",
    response_model=list[ScanResponse],
)
def list_scans(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id,
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    return get_project_scans(
        db=db,
        project_id=project_id,
    )


# =========================================================
# GET SINGLE SCAN
# =========================================================

@router.get(
    "/scans/{scan_id}",
    response_model=ScanResponse,
)
def get_single_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    scan = get_scan(
        db=db,
        scan_id=scan_id,
    )

    if not scan:
        raise HTTPException(
            status_code=404,
            detail="Scan not found",
        )

    if scan.project.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Scan not found",
        )

    return scan