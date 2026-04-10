"""Weighted sum aggregator — default aggregation method."""

from __future__ import annotations

from typing import Any

from app.engine.base import Aggregator, ComponentResult


class WeightedSumAggregator(Aggregator):
    def aggregate(
        self,
        component_results: list[ComponentResult],
        config: dict[str, Any],
    ) -> int:
        total = sum(cr.weighted for cr in component_results)
        return min(round(total), 100)
