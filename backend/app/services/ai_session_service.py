import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_session import AISession


async def list_sessions(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
) -> list[AISession]:
    stmt = (
        select(AISession)
        .where(AISession.tenant_id == tenant_id, AISession.user_id == user_id)
        .order_by(AISession.updated_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_session(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    session_id: uuid.UUID,
) -> AISession | None:
    stmt = select(AISession).where(
        AISession.id == session_id, AISession.tenant_id == tenant_id
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_session(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    data: dict,
) -> AISession:
    session = AISession(
        tenant_id=tenant_id,
        user_id=user_id,
        title=data.get("title", "New Chat"),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def update_session(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    session_id: uuid.UUID,
    data: dict,
) -> AISession | None:
    stmt = select(AISession).where(
        AISession.id == session_id, AISession.tenant_id == tenant_id
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        return None

    for key, value in data.items():
        if value is not None:
            setattr(session, key, value)

    await db.commit()
    await db.refresh(session)
    return session


async def delete_session(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    session_id: uuid.UUID,
) -> bool:
    stmt = select(AISession).where(
        AISession.id == session_id, AISession.tenant_id == tenant_id
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        return False

    await db.delete(session)
    await db.commit()
    return True
