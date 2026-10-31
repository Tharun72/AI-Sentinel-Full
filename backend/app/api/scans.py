from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_current_user
from app.database.database import get_db
from app.models.project import Project
from app.models.scan import Scan
from app.schemas.scan import ScanCreate, ScanProgressResponse, ScanResponse
from app.services.background_scan import run_scan_background
from app.services.report_service import build_report
from app.services.repository_validation import validate_repository_url
from app.services.scan_service import create_scan, get_project_scans, get_scan


router = APIRouter(prefix="/projects", tags=["Scans"])


def _owned_project(db: Session, project_id: int, user_id: int) -> Project | None:
    return db.query(Project).filter(Project.id == project_id, Project.owner_id == user_id).first()


@router.post("/{project_id}/scans", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
def start_scan(
    project_id: int,
    request: ScanCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = _owned_project(db, project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        validate_repository_url(project.repository_url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    scan = create_scan(db=db, project=project, branch=request.branch, actor_id=current_user.id)
    background_tasks.add_task(run_scan_background, scan.id)
    return scan


@router.get("/{project_id}/scans", response_model=list[ScanResponse])
def list_scans(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not _owned_project(db, project_id, current_user.id):
        raise HTTPException(status_code=404, detail="Project not found")
    return get_project_scans(db=db, project_id=project_id)


@router.get("/scans/{scan_id}", response_model=ScanResponse)
def get_single_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    scan = get_scan(db=db, scan_id=scan_id)
    if not scan or scan.project.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.get("/scans/{scan_id}/progress", response_model=ScanProgressResponse)
def get_scan_progress(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    scan = get_scan(db=db, scan_id=scan_id)
    if not scan or scan.project.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.get("/reports", tags=["Reports"])
def export_reports(
    report_format: str = Query("json", alias="format", pattern="^(json|csv|sarif)$"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    projects = db.query(Project).filter(Project.owner_id == current_user.id).order_by(Project.id).all()
    project_ids = [project.id for project in projects]
    scans = (
        db.query(Scan)
        .options(selectinload(Scan.vulnerabilities))
        .filter(Scan.project_id.in_(project_ids))
        .order_by(Scan.created_at.desc())
        .all()
        if project_ids
        else []
    )
    try:
        content, media_type, filename = build_report(projects, scans, report_format)
    except ValueError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
