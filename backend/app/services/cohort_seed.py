import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cohort import CRSConfig
from app.services.seed_service import DEFAULT_TENANT_ID

CRS_CONFIG_ID = uuid.UUID("40000000-0000-0000-0000-000000000001")

COMPONENTS = [
    {
        "name": "Glycaemic Control",
        "weight": 0.35,
        "cap": 100,
        "scoring_table": [
            {"criterion": "HbA1c < 5.7%", "field": "hba1c", "min": None, "max": 5.7, "points": 0},
            {"criterion": "HbA1c 5.7-6.4%", "field": "hba1c", "min": 5.7, "max": 6.5, "points": 20},
            {"criterion": "HbA1c 6.5-7.9%", "field": "hba1c", "min": 6.5, "max": 8.0, "points": 40},
            {"criterion": "HbA1c 8.0-9.9%", "field": "hba1c", "min": 8.0, "max": 10.0, "points": 70},
            {"criterion": "HbA1c >= 10.0%", "field": "hba1c", "min": 10.0, "max": None, "points": 90},
        ],
        "bonus_table": [
            {"criterion": "TIR < 50% (CGM)", "field": "tir", "max": 50, "points": 10},
            {"criterion": "CV > 36%", "field": "cv", "min": 36, "points": 5},
            {"criterion": "TBR > 4%", "field": "tbr", "min": 4, "points": 8},
        ],
    },
    {
        "name": "Complication Burden",
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

TIER_THRESHOLDS = [
    {"tier": 0, "label": "Tier 0", "crs_min": 0, "crs_max": 15, "prereq": "BMI >= 25; no DM diagnosis"},
    {"tier": 1, "label": "Tier 1", "crs_min": 16, "crs_max": 30, "prereq": "HbA1c 5.7-6.4% or FPG 100-125"},
    {"tier": 2, "label": "Tier 2", "crs_min": 31, "crs_max": 50, "prereq": "T2DM diagnosis; HbA1c < 8.0%"},
    {"tier": 3, "label": "Tier 3", "crs_min": 51, "crs_max": 70, "prereq": "T2DM diagnosis"},
    {"tier": 4, "label": "Tier 4", "crs_min": 71, "crs_max": 100, "prereq": "Any DM diagnosis"},
]

TIEBREAKER_RULES = [
    {"priority": 1, "rule": "DKA event in prior 12 months", "action": "assign_tier", "tier": 4},
    {"priority": 2, "rule": "T1DM (E10.x)", "action": "min_tier_or_escalate", "min_tier": 3, "escalate_if_crs_gte": 51, "escalate_tier": 4},
    {"priority": 3, "rule": "Any Tier 3 hard criterion", "action": "min_tier", "min_tier": 3},
    {"priority": 4, "rule": "HbA1c >= 5.7% but CRS assigns Tier 0", "action": "escalate_tier", "from_tier": 0, "to_tier": 1},
]


async def seed_crs_config(db: AsyncSession) -> None:
    result = await db.execute(select(CRSConfig).where(CRSConfig.id == CRS_CONFIG_ID))
    if result.scalar_one_or_none():
        return

    config = CRSConfig(
        id=CRS_CONFIG_ID,
        tenant_id=DEFAULT_TENANT_ID,
        components=COMPONENTS,
        tier_thresholds=TIER_THRESHOLDS,
        tiebreaker_rules=TIEBREAKER_RULES,
        is_active=True,
    )
    db.add(config)
    await db.commit()
