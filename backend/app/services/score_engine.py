"""Score computation engine — async orchestrator.

Loads scoring configuration + patient clinical data from the DB,
transforms human-readable seed-format configs into structured engine configs,
runs the scoring pipeline, maps to a cohort, and caches the result.
"""

from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.engine.base import PatientData
from app.models.cohort import Cohort, ScoringEngine
from app.models.patient import Patient, PatientDiagnosis, PatientLab
from app.services.scoring_engine_service import score_patient

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ICD-10 prefix → keyword mapping for diagnosis_match criterion parsing
# ---------------------------------------------------------------------------

_ICD_KEYWORD_MAP: list[tuple[str, list[str]]] = [
    ("E11.4", ["neuropathy"]),
    ("E11.3", ["retinopathy"]),
    ("E11.31", ["non-proliferative retinopathy"]),
    ("E11.35", ["proliferative retinopathy"]),
    ("N18.3", ["ckd g3a"]),
    ("N18.4", ["ckd g3b"]),
    ("N18.5", ["ckd g4"]),
    ("N18.", ["ckd"]),
    ("I25.", ["cvd", "established cvd"]),
    ("I21.", ["cvd", "established cvd"]),
    ("I50.", ["heart failure"]),
    ("E11.52", ["amputation", "foot ulcer"]),
    ("E11.6", ["microalbuminuria", "macroalbuminuria"]),
]


# ---------------------------------------------------------------------------
# Criterion string parsers
# ---------------------------------------------------------------------------

_RANGE_RE = re.compile(
    r"(?P<label>[A-Za-z0-9_ ]+?)\s+"
    r"(?P<lo>[\d.]+)\s*[–\-]\s*(?P<hi>[\d.]+)\s*%?",
)
_LT_RE = re.compile(
    r"(?P<label>[A-Za-z0-9_ ]+?)\s*<\s*(?P<val>[\d.]+)\s*%?",
)
_GTE_RE = re.compile(
    r"(?P<label>[A-Za-z0-9_ ]+?)\s*>=\s*(?P<val>[\d.]+)\s*%?",
)
_PDC_RANGE_RE = re.compile(
    r"PDC\s+(?P<lo>[\d.]+)\s*[–\-]\s*(?P<hi>[\d.]+)\s*%?",
)
_PDC_GTE_RE = re.compile(r"PDC\s*>=\s*(?P<val>[\d.]+)\s*%?")
_PDC_LT_RE = re.compile(r"PDC\s*<\s*(?P<val>[\d.]+)\s*%?")
_DOMAIN_COUNT_RE = re.compile(r"(\d+)\+?\s+high-risk\s+domain", re.IGNORECASE)


def _parse_lab_criterion(criterion: str) -> dict[str, Any] | None:
    """Parse a lab-range criterion string into {field, min, max}."""
    m = _RANGE_RE.match(criterion)
    if m:
        # Engine uses [min, max) semantics — nudge max up by 0.05 to include upper bound
        # e.g. "5.7-6.4%" becomes [5.7, 6.45) so 6.4 is included
        hi = float(m.group("hi"))
        return {
            "field": m.group("label").strip().lower().replace(" ", ""),
            "min": float(m.group("lo")),
            "max": round(hi + 0.05, 2),
        }
    m = _LT_RE.match(criterion)
    if m:
        return {
            "field": m.group("label").strip().lower().replace(" ", ""),
            "min": None,
            "max": float(m.group("val")),
        }
    m = _GTE_RE.match(criterion)
    if m:
        return {
            "field": m.group("label").strip().lower().replace(" ", ""),
            "min": float(m.group("val")),
            "max": None,
        }
    return None


def _parse_pdc_criterion(criterion: str) -> dict[str, Any] | None:
    """Parse a PDC criterion string into {min, max}."""
    m = _PDC_GTE_RE.search(criterion)
    if m:
        return {"type": "pdc", "min": float(m.group("val")), "max": None}
    m = _PDC_LT_RE.search(criterion)
    if m:
        return {"type": "pdc", "min": None, "max": float(m.group("val"))}
    m = _PDC_RANGE_RE.search(criterion)
    if m:
        return {"type": "pdc", "min": float(m.group("lo")), "max": float(m.group("hi")) + 1}
    return None


def _parse_sdoh_criterion(criterion: str) -> int | None:
    """Parse SDOH criterion into a domain count threshold."""
    m = _DOMAIN_COUNT_RE.search(criterion)
    if m:
        return int(m.group(1))
    if re.search(r"\b0\s+", criterion):
        return 0
    return None


def _match_diagnosis_keyword(criterion: str, active_codes: list[str]) -> bool:
    """Check if a diagnosis criterion matches any of the patient's ICD-10 codes.

    Uses keyword matching on the criterion text + ICD prefix lookup.
    """
    crit_lower = criterion.lower()

    # "No complications" is the default row — only matches if there are no complications
    if "no complication" in crit_lower:
        return len(active_codes) == 0

    for icd_prefix, keywords in _ICD_KEYWORD_MAP:
        if any(kw in crit_lower for kw in keywords):
            if any(code.upper().startswith(icd_prefix.upper()) for code in active_codes):
                return True

    return False


# ---------------------------------------------------------------------------
# Config transformers: seed format → engine format
# ---------------------------------------------------------------------------

def _transform_lab_range_config(component: dict[str, Any]) -> dict[str, Any]:
    """Transform a seed lab_range component into engine-compatible config."""
    cfg = dict(component)

    # Infer field from first scoring_table criterion
    scoring_table = cfg.get("scoring_table", [])
    field = None
    new_table = []
    for row in scoring_table:
        parsed = _parse_lab_criterion(row["criterion"])
        if parsed:
            if field is None:
                field = parsed["field"]
            new_table.append({
                "criterion": row["criterion"],
                "min": parsed["min"],
                "max": parsed["max"],
                "points": row["points"],
            })
        else:
            new_table.append(row)

    cfg["field"] = field or "hba1c"
    cfg["scoring_table"] = new_table

    # Transform bonus_table — bonus entries reference separate lab fields
    # Apply 0.3x discount: bonus data (e.g. CGM) is supplementary, most patients won't have it
    new_bonus = []
    for row in cfg.get("bonus_table", []):
        crit = row["criterion"].lower()
        discounted_pts = round(row["points"] * 0.3)
        # Extract field name and threshold from patterns like "TIR < 50% (CGM)"
        parsed = _parse_lab_criterion(row["criterion"].split("(")[0].strip())
        if parsed:
            new_bonus.append({
                "criterion": row["criterion"],
                "field": parsed["field"],
                "min": parsed["min"],
                "max": parsed["max"],
                "points": discounted_pts,
            })
        elif ">" in crit:
            # Handle "CV > 36%" pattern
            m = re.search(r"(\w+)\s*>\s*([\d.]+)", row["criterion"])
            if m:
                new_bonus.append({
                    "criterion": row["criterion"],
                    "field": m.group(1).lower(),
                    "min": float(m.group(2)),
                    "max": None,
                    "points": discounted_pts,
                })
        else:
            new_bonus.append({**row, "points": discounted_pts})

    cfg["bonus_table"] = new_bonus
    return cfg


def _transform_diagnosis_match_config(
    component: dict[str, Any],
    active_codes: list[str],
) -> dict[str, Any]:
    """Transform a seed diagnosis_match component into engine-compatible config.

    Since the seed uses human-readable criterion strings, we resolve matches
    directly here and build a pre-resolved scoring table.
    """
    cfg = dict(component)
    new_table = []
    for row in cfg.get("scoring_table", []):
        crit_lower = row["criterion"].lower()

        # Determine the type and ICD prefixes for this criterion
        if "no complication" in crit_lower:
            new_table.append({"criterion": row["criterion"], "type": "default", "points": row["points"]})
            continue

        # Find matching ICD prefixes for this criterion
        matched_prefixes = []
        for icd_prefix, keywords in _ICD_KEYWORD_MAP:
            if any(kw in crit_lower for kw in keywords):
                matched_prefixes.append(icd_prefix)

        # Lab-based criteria (uACR ranges)
        if "uacr" in crit_lower or "microalbuminuria" in crit_lower or "macroalbuminuria" in crit_lower:
            if "30-300" in row["criterion"] or "30–300" in row["criterion"] or "microalbuminuria" in crit_lower:
                new_table.append({
                    "criterion": row["criterion"],
                    "type": "lab",
                    "field": "uacr",
                    "min": 30,
                    "max": 300,
                    "points": row["points"],
                })
            elif "> 300" in row["criterion"] or "macroalbuminuria" in crit_lower:
                new_table.append({
                    "criterion": row["criterion"],
                    "type": "lab",
                    "field": "uacr",
                    "min": 300,
                    "max": None,
                    "points": row["points"],
                })
            continue

        if "egfr" in crit_lower:
            # eGFR-based criteria — map as lab type
            m = re.search(r"egfr\s+(\d+)[–\-](\d+)", crit_lower)
            if m:
                new_table.append({
                    "criterion": row["criterion"],
                    "type": "lab",
                    "field": "egfr",
                    "min": int(m.group(1)),
                    "max": int(m.group(2)),
                    "points": row["points"],
                })
                continue

        if matched_prefixes:
            new_table.append({
                "criterion": row["criterion"],
                "type": "diagnosis",
                "icd10_prefix": matched_prefixes,
                "points": row["points"],
            })
        else:
            # Fallback: keep as-is, won't match
            new_table.append({"criterion": row["criterion"], "type": "default", "points": row["points"]})

    cfg["scoring_table"] = new_table
    return cfg


def _transform_pharmacy_config(component: dict[str, Any]) -> dict[str, Any]:
    """Transform a seed pharmacy_adherence component into engine-compatible config."""
    cfg = dict(component)
    new_table = []
    for row in cfg.get("scoring_table", []):
        parsed = _parse_pdc_criterion(row["criterion"])
        if parsed:
            new_table.append({
                "criterion": row["criterion"],
                "type": "pdc",
                "min": parsed["min"],
                "max": parsed["max"],
                "points": row["points"],
            })
        else:
            new_table.append({**row, "type": "pdc"})
    cfg["scoring_table"] = new_table

    # Bonus table — PRO scores stored as lab values
    # Apply 0.3x discount: supplementary PRO data most patients won't have
    new_bonus = []
    for row in cfg.get("bonus_table", []):
        crit = row["criterion"]
        discounted_pts = round(row["points"] * 0.3)
        m = re.search(r"(\w[\w-]*)\s*>=\s*([\d.]+)", crit)
        if m:
            new_bonus.append({
                "criterion": crit,
                "field": m.group(1).lower().replace("-", ""),
                "min": float(m.group(2)),
                "max": None,
                "points": discounted_pts,
            })
        elif "< " in crit:
            m2 = re.search(r"(\w[\w-]*)\s*<\s*([\d.]+)", crit)
            if m2:
                new_bonus.append({
                    "criterion": crit,
                    "field": m2.group(1).lower().replace("-", ""),
                    "min": None,
                    "max": float(m2.group(2)),
                    "points": discounted_pts,
                })
        elif "60+ days" in crit.lower():
            # App engagement — not a lab, skip (no data source)
            new_bonus.append({
                "criterion": crit,
                "field": "app_engagement_gap_days",
                "min": 60,
                "max": None,
                "points": discounted_pts,
            })
        else:
            new_bonus.append({**row, "points": discounted_pts})
    cfg["bonus_table"] = new_bonus
    return cfg


def _transform_utilisation_config(component: dict[str, Any]) -> dict[str, Any]:
    """Transform seed utilisation component.

    Since we don't have encounter data yet, the engine component won't be used
    directly. Instead we use care_gaps as a proxy in _score_utilisation_proxy().
    We keep the config but mark it for proxy scoring.
    """
    cfg = dict(component)
    cfg["_use_proxy"] = True
    return cfg


def _transform_sdoh_config(component: dict[str, Any]) -> dict[str, Any]:
    """Transform seed SDOH component into engine-compatible config."""
    cfg = dict(component)
    new_table = []
    for row in cfg.get("scoring_table", []):
        count = _parse_sdoh_criterion(row["criterion"])
        new_table.append({
            "criterion": row["criterion"],
            "domain_count": count if count is not None else 0,
            "points": row["points"],
        })
    cfg["scoring_table"] = new_table
    return cfg


# ---------------------------------------------------------------------------
# Proxy scoring for utilisation (no encounter table yet)
# ---------------------------------------------------------------------------

def _score_utilisation_proxy(care_gaps: list | None) -> int:
    """Use care_gaps count as proxy for utilisation scoring."""
    n = len(care_gaps) if care_gaps else 0
    if n == 0:
        return 0
    if n == 1:
        return 30
    if n <= 3:
        return 60
    return 80


# ---------------------------------------------------------------------------
# PatientData builder
# ---------------------------------------------------------------------------

async def _build_patient_data(
    db: AsyncSession,
    patient: Patient,
) -> PatientData:
    """Load clinical data and build a PatientData bundle."""

    # Latest labs — deduplicated by test_type, keeping most recent
    lab_stmt = (
        select(PatientLab)
        .where(
            PatientLab.patient_id == patient.id,
            PatientLab.tenant_id == patient.tenant_id,
        )
        .order_by(PatientLab.recorded_at.desc())
    )
    lab_result = await db.execute(lab_stmt)
    all_labs = lab_result.scalars().all()

    latest_labs: dict[str, float] = {}
    for lab in all_labs:
        key = lab.test_type.lower().replace(" ", "")
        if key not in latest_labs:
            latest_labs[key] = lab.value

    # Active diagnoses
    dx_stmt = (
        select(PatientDiagnosis)
        .where(
            PatientDiagnosis.patient_id == patient.id,
            PatientDiagnosis.tenant_id == patient.tenant_id,
            PatientDiagnosis.is_active.is_(True),
        )
    )
    dx_result = await db.execute(dx_stmt)
    diagnoses = dx_result.scalars().all()
    active_codes = [d.icd10_code for d in diagnoses]

    # Medications
    medications = patient.active_medications or []

    # SDOH flags
    sdoh = patient.sdoh_flags or {}

    # Utilisation — proxy from care_gaps
    care_gaps = patient.care_gaps or []
    utilisation = {
        "er_visits_12mo": 0,
        "hospitalisations_12mo": 0,
        "dka_12mo": False,
        "_care_gap_count": len(care_gaps),
    }

    return PatientData(
        latest_labs=latest_labs,
        active_diagnosis_codes=active_codes,
        medications=medications,
        sdoh_flags=sdoh,
        utilisation=utilisation,
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def compute_patient_score(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
    program_id: uuid.UUID,
) -> dict | None:
    """Compute the Composite Risk Score (CRS) for a patient.

    Returns:
        {
            "score": 42.5,
            "breakdown": {
                "glycaemic_control": {"raw": 40, "weighted": 12.0},
                ...
            },
            "cohort_id": "...",
            "cohort_name": "...",
        }
        or None if the scoring engine or patient is not found.
    """

    # 1. Load scoring engine
    engine_stmt = (
        select(ScoringEngine)
        .where(
            ScoringEngine.program_id == program_id,
            ScoringEngine.tenant_id == tenant_id,
            ScoringEngine.is_active.is_(True),
        )
    )
    engine_result = await db.execute(engine_stmt)
    engine = engine_result.scalar_one_or_none()
    if engine is None:
        logger.warning("No active scoring engine for program %s", program_id)
        return None

    # 2. Load patient
    patient_stmt = select(Patient).where(
        Patient.id == patient_id,
        Patient.tenant_id == tenant_id,
    )
    patient_result = await db.execute(patient_stmt)
    patient = patient_result.scalar_one_or_none()
    if patient is None:
        logger.warning("Patient %s not found", patient_id)
        return None

    # 3. Build PatientData
    patient_data = await _build_patient_data(db, patient)

    # 4. Transform seed-format component configs → engine-compatible configs
    transformed_components = []
    for comp in engine.components:
        ds = comp.get("data_source")
        if ds == "lab_range":
            transformed_components.append(_transform_lab_range_config(comp))
        elif ds == "diagnosis_match":
            transformed_components.append(
                _transform_diagnosis_match_config(comp, patient_data.active_diagnosis_codes)
            )
        elif ds == "pharmacy_adherence":
            transformed_components.append(_transform_pharmacy_config(comp))
        elif ds == "utilisation":
            transformed_components.append(_transform_utilisation_config(comp))
        elif ds == "sdoh":
            transformed_components.append(_transform_sdoh_config(comp))
        else:
            transformed_components.append(comp)

    # 5. Build a temporary engine object with transformed configs
    #    We patch the components list for the score_patient call.
    original_components = engine.components
    engine.components = transformed_components

    # Override utilisation scoring with proxy before calling score_patient
    # We need to handle utilisation specially since there's no encounter data
    _patch_utilisation_for_proxy(engine.components, patient.care_gaps)

    # 6. Load cohorts for the program
    cohort_stmt = (
        select(Cohort)
        .where(
            Cohort.program_id == program_id,
            Cohort.tenant_id == tenant_id,
            Cohort.is_active.is_(True),
        )
        .order_by(Cohort.sort_order)
    )
    cohort_result = await db.execute(cohort_stmt)
    cohorts = list(cohort_result.scalars().all())

    if not cohorts:
        logger.warning("No active cohorts for program %s", program_id)
        engine.components = original_components
        return None

    # 7. Run the scoring pipeline
    try:
        result = score_patient(patient_data, engine, cohorts)
    finally:
        # Restore original components to avoid mutating the cached ORM object
        engine.components = original_components

    # 8. Cache score on patient
    patient.risk_score = result["score"]
    patient.risk_score_updated_at = datetime.now(timezone.utc)

    # Find cohort name for the response
    cohort_name = None
    cohort_id = result.get("cohort_id")
    for c in cohorts:
        if c.id == cohort_id:
            cohort_name = c.name
            break

    return {
        "score": result["score"],
        "breakdown": result["breakdown"],
        "cohort_id": str(cohort_id) if cohort_id else None,
        "cohort_name": cohort_name,
        "cohort_sort_order": result.get("cohort_sort_order"),
        "reason": result.get("reason"),
    }


def _patch_utilisation_for_proxy(
    components: list[dict[str, Any]],
    care_gaps: list | None,
) -> None:
    """Replace utilisation component's scoring table with a pre-resolved proxy config.

    Since we have no encounter data, we use care_gaps count to derive a proxy score.
    We rewrite the scoring table so the engine's UtilisationComponent sees a match.
    """
    proxy_score = _score_utilisation_proxy(care_gaps)

    for comp in components:
        if comp.get("data_source") == "utilisation" and comp.get("_use_proxy"):
            # Replace the scoring table with a single row that always matches
            comp["scoring_table"] = [
                {
                    "criterion": f"Proxy: {len(care_gaps or [])} care gaps",
                    "er_visits": None,
                    "hospitalisations": None,
                    "dka": False,
                    "points": proxy_score,
                },
            ]
            break
