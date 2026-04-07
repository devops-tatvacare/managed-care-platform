"""Seed data for the Diabetes Care program — 5 cohorts + scoring engine."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cohort import Cohort, ScoringEngine
from app.models.program import Program, ProgramVersion
from app.services.seed_service import DEFAULT_TENANT_ID, DEFAULT_USER_ID

PROGRAM_ID = uuid.UUID("50000000-0000-0000-0000-000000000001")
ENGINE_ID = uuid.UUID("60000000-0000-0000-0000-000000000001")

COHORT_DEFS = [
    {"sort": 0, "name": "Cohort 0 — Pre-diabetes Prevention", "slug": "prevention", "color": "#22c55e", "min": 0, "max": 15, "cadence": 180},
    {"sort": 1, "name": "Cohort 1 — Early Intervention", "slug": "early-intervention", "color": "#3b82f6", "min": 16, "max": 30, "cadence": 120},
    {"sort": 2, "name": "Cohort 2 — Active Management", "slug": "active-management", "color": "#f59e0b", "min": 31, "max": 50, "cadence": 90},
    {"sort": 3, "name": "Cohort 3 — Complex Care", "slug": "complex-care", "color": "#f97316", "min": 51, "max": 70, "cadence": 60},
    {"sort": 4, "name": "Cohort 4 — Intensive Support", "slug": "intensive-support", "color": "#ef4444", "min": 71, "max": 100, "cadence": 30},
]

COMPONENTS = [
    {
        "name": "Glycaemic Control",
        "data_source": "lab_range",
        "weight": 0.35,
        "cap": 100,
        "field": "hba1c",
        "proxy_field": "fpg",
        "proxy_map": [
            {"min": 126, "max": None, "mapped_value": 7.0},
            {"min": 100, "max": 126, "mapped_value": 5.8},
            {"min": None, "max": 100, "mapped_value": 5.0},
        ],
        "scoring_table": [
            {"criterion": "HbA1c < 5.7%", "min": None, "max": 5.7, "points": 0},
            {"criterion": "HbA1c 5.7-6.4%", "min": 5.7, "max": 6.5, "points": 20},
            {"criterion": "HbA1c 6.5-7.9%", "min": 6.5, "max": 8.0, "points": 40},
            {"criterion": "HbA1c 8.0-9.9%", "min": 8.0, "max": 10.0, "points": 70},
            {"criterion": "HbA1c >= 10.0%", "min": 10.0, "max": None, "points": 90},
        ],
        "bonus_table": [
            {"criterion": "TIR < 50% (CGM)", "field": "tir", "max": 50, "points": 10},
            {"criterion": "CV > 36%", "field": "cv", "min": 36, "points": 5},
            {"criterion": "TBR > 4%", "field": "tbr", "min": 4, "points": 8},
        ],
    },
    {
        "name": "Complication Burden",
        "data_source": "diagnosis_match",
        "weight": 0.25,
        "cap": 100,
        "scoring_table": [
            {"criterion": "No complications", "type": "default", "points": 0},
            {"criterion": "Microalbuminuria (uACR 30-300)", "type": "lab", "field": "uacr", "min": 30, "max": 300, "points": 25},
            {"criterion": "Macroalbuminuria (uACR > 300)", "type": "lab", "field": "uacr", "min": 300, "max": None, "points": 50},
            {"criterion": "CKD G3a (eGFR 45-59)", "type": "lab", "field": "egfr", "min": 45, "max": 59, "points": 35},
            {"criterion": "CKD G3b (eGFR 30-44)", "type": "lab", "field": "egfr", "min": 30, "max": 44, "points": 55},
            {"criterion": "CKD G4 (eGFR 15-29)", "type": "lab", "field": "egfr", "min": 15, "max": 29, "points": 75},
            {"criterion": "Non-proliferative retinopathy", "type": "diagnosis", "icd10_prefix": ["E11.31"], "points": 20},
            {"criterion": "Proliferative retinopathy", "type": "diagnosis", "icd10_prefix": ["E11.35"], "points": 45},
            {"criterion": "Peripheral neuropathy", "type": "diagnosis", "icd10_prefix": ["E11.4"], "points": 20},
            {"criterion": "Established CVD - MI/stroke/PAD", "type": "diagnosis", "icd10_prefix": ["I25", "I63", "I73.9"], "points": 40},
            {"criterion": "Heart failure", "type": "diagnosis", "icd10_prefix": ["I50"], "points": 40},
            {"criterion": "DM-related amputation", "type": "diagnosis", "icd10_prefix": ["Z89.4", "Z89.5", "Z89.6"], "points": 60},
        ],
    },
    {
        "name": "Behavioural/Adherence",
        "data_source": "pharmacy_adherence",
        "weight": 0.20,
        "cap": 100,
        "scoring_table": [
            {"criterion": "PDC >= 80%", "type": "pdc", "min": 80, "max": None, "points": 0},
            {"criterion": "PDC 70-79%", "type": "pdc", "min": 70, "max": 80, "points": 20},
            {"criterion": "PDC 60-69%", "type": "pdc", "min": 60, "max": 70, "points": 40},
            {"criterion": "PDC < 60%", "type": "pdc", "min": None, "max": 60, "points": 70},
        ],
        "bonus_table": [
            {"criterion": "DDS mean >= 3.0", "field": "dds_mean", "min": 3.0, "points": 20},
            {"criterion": "PHQ-9 >= 10", "field": "phq9", "min": 10, "points": 20},
            {"criterion": "SED-9 < 6", "field": "sed9", "max": 6, "points": 10},
            {"criterion": "No app engagement 60+ days", "field": "app_inactive_days", "min": 60, "points": 15},
        ],
    },
    {
        "name": "Utilisation",
        "data_source": "utilisation",
        "weight": 0.15,
        "cap": 100,
        "scoring_table": [
            {"criterion": "0 ER, 0 hosp", "er_visits": 0, "hospitalisations": 0, "dka": False, "points": 0},
            {"criterion": "1 DM-related ER visit", "er_visits": 1, "hospitalisations": 0, "dka": False, "points": 30},
            {"criterion": "2+ DM-related ER visits", "er_visits": 2, "hospitalisations": 0, "dka": False, "points": 60},
            {"criterion": "1 DM-related hospitalisation", "er_visits": None, "hospitalisations": 1, "dka": False, "points": 50},
            {"criterion": "DKA hospitalisation (any)", "er_visits": None, "hospitalisations": None, "dka": True, "points": 85},
            {"criterion": "2+ hospitalisations (any cause)", "er_visits": None, "hospitalisations": 2, "dka": False, "points": 80},
        ],
    },
    {
        "name": "SDOH Burden",
        "data_source": "sdoh",
        "weight": 0.05,
        "cap": 100,
        "scoring_table": [
            {"criterion": "0 high-risk domains", "domain_count": 0, "points": 0},
            {"criterion": "1 domain", "domain_count": 1, "points": 33},
            {"criterion": "2 domains", "domain_count": 2, "points": 66},
            {"criterion": "3+ domains", "domain_count": 3, "points": 100},
        ],
    },
]

TIEBREAKER_RULES = [
    {
        "priority": 1,
        "rule": "DKA event in prior 12 months",
        "action": "assign_cohort",
        "target_sort_order": 4,
        "condition": {"type": "has_dka"},
    },
    {
        "priority": 2,
        "rule": "T1DM (E10.x)",
        "action": "min_cohort_or_escalate",
        "min_sort_order": 3,
        "escalate_if_score_gte": 51,
        "escalate_sort_order": 4,
        "condition": {"type": "has_diagnosis_prefix", "prefixes": ["E10"]},
    },
    {
        "priority": 3,
        "rule": "Any Tier 3 hard criterion",
        "action": "min_cohort",
        "min_sort_order": 3,
        "condition": {
            "type": "has_tier_hard_criteria",
            "diagnosis_prefixes": ["E11.31", "E11.35", "E11.4", "I25", "I63", "I73.9", "I50", "Z89.4", "Z89.5", "Z89.6"],
        },
    },
    {
        "priority": 4,
        "rule": "HbA1c >= 5.7% but score assigns Cohort 0",
        "action": "escalate_cohort",
        "from_sort_order": 0,
        "to_sort_order": 1,
        "condition": {"type": "lab_gte", "field": "hba1c", "value": 5.7},
    },
]


async def seed_diabetes_program(db: AsyncSession) -> None:
    """Seed the Diabetes Care program with 5 cohorts and a scoring engine."""
    result = await db.execute(select(Program).where(Program.id == PROGRAM_ID))
    if result.scalar_one_or_none():
        return

    # 1. Create program
    program = Program(
        id=PROGRAM_ID,
        tenant_id=DEFAULT_TENANT_ID,
        name="Diabetes Care",
        slug="diabetes-care",
        condition="diabetes",
        description="Comprehensive diabetes care management program with risk-stratified cohorts",
        status="active",
        version=1,
        published_at=datetime.now(timezone.utc),
        published_by=DEFAULT_USER_ID,
        created_by=DEFAULT_USER_ID,
    )
    db.add(program)
    await db.flush()

    # 2. Create cohorts
    cohort_ids = {}
    for cdef in COHORT_DEFS:
        cohort_id = uuid.uuid4()
        cohort = Cohort(
            id=cohort_id,
            tenant_id=DEFAULT_TENANT_ID,
            program_id=PROGRAM_ID,
            name=cdef["name"],
            slug=cdef["slug"],
            color=cdef["color"],
            sort_order=cdef["sort"],
            review_cadence_days=cdef["cadence"],
            score_range_min=cdef["min"],
            score_range_max=cdef["max"],
        )
        db.add(cohort)
        cohort_ids[cdef["sort"]] = cohort_id
    await db.flush()

    # 3. Create scoring engine
    engine = ScoringEngine(
        id=ENGINE_ID,
        tenant_id=DEFAULT_TENANT_ID,
        program_id=PROGRAM_ID,
        components=COMPONENTS,
        tiebreaker_rules=TIEBREAKER_RULES,
        aggregation_method="weighted_sum",
        is_active=True,
    )
    db.add(engine)

    # 4. Publish version 1
    snapshot = {
        "name": program.name,
        "condition": program.condition,
        "description": program.description,
        "cohorts": [
            {
                "id": str(cohort_ids[cdef["sort"]]),
                "name": cdef["name"],
                "slug": cdef["slug"],
                "color": cdef["color"],
                "sort_order": cdef["sort"],
                "score_range_min": cdef["min"],
                "score_range_max": cdef["max"],
                "review_cadence_days": cdef["cadence"],
            }
            for cdef in COHORT_DEFS
        ],
        "scoring_engine": {
            "components": COMPONENTS,
            "tiebreaker_rules": TIEBREAKER_RULES,
            "aggregation_method": "weighted_sum",
        },
    }
    version = ProgramVersion(
        program_id=PROGRAM_ID,
        version=1,
        snapshot=snapshot,
        published_by=DEFAULT_USER_ID,
    )
    db.add(version)

    await db.commit()
