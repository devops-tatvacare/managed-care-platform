"""SQLAlchemy event listeners that keep search_index in sync with source entities.

Call `register_search_sync()` once at app startup. After that, every flush
that touches a tracked model will upsert or delete the corresponding
search_index row inside the same transaction.
"""

from __future__ import annotations

from sqlalchemy import event, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.action import PatientAction
from app.models.cohort import Cohort
from app.models.communication import MessageTemplate
from app.models.pathway import Pathway
from app.models.patient import Patient
from app.models.program import Program
from app.models.search_index import SearchIndex


# ── Entity → search_index field mapping ──────────────────────────────────────

def _patient_fields(p: Patient) -> dict:
    return dict(
        tenant_id=p.tenant_id,
        entity_type="patient",
        entity_id=p.id,
        title=f"{p.first_name} {p.last_name}",
        subtitle=f"EMPI: {p.empi_id}",
        meta={
            "risk_score": p.risk_score,
            "pathway_status": p.pathway_status,
            "is_active": p.is_active,
        },
    )


def _pathway_fields(pw: Pathway) -> dict:
    return dict(
        tenant_id=pw.tenant_id,
        entity_type="pathway",
        entity_id=pw.id,
        title=pw.name,
        subtitle=pw.condition,
        meta={"status": pw.status},
    )


def _program_fields(pr: Program) -> dict:
    return dict(
        tenant_id=pr.tenant_id,
        entity_type="program",
        entity_id=pr.id,
        title=pr.name,
        subtitle=pr.condition,
        meta={"status": pr.status},
    )


def _cohort_fields(c: Cohort) -> dict:
    return dict(
        tenant_id=c.tenant_id,
        entity_type="cohort",
        entity_id=c.id,
        title=c.name,
        subtitle=c.description,
        meta={
            "is_active": c.is_active,
            "program_id": str(c.program_id),
        },
    )


def _template_fields(t: MessageTemplate) -> dict:
    return dict(
        tenant_id=t.tenant_id,
        entity_type="communication",
        entity_id=t.id,
        title=t.name,
        subtitle=f"{t.channel} · {t.category}",
        meta={"language": t.language, "channel": t.channel},
    )


def _action_fields(a: PatientAction) -> dict:
    return dict(
        tenant_id=a.tenant_id,
        entity_type="action",
        entity_id=a.id,
        title=a.title,
        subtitle=a.assigned_to,
        meta={"priority": a.priority, "status": a.status},
    )


_MODEL_MAP: dict[type, tuple[str, callable]] = {
    Patient: ("patient", _patient_fields),
    Pathway: ("pathway", _pathway_fields),
    Program: ("program", _program_fields),
    Cohort: ("cohort", _cohort_fields),
    MessageTemplate: ("communication", _template_fields),
    PatientAction: ("action", _action_fields),
}


# ── Listener ─────────────────────────────────────────────────────────────────

def _after_flush(session: Session, flush_context) -> None:
    """Sync new/dirty/deleted instances to search_index within the same transaction."""
    conn = session.connection()

    for instance in list(session.new) + list(session.dirty):
        model_cls = type(instance)
        if model_cls not in _MODEL_MAP:
            continue
        _entity_type, fields_fn = _MODEL_MAP[model_cls]
        fields = fields_fn(instance)

        stmt = pg_insert(SearchIndex).values(**fields)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_search_entity",
            set_={
                "title": stmt.excluded.title,
                "subtitle": stmt.excluded.subtitle,
                "metadata": stmt.excluded.metadata,
                "updated_at": func.now(),
            },
        )
        conn.execute(stmt)

    for instance in list(session.deleted):
        model_cls = type(instance)
        if model_cls not in _MODEL_MAP:
            continue
        entity_type, _ = _MODEL_MAP[model_cls]

        from sqlalchemy import delete as sa_delete
        conn.execute(
            sa_delete(SearchIndex).where(
                SearchIndex.entity_type == entity_type,
                SearchIndex.entity_id == instance.id,
            )
        )


def register_search_sync() -> None:
    """Register the after_flush listener. Call once at app startup."""
    event.listen(Session, "after_flush", _after_flush)
