from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database.database import get_db
from app.models.audit import AuditChain, AuditEvent
from app.models.project import Project
from app.schemas.audit import AuditEventListResponse, AuditEventResponse, AuditVerificationResponse
from app.services.audit_service import event_metadata, verify_audit_events


router = APIRouter(prefix="/audit", tags=["Audit History"])


def _visible_event_filter(db: Session, user_id: int, project_id: int | None):
    owned_project_ids = [item[0] for item in db.query(Project.id).filter(Project.owner_id == user_id).all()]
    if project_id is not None:
        if project_id not in owned_project_ids:
            raise HTTPException(status_code=404, detail="Project not found")
        return AuditEvent.project_id == project_id
    conditions = [AuditEvent.actor_id == user_id]
    if owned_project_ids:
        conditions.append(AuditEvent.project_id.in_(owned_project_ids))
    return or_(*conditions)


def _serialize(event: AuditEvent) -> AuditEventResponse:
    return AuditEventResponse(
        id=event.id, sequence=event.sequence, event_type=event.event_type, outcome=event.outcome,
        actor_id=event.actor_id, project_id=event.project_id, resource_type=event.resource_type,
        resource_id=event.resource_id, metadata=event_metadata(event), previous_hash=event.previous_hash,
        event_hash=event.event_hash, created_at=event.created_at,
    )


@router.get("", response_model=AuditEventListResponse)
def list_audit_events(
    project_id: int | None = Query(default=None, gt=0),
    event_type: str | None = Query(default=None, min_length=1, max_length=96),
    outcome: str | None = Query(default=None, pattern="^(success|failure|pending)$"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filters = [_visible_event_filter(db, current_user.id, project_id)]
    if event_type:
        filters.append(AuditEvent.event_type == event_type)
    if outcome:
        filters.append(AuditEvent.outcome == outcome)
    condition = and_(*filters)
    total = db.query(func.count(AuditEvent.id)).filter(condition).scalar() or 0
    events = db.query(AuditEvent).filter(condition).order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc()).offset(offset).limit(limit).all()
    return AuditEventListResponse(events=[_serialize(event) for event in events], total=total, limit=limit, offset=offset)


@router.get("/verify", response_model=AuditVerificationResponse)
def verify_audit_history(
    project_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    condition = _visible_event_filter(db, current_user.id, project_id)
    events = db.query(AuditEvent).filter(condition).order_by(AuditEvent.scope_key, AuditEvent.sequence).all()
    scopes = {event.scope_key for event in events}
    chains = db.query(AuditChain).filter(AuditChain.scope_key.in_(scopes)).all() if scopes else []
    return AuditVerificationResponse(**verify_audit_events(events, chains))
