from sqlalchemy.orm import Session

from app.models.project import Project
from app.services.audit_service import record_audit_event


def create_project(
    db: Session,
    name: str,
    description: str | None,
    repository_url: str | None,
    owner_id: int,
):
    project = Project(
        name=name,
        description=description,
        repository_url=repository_url,
        owner_id=owner_id,
    )
    try:
        db.add(project)
        db.flush()
        record_audit_event(
            db,
            event_type="project.created",
            resource_type="project",
            resource_id=project.id,
            project_id=project.id,
            actor_id=owner_id,
            metadata={"name": project.name, "has_repository": bool(repository_url)},
        )
        db.commit()
        db.refresh(project)
    except Exception:
        db.rollback()
        raise
    return project


def get_projects(db: Session, owner_id: int):
    return (
        db.query(Project)
        .filter(Project.owner_id == owner_id)
        .order_by(Project.created_at.desc())
        .all()
    )


def get_project(db: Session, project_id: int, owner_id: int):
    return (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_id == owner_id)
        .first()
    )
