import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.pathway import Pathway


class Cohort(Base, TimestampMixin):
    """A named population segment within a program."""
    __tablename__ = "cohorts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    program_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#e2e8f0")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    review_cadence_days: Mapped[int] = mapped_column(Integer, default=90)
    score_range_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_range_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    member_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    pathway_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pathways.id", ondelete="SET NULL"), nullable=True
    )

    program: Mapped["Program"] = relationship(back_populates="cohorts")
    pathway: Mapped["Pathway | None"] = relationship("Pathway", lazy="selectin")
    criteria: Mapped[list["CohortCriteria"]] = relationship(
        back_populates="cohort", cascade="all, delete-orphan",
        order_by="CohortCriteria.sort_order"
    )
    assignments: Mapped[list["CohortAssignment"]] = relationship(
        back_populates="cohort", cascade="all, delete-orphan",
        foreign_keys="CohortAssignment.cohort_id"
    )


class CohortCriteria(Base):
    """AND/OR criteria tree node. Groups have group_operator + children. Leaves have rule_type + config."""
    __tablename__ = "cohort_criteria"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cohort_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    parent_group_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("cohort_criteria.id", ondelete="CASCADE"), nullable=True
    )
    group_operator: Mapped[str | None] = mapped_column(String(3), nullable=True)
    rule_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    cohort: Mapped["Cohort"] = relationship(back_populates="criteria")
    children: Mapped[list["CohortCriteria"]] = relationship(
        back_populates="parent",
        cascade="all, delete-orphan",
        order_by="CohortCriteria.sort_order",
    )
    parent: Mapped["CohortCriteria | None"] = relationship(
        back_populates="children", remote_side="CohortCriteria.id"
    )


class ScoringEngine(Base, TimestampMixin):
    """Program-level scoring engine. One per program (optional)."""
    __tablename__ = "scoring_engines"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    program_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    components: Mapped[list] = mapped_column(JSON, nullable=False)
    tiebreaker_rules: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    aggregation_method: Mapped[str] = mapped_column(String(20), default="weighted_sum")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    program: Mapped["Program"] = relationship(back_populates="scoring_engine")


class CohortAssignment(Base):
    """Audit log of cohort assignments."""
    __tablename__ = "cohort_assignments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    program_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cohort_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    assignment_type: Mapped[str] = mapped_column(String(20), default="engine")
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
    previous_cohort_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("cohorts.id"), nullable=True
    )
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    review_due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    cohort: Mapped["Cohort"] = relationship(back_populates="assignments", foreign_keys=[cohort_id])
    patient: Mapped["Patient"] = relationship(lazy="raise")


class CohortisationEvent(Base):
    """Event queue for the cohortisation worker."""
    __tablename__ = "cohortisation_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    event_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
