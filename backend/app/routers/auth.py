from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import authenticate, create_tokens

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate(db, data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return create_tokens(user)


@router.get("/me", response_model=UserResponse)
async def me(auth: AuthContext = Depends(get_auth)):
    return UserResponse(
        id=str(auth.user_id),
        email=auth.email,
        display_name=auth.email.split("@")[0].title(),
        role=auth.role_name,
        tenant_id=str(auth.tenant_id),
        tenant_name="Bradesco Saude",
    )
