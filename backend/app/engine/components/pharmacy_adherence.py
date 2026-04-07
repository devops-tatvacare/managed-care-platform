"""Pharmacy adherence scoring component.

Scores based on worst PDC across active medications + optional bonus rules.

Config schema:
  {
    "data_source": "pharmacy_adherence",
    "scoring_table": [
      {"criterion": "...", "type": "pdc", "min": 80, "max": null, "points": 0},
      {"criterion": "...", "type": "pdc", "min": 70, "max": 80,   "points": 20},
      ...
    ],
    "bonus_table": [
      {"criterion": "...", "field": "phq9", "min": 10, "points": 20},
      ...
    ]
  }
"""

from __future__ import annotations

from typing import Any

from app.engine.base import PatientData, ScoringComponent


class PharmacyAdherenceComponent(ScoringComponent):
    def score(self, patient_data: PatientData, config: dict[str, Any]) -> int:
        meds = patient_data.medications
        if not meds:
            worst_pdc = 100.0
        else:
            pdc_values = []
            for med in meds:
                raw = med.get("pdc_90day")
                if raw is not None:
                    pdc_values.append(raw * 100.0)  # decimal → percentage
            worst_pdc = min(pdc_values) if pdc_values else 100.0

        # Match scoring table
        base = 0
        for row in config.get("scoring_table", []):
            if row.get("type") != "pdc":
                continue
            r_min = row.get("min")
            r_max = row.get("max")
            if r_min is not None and worst_pdc < r_min:
                continue
            if r_max is not None and worst_pdc >= r_max:
                continue
            base = row["points"]
            break

        # Bonus (PRO scores from labs)
        bonus = 0
        for row in config.get("bonus_table", []):
            val = patient_data.latest_labs.get(row["field"].lower())
            if val is None:
                continue
            r_min = row.get("min")
            r_max = row.get("max")
            if r_min is not None and val < r_min:
                continue
            if r_max is not None and val >= r_max:
                continue
            bonus += row["points"]

        return base + bonus
