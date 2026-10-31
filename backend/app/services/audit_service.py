"""Audit-event creation and hash-chain verification."""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models.audit import AuditChain, AuditEvent


_SENSITIVE_METADATA_TOKENS = ("password", "secret", "token", "api_key", "apikey", "private_key", "authorization")
_VALID_OUTCOMES = {"success", "failure", "pending"}


def _scope_key(project_id: int | None, actor_id: int | None) -> str:
    if project_id is not None:
        return f"project:{project_id}"
    if actor_id is not None:
        return f"actor:{actor_id}"
    return "system"


def _timestamp(value: datetime) -> str:
    """Use a stable UTC representation even though legacy columns are naive."""

    return value.isoformat(timespec="microseconds") + "Z"


def _safe_metadata(value: Any, *, key: str = "") -> Any:
    normalized_key = key.lower().replace("-", "_")
    if any(token in normalized_key for token in _SENSITIVE_METADATA_TOKENS):
        return "[redacted]"
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return value[:512]
    if isinstance(value, (list, tuple)):
        return [_safe_metadata(item) for item in value[:50]]
    if isinstance(value, dict):
        return {
            str(item_key)[:128]: _safe_metadata(item_value, key=str(item_key))
            for item_key, item_value in sorted(value.items(), key=lambda item: str(item[0]))
        }
    return str(value)[:512]


def _canonical_payload(event: AuditEvent) -> dict[str, Any]:
    return {
        "version": 1,
        "scope": event.scope_key,
        "sequence": event.sequence,
        "event_type": event.event_type,
        "outcome": event.outcome,
        "actor_id": event.actor_id,
        "project_id": event.project_id,
        "resource_type": event.resource_type,
        "resource_id": event.resource_id,
        "metadata": json.loads(event.metadata_json),
        "created_at": _timestamp(event.created_at),
        "previous_hash": event.previous_hash,
    }


def _hash_event(event: AuditEvent) -> str:
    payload = json.dumps(
        _canonical_payload(event), sort_keys=True, separators=(",", ":"), ensure_ascii=True
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def record_audit_event(
    db: Session,
    *,
    event_type: str,
    resource_type: str,
    resource_id: int | str | None = None,
    project_id: int | None = None,
    actor_id: int | None = None,
    outcome: str = "success",
    metadata: dict[str, Any] | None = None,
) -> AuditEvent:
    """Add one event to a scope's serialized, hash-chained audit log.

    Callers commit this same session with the business mutation. Existing chain
    rows are locked with ``FOR UPDATE`` on databases that support row locks,
    preventing concurrent writers from choosing the same previous hash.
    """

    if not event_type or len(event_type) > 96:
        raise ValueError("Audit event type is required and must be at most 96 characters.")
    if not resource_type or len(resource_type) > 64:
        raise ValueError("Audit resource type is required and must be at most 64 characters.")
    if outcome not in _VALID_OUTCOMES:
        raise ValueError("Invalid audit outcome.")

    scope = _scope_key(project_id, actor_id)
    chain = (
        db.query(AuditChain)
        .filter(AuditChain.scope_key == scope)
        .with_for_update()
        .one_or_none()
    )
    if chain is None:
        chain = AuditChain(scope_key=scope, last_hash=None, next_sequence=1)
        db.add(chain)
        db.flush()

    event = AuditEvent(
        scope_key=scope,
        sequence=chain.next_sequence,
        event_type=event_type,
        outcome=outcome,
        actor_id=actor_id,
        project_id=project_id,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        metadata_json=json.dumps(_safe_metadata(metadata or {}), sort_keys=True, separators=(",", ":")),
        previous_hash=chain.last_hash,
        created_at=utc_now(),
        event_hash="",
    )
    event.event_hash = _hash_event(event)
    chain.last_hash = event.event_hash
    chain.next_sequence += 1
    db.add(event)
    db.flush()
    return event


def event_metadata(event: AuditEvent) -> dict[str, Any]:
    try:
        parsed = json.loads(event.metadata_json)
    except (TypeError, json.JSONDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def verify_audit_events(events: list[AuditEvent], chains: list[AuditChain]) -> dict[str, Any]:
    """Verify visible audit scopes against their current chain heads."""

    events_by_scope: dict[str, list[AuditEvent]] = defaultdict(list)
    for event in events:
        events_by_scope[event.scope_key].append(event)
    chain_by_scope = {chain.scope_key: chain for chain in chains}
    errors: list[str] = []
    verified_events = 0

    for scope, scoped_events in events_by_scope.items():
        previous_hash: str | None = None
        expected_sequence = 1
        for event in sorted(scoped_events, key=lambda item: item.sequence):
            if event.sequence != expected_sequence:
                errors.append(f"{scope}: expected sequence {expected_sequence}, found {event.sequence}.")
            if event.previous_hash != previous_hash:
                errors.append(f"{scope}: previous hash mismatch at sequence {event.sequence}.")
            if event.event_hash != _hash_event(event):
                errors.append(f"{scope}: event hash mismatch at sequence {event.sequence}.")
            previous_hash = event.event_hash
            expected_sequence += 1
            verified_events += 1
        chain = chain_by_scope.get(scope)
        if chain is None:
            errors.append(f"{scope}: missing chain head.")
        else:
            if chain.last_hash != previous_hash:
                errors.append(f"{scope}: chain-head hash mismatch.")
            if chain.next_sequence != expected_sequence:
                errors.append(f"{scope}: chain-head sequence mismatch.")

    return {"verified": not errors, "verified_events": verified_events, "scopes": len(events_by_scope), "errors": errors}
