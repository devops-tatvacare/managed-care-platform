"""Unified search endpoint — queries the search_index table."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.search import SearchResponse
from app.services.search_service import search

router = APIRouter()


@router.get("", response_model=SearchResponse)
async def unified_search(
    q: str = Query(..., min_length=2, max_length=200, description="Search query"),
    auth=Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    return await search(db, auth.tenant_id, q)
