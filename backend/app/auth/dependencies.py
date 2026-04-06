import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.jwt import decode_token
from app.database import get_db
from app.models.user import User

security = HTTPBearer()


async def get_auth(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> AuthContext:
    try:
        payload = decode_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id = uuid.UUID(payload["sub"])
    stmt = select(User).where(User.id == user_id, User.is_active == True)  # noqa: E712
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return AuthContext(
        user_id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        role_name=user.role.name,
        is_owner=user.role.is_system and user.role.name == "Owner",
        permissions=frozenset(user.role.permissions or []),
    )
