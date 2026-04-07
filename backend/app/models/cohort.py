import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CRSConfig(Base, TimestampMixin):
    """Tenant-configurable CRS formula: component weights, scoring tables, tier thresholds, tie-breakers."""
    __tablename__ = "crs_configs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    components: Mapped[list] = mapped_column(JSON, nullable=False)
    tier_thresholds: Mapped[list] = mapped_column(JSON, nullable=False)
    tiebreaker_rules: Mapped[list] = mapped_column(JSON, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class CohortAssignment(Base):
    """Audit log of every CRS calculation and tier assignment for a patient."""
    __tablename__ = "cohort_assignments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tier_number: Mapped[int] = mapped_column(Integer, nullable=False)
    crs_score: Mapped[int] = mapped_column(Integer, nullable=False)
    crs_breakdown: Mapped[dict] = mapped_column(JSON, nullable=False)
    assignment_type: Mapped[str] = mapped_column(String(20), default="auto")
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    previous_tier: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    review_due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    patient = relationship("Patient", lazy="raise")
