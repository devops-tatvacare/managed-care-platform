"""CRS (Clinical Risk Score) Calculation Engine.

Pure functions — no database access. Takes patient data + CRS config JSON,
returns scores, tiers, and tiebreaker results.
"""

from __future__ import annotations

from typing import Any

from app.models.patient import Patient, PatientDiagnosis, PatientLab


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _latest_lab(labs: list[PatientLab], test_type: str) -> float | None:
    """Return the value of the most recent lab matching *test_type* (case-insensitive)."""
    matches = [l for l in labs if l.test_type.lower() == test_type.lower()]
    if not matches:
        return None
    matches.sort(key=lambda l: l.recorded_at, reverse=True)
    return matches[0].value


def _value_in_range(value: float, row_min: float | None, row_max: float | None) -> bool:
    """Check if *value* falls within [row_min, row_max).

    None means unbounded on that side.
    """
    if row_min is not None and value < row_min:
        return False
    if row_max is not None and value >= row_max:
        return False
    return True


def _active_diagnoses(diagnoses: list[PatientDiagnosis]) -> list[PatientDiagnosis]:
    return [d for d in diagnoses if d.is_active]


def _has_diagnosis_prefix(diagnoses: list[PatientDiagnosis], prefixes: list[str]) -> bool:
    """Return True if any active diagnosis icd10_code starts with any of *prefixes*."""
    for d in _active_diagnoses(diagnoses):
        for prefix in prefixes:
            if d.icd10_code.startswith(prefix):
                return True
    return False


# ---------------------------------------------------------------------------
# Component scorers
# ---------------------------------------------------------------------------

def _score_glycaemic(component: dict, labs: list[PatientLab]) -> int:
    """Score Glycaemic Control component."""
    hba1c = _latest_lab(labs, "HbA1c")

    if hba1c is None:
        # Use FPG as proxy
        fpg = _latest_lab(labs, "FPG")
        if fpg is None:
            return 0
        if fpg >= 126:
            hba1c = 7.0
        elif fpg >= 100:
            hba1c = 5.8
        else:
            hba1c = 5.0

    # Match scoring_table
    base = 0
    for row in component["scoring_table"]:
        if _value_in_range(hba1c, row.get("min"), row.get("max")):
            base = row["points"]
            break

    # Bonus points (CGM data)
    bonus = 0
    for row in component.get("bonus_table", []):
        field = row["field"]
        val = _latest_lab(labs, field)
        if val is None:
            continue
        row_min = row.get("min")
        row_max = row.get("max")
        # Bonus triggers: value >= min (if min set) OR value < max (if max set)
        if row_min is not None and row_max is not None:
            if row_min <= val < row_max:
                bonus += row["points"]
        elif row_min is not None:
            if val >= row_min:
                bonus += row["points"]
        elif row_max is not None:
            if val < row_max:
                bonus += row["points"]

    return base + bonus


def _score_complication(
    component: dict,
    labs: list[PatientLab],
    diagnoses: list[PatientDiagnosis],
) -> int:
    """Score Complication Burden — sum all matching rows, then cap."""
    total = 0
    for row in component["scoring_table"]:
        rtype = row.get("type", "default")
        if rtype == "default":
            continue
        if rtype == "lab":
            val = _latest_lab(labs, row["field"])
            if val is None:
                continue
            r_min = row.get("min")
            r_max = row.get("max")
            if r_min is not None and val < r_min:
                continue
            if r_max is not None and val > r_max:
                continue
            total += row["points"]
        elif rtype == "diagnosis":
            if _has_diagnosis_prefix(diagnoses, row["icd10_prefix"]):
                total += row["points"]
    return total


def _score_adherence(component: dict, patient: Patient, labs: list[PatientLab]) -> int:
    """Score Behavioural/Adherence — worst PDC across active meds."""
    meds = patient.active_medications or []

    if not meds:
        # No medications → fully adherent (no score)
        worst_pdc = 100.0
    else:
        pdc_values = []
        for med in meds:
            raw = med.get("pdc_90day")
            if raw is not None:
                pdc_values.append(raw * 100.0)  # decimal → percentage
        worst_pdc = min(pdc_values) if pdc_values else 100.0

    # Match PDC scoring_table
    base = 0
    for row in component["scoring_table"]:
        if row.get("type") != "pdc":
            continue
        if _value_in_range(worst_pdc, row.get("min"), row.get("max")):
            base = row["points"]
            break

    # Bonus points (questionnaires / engagement)
    bonus = 0
    for row in component.get("bonus_table", []):
        field = row["field"]
        val = _latest_lab(labs, field)
        if val is None:
            continue
        row_min = row.get("min")
        row_max = row.get("max")
        if row_min is not None and row_max is not None:
            if row_min <= val < row_max:
                bonus += row["points"]
        elif row_min is not None:
            if val >= row_min:
                bonus += row["points"]
        elif row_max is not None:
            if val < row_max:
                bonus += row["points"]

    return base + bonus


def _score_utilisation(component: dict, patient: Patient) -> int:
    """Score Utilisation — highest matching row wins."""
    breakdown = patient.crs_breakdown or {}
    er = breakdown.get("er_visits_12mo", 0) or 0
    hosp = breakdown.get("hospitalisations_12mo", 0) or 0
    dka = breakdown.get("dka_12mo", False) or False

    best = 0
    for row in component["scoring_table"]:
        match = True

        # DKA check
        if row.get("dka") is True:
            if not dka:
                match = False
        elif row.get("dka") is False:
            # row requires no DKA — but we don't disqualify; the row just
            # doesn't cover DKA scenarios specifically
            pass

        # ER visits check
        row_er = row.get("er_visits")
        if row_er is not None:
            if row_er == 0 and er != 0:
                match = False
            elif row_er > 0 and er < row_er:
                match = False

        # Hospitalisations check
        row_hosp = row.get("hospitalisations")
        if row_hosp is not None:
            if row_hosp == 0 and hosp != 0:
                match = False
            elif row_hosp > 0 and hosp < row_hosp:
                match = False

        if match and row["points"] > best:
            best = row["points"]

    return best


def _score_sdoh(component: dict, patient: Patient) -> int:
    """Score SDOH Burden — count True flags, match domain_count."""
    flags = patient.sdoh_flags or {}
    count = sum(1 for v in flags.values() if v is True)

    score = 0
    for row in component["scoring_table"]:
        dc = row["domain_count"]
        # domain_count acts as "this many or more" for the highest bracket
        if count >= dc:
            score = row["points"]
        # keep iterating to find the best match (rows are ascending)
    return score


# ---------------------------------------------------------------------------
# Component dispatcher
# ---------------------------------------------------------------------------

_SCORERS: dict[str, str] = {
    "Glycaemic Control": "glycaemic",
    "Complication Burden": "complication",
    "Behavioural/Adherence": "adherence",
    "Utilisation": "utilisation",
    "SDOH Burden": "sdoh",
}


def _score_component(
    component: dict,
    patient: Patient,
    labs: list[PatientLab],
    diagnoses: list[PatientDiagnosis],
) -> int:
    """Dispatch to the correct scorer and return the raw (uncapped) score."""
    name = component["name"]
    key = _SCORERS.get(name)
    if key == "glycaemic":
        return _score_glycaemic(component, labs)
    if key == "complication":
        return _score_complication(component, labs, diagnoses)
    if key == "adherence":
        return _score_adherence(component, patient, labs)
    if key == "utilisation":
        return _score_utilisation(component, patient)
    if key == "sdoh":
        return _score_sdoh(component, patient)
    return 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def calculate_crs(
    patient: Patient,
    labs: list[PatientLab],
    diagnoses: list[PatientDiagnosis],
    config_components: list[dict[str, Any]],
) -> dict[str, Any]:
    """Calculate the full CRS from patient data and config JSON.

    Returns::

        {
            "total": int,
            "components": {
                "Glycaemic Control": {"raw": int, "weighted": float},
                ...
            }
        }
    """
    components_out: dict[str, dict[str, float]] = {}
    total = 0.0

    for comp in config_components:
        raw = _score_component(comp, patient, labs, diagnoses)
        cap = comp.get("cap", 100)
        raw = min(raw, cap)
        weight = comp.get("weight", 0.0)
        weighted = raw * weight
        components_out[comp["name"]] = {"raw": raw, "weighted": round(weighted, 2)}
        total += weighted

    return {
        "total": round(total),
        "components": components_out,
    }


def map_score_to_tier(crs_score: int, tier_thresholds: list[dict[str, Any]]) -> int:
    """Map a CRS score to a tier number using threshold ranges."""
    for t in tier_thresholds:
        if t["crs_min"] <= crs_score <= t["crs_max"]:
            return t["tier"]
    # If above all thresholds, return highest tier
    if tier_thresholds:
        return max(t["tier"] for t in tier_thresholds)
    return 0


def apply_tiebreakers(
    crs_score: int,
    tier_number: int,
    patient: Patient,
    labs: list[PatientLab],
    diagnoses: list[PatientDiagnosis],
    tiebreaker_rules: list[dict[str, Any]],
) -> tuple[int, str | None]:
    """Apply tiebreaker rules in priority order.

    Returns (final_tier, reason_string_or_None).
    """
    rules = sorted(tiebreaker_rules, key=lambda r: r["priority"])
    final_tier = tier_number
    reason: str | None = None

    # Pre-compute conditions
    breakdown = patient.crs_breakdown or {}
    has_dka = (
        breakdown.get("dka_12mo", False)
        or _has_diagnosis_prefix(diagnoses, ["E10.1", "E11.1", "E13.1"])
    )
    has_t1dm = _has_diagnosis_prefix(diagnoses, ["E10"])
    hba1c = _latest_lab(labs, "HbA1c")

    # Tier 3 hard criteria
    meds = patient.active_medications or []
    pdc_values = [m.get("pdc_90day", 1.0) * 100.0 for m in meds if m.get("pdc_90day") is not None]
    worst_pdc = min(pdc_values) if pdc_values else 100.0

    has_tier3_hard = (
        (hba1c is not None and 8.0 <= hba1c < 10.0)
        or worst_pdc < 80.0
        or _has_diagnosis_prefix(diagnoses, ["E11.4", "E11.31"])
        or breakdown.get("er_visits_12mo", 0) >= 1
        or breakdown.get("hospitalisations_12mo", 0) >= 1
    )

    for rule in rules:
        action = rule["action"]

        if action == "assign_tier":
            # DKA → Tier 4
            if has_dka:
                final_tier = rule["tier"]
                reason = rule["rule"]
                break  # highest priority, stop

        elif action == "min_tier_or_escalate":
            if has_t1dm:
                min_t = rule["min_tier"]
                if final_tier < min_t:
                    final_tier = min_t
                    reason = rule["rule"]
                if crs_score >= rule.get("escalate_if_crs_gte", 999):
                    final_tier = rule["escalate_tier"]
                    reason = rule["rule"]

        elif action == "min_tier":
            if has_tier3_hard and final_tier < rule["min_tier"]:
                final_tier = rule["min_tier"]
                reason = rule["rule"]

        elif action == "escalate_tier":
            if final_tier == rule.get("from_tier"):
                # Check the specific condition — HbA1c >= 5.7 for the Tier 0→1 rule
                should_escalate = False
                if hba1c is not None and hba1c >= 5.7:
                    should_escalate = True
                if should_escalate:
                    final_tier = rule["to_tier"]
                    reason = rule["rule"]

    return final_tier, reason


def get_review_cadence_days(tier_number: int) -> int:
    """Return days until next review for a given tier."""
    cadence = {0: 365, 1: 180, 2: 90, 3: 30, 4: 7}
    return cadence.get(tier_number, 90)
