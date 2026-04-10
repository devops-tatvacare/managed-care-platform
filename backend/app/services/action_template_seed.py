"""Seed action templates for Diabetes Care + compute scores + generate actions."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.action import ActionTemplate, PatientAction
from app.models.program import Program
from app.models.patient import Patient
from app.services.seed_service import DEFAULT_TENANT_ID
from app.services.score_engine import compute_patient_score
from app.services.action_engine import generate_patient_actions, persist_actions


DIABETES_ACTION_TEMPLATES = [
    {
        "name": "Eye Exam Overdue",
        "trigger_type": "care_gap",
        "trigger_config": {"gap_type": "Eye exam"},
        "priority_base": 60,
        "score_weight": 0.3,
        "title_template": "Schedule dilated eye exam for {patient_name}",
        "description_template": "Eye exam is overdue — HEDIS compliance gap",
        "resolution_options": [
            {"label": "Send Reminder", "action_type": "send_outreach", "icon": "send", "channel": "whatsapp"},
            {"label": "View Patient", "action_type": "navigate", "icon": "user", "navigate_to": "patient_detail", "navigate_tab": "care-protocols"},
            {"label": "Dismiss", "action_type": "dismiss", "icon": "close", "requires_reason": True},
        ],
    },
    {
        "name": "Foot Exam Overdue",
        "trigger_type": "care_gap",
        "trigger_config": {"gap_type": "Foot exam"},
        "priority_base": 55,
        "score_weight": 0.25,
        "title_template": "Schedule foot exam for {patient_name}",
        "description_template": "Annual foot exam overdue — neuropathy screening gap",
        "resolution_options": [
            {"label": "Send Reminder", "action_type": "send_outreach", "icon": "send", "channel": "whatsapp"},
            {"label": "View Patient", "action_type": "navigate", "icon": "user", "navigate_to": "patient_detail", "navigate_tab": "care-protocols"},
            {"label": "Dismiss", "action_type": "dismiss", "icon": "close", "requires_reason": True},
        ],
    },
    {
        "name": "Dental Referral Overdue",
        "trigger_type": "care_gap",
        "trigger_config": {"gap_type": "Dental referral"},
        "priority_base": 40,
        "score_weight": 0.2,
        "title_template": "Schedule dental referral for {patient_name}",
        "description_template": "Annual dental check overdue — periodontal disease risk",
        "resolution_options": [
            {"label": "Send Reminder", "action_type": "send_outreach", "icon": "send", "channel": "whatsapp"},
            {"label": "Dismiss", "action_type": "dismiss", "icon": "close", "requires_reason": True},
        ],
    },
    {
        "name": "HbA1c Lab Overdue",
        "trigger_type": "care_gap",
        "trigger_config": {"gap_type": "HbA1c"},
        "priority_base": 70,
        "score_weight": 0.35,
        "title_template": "Order HbA1c lab for {patient_name}",
        "description_template": "HbA1c monitoring overdue — critical for glycaemic control tracking",
        "resolution_options": [
            {"label": "Send Lab Reminder", "action_type": "send_outreach", "icon": "lab", "channel": "whatsapp"},
            {"label": "View Patient", "action_type": "navigate", "icon": "user", "navigate_to": "patient_detail", "navigate_tab": "clinical-data"},
            {"label": "Dismiss", "action_type": "dismiss", "icon": "close", "requires_reason": True},
        ],
    },
    {
        "name": "uACR Screening Overdue",
        "trigger_type": "care_gap",
        "trigger_config": {"gap_type": "uACR"},
        "priority_base": 65,
        "score_weight": 0.3,
        "title_template": "Order uACR screening for {patient_name}",
        "description_template": "Urine albumin-creatinine ratio screening overdue — nephropathy detection",
        "resolution_options": [
            {"label": "Send Reminder", "action_type": "send_outreach", "icon": "send", "channel": "whatsapp"},
            {"label": "Dismiss", "action_type": "dismiss", "icon": "close", "requires_reason": True},
        ],
    },
    {
        "name": "High Risk Score Alert",
        "trigger_type": "score_threshold",
        "trigger_config": {"threshold": 70},
        "priority_base": 80,
        "score_weight": 0.4,
        "title_template": "High risk alert for {patient_name}",
        "description_template": "Risk score exceeds 70 — review for tier escalation",
        "resolution_options": [
            {"label": "Review Patient", "action_type": "navigate", "icon": "user", "navigate_to": "patient_detail", "navigate_tab": "cohort"},
            {"label": "Send Outreach", "action_type": "send_outreach", "icon": "send", "channel": "whatsapp"},
            {"label": "Dismiss", "action_type": "dismiss", "icon": "close", "requires_reason": True},
        ],
    },
]


async def seed_action_templates(db: AsyncSession) -> None:
    """Seed action templates, compute scores, generate actions."""
    # Check if already seeded
    existing = (await db.execute(
        select(ActionTemplate).where(ActionTemplate.tenant_id == DEFAULT_TENANT_ID).limit(1)
    )).scalar_one_or_none()
    if existing:
        return

    # Find Diabetes Care program
    program = (await db.execute(
        select(Program).where(Program.tenant_id == DEFAULT_TENANT_ID, Program.name == "Diabetes Care")
    )).scalar_one_or_none()
    if not program:
        return

    # Seed templates
    for tmpl_data in DIABETES_ACTION_TEMPLATES:
        db.add(ActionTemplate(tenant_id=DEFAULT_TENANT_ID, program_id=program.id, **tmpl_data))
    await db.flush()

    # Compute scores for all patients
    patients = (await db.execute(
        select(Patient).where(Patient.tenant_id == DEFAULT_TENANT_ID, Patient.is_active == True).limit(200)  # noqa: E712
    )).scalars().all()

    for patient in patients:
        await compute_patient_score(db, DEFAULT_TENANT_ID, patient.id, program.id)

    # Generate actions for all patients
    for patient in patients:
        action_dicts = await generate_patient_actions(db, DEFAULT_TENANT_ID, patient.id, program.id)
        if action_dicts:
            await persist_actions(db, action_dicts)

    await db.commit()
