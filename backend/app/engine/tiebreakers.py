"""Generic tiebreaker rule evaluation.

Reads tiebreaker_rules JSON from the scoring engine config and applies them
in priority order. Each rule has an action type that determines behaviour.

Supported actions:
  - assign_cohort: force a specific cohort (by sort_order) regardless of score
  - min_cohort_or_escalate: ensure minimum cohort, escalate if score above threshold
  - min_cohort: ensure minimum cohort sort_order
  - escalate_cohort: if current cohort matches from_sort_order, escalate to to_sort_order
"""

from __future__ import annotations

from typing import Any

from app.engine.base import PatientData


def apply_tiebreakers(
    score: int,
    cohort_sort_order: int,
    patient_data: PatientData,
    tiebreaker_rules: list[dict[str, Any]],
) -> tuple[int, str | None]:
    """Apply tiebreaker rules. Returns (final_sort_order, reason_or_None)."""
    rules = sorted(tiebreaker_rules, key=lambda r: r.get("priority", 99))

    for rule in rules:
        action = rule["action"]
        condition = rule.get("condition", {})

        if not _evaluate_condition(condition, patient_data):
            continue

        if action == "assign_cohort":
            return rule["target_sort_order"], rule.get("rule", "Tiebreaker override")

        elif action == "min_cohort_or_escalate":
            min_so = rule["min_sort_order"]
            if cohort_sort_order < min_so:
                cohort_sort_order = min_so
            if score >= rule.get("escalate_if_score_gte", 999):
                cohort_sort_order = rule["escalate_sort_order"]
            return cohort_sort_order, rule.get("rule", "Tiebreaker override")

        elif action == "min_cohort":
            min_so = rule["min_sort_order"]
            if cohort_sort_order < min_so:
                return min_so, rule.get("rule", "Tiebreaker override")

        elif action == "escalate_cohort":
            if cohort_sort_order == rule.get("from_sort_order"):
                return rule["to_sort_order"], rule.get("rule", "Tiebreaker override")

    return cohort_sort_order, None


def _evaluate_condition(condition: dict[str, Any], patient_data: PatientData) -> bool:
    """Evaluate a tiebreaker condition against patient data."""
    ctype = condition.get("type")

    if ctype == "has_diagnosis_prefix":
        prefixes = condition.get("prefixes", [])
        return any(
            code.startswith(p)
            for code in patient_data.active_diagnosis_codes
            for p in prefixes
        )

    elif ctype == "has_dka":
        return bool(patient_data.utilisation.get("dka_12mo", False))

    elif ctype == "lab_gte":
        field = condition.get("field", "").lower()
        threshold = condition.get("value", 999)
        val = patient_data.latest_labs.get(field)
        return val is not None and val >= threshold

    elif ctype == "has_tier_hard_criteria":
        # Composite check: HbA1c 8-10, PDC < 80, complication diagnoses, ER/hosp
        hba1c = patient_data.latest_labs.get("hba1c")
        if hba1c is not None and 8.0 <= hba1c < 10.0:
            return True
        meds = patient_data.medications
        if meds:
            pdc_vals = [m.get("pdc_90day", 1.0) * 100 for m in meds if m.get("pdc_90day") is not None]
            if pdc_vals and min(pdc_vals) < 80:
                return True
        comp_prefixes = condition.get("diagnosis_prefixes", [])
        if any(code.startswith(p) for code in patient_data.active_diagnosis_codes for p in comp_prefixes):
            return True
        util = patient_data.utilisation
        if util.get("er_visits_12mo", 0) >= 1 or util.get("hospitalisations_12mo", 0) >= 1:
            return True
        return False

    # Unknown condition type → does not match
    return False
