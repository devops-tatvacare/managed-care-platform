import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.pathway import Pathway, PathwayBlock, PathwayEdge


# ── Helpers ──────────────────────────────────────────────────────────────

async def _reload_pathway(db: AsyncSession, pathway_id: uuid.UUID) -> Pathway | None:
    """Re-query a pathway with all relationships eagerly loaded."""
    stmt = (
        select(Pathway)
        .where(Pathway.id == pathway_id)
        .options(selectinload(Pathway.blocks), selectinload(Pathway.edges))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# ── Pathway CRUD ─────────────────────────────────────────────────────────

async def list_pathways(
    db: AsyncSession,
    tenant_id: uuid.UUID,
) -> tuple[list[Pathway], int]:
    stmt = (
        select(Pathway)
        .where(Pathway.tenant_id == tenant_id)
        .options(selectinload(Pathway.blocks))
        .order_by(Pathway.updated_at.desc())
    )

    count_stmt = select(func.count()).select_from(
        select(Pathway).where(Pathway.tenant_id == tenant_id).subquery()
    )
    total = (await db.execute(count_stmt)).scalar_one()

    result = await db.execute(stmt)
    pathways = list(result.scalars().all())
    return pathways, total


async def get_pathway(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    pathway_id: uuid.UUID,
) -> Pathway | None:
    stmt = (
        select(Pathway)
        .where(Pathway.id == pathway_id, Pathway.tenant_id == tenant_id)
        .options(selectinload(Pathway.blocks), selectinload(Pathway.edges))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_pathway(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    data: dict,
) -> Pathway:
    pathway = Pathway(
        tenant_id=tenant_id,
        created_by=user_id,
        name=data["name"],
        description=data.get("description"),
        condition=data.get("condition"),
        target_tiers=data.get("target_tiers", []),
    )
    db.add(pathway)
    await db.commit()
    return await _reload_pathway(db, pathway.id)  # type: ignore[return-value]


async def update_pathway(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    pathway_id: uuid.UUID,
    data: dict,
) -> Pathway | None:
    stmt = select(Pathway).where(
        Pathway.id == pathway_id, Pathway.tenant_id == tenant_id
    )
    result = await db.execute(stmt)
    pathway = result.scalar_one_or_none()
    if not pathway:
        return None

    for key, value in data.items():
        if value is not None:
            setattr(pathway, key, value)

    await db.commit()
    return await _reload_pathway(db, pathway_id)


async def publish_pathway(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    pathway_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Pathway | None:
    stmt = select(Pathway).where(
        Pathway.id == pathway_id, Pathway.tenant_id == tenant_id
    )
    result = await db.execute(stmt)
    pathway = result.scalar_one_or_none()
    if not pathway:
        return None

    pathway.status = "published"
    pathway.published_at = datetime.now(timezone.utc)
    pathway.published_by = user_id

    await db.commit()
    return await _reload_pathway(db, pathway_id)


# ── Block CRUD ───────────────────────────────────────────────────────────

async def add_block(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    pathway_id: uuid.UUID,
    data: dict,
) -> PathwayBlock | None:
    stmt = select(Pathway).where(
        Pathway.id == pathway_id, Pathway.tenant_id == tenant_id
    )
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        return None

    block = PathwayBlock(
        tenant_id=tenant_id,
        pathway_id=pathway_id,
        block_type=data["block_type"],
        category=data["category"],
        label=data["label"],
        config=data.get("config", {}),
        position=data.get("position"),
        order_index=data.get("order_index", 0),
    )
    db.add(block)
    await db.commit()
    await db.refresh(block)
    return block


async def update_block(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    pathway_id: uuid.UUID,
    block_id: uuid.UUID,
    data: dict,
) -> PathwayBlock | None:
    stmt = select(PathwayBlock).where(
        PathwayBlock.id == block_id,
        PathwayBlock.pathway_id == pathway_id,
        PathwayBlock.tenant_id == tenant_id,
    )
    result = await db.execute(stmt)
    block = result.scalar_one_or_none()
    if not block:
        return None

    for key, value in data.items():
        if value is not None:
            setattr(block, key, value)

    await db.commit()
    await db.refresh(block)
    return block


async def delete_block(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    pathway_id: uuid.UUID,
    block_id: uuid.UUID,
) -> bool:
    stmt = select(PathwayBlock).where(
        PathwayBlock.id == block_id,
        PathwayBlock.pathway_id == pathway_id,
        PathwayBlock.tenant_id == tenant_id,
    )
    result = await db.execute(stmt)
    block = result.scalar_one_or_none()
    if not block:
        return False

    await db.execute(
        delete(PathwayEdge).where(
            PathwayEdge.pathway_id == pathway_id,
            (PathwayEdge.source_block_id == block_id)
            | (PathwayEdge.target_block_id == block_id),
        )
    )

    await db.delete(block)
    await db.commit()
    return True


# ── Edge Bulk Save ───────────────────────────────────────────────────────

async def save_edges(
    db: AsyncSession,
    pathway_id: uuid.UUID,
    edges_data: list[dict],
) -> list[PathwayEdge]:
    await db.execute(
        delete(PathwayEdge).where(PathwayEdge.pathway_id == pathway_id)
    )

    new_edges = []
    for edge in edges_data:
        new_edge = PathwayEdge(
            id=uuid.UUID(edge["id"]) if "id" in edge else uuid.uuid4(),
            pathway_id=pathway_id,
            source_block_id=uuid.UUID(edge["source_block_id"]),
            target_block_id=uuid.UUID(edge["target_block_id"]),
            edge_type=edge.get("edge_type", "default"),
            label=edge.get("label"),
        )
        db.add(new_edge)
        new_edges.append(new_edge)

    await db.commit()
    for edge in new_edges:
        await db.refresh(edge)
    return new_edges
