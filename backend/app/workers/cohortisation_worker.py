"""Async background worker that processes cohortisation events.

Polls the cohortisation_events table for pending events, scores the affected
patients against all active programs in the tenant, and creates/updates
cohort assignments.
"""

from __future__ import annotations

import asyncio
import json as _json
import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import async_session
from app.events import event_bus
from app.models.cohort import (
    Cohort, CohortAssignment, CohortisationEvent, ScoringEngine,
)
from app.models.patient import Patient
from app.models.program import Program
from app.services.criteria_evaluator import evaluate_criteria_tree
from app.services.patient_data import build_patient_data
from app.services.scoring_engine_service import score_patient

logger = logging.getLogger(__name__)

POLL_INTERVAL = 5  # seconds
BATCH_SIZE = 50


async def _generate_batch_narratives(
    db: AsyncSession,
    scored_patients: list[dict],
) -> dict[str, str]:
    """Call LLM to generate risk narratives for a batch of scored patients.
    Returns {patient_id: narrative} map.
    """
    if not scored_patients:
        return {}

    try:
        from app.llm import get_provider, PROMPT_REGISTRY

        template = PROMPT_REGISTRY.get("batch_risk_narrative")
        if not template:
            return {}

        patients_json = _json.dumps([
            {
                "patient_id": str(p["patient_id"]),
                "name": p["patient_name"],
                "score": p["score"],
                "cohort": p["cohort_name"],
                "top_drivers": [
                    f"{k}: {v['raw']}/{100} (weighted {v['weighted']})"
                    for k, v in sorted(
                        (p.get("breakdown") or {}).items(),
                        key=lambda x: x[1].get("weighted", 0),
                        reverse=True,
                    )[:3]
                ],
                "labs": p.get("labs_summary", ""),
                "diagnoses": p.get("diagnoses_summary", ""),
            }
            for p in scored_patients
        ], indent=2)

        system_prompt, user_prompt = template.render(
            count=str(len(scored_patients)),
            patients_json=patients_json,
        )

        provider = get_provider()
        result = await provider.generate(
            user_prompt, system=system_prompt, max_tokens=2048, parse_json=True,
        )

        narratives = result if isinstance(result, list) else result.get("narratives", result) if isinstance(result, dict) else []
        if not isinstance(narratives, list):
            return {}

        narrative_map = {str(n["patient_id"]): n["narrative"] for n in narratives if "patient_id" in n and "narrative" in n}

        # Update assignments in DB
        for p in scored_patients:
            pid = str(p["patient_id"])
            narrative = narrative_map.get(pid)
            if narrative and p.get("assignment_id"):
                await db.execute(
                    update(CohortAssignment)
                    .where(CohortAssignment.id == p["assignment_id"])
                    .values(narrative=narrative)
                )

        await db.commit()
        return narrative_map
    except Exception:
        logger.warning("Batch narrative generation failed", exc_info=True)
        return {}


async def run(shutdown_event: asyncio.Event | None = None) -> None:
    """Main worker loop. Polls for pending events and processes them."""
    logger.info("Cohortisation worker started")
    while True:
        if shutdown_event and shutdown_event.is_set():
            break
        try:
            async with async_session() as db:
                processed = await _process_batch(db)
                if processed > 0:
                    logger.info(f"Processed {processed} cohortisation events")
        except Exception:
            logger.exception("Error in cohortisation worker")

        await asyncio.sleep(POLL_INTERVAL)


async def _process_batch(db: AsyncSession) -> int:
    """Process a batch of pending events."""
    # Fetch pending events
    result = await db.execute(
        select(CohortisationEvent)
        .where(CohortisationEvent.status == "pending")
        .order_by(CohortisationEvent.created_at)
        .limit(BATCH_SIZE)
    )
    events = list(result.scalars().all())
    if not events:
        return 0

    # Mark as processing
    event_ids = [e.id for e in events]
    await db.execute(
        update(CohortisationEvent)
        .where(CohortisationEvent.id.in_(event_ids))
        .values(status="processing")
    )
    await db.commit()

    # Group by tenant + patient for efficiency
    processed = 0
    failed = 0
    scored_for_narrative = []
    for event in events:
        try:
            result_data = await _process_event(db, event)
            event.status = "completed"
            event.processed_at = datetime.now(timezone.utc)
            processed += 1

            if result_data:
                await event_bus.publish(event.tenant_id, "cohortisation", {
                    "type": "item_processed",
                    "entity_id": str(event.patient_id),
                    "data": result_data,
                })
                scored_for_narrative.append({
                    "assignment_id": result_data.get("assignment_id"),
                    "patient_id": event.patient_id,
                    "patient_name": result_data.get("patient_name", ""),
                    "score": result_data.get("score"),
                    "cohort_name": result_data.get("cohort_name", ""),
                    "breakdown": result_data.get("score_breakdown"),
                    "labs_summary": result_data.get("labs_summary", ""),
                    "diagnoses_summary": result_data.get("diagnoses_summary", ""),
                })
        except Exception as exc:
            logger.exception(f"Failed to process event {event.id}")
            event.status = "failed"
            event.error = str(exc)
            failed += 1

            await event_bus.publish(event.tenant_id, "cohortisation", {
                "type": "item_failed",
                "entity_id": str(event.patient_id),
                "data": {"error": str(exc)},
            })

    await db.commit()

    # Generate narratives for scored patients
    narrative_map = await _generate_batch_narratives(db, scored_for_narrative)
    if narrative_map:
        tid = events[0].tenant_id
        for pid, narrative in narrative_map.items():
            await event_bus.publish(tid, "cohortisation", {
                "type": "narrative_ready",
                "entity_id": pid,
                "data": {"narrative": narrative},
            })

    # Check if batch is complete (no more pending events)
    remaining = await db.execute(
        select(CohortisationEvent)
        .where(CohortisationEvent.status == "pending")
        .limit(1)
    )
    if not remaining.scalar_one_or_none() and (processed + failed) > 0:
        tid = events[0].tenant_id
        await event_bus.publish(tid, "cohortisation", {
            "type": "batch_complete",
            "data": {"processed": processed, "failed": failed},
        })

    return processed + failed


async def _process_event(db: AsyncSession, event: CohortisationEvent) -> dict | None:
    """Process a single cohortisation event — score patient against all active programs."""
    # Load patient
    result = await db.execute(
        select(Patient)
        .where(Patient.id == event.patient_id, Patient.tenant_id == event.tenant_id)
        .options(selectinload(Patient.labs), selectinload(Patient.diagnoses))
    )
    patient = result.scalar_one_or_none()
    if not patient or not patient.is_active:
        return

    # Build patient data
    patient_data = build_patient_data(patient, list(patient.labs), list(patient.diagnoses))

    # Load active programs for tenant
    programs_result = await db.execute(
        select(Program)
        .where(Program.tenant_id == event.tenant_id, Program.status == "active")
        .options(
            selectinload(Program.cohorts).selectinload(Cohort.criteria),
            selectinload(Program.scoring_engine),
        )
    )
    programs = list(programs_result.scalars().all())

    last_result = None
    for program in programs:
        result = await _assign_patient_to_program(db, event.tenant_id, patient, patient_data, program)
        if result:
            last_result = result
    return last_result


async def _assign_patient_to_program(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient: Patient,
    patient_data,
    program: Program,
) -> dict | None:
    """Assign a patient to a cohort within a program."""
    cohorts = sorted(program.cohorts, key=lambda c: c.sort_order)
    if not cohorts:
        return None

    score_result: dict | None = None
    matched_cohort: Cohort | None = None
    assignment_type = "criteria"

    # If program has a scoring engine, use it
    if program.scoring_engine and program.scoring_engine.is_active:
        score_result = score_patient(patient_data, program.scoring_engine, cohorts)
        matched_cohort = next(
            (c for c in cohorts if c.id == score_result["cohort_id"]), None
        )
        assignment_type = "engine"

    # Otherwise, use criteria matching — find first cohort whose criteria match
    if matched_cohort is None:
        for cohort in cohorts:
            criteria = list(cohort.criteria) if cohort.criteria else []
            if evaluate_criteria_tree(criteria, patient_data):
                matched_cohort = cohort
                break

    if not matched_cohort:
        return None  # Patient doesn't match any cohort

    # Get current assignment for this patient+program
    current_result = await db.execute(
        select(CohortAssignment).where(
            CohortAssignment.patient_id == patient.id,
            CohortAssignment.program_id == program.id,
            CohortAssignment.is_current == True,
        )
    )
    current = current_result.scalar_one_or_none()

    # Skip if already assigned to the same cohort
    if current and current.cohort_id == matched_cohort.id:
        return None

    # Mark old as not current
    if current:
        current.is_current = False

    # Create new assignment
    now = datetime.now(timezone.utc)
    assignment = CohortAssignment(
        tenant_id=tenant_id,
        patient_id=patient.id,
        program_id=program.id,
        cohort_id=matched_cohort.id,
        score=score_result["score"] if score_result else None,
        score_breakdown=score_result["breakdown"] if score_result else None,
        assignment_type=assignment_type,
        reason=score_result.get("reason") if score_result else None,
        previous_cohort_id=current.cohort_id if current else None,
        is_current=True,
        assigned_at=now,
        review_due_at=now + timedelta(days=matched_cohort.review_cadence_days),
    )
    db.add(assignment)

    # Update cohort member counts
    matched_cohort.member_count = (matched_cohort.member_count or 0) + 1
    if current:
        old_cohort = next((c for c in program.cohorts if c.id == current.cohort_id), None)
        if old_cohort and old_cohort.member_count > 0:
            old_cohort.member_count -= 1

    await db.flush()

    return {
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "score": assignment.score,
        "cohort_id": str(matched_cohort.id),
        "cohort_name": matched_cohort.name,
        "cohort_color": matched_cohort.color or "#e2e8f0",
        "assignment_type": assignment_type,
        "program_id": str(program.id),
        "program_name": program.name,
        "assigned_at": assignment.assigned_at.isoformat(),
        "review_due_at": assignment.review_due_at.isoformat() if assignment.review_due_at else None,
        "assignment_id": str(assignment.id),
        "score_breakdown": score_result["breakdown"] if score_result else None,
        "labs_summary": ", ".join(f"{k}: {v}" for k, v in list(patient_data.latest_labs.items())[:5]),
        "diagnoses_summary": ", ".join(patient_data.active_diagnosis_codes[:5]),
    }
