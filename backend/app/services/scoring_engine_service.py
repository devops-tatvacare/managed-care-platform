"""Scoring engine service.

Orchestrates scoring component execution, aggregation, tiebreaker application,
and cohort mapping for a single patient within a single program.
"""

from __future__ import annotations

from typing import Any

from app.engine.base import ComponentResult, PatientData
from app.engine.component_registry import get_component
from app.engine.aggregators.weighted_sum import WeightedSumAggregator
from app.engine.tiebreakers import apply_tiebreakers
from app.models.cohort import Cohort, ScoringEngine


# Aggregator registry
_AGGREGATORS = {
    "weighted_sum": WeightedSumAggregator,
}


def score_patient(
    patient_data: PatientData,
    engine: ScoringEngine,
    cohorts: list[Cohort],
) -> dict[str, Any]:
    """Score a patient and determine cohort assignment.

    Returns:
        {
            "score": int,
            "breakdown": {"Component Name": {"raw": int, "weighted": float}, ...},
            "cohort_id": UUID,
            "cohort_sort_order": int,
            "reason": str | None,
        }
    """
    # 1. Score each component
    component_results: list[ComponentResult] = []
    breakdown: dict[str, dict[str, float]] = {}

    for comp_config in engine.components:
        data_source = comp_config.get("data_source")
        if not data_source:
            continue

        component = get_component(data_source)
        raw = component.score(patient_data, comp_config)
        cap = comp_config.get("cap", 100)
        raw = min(raw, cap)
        weight = comp_config.get("weight", 0.0)
        weighted = round(raw * (weight / 100.0), 2)

        name = comp_config.get("name", data_source)
        component_results.append(ComponentResult(name=name, raw=raw, weighted=weighted))
        breakdown[name] = {"raw": raw, "weighted": weighted}

    # 2. Aggregate
    agg_method = engine.aggregation_method or "weighted_sum"
    agg_cls = _AGGREGATORS.get(agg_method, WeightedSumAggregator)
    aggregator = agg_cls()
    total_score = aggregator.aggregate(component_results, {})

    # 3. Map score to cohort (by score_range)
    sorted_cohorts = sorted(cohorts, key=lambda c: c.sort_order)
    matched_cohort = sorted_cohorts[-1] if sorted_cohorts else None  # default: highest

    for cohort in sorted_cohorts:
        if cohort.score_range_min is not None and cohort.score_range_max is not None:
            if cohort.score_range_min <= total_score <= cohort.score_range_max:
                matched_cohort = cohort
                break

    if not matched_cohort:
        raise ValueError("No cohorts defined for program")

    cohort_sort_order = matched_cohort.sort_order

    # 4. Apply tiebreakers
    final_sort_order, reason = apply_tiebreakers(
        total_score, cohort_sort_order, patient_data, engine.tiebreaker_rules
    )

    # Resolve final cohort by sort_order
    final_cohort = matched_cohort
    if final_sort_order != cohort_sort_order:
        for c in sorted_cohorts:
            if c.sort_order == final_sort_order:
                final_cohort = c
                break

    return {
        "score": total_score,
        "breakdown": breakdown,
        "cohort_id": final_cohort.id,
        "cohort_sort_order": final_sort_order,
        "reason": reason,
    }
