import math
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.patient import (
    PatientDetail,
    PatientDiagnosisRecord,
    PatientLabRecord,
    PatientListItem,
    PatientListResponse,
)
from app.services.patient_service import (
    get_patient,
    get_patient_diagnoses,
    get_patient_labs,
    list_patients,
)

router = APIRouter()


def _serialize_patient_list(p) -> dict:
    return {
        "id": str(p.id),
        "empi_id": p.empi_id,
        "first_name": p.first_name,
        "last_name": p.last_name,
        "date_of_birth": str(p.date_of_birth),
        "gender": p.gender,
        "phone": p.phone,
        "pathway_status": p.pathway_status,
        "pathway_name": p.pathway_name,
        "care_gaps": p.care_gaps,
        "last_contact_date": str(p.last_contact_date) if p.last_contact_date else None,
        "assigned_to": p.assigned_to,
        "pcp_name": p.pcp_name,
        "insurance_plan": p.insurance_plan,
        "active_medications": p.active_medications,
    }


@router.get("", response_model=PatientListResponse)
async def patients_list(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str | None = None,
    pathway_status: str | None = None,
):
    patients, total = await list_patients(
        db, auth.tenant_id, page, page_size, search, pathway_status
    )
    return PatientListResponse(
        items=[PatientListItem(**_serialize_patient_list(p)) for p in patients],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/{patient_id}", response_model=PatientDetail)
async def patient_detail(
    patient_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    patient = await get_patient(db, auth.tenant_id, patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    data = _serialize_patient_list(patient)
    data.update({
        "email": patient.email,
        "cpf": patient.cpf,
        "address": patient.address,
        "preferred_language": patient.preferred_language,
        "preferred_channel": patient.preferred_channel,
        "allergies": patient.allergies,
        "sdoh_flags": patient.sdoh_flags,
        "review_due_date": str(patient.review_due_date) if patient.review_due_date else None,
    })
    return PatientDetail(**data)


@router.get("/{patient_id}/labs", response_model=list[PatientLabRecord])
async def patient_labs(
    patient_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    labs = await get_patient_labs(db, auth.tenant_id, patient_id)
    return [
        PatientLabRecord(
            id=str(lab.id),
            test_type=lab.test_type,
            value=lab.value,
            unit=lab.unit,
            source_system=lab.source_system,
            recorded_at=lab.recorded_at.isoformat(),
        )
        for lab in labs
    ]


@router.get("/{patient_id}/diagnoses", response_model=list[PatientDiagnosisRecord])
async def patient_diagnoses(
    patient_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    diagnoses = await get_patient_diagnoses(db, auth.tenant_id, patient_id)
    return [
        PatientDiagnosisRecord(
            id=str(d.id),
            icd10_code=d.icd10_code,
            description=d.description,
            diagnosed_at=str(d.diagnosed_at) if d.diagnosed_at else None,
            is_active=d.is_active,
        )
        for d in diagnoses
    ]
