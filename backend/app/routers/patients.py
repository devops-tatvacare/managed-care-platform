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
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.models.cohort import Cohort, CohortAssignment
from app.models.patient import Patient
from app.services.patient_service import (
    get_patient,
    get_patient_diagnoses,
    get_patient_filter_options,
    get_patient_labs,
    list_patients,
)
from app.services.score_engine import compute_patient_score

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
        "risk_score": p.risk_score,
    }


@router.get("/filter-options")
async def patient_filter_options(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    return await get_patient_filter_options(db, auth.tenant_id)


@router.get("", response_model=PatientListResponse)
async def patients_list(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str | None = None,
    pathway_status: str | None = None,
    pathway_name: str | None = None,
    assigned_to: str | None = None,
    program_id: str | None = None,
    cohort_id: str | None = None,
):
    patients, total = await list_patients(
        db, auth.tenant_id, page, page_size, search, pathway_status,
        pathway_name, assigned_to, program_id, cohort_id,
    )
    return PatientListResponse(
        items=[PatientListItem(**_serialize_patient_list(p)) for p in patients],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/bulk-import")
async def bulk_import(
    payload: list[dict],
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    """Bulk import patients with labs and diagnoses, then trigger cohortisation."""
    from datetime import date, datetime, timezone
    from app.models.patient import PatientLab, PatientDiagnosis
    from app.workers.event_emitter import emit_bulk_events
    from app.events import event_bus

    def _parse_date(v):
        if not v: return None
        if isinstance(v, date) and not isinstance(v, datetime): return v
        s = str(v)
        if "T" in s:
            return datetime.fromisoformat(s).date()
        return date.fromisoformat(s)

    def _parse_dt(v):
        if not v: return None
        if isinstance(v, datetime): return v
        dt = datetime.fromisoformat(v)
        if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
        return dt

    patient_ids = []
    for item in payload:
        pid = uuid.uuid4()
        patient_ids.append(pid)

        patient = Patient(
            id=pid,
            tenant_id=auth.tenant_id,
            empi_id=item.get("empi_id", f"EMPI-{uuid.uuid4().hex[:8]}"),
            first_name=item["first_name"],
            last_name=item["last_name"],
            date_of_birth=_parse_date(item.get("date_of_birth")),
            gender=item.get("gender", "U"),
            email=item.get("email"),
            phone=item.get("phone"),
            cpf=item.get("cpf"),
            address=item.get("address"),
            insurance_plan=item.get("insurance_plan"),
            pcp_name=item.get("pcp_name"),
            preferred_language=item.get("preferred_language", "pt"),
            preferred_channel=item.get("preferred_channel", "whatsapp"),
            allergies=item.get("allergies", []),
            active_medications=item.get("active_medications", []),
            sdoh_flags=item.get("sdoh_flags", {}),
            pathway_status=item.get("pathway_status"),
            pathway_name=item.get("pathway_name"),
            care_gaps=item.get("care_gaps", []),
        )
        db.add(patient)

        for lab in item.get("labs", []):
            db.add(PatientLab(
                id=uuid.uuid4(),
                tenant_id=auth.tenant_id,
                patient_id=pid,
                test_type=lab["test_type"],
                value=lab["value"],
                unit=lab.get("unit", ""),
                source_system=lab.get("source_system", "BulkImport"),
                recorded_at=_parse_dt(lab.get("recorded_at")),
            ))

        for dx in item.get("diagnoses", []):
            db.add(PatientDiagnosis(
                id=uuid.uuid4(),
                tenant_id=auth.tenant_id,
                patient_id=pid,
                icd10_code=dx["icd10_code"],
                description=dx.get("description", ""),
                diagnosed_at=_parse_date(dx.get("diagnosed_at")),
                is_active=dx.get("is_active", True),
            ))

    await db.flush()

    count = await emit_bulk_events(db, auth.tenant_id, patient_ids, "bulk_import")
    await db.commit()

    await event_bus.publish(auth.tenant_id, "cohortisation", {
        "type": "batch_started",
        "data": {"total": count, "scope": "import"},
    })

    return {"patients_created": len(patient_ids), "events_created": count}


@router.post("/{patient_id}/ai-summary")
async def ai_summary(
    patient_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    """Stream an AI clinical summary for a patient."""
    import json as _json
    from datetime import date as _date
    from starlette.responses import StreamingResponse
    from app.llm import get_provider, PROMPT_REGISTRY
    from app.models.patient import PatientLab, PatientDiagnosis
    from app.models.cohort import CohortAssignment
    from sqlalchemy.orm import selectinload

    # Load patient
    patient = await get_patient(db, auth.tenant_id, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Load current cohort assignment with cohort relation
    assignment_result = await db.execute(
        select(CohortAssignment)
        .where(
            CohortAssignment.patient_id == patient_id,
            CohortAssignment.is_current == True,
        )
        .options(selectinload(CohortAssignment.cohort))
        .order_by(CohortAssignment.assigned_at.desc())
        .limit(1)
    )
    assignment = assignment_result.scalar_one_or_none()

    # Load labs
    labs_result = await db.execute(
        select(PatientLab)
        .where(PatientLab.patient_id == patient_id)
        .order_by(PatientLab.recorded_at.desc())
        .limit(10)
    )
    labs = list(labs_result.scalars().all())

    # Load diagnoses
    diag_result = await db.execute(
        select(PatientDiagnosis)
        .where(PatientDiagnosis.patient_id == patient_id, PatientDiagnosis.is_active == True)
    )
    diagnoses = list(diag_result.scalars().all())

    # Build prompt context
    age = (_date.today() - patient.date_of_birth).days // 365 if patient.date_of_birth else "?"
    meds = patient.active_medications or []
    worst_pdc = min((m.get("pdc_90day", 1.0) for m in meds), default=1.0) if meds else 1.0
    cohort_name = assignment.cohort.name if assignment and assignment.cohort else "Unassigned"

    template = PROMPT_REGISTRY["patient_ai_summary"]
    system_prompt, user_prompt = template.render(
        patient_name=f"{patient.first_name} {patient.last_name}",
        age=str(age),
        gender=patient.gender or "Unknown",
        score=str(assignment.score) if assignment else "N/A",
        cohort_name=cohort_name,
        narrative=assignment.narrative or "No narrative available" if assignment else "No assignment",
        diagnoses=", ".join(f"{d.icd10_code} ({d.description})" for d in diagnoses) or "None",
        labs=", ".join(f"{l.test_type}: {l.value} {l.unit}" for l in labs[:5]) or "None",
        medications=", ".join(f"{m['name']} {m.get('dose', '')}" for m in meds) or "None",
        worst_pdc=f"{worst_pdc * 100:.0f}%" if meds else "N/A",
        sdoh_flags=", ".join(k for k, v in (patient.sdoh_flags or {}).items() if v) or "None",
        care_gaps=", ".join(patient.care_gaps or []) or "None",
    )

    async def event_stream():
        try:
            provider = get_provider()
            async for chunk in provider.generate_stream(
                user_prompt, system=system_prompt, max_tokens=2048,
            ):
                yield f"data: {_json.dumps({'text': chunk})}\n\n"
            yield f"data: {_json.dumps({'done': True})}\n\n"
        except Exception as exc:
            import logging
            logging.getLogger(__name__).exception("AI summary stream failed")
            yield f"data: {_json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/batch-compute-scores")
async def batch_compute_scores(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
    limit: int = Query(100, le=500),
):
    """Batch compute scores for all patients. Manual trigger for testing."""
    patients_q = await db.execute(
        select(Patient).where(Patient.tenant_id == auth.tenant_id, Patient.is_active == True).limit(limit)  # noqa: E712
    )
    patients = patients_q.scalars().all()

    computed = 0
    for p in patients:
        result = await compute_patient_score(db, auth.tenant_id, p.id, uuid.UUID(program_id))
        if result:
            computed += 1

    await db.commit()
    return {"computed": computed, "total_patients": len(patients)}


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


@router.post("/{patient_id}/compute-score")
async def patient_compute_score(
    patient_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(..., description="Program ID to score against"),
):
    """Compute and cache risk score for a single patient."""
    result = await compute_patient_score(db, auth.tenant_id, patient_id, uuid.UUID(program_id))
    if result is None:
        raise HTTPException(status_code=404, detail="No scoring engine found for this program")
    await db.commit()
    return result


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


@router.get("/{patient_id}/cohort-assignments")
async def patient_cohort_assignments(
    patient_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(CohortAssignment)
        .options(joinedload(CohortAssignment.cohort).joinedload(Cohort.program))
        .where(
            CohortAssignment.tenant_id == auth.tenant_id,
            CohortAssignment.patient_id == patient_id,
            CohortAssignment.is_current == True,  # noqa: E712
        )
        .order_by(CohortAssignment.assigned_at.desc())
    )
    result = await db.execute(stmt)
    assignments = result.scalars().unique().all()
    return [
        {
            "id": str(a.id),
            "patient_id": str(a.patient_id),
            "patient_name": None,
            "program_id": str(a.program_id),
            "program_name": a.cohort.program.name if a.cohort and a.cohort.program else None,
            "cohort_id": str(a.cohort_id),
            "cohort_name": a.cohort.name if a.cohort else None,
            "cohort_color": a.cohort.color if a.cohort else "#e2e8f0",
            "score": a.score,
            "score_breakdown": a.score_breakdown,
            "assignment_type": a.assignment_type,
            "reason": a.reason,
            "previous_cohort_id": str(a.previous_cohort_id) if a.previous_cohort_id else None,
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
            "review_due_at": a.review_due_at.isoformat() if a.review_due_at else None,
        }
        for a in assignments
    ]
