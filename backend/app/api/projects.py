from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database.database import get_db
from app.schemas.project import ProjectCreate, ProjectResponse
from app.services.project_service import (
    create_project,
    get_projects,
    get_project
)


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