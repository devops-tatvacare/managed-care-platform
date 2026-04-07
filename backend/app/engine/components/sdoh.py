"""SDOH burden scoring component.

Scores based on count of high-risk SDOH domains.

Config schema:
  {
    "data_source": "sdoh",
    "scoring_table": [
      {"criterion": "...", "domain_count": 0, "points": 0},
      {"criterion": "...", "domain_count": 1, "points": 33},
      {"criterion": "...", "domain_count": 3, "points": 100},
    ]
  }
"""

from __future__ import annotations

from typing import Any

from app.engine.base import PatientData, ScoringComponent


class SDOHComponent(ScoringComponent):
    def score(self, patient_data: PatientData, config: dict[str, Any]) -> int:
        count = sum(1 for v in patient_data.sdoh_flags.values() if v is True)
        result = 0
        for row in config.get("scoring_table", []):
            if count >= row["domain_count"]:
                result = row["points"]
        return result
