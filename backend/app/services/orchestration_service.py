"""Orchestration service — builds the multi-step outreach sequence table view."""

from __future__ import annotations

import uuid

from sqlalchemy import case, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cohort import CohortAssignment
from app.models.communication import ConciergeAction, MessageTemplate
from app.models.patient import Patient
from app.models.pathway import PathwayBlock
from app.models.program import Program


async def get_orchestration_rows(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    *,
    page: int = 1,
    page_size: int = 25,
    program_id: uuid.UUID | None = None,
    cohort_id: uuid.UUID | None = None,
    channel: str | None = None,
    status: str | None = None,
) -> tuple[list[dict], int, dict]:
    """Return orchestration table rows with stats.

    Returns (items, total, stats_dict).
    """

    # Base query for actions
    q = (
        select(ConciergeAction)
        .where(ConciergeAction.tenant_id == tenant_id)
        .order_by(desc(ConciergeAction.created_at))
    )

    if channel:
        q = q.where(ConciergeAction.channel == channel)
    if status:
        q = q.where(ConciergeAction.status == status)

    # If filtering by program or cohort, we need patient IDs from cohort_assignments
    if program_id or cohort_id:
        assignment_q = select(CohortAssignment.patient_id).where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.is_current == True,  # noqa: E712
        )
        if program_id:
            assignment_q = assignment_q.where(CohortAssignment.program_id == program_id)
        if cohort_id:
            assignment_q = assignment_q.where(CohortAssignment.cohort_id == cohort_id)
        patient_ids_sq = assignment_q.subquery()
        q = q.where(ConciergeAction.patient_id.in_(select(patient_ids_sq.c.patient_id)))

    # Count total
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Stats across all filtered actions
    stats_q = (
        select(
            func.count().label("total_sequences"),
            func.sum(case((ConciergeAction.status == "pending", 1), else_=0)).label("active"),
            func.sum(case((ConciergeAction.status == "success", 1), else_=0)).label("completed"),
            func.sum(case((ConciergeAction.status == "failed", 1), else_=0)).label("failed"),
        )
        .where(ConciergeAction.tenant_id == tenant_id)
    )
    if channel:
        stats_q = stats_q.where(ConciergeAction.channel == channel)
    if status:
        stats_q = stats_q.where(ConciergeAction.status == status)
    stats_row = (await db.execute(stats_q)).one()
    stats = {
        "total_sequences": stats_row.total_sequences or 0,
        "active": stats_row.active or 0,
        "completed": stats_row.completed or 0,
        "failed": stats_row.failed or 0,
    }

    if total == 0:
        return [], 0, stats

    # Paginate
    paginated_q = q.offset((page - 1) * page_size).limit(page_size)
    actions = (await db.execute(paginated_q)).scalars().all()

    # Gather related IDs for batch lookup
    patient_ids = list({a.patient_id for a in actions})
    template_ids = [a.template_id for a in actions if a.template_id]
    block_ids = [a.pathway_block_id for a in actions if a.pathway_block_id]

    # Batch load patients
    patient_map: dict[uuid.UUID, Patient] = {}
    if patient_ids:
        pts = (await db.execute(select(Patient).where(Patient.id.in_(patient_ids)))).scalars().all()
        patient_map = {p.id: p for p in pts}

    # Batch load current cohort assignments for patients
    cohort_map: dict[uuid.UUID, tuple[str | None, str | None]] = {}  # patient_id -> (cohort_name, program_name)
    if patient_ids:
        ca_q = (
            select(CohortAssignment)
            .where(
                CohortAssignment.tenant_id == tenant_id,
                CohortAssignment.patient_id.in_(patient_ids),
                CohortAssignment.is_current == True,  # noqa: E712
            )
            .options(selectinload(CohortAssignment.cohort))
        )
        assignments = (await db.execute(ca_q)).scalars().all()
        for a in assignments:
            cohort_map[a.patient_id] = (
                a.cohort.name if a.cohort else None,
                None,  # program name filled below
            )

        # Fetch program names for those cohorts
        program_ids = list({a.program_id for a in assignments})
        if program_ids:
            progs = (await db.execute(select(Program).where(Program.id.in_(program_ids)))).scalars().all()
            prog_map = {p.id: p.name for p in progs}
            for a in assignments:
                cname = a.cohort.name if a.cohort else None
                pname = prog_map.get(a.program_id)
                cohort_map[a.patient_id] = (cname, pname)

    # Batch load templates
    template_map: dict[uuid.UUID, str] = {}
    if template_ids:
        tpls = (await db.execute(select(MessageTemplate).where(MessageTemplate.id.in_(template_ids)))).scalars().all()
        template_map = {t.id: t.name for t in tpls}

    # Batch load pathway blocks
    block_map: dict[uuid.UUID, str] = {}
    if block_ids:
        blks = (await db.execute(select(PathwayBlock).where(PathwayBlock.id.in_(block_ids)))).scalars().all()
        block_map = {b.id: b.label for b in blks}

    items = []
    for a in actions:
        patient = patient_map.get(a.patient_id)
        cohort_info = cohort_map.get(a.patient_id, (None, None))
        items.append({
            "action_id": str(a.id),
            "patient_id": str(a.patient_id),
            "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
            "cohort_name": cohort_info[0],
            "program_name": cohort_info[1],
            "pathway_block_label": block_map.get(a.pathway_block_id) if a.pathway_block_id else None,
            "channel": a.channel,
            "action_type": a.action_type,
            "status": a.status,
            "triggered_by": a.triggered_by,
            "template_name": template_map.get(a.template_id) if a.template_id else None,
            "created_at": a.created_at.isoformat(),
            "completed_at": a.completed_at.isoformat() if a.completed_at else None,
        })

    return items, total, stats
