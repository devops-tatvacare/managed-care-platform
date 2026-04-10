"""Pydantic schemas for the unified search endpoint."""

from __future__ import annotations

import uuid

from pydantic import BaseModel


class SearchResultItem(BaseModel):
    entity_id: uuid.UUID
    entity_type: str
    title: str
    subtitle: str | None = None
    metadata: dict = {}


class SearchResponse(BaseModel):
    results: dict[str, list[SearchResultItem]]
    query: str
    total: int
