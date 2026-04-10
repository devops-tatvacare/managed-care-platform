"""Action system models — templates and patient-level action instances."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ActionTemplate(Base, TimestampMixin):
    __tablename__ = "action_templates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    program_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("programs.id", ondelete="CASCADE"))

    name: Mapped[str] = mapped_column(default="")
    trigger_type: Mapped[str] = mapped_column(default="care_gap")
    trigger_config: Mapped[dict] = mapped_column(JSONB, default=dict)

    cohort_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    priority_base: Mapped[int] = mapped_column(default=50)
    score_weight: Mapped[float] = mapped_column(default=0.3)
    title_template: Mapped[str] = mapped_column(Text, default="")
    description_template: Mapped[str | None] = mapped_column(Text, nullable=True)

    resolution_options: Mapped[list] = mapped_column(JSONB, default=list)

    is_active: Mapped[bool] = mapped_column(default=True)


class PatientAction(Base, TimestampMixin):
    __tablename__ = "patient_actions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("action_templates.id", ondelete="CASCADE"))
    program_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("programs.id", ondelete="CASCADE"))
    cohort_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("cohorts.id", ondelete="SET NULL"), nullable=True)

    priority: Mapped[int] = mapped_column(default=50)
    title: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(default="open")
    assigned_to: Mapped[str | None] = mapped_column(nullable=True)

    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_type: Mapped[str | None] = mapped_column(nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    trigger_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    resolution_options: Mapped[list] = mapped_column(JSONB, default=list)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", lazy="selectin")
    template: Mapped["ActionTemplate"] = relationship("ActionTemplate", lazy="selectin")
