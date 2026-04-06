import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.pathway import (
    BlockCreate,
    BlockUpdate,
    PathwayBlockSchema,
    PathwayCreate,
    PathwayDetail,
    PathwayEdgeSchema,
    PathwayListItem,
    PathwayListResponse,
    PathwayUpdate,
)
from app.services.pathway_service import (
    add_block,
    create_pathway,
    delete_block,
    get_pathway,
    list_pathways,
    publish_pathway,
    save_edges,
    update_block,
    update_pathway,
)

router = APIRouter()


def _serialize_block(b) -> dict:
    return {
        "id": str(b.id),
        "block_type": b.block_type,
        "category": b.category,
        "label": b.label,
        "config": b.config,
        "position": b.position,
        "order_index": b.order_index,
    }


def _serialize_edge(e) -> dict:
    return {
        "id": str(e.id),
        "source_block_id": str(e.source_block_id),
        "target_block_id": str(e.target_block_id),
        "edge_type": e.edge_type,
        "label": e.label,
    }


def _serialize_pathway_list(p) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "description": p.description,
        "condition": p.condition,
        "target_tiers": p.target_tiers or [],
        "status": p.status,
        "version": p.version,
        "block_count": len(p.blocks) if p.blocks else 0,
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
    }


@router.get("", response_model=PathwayListResponse)
async def pathways_list(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    pathways, total = await list_pathways(db, auth.tenant_id)
    return PathwayListResponse(
        items=[PathwayListItem(**_serialize_pathway_list(p)) for p in pathways],
        total=total,
    )


@router.post("", response_model=PathwayDetail, status_code=status.HTTP_201_CREATED)
async def pathway_create(
    body: PathwayCreate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    pathway = await create_pathway(db, auth.tenant_id, auth.user_id, body.model_dump())
    data = _serialize_pathway_list(pathway)
    data.update({
        "created_by": str(pathway.created_by),
        "published_at": pathway.published_at.isoformat() if pathway.published_at else None,
        "published_by": str(pathway.published_by) if pathway.published_by else None,
        "blocks": [],
        "edges": [],
    })
    return PathwayDetail(**data)


@router.get("/{pathway_id}", response_model=PathwayDetail)
async def pathway_detail(
    pathway_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    pathway = await get_pathway(db, auth.tenant_id, pathway_id)
    if not pathway:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pathway not found")
    data = _serialize_pathway_list(pathway)
    data.update({
        "created_by": str(pathway.created_by),
        "published_at": pathway.published_at.isoformat() if pathway.published_at else None,
        "published_by": str(pathway.published_by) if pathway.published_by else None,
        "blocks": [PathwayBlockSchema(**_serialize_block(b)) for b in pathway.blocks],
        "edges": [PathwayEdgeSchema(**_serialize_edge(e)) for e in pathway.edges],
    })
    return PathwayDetail(**data)


@router.patch("/{pathway_id}", response_model=PathwayDetail)
async def pathway_update(
    pathway_id: uuid.UUID,
    body: PathwayUpdate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    pathway = await update_pathway(
        db, auth.tenant_id, pathway_id, body.model_dump(exclude_unset=True)
    )
    if not pathway:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pathway not found")
    # Re-fetch with relationships
    pathway = await get_pathway(db, auth.tenant_id, pathway_id)
    data = _serialize_pathway_list(pathway)
    data.update({
        "created_by": str(pathway.created_by),
        "published_at": pathway.published_at.isoformat() if pathway.published_at else None,
        "published_by": str(pathway.published_by) if pathway.published_by else None,
        "blocks": [PathwayBlockSchema(**_serialize_block(b)) for b in pathway.blocks],
        "edges": [PathwayEdgeSchema(**_serialize_edge(e)) for e in pathway.edges],
    })
    return PathwayDetail(**data)


@router.post("/{pathway_id}/publish", response_model=PathwayDetail)
async def pathway_publish(
    pathway_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    pathway = await publish_pathway(db, auth.tenant_id, pathway_id, auth.user_id)
    if not pathway:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pathway not found")
    # Re-fetch with relationships
    pathway = await get_pathway(db, auth.tenant_id, pathway_id)
    data = _serialize_pathway_list(pathway)
    data.update({
        "created_by": str(pathway.created_by),
        "published_at": pathway.published_at.isoformat() if pathway.published_at else None,
        "published_by": str(pathway.published_by) if pathway.published_by else None,
        "blocks": [PathwayBlockSchema(**_serialize_block(b)) for b in pathway.blocks],
        "edges": [PathwayEdgeSchema(**_serialize_edge(e)) for e in pathway.edges],
    })
    return PathwayDetail(**data)


@router.post("/{pathway_id}/blocks", response_model=PathwayBlockSchema, status_code=status.HTTP_201_CREATED)
async def block_create(
    pathway_id: uuid.UUID,
    body: BlockCreate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    block = await add_block(db, auth.tenant_id, pathway_id, body.model_dump())
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pathway not found")
    return PathwayBlockSchema(**_serialize_block(block))


@router.patch("/{pathway_id}/blocks/{block_id}", response_model=PathwayBlockSchema)
async def block_update(
    pathway_id: uuid.UUID,
    block_id: uuid.UUID,
    body: BlockUpdate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    block = await update_block(
        db, auth.tenant_id, pathway_id, block_id, body.model_dump(exclude_unset=True)
    )
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
    return PathwayBlockSchema(**_serialize_block(block))


@router.delete("/{pathway_id}/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def block_delete(
    pathway_id: uuid.UUID,
    block_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_block(db, auth.tenant_id, pathway_id, block_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")


@router.put("/{pathway_id}/edges", response_model=list[PathwayEdgeSchema])
async def edges_save(
    pathway_id: uuid.UUID,
    body: list[PathwayEdgeSchema],
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    # Verify pathway belongs to tenant
    pathway = await get_pathway(db, auth.tenant_id, pathway_id)
    if not pathway:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pathway not found")
    edges = await save_edges(db, pathway_id, [e.model_dump() for e in body])
    return [PathwayEdgeSchema(**_serialize_edge(e)) for e in edges]
