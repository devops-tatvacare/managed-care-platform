import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.pathway import (
    AISessionCreate,
    AISessionDetail,
    AISessionListItem,
    AISessionUpdate,
)
from app.services.ai_session_service import (
    create_session,
    delete_session,
    get_session,
    list_sessions,
    update_session,
)

router = APIRouter()


def _serialize_session_list(s) -> dict:
    return {
        "id": str(s.id),
        "title": s.title,
        "pathway_id": str(s.pathway_id) if s.pathway_id else None,
        "message_count": len(s.messages) if s.messages else 0,
        "created_at": s.created_at.isoformat(),
        "updated_at": s.updated_at.isoformat(),
    }


def _serialize_session_detail(s) -> dict:
    data = _serialize_session_list(s)
    data.update({
        "messages": s.messages or [],
        "generated_pathway": s.generated_pathway,
    })
    return data


@router.get("", response_model=list[AISessionListItem])
async def sessions_list(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    sessions = await list_sessions(db, auth.tenant_id, auth.user_id)
    return [AISessionListItem(**_serialize_session_list(s)) for s in sessions]


@router.post("", response_model=AISessionDetail, status_code=status.HTTP_201_CREATED)
async def session_create(
    body: AISessionCreate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    session = await create_session(db, auth.tenant_id, auth.user_id, body.model_dump())
    return AISessionDetail(**_serialize_session_detail(session))


@router.get("/{session_id}", response_model=AISessionDetail)
async def session_detail(
    session_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    session = await get_session(db, auth.tenant_id, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return AISessionDetail(**_serialize_session_detail(session))


@router.patch("/{session_id}", response_model=AISessionDetail)
async def session_update(
    session_id: uuid.UUID,
    body: AISessionUpdate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    session = await update_session(
        db, auth.tenant_id, session_id, body.model_dump(exclude_unset=True)
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return AISessionDetail(**_serialize_session_detail(session))


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def session_delete(
    session_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_session(db, auth.tenant_id, session_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
