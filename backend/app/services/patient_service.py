import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cohort import Cohort, CohortAssignment
from app.models.program import Program
from app.models.patient import Patient, PatientDiagnosis, PatientLab


async def get_patient_filter_options(
    db: AsyncSession,
    tenant_id: uuid.UUID,
) -> dict:
    pathway_names = (await db.execute(
        select(Patient.pathway_name).where(
            Patient.tenant_id == tenant_id,
            Patient.is_active == True,  # noqa: E712
            Patient.pathway_name.is_not(None),
        ).distinct().order_by(Patient.pathway_name)
    )).scalars().all()

    pathway_statuses = (await db.execute(
        select(Patient.pathway_status).where(
            Patient.tenant_id == tenant_id,
            Patient.is_active == True,  # noqa: E712
            Patient.pathway_status.is_not(None),
        ).distinct().order_by(Patient.pathway_status)
    )).scalars().all()

    assigned_tos = (await db.execute(
        select(Patient.assigned_to).where(
            Patient.tenant_id == tenant_id,
            Patient.is_active == True,  # noqa: E712
            Patient.assigned_to.is_not(None),
        ).distinct().order_by(Patient.assigned_to)
    )).scalars().all()

    programs = (await db.execute(
        select(Program.id, Program.name).where(
            Program.tenant_id == tenant_id,
        ).order_by(Program.name)
    )).all()

    cohorts = (await db.execute(
        select(Cohort.id, Cohort.name, Cohort.program_id).where(
            Cohort.tenant_id == tenant_id,
            Cohort.is_active == True,  # noqa: E712
        ).order_by(Cohort.name)
    )).all()

    return {
        "pathway_names": list(pathway_names),
        "pathway_statuses": list(pathway_statuses),
        "assigned_tos": list(assigned_tos),
        "programs": [{"id": str(p.id), "name": p.name} for p in programs],
        "cohorts": [{"id": str(c.id), "name": c.name, "program_id": str(c.program_id)} for c in cohorts],
    }


async def list_patients(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    pathway_status: str | None = None,
    pathway_name: str | None = None,
    assigned_to: str | None = None,
    program_id: str | None = None,
    cohort_id: str | None = None,
) -> tuple[list[Patient], int]:
    stmt = select(Patient).where(
        Patient.tenant_id == tenant_id,
        Patient.is_active == True,  # noqa: E712
    )

    if program_id or cohort_id:
        stmt = stmt.where(
            Patient.id.in_(
                select(CohortAssignment.patient_id).where(
                    CohortAssignment.tenant_id == tenant_id,
                    CohortAssignment.is_current == True,  # noqa: E712
                    *([CohortAssignment.program_id == program_id] if program_id else []),
                    *([CohortAssignment.cohort_id == cohort_id] if cohort_id else []),
                )
            )
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

    if pathway_name:
        stmt = stmt.where(Patient.pathway_name == pathway_name)

    if assigned_to:
        stmt = stmt.where(Patient.assigned_to == assigned_to)

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
