import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    empi_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(10), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    cpf: Mapped[str | None] = mapped_column(String(14), nullable=True)
    address: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    insurance_plan: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pcp_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(10), default="pt", nullable=False)
    preferred_channel: Mapped[str] = mapped_column(String(30), default="whatsapp", nullable=False)
    allergies: Mapped[list | None] = mapped_column(JSON, nullable=True)
    active_medications: Mapped[list | None] = mapped_column(JSON, nullable=True)
    sdoh_flags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    tier: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    crs_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    crs_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    pathway_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pathway_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    care_gaps: Mapped[list | None] = mapped_column(JSON, nullable=True)
    last_contact_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(150), nullable=True)
    review_due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    labs: Mapped[list["PatientLab"]] = relationship(
        "PatientLab", back_populates="patient", cascade="all, delete-orphan"
    )
    diagnoses: Mapped[list["PatientDiagnosis"]] = relationship(
        "PatientDiagnosis", back_populates="patient", cascade="all, delete-orphan"
    )


class PatientLab(Base):
    __tablename__ = "patient_labs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    test_type: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    source_system: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="labs")


class PatientDiagnosis(Base):
    __tablename__ = "patient_diagnoses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    icd10_code: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    diagnosed_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="diagnoses")
