from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from app.auth.jwt import create_access_token, create_refresh_token
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
    stmt = select(User).where(User.email == email, User.is_active == True)  # noqa: E712
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user and verify_password(password, user.password_hash):
        return user
    return None


def create_tokens(user: User) -> dict:
    return {
        "access_token": create_access_token(user.id, user.tenant_id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }
