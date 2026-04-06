import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Pathway(Base, TimestampMixin):
    __tablename__ = "pathways"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    condition: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_tiers: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    version: Mapped[int] = mapped_column(Integer, default=1)
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    published_by: Mapped[uuid.UUID | None] = mapped_column(nullable=True)

    blocks: Mapped[list["PathwayBlock"]] = relationship(
        "PathwayBlock", back_populates="pathway", cascade="all, delete-orphan"
    )
    edges: Mapped[list["PathwayEdge"]] = relationship(
        "PathwayEdge", back_populates="pathway", cascade="all, delete-orphan"
    )


class PathwayBlock(Base, TimestampMixin):
    __tablename__ = "pathway_blocks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pathway_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pathways.id", ondelete="CASCADE"), nullable=False, index=True
    )
    block_type: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    position: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    pathway: Mapped["Pathway"] = relationship("Pathway", back_populates="blocks")


class PathwayEdge(Base):
    __tablename__ = "pathway_edges"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    pathway_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pathways.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_block_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pathway_blocks.id", ondelete="CASCADE"), nullable=False
    )
    target_block_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pathway_blocks.id", ondelete="CASCADE"), nullable=False
    )
    edge_type: Mapped[str] = mapped_column(String(20), default="default")
    label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    pathway: Mapped["Pathway"] = relationship("Pathway", back_populates="edges")
