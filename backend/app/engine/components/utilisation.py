"""Utilisation scoring component.

Scores based on ER visits, hospitalisations, and DKA events. Highest matching row wins.

Config schema:
  {
    "data_source": "utilisation",
    "scoring_table": [
      {"criterion": "...", "er_visits": 0, "hospitalisations": 0, "dka": false, "points": 0},
      {"criterion": "...", "er_visits": 2, "hospitalisations": 0, "dka": false, "points": 60},
      {"criterion": "...", "er_visits": null, "hospitalisations": null, "dka": true, "points": 85},
      ...
    ]
  }
"""

from __future__ import annotations

from typing import Any

from app.engine.base import PatientData, ScoringComponent


class UtilisationComponent(ScoringComponent):
    def score(self, patient_data: PatientData, config: dict[str, Any]) -> int:
        util = patient_data.utilisation
        er = util.get("er_visits_12mo", 0) or 0
        hosp = util.get("hospitalisations_12mo", 0) or 0
        dka = util.get("dka_12mo", False) or False

        best = 0
        for row in config.get("scoring_table", []):
            if row.get("dka") is True and not dka:
                continue
            row_er = row.get("er_visits")
            if row_er is not None:
                if row_er == 0 and er != 0:
                    continue
                if row_er > 0 and er < row_er:
                    continue
            row_hosp = row.get("hospitalisations")
            if row_hosp is not None:
                if row_hosp == 0 and hosp != 0:
                    continue
                if row_hosp > 0 and hosp < row_hosp:
                    continue
            if row["points"] > best:
                best = row["points"]

        return best
