import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.patient import Patient, PatientDiagnosis, PatientLab


async def list_patients(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    pathway_status: str | None = None,
) -> tuple[list[Patient], int]:
    stmt = select(Patient).where(
        Patient.tenant_id == tenant_id,
        Patient.is_active == True,  # noqa: E712
    )

    if search:
        search_term = f"%{search}%"
        stmt = stmt.where(
            or_(
                Patient.first_name.ilike(search_term),
                Patient.last_name.ilike(search_term),
                Patient.empi_id.ilike(search_term),
                Patient.phone.ilike(search_term),
            )
        )

    if pathway_status:
        stmt = stmt.where(Patient.pathway_status == pathway_status)

    # Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Paginate
    stmt = stmt.order_by(Patient.last_name).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    patients = list(result.scalars().all())

    return patients, total


async def get_patient(
    db: AsyncSession, tenant_id: uuid.UUID, patient_id: uuid.UUID
) -> Patient | None:
    stmt = select(Patient).where(
        Patient.id == patient_id,
        Patient.tenant_id == tenant_id,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_patient_labs(
    db: AsyncSession, tenant_id: uuid.UUID, patient_id: uuid.UUID
) -> list[PatientLab]:
    stmt = (
        select(PatientLab)
        .where(PatientLab.patient_id == patient_id, PatientLab.tenant_id == tenant_id)
        .order_by(PatientLab.recorded_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_patient_diagnoses(
    db: AsyncSession, tenant_id: uuid.UUID, patient_id: uuid.UUID
) -> list[PatientDiagnosis]:
    stmt = (
        select(PatientDiagnosis)
        .where(
            PatientDiagnosis.patient_id == patient_id,
            PatientDiagnosis.tenant_id == tenant_id,
            PatientDiagnosis.is_active == True,  # noqa: E712
        )
        .order_by(PatientDiagnosis.diagnosed_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
