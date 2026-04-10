"""Communication models — ConciergeAction (append-only log) and MessageTemplate."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ConciergeAction(Base):
    """Append-only action log for all outbound communications.

    Each state change creates a new row — never update existing rows.
    """
    __tablename__ = "concierge_actions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pathway_block_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pathway_blocks.id", ondelete="SET NULL"), nullable=True
    )
    triggered_by: Mapped[str] = mapped_column(
        String(10), nullable=False  # "auto" | "manual"
    )
    channel: Mapped[str] = mapped_column(
        String(20), nullable=False  # whatsapp | sms | call | app_push | system
    )
    action_type: Mapped[str] = mapped_column(
        String(30), nullable=False  # wa_dispatched, wa_delivered, wa_read, wa_replied, etc.
    )
    status: Mapped[str] = mapped_column(
        String(10), nullable=False, default="pending"  # pending | success | failed
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("message_templates.id", ondelete="SET NULL"), nullable=True
    )
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    patient: Mapped["Patient"] = relationship(lazy="raise")
    template: Mapped["MessageTemplate | None"] = relationship(lazy="raise")


class MessageTemplate(Base):
    """Reusable outbound message template with variable placeholders."""
    __tablename__ = "message_templates"
    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", "language", name="uq_template_tenant_slug_lang"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(
        String(30), nullable=False  # lab_reminder | medication | appointment | followup | custom
    )
    channel: Mapped[str] = mapped_column(
        String(20), nullable=False  # whatsapp | sms | call | app_push
    )
    language: Mapped[str] = mapped_column(String(5), nullable=False, default="pt")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    variable_map: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    cohort_applicability: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
