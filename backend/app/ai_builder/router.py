"""AI Builder API — single generic endpoint for all builder surfaces.

Sessions are persisted to the ai_sessions DB table.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.models.ai_session import AISession
from app.ai_builder.service import BuilderService
from app.ai_builder.session import BuilderSession
from app.ai_builder.surfaces import COHORT_PROGRAM_SYSTEM_PROMPT, PATHWAY_SYSTEM_PROMPT

router = APIRouter()

SURFACE_PROMPTS: dict[str, str] = {
    "cohort_program": COHORT_PROGRAM_SYSTEM_PROMPT,
    "pathway": PATHWAY_SYSTEM_PROMPT,
}

_service = BuilderService()


# ---------------------------------------------------------------------------
# Request / Response
# ---------------------------------------------------------------------------

class BuilderTurnRequest(BaseModel):
    surface: str
    message: str
    reset: bool = False


class BuilderTurnResponse(BaseModel):
    message: str
    config: dict | None = None
    surface: str
    turn_count: int
    session_id: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_or_create_session(
    db: AsyncSession,
    auth: AuthContext,
    surface: str,
    reset: bool,
) -> tuple[AISession, BuilderSession]:
    """Load existing DB session or create a new one."""

    if not reset:
        # Try to find an existing session for this user + surface
        stmt = (
            select(AISession)
            .where(
                AISession.user_id == auth.user_id,
                AISession.tenant_id == auth.tenant_id,
                AISession.surface == surface,
            )
            .order_by(AISession.updated_at.desc())
            .limit(1)
        )
        db_session = (await db.execute(stmt)).scalar_one_or_none()

        if db_session:
            builder_session = BuilderSession.from_dict({
                "surface": surface,
                "system_prompt": SURFACE_PROMPTS.get(surface, ""),
                "messages": db_session.messages or [],
                "current_config": db_session.generated_config,
            })
            return db_session, builder_session

    # Create new
    db_session = AISession(
        tenant_id=auth.tenant_id,
        user_id=auth.user_id,
        surface=surface,
        title=f"AI Builder — {surface}",
        messages=[],
        generated_config=None,
    )
    db.add(db_session)
    await db.flush()

    builder_session = BuilderSession(
        surface=surface,
        system_prompt=SURFACE_PROMPTS.get(surface, ""),
    )
    return db_session, builder_session


async def _save_session(
    db: AsyncSession,
    db_session: AISession,
    builder_session: BuilderSession,
) -> None:
    """Persist builder session state to DB."""
    db_session.messages = [
        {"role": m.role, "content": m.content, "config": m.config}
        for m in builder_session.messages
    ]
    db_session.generated_config = builder_session.current_config
    await db.commit()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/turn", response_model=BuilderTurnResponse)
async def builder_turn(
    body: BuilderTurnRequest,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    """Execute one turn of the AI builder conversation."""
    surface = body.surface
    if surface not in SURFACE_PROMPTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown surface '{surface}'. Available: {list(SURFACE_PROMPTS.keys())}",
        )

    db_session, builder_session = await _get_or_create_session(db, auth, surface, body.reset)

    try:
        result = await _service.run_turn(builder_session, body.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI builder error: {str(e)}")

    await _save_session(db, db_session, builder_session)

    return BuilderTurnResponse(
        message=result["message"],
        config=result.get("config"),
        surface=surface,
        turn_count=len(builder_session.messages),
        session_id=str(db_session.id),
    )


@router.post("/reset")
async def builder_reset(
    surface: str,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    """Delete the active builder session for a surface."""
    stmt = select(AISession).where(
        AISession.user_id == auth.user_id,
        AISession.tenant_id == auth.tenant_id,
        AISession.surface == surface,
    )
    sessions = (await db.execute(stmt)).scalars().all()
    for s in sessions:
        await db.delete(s)
    await db.commit()
    return {"status": "reset", "surface": surface, "deleted": len(sessions)}
