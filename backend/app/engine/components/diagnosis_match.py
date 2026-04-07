"""Diagnosis match scoring component.

Sums points for all matching diagnosis-based findings. Used for complication burden.

Config schema:
  {
    "data_source": "diagnosis_match",
    "scoring_table": [
      {"criterion": "...", "type": "default", "points": 0},
      {"criterion": "...", "type": "lab", "field": "uacr", "min": 30, "max": 300, "points": 25},
      {"criterion": "...", "type": "diagnosis", "icd10_prefix": ["E11.31"], "points": 20},
      ...
    ]
  }
"""

from __future__ import annotations

from typing import Any

from app.engine.base import PatientData, ScoringComponent


class DiagnosisMatchComponent(ScoringComponent):
    def score(self, patient_data: PatientData, config: dict[str, Any]) -> int:
        total = 0
        for row in config.get("scoring_table", []):
            rtype = row.get("type", "default")

            if rtype == "default":
                continue

            if rtype == "lab":
                val = patient_data.latest_labs.get(row["field"].lower())
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
                prefixes = row.get("icd10_prefix", [])
                if any(
                    code.startswith(p)
                    for code in patient_data.active_diagnosis_codes
                    for p in prefixes
                ):
                    total += row["points"]

        return total
