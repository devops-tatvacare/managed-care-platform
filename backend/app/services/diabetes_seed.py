"""Seed data for the Diabetes Care program (v2).

Creates a Program with 5 risk-stratified cohorts, CohortCriteria, a ScoringEngine,
and a basic Pathway for Tier 2 (Diabetes Wellness).
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cohort import Cohort, CohortCriteria, ScoringEngine
from app.models.pathway import Pathway, PathwayBlock
from app.models.program import Program
from app.services.seed_service import DEFAULT_TENANT_ID, DEFAULT_USER_ID

# ---------------------------------------------------------------------------
# Cohort definitions
# ---------------------------------------------------------------------------

COHORT_DEFS = [
    {
        "sort_order": 0,
        "name": "Tier 0 — Prevention Program",
        "slug": "tier-0-prevention",
        "color": "#86efac",
        "score_range_min": 0,
        "score_range_max": 15,
        "review_cadence_days": 365,
    },
    {
        "sort_order": 1,
        "name": "Tier 1 — Pre-Diabetes Reversal",
        "slug": "tier-1-pre-diabetes",
        "color": "#93c5fd",
        "score_range_min": 16,
        "score_range_max": 30,
        "review_cadence_days": 180,
    },
    {
        "sort_order": 2,
        "name": "Tier 2 — Diabetes Wellness",
        "slug": "tier-2-wellness",
        "color": "#fcd34d",
        "score_range_min": 31,
        "score_range_max": 50,
        "review_cadence_days": 90,
    },
    {
        "sort_order": 3,
        "name": "Tier 3 — Advanced Diabetes Care",
        "slug": "tier-3-advanced",
        "color": "#fdba74",
        "score_range_min": 51,
        "score_range_max": 70,
        "review_cadence_days": 30,
    },
    {
        "sort_order": 4,
        "name": "Tier 4 — Comprehensive Support",
        "slug": "tier-4-comprehensive",
        "color": "#fca5a5",
        "score_range_min": 71,
        "score_range_max": 100,
        "review_cadence_days": 7,
    },
]

# ---------------------------------------------------------------------------
# Criteria rules per cohort (index matches COHORT_DEFS order)
# Each item: list of rule dicts with rule_type + config
# ---------------------------------------------------------------------------

COHORT_CRITERIA = [
    # Tier 0 — Prevention
    [
        {"rule_type": "demographics", "config": {"bmi_operator": ">=", "bmi_threshold": 25}},
        {
            "rule_type": "diagnosis",
            "config": {"icd10_codes": ["E11"], "match_type": "prefix", "include": False},
        },
    ],
    # Tier 1 — Pre-Diabetes Reversal
    [
        {"rule_type": "lab", "config": {"test_type": "HbA1c", "operator": ">=", "value": 5.7}},
        {"rule_type": "lab", "config": {"test_type": "HbA1c", "operator": "<", "value": 6.5}},
    ],
    # Tier 2 — Diabetes Wellness
    [
        {
            "rule_type": "diagnosis",
            "config": {"icd10_codes": ["E11"], "match_type": "prefix", "include": True},
        },
        {"rule_type": "lab", "config": {"test_type": "HbA1c", "operator": "<", "value": 8.0}},
    ],
    # Tier 3 — Advanced Diabetes Care
    [
        {
            "rule_type": "diagnosis",
            "config": {"icd10_codes": ["E11"], "match_type": "prefix", "include": True},
        },
    ],
    # Tier 4 — Comprehensive Support
    [
        {
            "rule_type": "diagnosis",
            "config": {
                "icd10_codes": ["E10", "E11"],
                "match_type": "prefix",
                "include": True,
            },
        },
    ],
]

# ---------------------------------------------------------------------------
# Scoring engine
# ---------------------------------------------------------------------------

COMPONENTS = [
    {
        "name": "glycaemic_control",
        "label": "Glycaemic Control",
        "data_source": "lab_range",
        "weight": 30,
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
            {"criterion": "TIR < 50% (CGM)", "field": "tir", "min": None, "max": 50, "points": 10},
            {"criterion": "CV > 36% (high variability)", "field": "cv", "min": 36, "max": None, "points": 5},
            {"criterion": "TBR > 4% (hypoglycaemia)", "field": "tbr", "min": 4, "max": None, "points": 8},
        ],
    },
    {
        "name": "complication_burden",
        "label": "Complication Burden",
        "data_source": "diagnosis_match",
        "weight": 30,
        "cap": 100,
        "scoring_table": [
            {"criterion": "No complications", "type": "default", "points": 0},
            {"criterion": "Microalbuminuria (uACR 30-300)", "type": "lab", "field": "uacr", "min": 30, "max": 300, "points": 25},
            {"criterion": "Macroalbuminuria (uACR > 300)", "type": "lab", "field": "uacr", "min": 300, "max": None, "points": 50},
            {"criterion": "CKD G3a (eGFR 45-59)", "type": "lab", "field": "egfr", "min": 45, "max": 59, "points": 35},
            {"criterion": "CKD G3b (eGFR 30-44)", "type": "lab", "field": "egfr", "min": 30, "max": 44, "points": 55},
            {"criterion": "CKD G4 (eGFR 15-29)", "type": "lab", "field": "egfr", "min": 15, "max": 29, "points": 75},
            {"criterion": "Non-proliferative retinopathy", "type": "diagnosis", "icd10_prefix": ["E11.31", "E10.31"], "points": 20},
            {"criterion": "Proliferative retinopathy", "type": "diagnosis", "icd10_prefix": ["E11.35", "E10.35"], "points": 45},
            {"criterion": "Peripheral neuropathy", "type": "diagnosis", "icd10_prefix": ["E11.4", "E10.4", "G63"], "points": 20},
            {"criterion": "Established CVD", "type": "diagnosis", "icd10_prefix": ["I25", "I63", "I73.9"], "points": 40},
            {"criterion": "Heart failure", "type": "diagnosis", "icd10_prefix": ["I50"], "points": 40},
            {"criterion": "DM-related amputation", "type": "diagnosis", "icd10_prefix": ["Z89"], "points": 60},
        ],
    },
    {
        "name": "behavioural_adherence",
        "label": "Behavioural / Adherence",
        "data_source": "pharmacy_adherence",
        "weight": 20,
        "cap": 100,
        "scoring_table": [
            {"criterion": "PDC >= 80%", "type": "pdc", "min": 80, "max": None, "points": 0},
            {"criterion": "PDC 70-79%", "type": "pdc", "min": 70, "max": 80, "points": 20},
            {"criterion": "PDC 60-69%", "type": "pdc", "min": 60, "max": 70, "points": 40},
            {"criterion": "PDC < 60%", "type": "pdc", "min": None, "max": 60, "points": 70},
        ],
        "bonus_table": [
            {"criterion": "DDS >= 3.0 (high distress)", "field": "dds", "min": 3.0, "max": None, "points": 15},
            {"criterion": "PHQ-9 >= 10 (depression)", "field": "phq9", "min": 10, "max": None, "points": 15},
            {"criterion": "SED-9 < 6 (low self-efficacy)", "field": "sed9", "min": None, "max": 6, "points": 10},
        ],
    },
    {
        "name": "utilisation",
        "label": "Utilisation",
        "data_source": "utilisation",
        "weight": 10,
        "cap": 100,
        "scoring_table": [
            {"criterion": "0 ER visits, 0 hospitalisations", "er_visits": 0, "hospitalisations": 0, "dka": False, "points": 0},
            {"criterion": "1 DM-related ER visit", "er_visits": 1, "hospitalisations": None, "dka": False, "points": 30},
            {"criterion": "2+ DM-related ER visits", "er_visits": 2, "hospitalisations": None, "dka": False, "points": 60},
            {"criterion": "1 DM-related hospitalisation", "er_visits": None, "hospitalisations": 1, "dka": False, "points": 50},
            {"criterion": "DKA hospitalisation", "er_visits": None, "hospitalisations": None, "dka": True, "points": 85},
            {"criterion": "2+ hospitalisations (any)", "er_visits": None, "hospitalisations": 2, "dka": False, "points": 80},
        ],
    },
    {
        "name": "sdoh_burden",
        "label": "SDOH Burden",
        "data_source": "sdoh",
        "weight": 10,
        "cap": 100,
        "scoring_table": [
            {"criterion": "0 high-risk domains", "domain_count": 0, "points": 0},
            {"criterion": "1 high-risk domain", "domain_count": 1, "points": 33},
            {"criterion": "2 high-risk domains", "domain_count": 2, "points": 66},
            {"criterion": "3+ high-risk domains", "domain_count": 3, "points": 100},
        ],
    },
]

TIEBREAKER_RULES = [
    {
        "priority": 1,
        "rule": "Tier 3 hard criterion met → minimum Tier 3",
        "action": "min_cohort",
        "min_sort_order": 3,
        "condition": {
            "type": "has_tier_hard_criteria",
            "diagnosis_prefixes": ["E11.31", "E11.35", "E11.4", "I50", "Z89"],
        },
    },
    {
        "priority": 2,
        "rule": "T1DM (E10.x) → minimum Tier 3; CRS >= 51 → Tier 4",
        "action": "min_cohort_or_escalate",
        "min_sort_order": 3,
        "escalate_if_score_gte": 51,
        "escalate_sort_order": 4,
        "condition": {"type": "has_diagnosis_prefix", "prefixes": ["E10"]},
    },
    {
        "priority": 3,
        "rule": "DKA event in prior 12 months → Tier 4",
        "action": "assign_cohort",
        "target_sort_order": 4,
        "condition": {"type": "has_dka"},
    },
    {
        "priority": 4,
        "rule": "CRS Tier 0 but HbA1c >= 5.7% → escalate to Tier 1",
        "action": "escalate_cohort",
        "from_sort_order": 0,
        "to_sort_order": 1,
        "condition": {"type": "lab_gte", "field": "hba1c", "value": 5.7},
    },
]

# ---------------------------------------------------------------------------
# Pathway blocks for Tier 2 Diabetes Wellness Pathway
# ---------------------------------------------------------------------------

PATHWAY_BLOCKS = [
    {
        "order_index": 0,
        "block_type": "eligibility_diagnosis",
        "category": "eligibility",
        "label": "T2DM Diagnosis Check",
        "config": {"icd10_codes": ["E11"], "match_type": "prefix", "include": True},
    },
    {
        "order_index": 1,
        "block_type": "action_lab_order",
        "category": "action",
        "label": "Quarterly HbA1c",
        "config": {"test_type": "HbA1c", "frequency": "quarterly"},
    },
    {
        "order_index": 2,
        "block_type": "action_outreach",
        "category": "action",
        "label": "Care Manager Check-in",
        "config": {"channel": "whatsapp", "frequency": "monthly"},
    },
    {
        "order_index": 3,
        "block_type": "logic_conditional",
        "category": "logic",
        "label": "HbA1c Rising Check",
        "config": {
            "field": "HbA1c",
            "operator": ">=",
            "value": 8.0,
            "true_branch_label": "Escalate to Tier 3",
        },
    },
]


# ---------------------------------------------------------------------------
# Main seed function
# ---------------------------------------------------------------------------


async def seed_diabetes_program(db: AsyncSession) -> None:
    """Seed the Diabetes Care program (v2 — full cohort criteria + pathway)."""

    # Idempotency check by name + tenant
    existing = await db.execute(
        select(Program).where(
            Program.tenant_id == DEFAULT_TENANT_ID,
            Program.name == "Diabetes Care",
        )
    )
    if existing.scalar_one_or_none():
        return

    # ------------------------------------------------------------------
    # 1. Program
    # ------------------------------------------------------------------
    program = Program(
        tenant_id=DEFAULT_TENANT_ID,
        name="Diabetes Care",
        slug="diabetes-care",
        condition="Type 2 Diabetes Mellitus",
        description=(
            "5-tier risk stratification based on ADA 2024 guidelines "
            "with composite risk scoring (CRS 0-100)"
        ),
        status="active",
        version=1,
        published_at=datetime.now(timezone.utc),
        published_by=DEFAULT_USER_ID,
        created_by=DEFAULT_USER_ID,
    )
    db.add(program)
    await db.flush()  # resolve program.id

    # ------------------------------------------------------------------
    # 2. Cohorts
    # ------------------------------------------------------------------
    cohorts: list[Cohort] = []
    for cdef in COHORT_DEFS:
        cohort = Cohort(
            tenant_id=DEFAULT_TENANT_ID,
            program_id=program.id,
            name=cdef["name"],
            slug=cdef["slug"],
            color=cdef["color"],
            sort_order=cdef["sort_order"],
            score_range_min=cdef["score_range_min"],
            score_range_max=cdef["score_range_max"],
            review_cadence_days=cdef["review_cadence_days"],
        )
        db.add(cohort)
        cohorts.append(cohort)

    await db.flush()  # resolve cohort.id for each cohort

    # ------------------------------------------------------------------
    # 3. CohortCriteria — one root AND group per cohort, rules as children
    # ------------------------------------------------------------------
    for cohort, rules in zip(cohorts, COHORT_CRITERIA):
        root = CohortCriteria(
            cohort_id=cohort.id,
            parent_group_id=None,
            group_operator="AND",
            rule_type=None,
            config=None,
            sort_order=0,
        )
        db.add(root)
        await db.flush()  # resolve root.id before adding children

        for idx, rule in enumerate(rules):
            leaf = CohortCriteria(
                cohort_id=cohort.id,
                parent_group_id=root.id,
                group_operator=None,
                rule_type=rule["rule_type"],
                config=rule["config"],
                sort_order=idx,
            )
            db.add(leaf)

    # ------------------------------------------------------------------
    # 4. ScoringEngine
    # ------------------------------------------------------------------
    engine = ScoringEngine(
        tenant_id=DEFAULT_TENANT_ID,
        program_id=program.id,
        components=COMPONENTS,
        tiebreaker_rules=TIEBREAKER_RULES,
        aggregation_method="weighted_sum",
        is_active=True,
    )
    db.add(engine)

    # ------------------------------------------------------------------
    # 5. Pathway — Tier 2 Diabetes Wellness
    # ------------------------------------------------------------------
    pathway = Pathway(
        tenant_id=DEFAULT_TENANT_ID,
        created_by=DEFAULT_USER_ID,
        name="Diabetes Wellness Pathway",
        condition="Type 2 Diabetes",
        target_tiers=[2],
        status="published",
        version=1,
        published_at=datetime.now(timezone.utc),
        published_by=DEFAULT_USER_ID,
    )
    db.add(pathway)
    await db.flush()  # resolve pathway.id

    for bdef in PATHWAY_BLOCKS:
        block = PathwayBlock(
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pathway.id,
            block_type=bdef["block_type"],
            category=bdef["category"],
            label=bdef["label"],
            config=bdef["config"],
            order_index=bdef["order_index"],
        )
        db.add(block)

    # ------------------------------------------------------------------
    # 6. Link Tier 2 cohort to the pathway
    # ------------------------------------------------------------------
    tier2_cohort = cohorts[2]  # sort_order == 2
    tier2_cohort.pathway_id = pathway.id

    # ------------------------------------------------------------------
    # 7. Commit
    # ------------------------------------------------------------------
    await db.commit()
