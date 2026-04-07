import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class AISession(Base, TimestampMixin):
    __tablename__ = "ai_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    pathway_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pathways.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="New Chat")
    messages: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    generated_pathway: Mapped[dict | None] = mapped_column(JSON, nullable=True)
