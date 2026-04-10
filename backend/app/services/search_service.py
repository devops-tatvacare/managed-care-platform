"""Unified search across all entity types via the search_index table."""

from __future__ import annotations

import re
from collections import defaultdict

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.search_index import SearchIndex


# ── Query ────────────────────────────────────────────────────────────────────


async def search(
    db: AsyncSession,
    tenant_id,
    query: str,
    limit: int = 25,
    per_type_limit: int = 5,
) -> dict:
    """Search across all entity types. Returns grouped results with total count."""
    sanitized = _sanitize_query(query)
    if not sanitized:
        return {"results": {}, "query": query, "total": 0}

    # Primary: tsvector prefix match
    tsquery_str = " & ".join(f"{term}:*" for term in sanitized.split())
    tsquery = func.to_tsquery("simple", tsquery_str)

    rank = func.ts_rank(SearchIndex.search_vector, tsquery).label("rank")

    stmt = (
        select(SearchIndex, rank)
        .where(
            SearchIndex.tenant_id == tenant_id,
            SearchIndex.search_vector.op("@@")(tsquery),
        )
        .order_by(rank.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    grouped = defaultdict(list)
    seen_ids = set()
    for row, _rank in rows:
        if len(grouped[row.entity_type]) >= per_type_limit:
            continue
        grouped[row.entity_type].append(_row_to_dict(row))
        seen_ids.add(row.entity_id)

    total = sum(len(items) for items in grouped.values())

    # Fallback: pg_trgm similarity if primary returned few results
    if total < per_type_limit:
        trgm_stmt = (
            select(SearchIndex)
            .where(
                SearchIndex.tenant_id == tenant_id,
                func.similarity(SearchIndex.search_text, query) > 0.3,
                SearchIndex.entity_id.notin_(seen_ids) if seen_ids else True,
            )
            .order_by(func.similarity(SearchIndex.search_text, query).desc())
            .limit(limit - total)
        )
        trgm_result = await db.execute(trgm_stmt)
        for row in trgm_result.scalars():
            if len(grouped[row.entity_type]) >= per_type_limit:
                continue
            grouped[row.entity_type].append(_row_to_dict(row))

    total = sum(len(items) for items in grouped.values())
    return {"results": dict(grouped), "query": query, "total": total}


def _row_to_dict(row: SearchIndex) -> dict:
    return {
        "entity_id": str(row.entity_id),
        "entity_type": row.entity_type,
        "title": row.title,
        "subtitle": row.subtitle,
        "metadata": row.meta or {},  # Python attr is `meta`, not `metadata`
    }


def _sanitize_query(query: str) -> str:
    """Strip special tsquery characters, collapse whitespace."""
    cleaned = re.sub(r"[^\w\s]", "", query.strip())
    return " ".join(cleaned.split())


# ── Sync helpers ─────────────────────────────────────────────────────────────


async def upsert_entity(
    db: AsyncSession,
    *,
    tenant_id,
    entity_type: str,
    entity_id,
    title: str,
    subtitle: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Insert or update a single entity in the search index."""
    stmt = pg_insert(SearchIndex).values(
        tenant_id=tenant_id,
        entity_type=entity_type,
        entity_id=entity_id,
        title=title,
        subtitle=subtitle,
        meta=metadata or {},  # Python attr is `meta`
    )
    stmt = stmt.on_conflict_do_update(
        constraint="uq_search_entity",
        set_={
            "title": stmt.excluded.title,
            "subtitle": stmt.excluded.subtitle,
            "metadata": stmt.excluded.metadata,
            "updated_at": func.now(),
        },
    )
    await db.execute(stmt)


async def delete_entity(db: AsyncSession, entity_type: str, entity_id) -> None:
    """Remove an entity from the search index."""
    await db.execute(
        delete(SearchIndex).where(
            SearchIndex.entity_type == entity_type,
            SearchIndex.entity_id == entity_id,
        )
    )


# ── Bulk rebuild ─────────────────────────────────────────────────────────────


async def rebuild_index(db: AsyncSession, tenant_id=None) -> int:
    """Rebuild search index from source tables. Returns total rows inserted."""
    from app.models.action import PatientAction
    from app.models.cohort import Cohort
    from app.models.communication import MessageTemplate
    from app.models.pathway import Pathway
    from app.models.patient import Patient
    from app.models.program import Program

    # Clear existing entries
    del_stmt = delete(SearchIndex)
    if tenant_id:
        del_stmt = del_stmt.where(SearchIndex.tenant_id == tenant_id)
    await db.execute(del_stmt)

    count = 0

    # Patients
    tenant_filter = Patient.tenant_id == tenant_id if tenant_id else True
    patients = await db.execute(select(Patient).where(tenant_filter))
    for p in patients.scalars():
        await upsert_entity(
            db,
            tenant_id=p.tenant_id,
            entity_type="patient",
            entity_id=p.id,
            title=f"{p.first_name} {p.last_name}",
            subtitle=f"EMPI: {p.empi_id}",
            metadata={
                "risk_score": p.risk_score,
                "pathway_status": p.pathway_status,
                "is_active": p.is_active,
            },
        )
        count += 1

    # Pathways
    tenant_filter = Pathway.tenant_id == tenant_id if tenant_id else True
    pathways = await db.execute(select(Pathway).where(tenant_filter))
    for pw in pathways.scalars():
        await upsert_entity(
            db,
            tenant_id=pw.tenant_id,
            entity_type="pathway",
            entity_id=pw.id,
            title=pw.name,
            subtitle=pw.condition,
            metadata={"status": pw.status},
        )
        count += 1

    # Programs
    tenant_filter = Program.tenant_id == tenant_id if tenant_id else True
    programs = await db.execute(select(Program).where(tenant_filter))
    for pr in programs.scalars():
        await upsert_entity(
            db,
            tenant_id=pr.tenant_id,
            entity_type="program",
            entity_id=pr.id,
            title=pr.name,
            subtitle=pr.condition,
            metadata={"status": pr.status},
        )
        count += 1

    # Cohorts
    tenant_filter = Cohort.tenant_id == tenant_id if tenant_id else True
    cohorts = await db.execute(select(Cohort).where(tenant_filter))
    for c in cohorts.scalars():
        await upsert_entity(
            db,
            tenant_id=c.tenant_id,
            entity_type="cohort",
            entity_id=c.id,
            title=c.name,
            subtitle=c.description,
            metadata={
                "is_active": c.is_active,
                "program_id": str(c.program_id),
            },
        )
        count += 1

    # MessageTemplates
    tenant_filter = MessageTemplate.tenant_id == tenant_id if tenant_id else True
    templates = await db.execute(select(MessageTemplate).where(tenant_filter))
    for t in templates.scalars():
        await upsert_entity(
            db,
            tenant_id=t.tenant_id,
            entity_type="communication",
            entity_id=t.id,
            title=t.name,
            subtitle=f"{t.channel} · {t.category}",
            metadata={"language": t.language, "channel": t.channel},
        )
        count += 1

    # PatientActions
    tenant_filter = PatientAction.tenant_id == tenant_id if tenant_id else True
    actions = await db.execute(select(PatientAction).where(tenant_filter))
    for a in actions.scalars():
        await upsert_entity(
            db,
            tenant_id=a.tenant_id,
            entity_type="action",
            entity_id=a.id,
            title=a.title,
            subtitle=a.assigned_to,
            metadata={"priority": a.priority, "status": a.status},
        )
        count += 1

    await db.flush()
    return count
