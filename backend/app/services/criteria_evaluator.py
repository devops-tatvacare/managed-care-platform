"""Generic criteria evaluator for AND/OR criteria trees.

Evaluates a CohortCriteria tree against patient data. Used by the cohortisation
engine to determine which cohort a patient matches (criteria-only assignment).

Rule evaluators are registered by rule_type. Each evaluator takes the rule config
and patient data and returns True/False.
"""

from __future__ import annotations

from typing import Any, Callable

from app.engine.base import PatientData
from app.models.cohort import CohortCriteria


# ── Rule evaluators ────────────────────────────────────────────────────────

def _eval_diagnosis(config: dict[str, Any], data: PatientData) -> bool:
    """Match ICD-10 codes by prefix."""
    codes = config.get("icd10_codes", [])
    match_type = config.get("match_type", "prefix")
    include = config.get("include", True)

    matched = False
    for code in codes:
        if match_type == "exact":
            matched = code in data.active_diagnosis_codes
        else:
            matched = any(dc.startswith(code) for dc in data.active_diagnosis_codes)
        if matched:
            break

    return matched if include else not matched


def _eval_lab(config: dict[str, Any], data: PatientData) -> bool:
    """Check lab value against threshold."""
    field = config.get("test_type", config.get("field", "")).lower()
    val = data.latest_labs.get(field)
    if val is None:
        return False
    op = config.get("operator", "gte")
    threshold = config.get("value", 0)
    upper = config.get("value_upper")

    if op == "gte":
        return val >= threshold
    elif op == "lte":
        return val <= threshold
    elif op == "gt":
        return val > threshold
    elif op == "lt":
        return val < threshold
    elif op == "eq":
        return val == threshold
    elif op == "between" and upper is not None:
        return threshold <= val <= upper
    return False


def _eval_demographics(config: dict[str, Any], data: PatientData) -> bool:
    """Check age, BMI, gender."""
    # BMI check
    bmi_threshold = config.get("bmi_threshold")
    if bmi_threshold is not None:
        bmi = data.latest_labs.get("bmi")
        if bmi is None:
            return False
        op = config.get("bmi_operator", "gte")
        if op == "gte" and bmi < bmi_threshold:
            return False
        if op == "lte" and bmi > bmi_threshold:
            return False
    return True


def _eval_pharmacy(config: dict[str, Any], data: PatientData) -> bool:
    """Check PDC threshold."""
    threshold = config.get("pdc_threshold", 0.8)
    op = config.get("pdc_operator", "gte")
    meds = data.medications
    if not meds:
        return op == "gte"  # No meds = fully adherent

    pdc_vals = [m.get("pdc_90day", 1.0) for m in meds if m.get("pdc_90day") is not None]
    if not pdc_vals:
        return op == "gte"

    worst = min(pdc_vals)
    if op == "gte":
        return worst >= threshold
    elif op == "lte":
        return worst <= threshold
    elif op == "lt":
        return worst < threshold
    return False


def _eval_utilisation(config: dict[str, Any], data: PatientData) -> bool:
    """Check ER visits / hospitalisations."""
    event_type = config.get("event_type", "er_visit")
    count_threshold = config.get("count_threshold", 1)

    if event_type == "er_visit":
        return data.utilisation.get("er_visits_12mo", 0) >= count_threshold
    elif event_type == "hospitalisation":
        return data.utilisation.get("hospitalisations_12mo", 0) >= count_threshold
    elif event_type == "dka":
        return bool(data.utilisation.get("dka_12mo", False))
    return False


def _eval_sdoh(config: dict[str, Any], data: PatientData) -> bool:
    """Check SDOH flags."""
    domain = config.get("domain")
    if domain:
        return data.sdoh_flags.get(domain, False)
    # Count-based
    threshold = config.get("count_threshold", 1)
    count = sum(1 for v in data.sdoh_flags.values() if v is True)
    return count >= threshold


def _eval_exclusion(config: dict[str, Any], data: PatientData) -> bool:
    """Exclusion rule — returns True if patient should be EXCLUDED."""
    codes = config.get("icd10_codes", [])
    for code in codes:
        if any(dc.startswith(code) for dc in data.active_diagnosis_codes):
            return True
    return False


RULE_EVALUATORS: dict[str, Callable[[dict[str, Any], PatientData], bool]] = {
    "diagnosis": _eval_diagnosis,
    "lab": _eval_lab,
    "demographics": _eval_demographics,
    "pharmacy": _eval_pharmacy,
    "utilisation": _eval_utilisation,
    "sdoh": _eval_sdoh,
    "exclusion": _eval_exclusion,
}


# ── Tree evaluator ─────────────────────────────────────────────────────────

def evaluate_criteria_tree(
    criteria: list[CohortCriteria],
    patient_data: PatientData,
) -> bool:
    """Evaluate an AND/OR criteria tree. Top-level list is implicitly AND.

    Group nodes have group_operator ("AND" | "OR") and children.
    Leaf nodes have rule_type and config.
    """
    if not criteria:
        return True  # No criteria = matches all

    # Filter to root-level nodes (no parent)
    roots = [c for c in criteria if c.parent_group_id is None]
    if not roots:
        return True

    # Implicitly AND all root nodes
    return all(_evaluate_node(node, criteria, patient_data) for node in roots)


def _evaluate_node(
    node: CohortCriteria,
    all_criteria: list[CohortCriteria],
    patient_data: PatientData,
) -> bool:
    """Evaluate a single criteria node (group or leaf)."""
    if node.group_operator:
        # Group node — find children
        children = [c for c in all_criteria if c.parent_group_id == node.id]
        if not children:
            return True
        if node.group_operator == "OR":
            return any(_evaluate_node(child, all_criteria, patient_data) for child in children)
        else:  # AND
            return all(_evaluate_node(child, all_criteria, patient_data) for child in children)

    # Leaf node
    if node.rule_type and node.config:
        evaluator = RULE_EVALUATORS.get(node.rule_type)
        if evaluator:
            result = evaluator(node.config, patient_data)
            # Exclusion rules invert: if patient matches exclusion, they DON'T match the cohort
            if node.rule_type == "exclusion":
                return not result
            return result

    return True  # Unknown rule type = pass
