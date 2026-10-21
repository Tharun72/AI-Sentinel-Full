from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database.database import get_db
from app.schemas.project import ProjectCreate, ProjectResponse
from app.schemas.secure_fix import SecureFixCreate, SecureFixResponse
from app.services.project_service import (
    create_project,
    get_projects,
    get_project
)
from app.services.repository_source import retrieve_repository_source
from app.models.scan import Scan
from app.models.vulnerability import Vulnerability
from app.models.secure_fix import SecureFix
from app.services.secure_fix_service import create_secure_fix, validate_secure_fix, approve_secure_fix


router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED
)
def create_new_project(
    request: ProjectCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    project = create_project(
        db=db,
        name=request.name,
        description=request.description,
        repository_url=request.repository_url,
        owner_id=current_user.id
    )

    return project


@router.post(
    "/{project_id}/fixes",
    response_model=SecureFixResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Secure Fixes"],
)
def propose_fix(
    project_id: int,
    request: SecureFixCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = get_project(db=db, project_id=project_id, owner_id=current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    vulnerability = db.query(Vulnerability).filter(Vulnerability.id == request.vulnerability_id).first()
    if not vulnerability:
        raise HTTPException(status_code=404, detail="Finding not found")
    scan = db.query(Scan).filter(Scan.id == vulnerability.scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    try:
        return create_secure_fix(db, project, scan, vulnerability, request.source_revision, request.file_path, request.patch_text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/{project_id}/fixes", response_model=list[SecureFixResponse], tags=["Secure Fixes"])
def list_fixes(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = get_project(db=db, project_id=project_id, owner_id=current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(SecureFix).filter(SecureFix.project_id == project_id).order_by(SecureFix.created_at.desc()).all()


@router.post("/{project_id}/fixes/{fix_id}/validate", response_model=SecureFixResponse, tags=["Secure Fixes"])
def validate_fix(
    project_id: int,
    fix_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = get_project(db=db, project_id=project_id, owner_id=current_user.id)
    fix = db.query(SecureFix).filter(SecureFix.id == fix_id, SecureFix.project_id == project_id).first() if project else None
    if not fix:
        raise HTTPException(status_code=404, detail="Fix not found")
    try:
        fix = validate_secure_fix(fix)
        db.commit()
        db.refresh(fix)
        return fix
    except TimeoutError as exc:
        db.commit()
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except ValueError as exc:
        db.commit()
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/{project_id}/fixes/{fix_id}/approve", response_model=SecureFixResponse, tags=["Secure Fixes"])
def approve_fix(
    project_id: int,
    fix_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = get_project(db=db, project_id=project_id, owner_id=current_user.id)
    fix = db.query(SecureFix).filter(SecureFix.id == fix_id, SecureFix.project_id == project_id).first() if project else None
    if not fix:
        raise HTTPException(status_code=404, detail="Fix not found")
    try:
        return approve_secure_fix(db, fix)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get(
    "/{project_id}/source",
    tags=["Repository Source"],
)
def get_project_source(
    project_id: int,
    path: str = Query(..., min_length=1, max_length=1024),
    branch: str = Query("main", min_length=1, max_length=255),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = get_project(db=db, project_id=project_id, owner_id=current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        return retrieve_repository_source(project.repository_url, branch, path)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc


@router.get(
    "",
    response_model=list[ProjectResponse]
)
def list_projects(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_projects(
        db=db,
        owner_id=current_user.id
    )


@router.get(
    "/{project_id}",
    response_model=ProjectResponse
)
def get_single_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    project = get_project(
        db=db,
        project_id=project_id,
        owner_id=current_user.id
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    return project