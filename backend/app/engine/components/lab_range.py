"""Lab range scoring component.

Scores patients based on a lab value falling into defined ranges.
Supports a primary scoring table (pick first match) and optional bonus table (additive).

Config schema (from scoring_engines.components[]):
  {
    "data_source": "lab_range",
    "field": "hba1c",
    "proxy_field": "fpg",
    "proxy_map": [
      {"min": 126, "max": null, "mapped_value": 7.0},
      {"min": 100, "max": 126,  "mapped_value": 5.8},
      {"min": null, "max": 100, "mapped_value": 5.0}
    ],
    "scoring_table": [
      {"criterion": "...", "min": null, "max": 5.7, "points": 0},
      {"criterion": "...", "min": 5.7,  "max": 6.5, "points": 20},
      ...
    ],
    "bonus_table": [
      {"criterion": "...", "field": "tir", "min": null, "max": 50, "points": 10},
      ...
    ]
  }
"""

from __future__ import annotations

from typing import Any

from app.engine.base import PatientData, ScoringComponent


class LabRangeComponent(ScoringComponent):
    def score(self, patient_data: PatientData, config: dict[str, Any]) -> int:
        field = config["field"].lower()
        value = patient_data.latest_labs.get(field)

        # Proxy fallback
        if value is None and config.get("proxy_field"):
            proxy_val = patient_data.latest_labs.get(config["proxy_field"].lower())
            if proxy_val is not None:
                value = self._apply_proxy_map(proxy_val, config.get("proxy_map", []))

        if value is None:
            return 0

        # Primary scoring table — first match wins
        base = 0
        for row in config.get("scoring_table", []):
            if _in_range(value, row.get("min"), row.get("max")):
                base = row["points"]
                break

        # Bonus table — additive
        bonus = 0
        for row in config.get("bonus_table", []):
            bonus_field = row["field"].lower()
            bonus_val = patient_data.latest_labs.get(bonus_field)
            if bonus_val is not None and _in_range(bonus_val, row.get("min"), row.get("max")):
                bonus += row["points"]

        return base + bonus

    @staticmethod
    def _apply_proxy_map(proxy_val: float, proxy_map: list[dict]) -> float | None:
        for mapping in proxy_map:
            if _in_range(proxy_val, mapping.get("min"), mapping.get("max")):
                return mapping["mapped_value"]
        return None


def _in_range(value: float, r_min: float | None, r_max: float | None) -> bool:
    """Check if value is in [r_min, r_max). None = unbounded."""
    if r_min is not None and value < r_min:
        return False
    if r_max is not None and value >= r_max:
        return False
    return True
