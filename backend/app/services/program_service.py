"""Program CRUD + versioning service."""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.program import Program, ProgramVersion
from app.models.cohort import Cohort, ScoringEngine


async def list_programs(db: AsyncSession, tenant_id: uuid.UUID) -> list[Program]:
    result = await db.execute(
        select(Program)
        .where(Program.tenant_id == tenant_id)
        .options(
            selectinload(Program.cohorts),
            selectinload(Program.scoring_engine),
        )
        .order_by(Program.created_at.desc())
    )
    return list(result.scalars().all())


async def get_program(db: AsyncSession, tenant_id: uuid.UUID, program_id: uuid.UUID) -> Program | None:
    result = await db.execute(
        select(Program)
        .where(Program.id == program_id, Program.tenant_id == tenant_id)
        .options(
            selectinload(Program.cohorts).selectinload(Cohort.criteria),
            selectinload(Program.scoring_engine),
            selectinload(Program.versions),
        )
    )
    return result.scalar_one_or_none()


async def create_program(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    created_by: uuid.UUID,
    data: dict,
) -> Program:
    program = Program(
        tenant_id=tenant_id,
        created_by=created_by,
        name=data["name"],
        slug=data.get("slug") or data["name"].lower().replace(" ", "-"),
        condition=data.get("condition"),
        description=data.get("description"),
        status=data.get("status", "draft"),
    )
    db.add(program)
    await db.commit()
    return await get_program(db, tenant_id, program.id)


async def update_program(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    data: dict,
) -> Program | None:
    program = await get_program(db, tenant_id, program_id)
    if not program:
        return None
    for key in ("name", "slug", "condition", "description", "status"):
        if key in data:
            setattr(program, key, data[key])
    await db.commit()
    await db.refresh(program)
    return program


async def publish_program(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ProgramVersion | None:
    program = await get_program(db, tenant_id, program_id)
    if not program:
        return None

    program.version += 1
    program.status = "active"
    program.published_at = datetime.now(timezone.utc)
    program.published_by = user_id

    # Build snapshot
    snapshot = {
        "name": program.name,
        "condition": program.condition,
        "description": program.description,
        "cohorts": [
            {
                "id": str(c.id),
                "name": c.name,
                "slug": c.slug,
                "color": c.color,
                "sort_order": c.sort_order,
                "score_range_min": c.score_range_min,
                "score_range_max": c.score_range_max,
                "review_cadence_days": c.review_cadence_days,
            }
            for c in program.cohorts
        ],
        "scoring_engine": None,
    }
    if program.scoring_engine:
        snapshot["scoring_engine"] = {
            "components": program.scoring_engine.components,
            "tiebreaker_rules": program.scoring_engine.tiebreaker_rules,
            "aggregation_method": program.scoring_engine.aggregation_method,
        }

    version = ProgramVersion(
        program_id=program.id,
        version=program.version,
        snapshot=snapshot,
        published_by=user_id,
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return version
