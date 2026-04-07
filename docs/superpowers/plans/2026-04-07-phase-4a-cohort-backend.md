# Phase 4A: Cohort System Backend — Programs, Cohorts, Generic Scoring Engine, Event-Driven Worker, Docker

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the diabetes-specific CRS system with a generic, production-grade cohort engine. Programs contain cohorts (what were "tiers"). A pluggable scoring engine assigns patients to cohorts. An async background worker processes cohortisation events. Docker packaging for local dev.

**Architecture:** New models (Program, ProgramVersion, Cohort, CohortCriteria, ScoringEngine, CohortAssignment, CohortisationEvent). Generic scoring engine with component registry + aggregator pattern. Criteria evaluator with AND/OR tree support. Event-driven worker polling `cohortisation_events`. Old `CRSConfig`, `crs_engine.py`, `cohort_seed.py` replaced entirely. Patient `tier`/`crs_score`/`crs_breakdown` columns removed — cohort membership lives in `cohort_assignments`.

**Tech Stack:** FastAPI, SQLAlchemy 2 (async), Pydantic v2, Docker + docker-compose. No new Python dependencies.

**Spec reference:** `docs/superpowers/specs/2026-04-07-cohort-system-redesign.md` — Sections 2 (DB), 3 (Backend), 5 (Docker), 6 (Seed)

**Critical rules (apply to every task):**
- NO diabetes-specific code in the engine — diabetes is a seeded configuration
- Generic abstractions — scoring components, criteria evaluators, aggregators use registry + base class patterns
- `selectinload` on all relationship queries — no lazy loading
- All endpoints require auth + tenant filtering
- Follow existing patterns (models, schemas, routers, services)

---

## Task 1: New Models — Program, ProgramVersion, Cohort, CohortCriteria

**Files:**
- Create: `backend/app/models/program.py`
- Create: `backend/app/models/cohort.py` (REPLACE existing)
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create `backend/app/models/program.py`**

```python
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Program(Base, TimestampMixin):
    """Top-level care management program (e.g., Diabetes Care, Heart Failure)."""
    __tablename__ = "programs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    condition: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    version: Mapped[int] = mapped_column(Integer, default=1)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )

    cohorts: Mapped[list["Cohort"]] = relationship(
        back_populates="program", cascade="all, delete-orphan",
        order_by="Cohort.sort_order"
    )
    versions: Mapped[list["ProgramVersion"]] = relationship(
        back_populates="program", cascade="all, delete-orphan",
        order_by="ProgramVersion.version.desc()"
    )
    scoring_engine: Mapped["ScoringEngine | None"] = relationship(
        back_populates="program", uselist=False, cascade="all, delete-orphan"
    )


class ProgramVersion(Base):
    """Immutable snapshot of a program at the time of publish."""
    __tablename__ = "program_versions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    program_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    published_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    program: Mapped["Program"] = relationship(back_populates="versions")
```

- [ ] **Step 2: Replace `backend/app/models/cohort.py`**

Delete the existing file entirely and create:

```python
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Cohort(Base, TimestampMixin):
    """A named population segment within a program."""
    __tablename__ = "cohorts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    program_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#e2e8f0")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    review_cadence_days: Mapped[int] = mapped_column(Integer, default=90)
    score_range_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_range_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    member_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    program: Mapped["Program"] = relationship(back_populates="cohorts")
    criteria: Mapped[list["CohortCriteria"]] = relationship(
        back_populates="cohort", cascade="all, delete-orphan",
        order_by="CohortCriteria.sort_order"
    )
    assignments: Mapped[list["CohortAssignment"]] = relationship(
        back_populates="cohort", cascade="all, delete-orphan"
    )


class CohortCriteria(Base):
    """AND/OR criteria tree node. Groups have group_operator + children. Leaves have rule_type + config."""
    __tablename__ = "cohort_criteria"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cohort_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    parent_group_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("cohort_criteria.id", ondelete="CASCADE"), nullable=True
    )
    group_operator: Mapped[str | None] = mapped_column(String(3), nullable=True)
    rule_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    cohort: Mapped["Cohort"] = relationship(back_populates="criteria")
    children: Mapped[list["CohortCriteria"]] = relationship(
        back_populates="parent",
        cascade="all, delete-orphan",
        order_by="CohortCriteria.sort_order",
    )
    parent: Mapped["CohortCriteria | None"] = relationship(
        back_populates="children", remote_side="CohortCriteria.id"
    )


class ScoringEngine(Base, TimestampMixin):
    """Program-level scoring engine. One per program (optional)."""
    __tablename__ = "scoring_engines"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    program_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    components: Mapped[list] = mapped_column(JSON, nullable=False)
    tiebreaker_rules: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    aggregation_method: Mapped[str] = mapped_column(String(20), default="weighted_sum")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    program: Mapped["Program"] = relationship(back_populates="scoring_engine")


class CohortAssignment(Base):
    """Audit log of cohort assignments."""
    __tablename__ = "cohort_assignments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    program_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cohort_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    assignment_type: Mapped[str] = mapped_column(String(20), default="engine")
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    previous_cohort_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("cohorts.id"), nullable=True
    )
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    review_due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    cohort: Mapped["Cohort"] = relationship(back_populates="assignments", foreign_keys=[cohort_id])
    patient: Mapped["Patient"] = relationship(lazy="raise")


class CohortisationEvent(Base):
    """Event queue for the cohortisation worker."""
    __tablename__ = "cohortisation_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    event_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 3: Update `backend/app/models/__init__.py`**

```python
from app.models.base import Base
from app.models.tenant import Tenant, TenantConfig
from app.models.user import User, RefreshToken
from app.models.role import Role
from app.models.patient import Patient, PatientLab, PatientDiagnosis
from app.models.pathway import Pathway, PathwayBlock, PathwayEdge
from app.models.ai_session import AISession
from app.models.program import Program, ProgramVersion
from app.models.cohort import (
    Cohort, CohortCriteria, ScoringEngine,
    CohortAssignment, CohortisationEvent,
)

__all__ = [
    "Base", "Tenant", "TenantConfig", "User", "RefreshToken", "Role",
    "Patient", "PatientLab", "PatientDiagnosis",
    "Pathway", "PathwayBlock", "PathwayEdge",
    "AISession",
    "Program", "ProgramVersion",
    "Cohort", "CohortCriteria", "ScoringEngine",
    "CohortAssignment", "CohortisationEvent",
]
```

- [ ] **Step 4: Remove Patient.tier, Patient.crs_score, Patient.crs_breakdown columns**

In `backend/app/models/patient.py`, delete these three lines:

```python
    tier: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    crs_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    crs_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
```

- [ ] **Step 5: Delete DB, verify server starts**

```bash
rm -f backend/data/care-admin.db
cd backend && source .venv/bin/activate && timeout 5 python -m uvicorn app.main:app --port 8000 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(cohort): new models — Program, Cohort, CohortCriteria, ScoringEngine, CohortAssignment, CohortisationEvent"
```

---

## Task 2: Generic Scoring Engine — Base Classes, Component Registry, Concrete Components

**Files:**
- Create: `backend/app/engine/__init__.py`
- Create: `backend/app/engine/base.py`
- Create: `backend/app/engine/component_registry.py`
- Create: `backend/app/engine/components/__init__.py`
- Create: `backend/app/engine/components/lab_range.py`
- Create: `backend/app/engine/components/diagnosis_match.py`
- Create: `backend/app/engine/components/pharmacy_adherence.py`
- Create: `backend/app/engine/components/utilisation.py`
- Create: `backend/app/engine/components/sdoh.py`
- Create: `backend/app/engine/aggregators/__init__.py`
- Create: `backend/app/engine/aggregators/weighted_sum.py`
- Create: `backend/app/engine/tiebreakers.py`
- Delete: `backend/app/services/crs_engine.py`

- [ ] **Step 1: Create `backend/app/engine/__init__.py`**

Empty file.

- [ ] **Step 2: Create `backend/app/engine/base.py`**

```python
"""Abstract base classes for scoring engine components and aggregators."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class PatientData:
    """Normalised patient data bundle passed to scoring components."""
    latest_labs: dict[str, float]          # test_type (lowercase) → most recent value
    active_diagnosis_codes: list[str]      # ICD-10 codes of active diagnoses
    medications: list[dict[str, Any]]      # [{name, dose, frequency, pdc_90day}, ...]
    sdoh_flags: dict[str, bool]            # {food_insecurity: True, ...}
    utilisation: dict[str, Any]            # {er_visits_12mo, hospitalisations_12mo, dka_12mo}


@dataclass
class ComponentResult:
    """Result from a single scoring component."""
    name: str
    raw: int
    weighted: float


class ScoringComponent(ABC):
    """Base class for all scoring components.

    Subclasses implement `score()` which reads the component config (from JSON)
    and patient data, returning a raw score (0 to cap).
    """

    @abstractmethod
    def score(self, patient_data: PatientData, config: dict[str, Any]) -> int:
        """Evaluate patient data against this component's config.
        Returns raw score (0 to cap). Capping is done by the caller."""
        ...


class Aggregator(ABC):
    """Combines component scores into a final composite score."""

    @abstractmethod
    def aggregate(
        self,
        component_results: list[ComponentResult],
        config: dict[str, Any],
    ) -> int:
        """Returns final composite score (0-100)."""
        ...
```

- [ ] **Step 3: Create `backend/app/engine/components/__init__.py`**

Empty file.

- [ ] **Step 4: Create `backend/app/engine/components/lab_range.py`**

```python
"""Lab range scoring component.

Scores patients based on a lab value falling into defined ranges.
Supports a primary scoring table (pick first match) and optional bonus table (additive).

Config schema (from scoring_engines.components[]):
  {
    "data_source": "lab_range",
    "field": "hba1c",                   # lab test_type to look up
    "proxy_field": "fpg",               # optional: fallback if primary missing
    "proxy_map": [                      # optional: how to convert proxy to primary scale
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
```

- [ ] **Step 5: Create `backend/app/engine/components/diagnosis_match.py`**

```python
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
```

- [ ] **Step 6: Create `backend/app/engine/components/pharmacy_adherence.py`**

```python
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
```

- [ ] **Step 7: Create `backend/app/engine/components/utilisation.py`**

```python
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
```

- [ ] **Step 8: Create `backend/app/engine/components/sdoh.py`**

```python
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
```

- [ ] **Step 9: Create `backend/app/engine/component_registry.py`**

```python
"""Registry of scoring component types. Maps data_source strings to component classes."""

from app.engine.base import ScoringComponent
from app.engine.components.lab_range import LabRangeComponent
from app.engine.components.diagnosis_match import DiagnosisMatchComponent
from app.engine.components.pharmacy_adherence import PharmacyAdherenceComponent
from app.engine.components.utilisation import UtilisationComponent
from app.engine.components.sdoh import SDOHComponent

COMPONENT_REGISTRY: dict[str, type[ScoringComponent]] = {
    "lab_range": LabRangeComponent,
    "diagnosis_match": DiagnosisMatchComponent,
    "pharmacy_adherence": PharmacyAdherenceComponent,
    "utilisation": UtilisationComponent,
    "sdoh": SDOHComponent,
}


def get_component(data_source: str) -> ScoringComponent:
    """Instantiate a scoring component by its data_source key."""
    cls = COMPONENT_REGISTRY.get(data_source)
    if cls is None:
        raise ValueError(f"Unknown scoring component data_source: {data_source}")
    return cls()
```

- [ ] **Step 10: Create `backend/app/engine/aggregators/__init__.py`**

Empty file.

- [ ] **Step 11: Create `backend/app/engine/aggregators/weighted_sum.py`**

```python
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
        return round(total)
```

- [ ] **Step 12: Create `backend/app/engine/tiebreakers.py`**

```python
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
```

- [ ] **Step 13: Delete old engine**

```bash
rm -f backend/app/services/crs_engine.py
```

- [ ] **Step 14: Commit**

```bash
git add -A && git commit -m "feat(engine): generic scoring engine with component registry, aggregators, and tiebreakers"
```

---

## Task 3: Criteria Evaluator — AND/OR Tree Evaluation

**Files:**
- Create: `backend/app/services/criteria_evaluator.py`

- [ ] **Step 1: Create `backend/app/services/criteria_evaluator.py`**

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat(criteria): generic AND/OR criteria tree evaluator with rule type registry"
```

---

## Task 4: Scoring Engine Service — Orchestrates Components + Aggregation

**Files:**
- Create: `backend/app/services/scoring_engine_service.py`

- [ ] **Step 1: Create `backend/app/services/scoring_engine_service.py`**

```python
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
        weighted = round(raw * weight, 2)

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
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat(engine): scoring engine service — orchestrates components, aggregation, tiebreakers"
```

---

## Task 5: Patient Data Normaliser — Builds PatientData from ORM Models

**Files:**
- Create: `backend/app/services/patient_data.py`

- [ ] **Step 1: Create `backend/app/services/patient_data.py`**

```python
"""Normalises ORM patient models into the PatientData bundle consumed by the engine."""

from __future__ import annotations

from app.engine.base import PatientData
from app.models.patient import Patient, PatientDiagnosis, PatientLab


def build_patient_data(
    patient: Patient,
    labs: list[PatientLab],
    diagnoses: list[PatientDiagnosis],
) -> PatientData:
    """Build a PatientData bundle from ORM models."""
    # Latest lab per test type
    latest_labs: dict[str, tuple[float, float]] = {}  # key → (timestamp, value)
    for lab in labs:
        key = lab.test_type.lower()
        ts = lab.recorded_at.timestamp() if lab.recorded_at else 0
        if key not in latest_labs or ts > latest_labs[key][0]:
            latest_labs[key] = (ts, lab.value)

    # Active diagnosis codes
    active_codes = [d.icd10_code for d in diagnoses if d.is_active]

    # Medications
    medications = patient.active_medications or []

    # SDOH flags
    sdoh_flags = patient.sdoh_flags or {}

    # Utilisation (from legacy crs_breakdown or empty)
    util: dict = {}
    # For now, utilisation data isn't in a dedicated model — it may come from
    # claims or be stored elsewhere. Default to empty.

    return PatientData(
        latest_labs={k: v[1] for k, v in latest_labs.items()},
        active_diagnosis_codes=active_codes,
        medications=medications,
        sdoh_flags=sdoh_flags,
        utilisation=util,
    )
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: patient data normaliser — ORM models to PatientData bundle"
```

---

## Task 6: Program & Cohort Services — CRUD + Versioning

**Files:**
- Create: `backend/app/services/program_service.py`
- Rewrite: `backend/app/services/cohort_service.py`

- [ ] **Step 1: Create `backend/app/services/program_service.py`**

```python
"""Program CRUD + versioning service."""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.program import Program, ProgramVersion
from app.models.cohort import Cohort, ScoringEngine


async def list_programs(db: AsyncSession, tenant_id: uuid.UUID) -> list[Program]:
    result = await db.execute(
        select(Program)
        .where(Program.tenant_id == tenant_id)
        .options(
            selectinload(Program.cohorts),
            selectinload(Program.scoring_engine),
        )
        .order_by(Program.created_at.desc())
    )
    return list(result.scalars().all())


async def get_program(db: AsyncSession, tenant_id: uuid.UUID, program_id: uuid.UUID) -> Program | None:
    result = await db.execute(
        select(Program)
        .where(Program.id == program_id, Program.tenant_id == tenant_id)
        .options(
            selectinload(Program.cohorts).selectinload(Cohort.criteria),
            selectinload(Program.scoring_engine),
            selectinload(Program.versions),
        )
    )
    return result.scalar_one_or_none()


async def create_program(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    created_by: uuid.UUID,
    data: dict,
) -> Program:
    program = Program(
        tenant_id=tenant_id,
        created_by=created_by,
        name=data["name"],
        slug=data.get("slug", data["name"].lower().replace(" ", "-")),
        condition=data.get("condition"),
        description=data.get("description"),
        status=data.get("status", "draft"),
    )
    db.add(program)
    await db.commit()
    await db.refresh(program)
    return program


async def update_program(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    data: dict,
) -> Program | None:
    program = await get_program(db, tenant_id, program_id)
    if not program:
        return None
    for key in ("name", "slug", "condition", "description", "status"):
        if key in data:
            setattr(program, key, data[key])
    await db.commit()
    await db.refresh(program)
    return program


async def publish_program(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ProgramVersion | None:
    program = await get_program(db, tenant_id, program_id)
    if not program:
        return None

    program.version += 1
    program.status = "active"
    program.published_at = datetime.now(timezone.utc)
    program.published_by = user_id

    # Build snapshot
    snapshot = {
        "name": program.name,
        "condition": program.condition,
        "description": program.description,
        "cohorts": [
            {
                "id": str(c.id),
                "name": c.name,
                "slug": c.slug,
                "color": c.color,
                "sort_order": c.sort_order,
                "score_range_min": c.score_range_min,
                "score_range_max": c.score_range_max,
                "review_cadence_days": c.review_cadence_days,
            }
            for c in program.cohorts
        ],
        "scoring_engine": None,
    }
    if program.scoring_engine:
        snapshot["scoring_engine"] = {
            "components": program.scoring_engine.components,
            "tiebreaker_rules": program.scoring_engine.tiebreaker_rules,
            "aggregation_method": program.scoring_engine.aggregation_method,
        }

    version = ProgramVersion(
        program_id=program.id,
        version=program.version,
        snapshot=snapshot,
        published_by=user_id,
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return version
```

- [ ] **Step 2: Rewrite `backend/app/services/cohort_service.py`**

Delete the existing file and create:

```python
"""Cohort CRUD, assignment queries, and distribution stats."""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cohort import (
    Cohort, CohortAssignment, CohortCriteria, CohortisationEvent, ScoringEngine,
)
from app.models.patient import Patient


# ── Cohort CRUD ────────────────────────────────────────────────────────────

async def list_cohorts(
    db: AsyncSession, tenant_id: uuid.UUID, program_id: uuid.UUID,
) -> list[Cohort]:
    result = await db.execute(
        select(Cohort)
        .where(Cohort.tenant_id == tenant_id, Cohort.program_id == program_id)
        .options(selectinload(Cohort.criteria))
        .order_by(Cohort.sort_order)
    )
    return list(result.scalars().all())


async def get_cohort(
    db: AsyncSession, tenant_id: uuid.UUID, cohort_id: uuid.UUID,
) -> Cohort | None:
    result = await db.execute(
        select(Cohort)
        .where(Cohort.id == cohort_id, Cohort.tenant_id == tenant_id)
        .options(selectinload(Cohort.criteria))
    )
    return result.scalar_one_or_none()


async def create_cohort(
    db: AsyncSession, tenant_id: uuid.UUID, program_id: uuid.UUID, data: dict,
) -> Cohort:
    cohort = Cohort(
        tenant_id=tenant_id,
        program_id=program_id,
        name=data["name"],
        slug=data.get("slug", data["name"].lower().replace(" ", "-")),
        description=data.get("description"),
        color=data.get("color", "#e2e8f0"),
        sort_order=data.get("sort_order", 0),
        review_cadence_days=data.get("review_cadence_days", 90),
        score_range_min=data.get("score_range_min"),
        score_range_max=data.get("score_range_max"),
    )
    db.add(cohort)
    await db.commit()
    await db.refresh(cohort)
    return cohort


async def update_cohort(
    db: AsyncSession, tenant_id: uuid.UUID, cohort_id: uuid.UUID, data: dict,
) -> Cohort | None:
    cohort = await get_cohort(db, tenant_id, cohort_id)
    if not cohort:
        return None
    for key in ("name", "slug", "description", "color", "sort_order",
                "review_cadence_days", "score_range_min", "score_range_max"):
        if key in data:
            setattr(cohort, key, data[key])
    await db.commit()
    await db.refresh(cohort)
    return cohort


async def delete_cohort(
    db: AsyncSession, tenant_id: uuid.UUID, cohort_id: uuid.UUID,
) -> bool:
    cohort = await get_cohort(db, tenant_id, cohort_id)
    if not cohort:
        return False
    await db.delete(cohort)
    await db.commit()
    return True


# ── Criteria ───────────────────────────────────────────────────────────────

async def replace_criteria(
    db: AsyncSession, tenant_id: uuid.UUID, cohort_id: uuid.UUID, criteria_tree: list[dict],
) -> list[CohortCriteria]:
    """Atomically replace a cohort's criteria tree."""
    cohort = await get_cohort(db, tenant_id, cohort_id)
    if not cohort:
        return []

    # Delete existing
    for c in list(cohort.criteria):
        await db.delete(c)
    await db.flush()

    # Insert new tree
    created = _build_criteria_tree(cohort_id, criteria_tree, parent_id=None)
    for c in created:
        db.add(c)

    await db.commit()
    return created


def _build_criteria_tree(
    cohort_id: uuid.UUID, nodes: list[dict], parent_id: uuid.UUID | None,
) -> list[CohortCriteria]:
    """Recursively build CohortCriteria objects from a nested dict structure."""
    result = []
    for i, node in enumerate(nodes):
        criteria = CohortCriteria(
            cohort_id=cohort_id,
            parent_group_id=parent_id,
            group_operator=node.get("group_operator"),
            rule_type=node.get("rule_type"),
            config=node.get("config"),
            sort_order=i,
        )
        result.append(criteria)
        # Recurse into children
        children_data = node.get("children", [])
        if children_data:
            children = _build_criteria_tree(cohort_id, children_data, criteria.id)
            result.extend(children)
    return result


# ── Scoring Engine CRUD ────────────────────────────────────────────────────

async def get_scoring_engine(
    db: AsyncSession, tenant_id: uuid.UUID, program_id: uuid.UUID,
) -> ScoringEngine | None:
    result = await db.execute(
        select(ScoringEngine).where(
            ScoringEngine.tenant_id == tenant_id,
            ScoringEngine.program_id == program_id,
        )
    )
    return result.scalar_one_or_none()


async def upsert_scoring_engine(
    db: AsyncSession, tenant_id: uuid.UUID, program_id: uuid.UUID, data: dict,
) -> ScoringEngine:
    engine = await get_scoring_engine(db, tenant_id, program_id)
    if engine:
        for key in ("components", "tiebreaker_rules", "aggregation_method"):
            if key in data:
                setattr(engine, key, data[key])
    else:
        engine = ScoringEngine(
            tenant_id=tenant_id,
            program_id=program_id,
            components=data.get("components", []),
            tiebreaker_rules=data.get("tiebreaker_rules", []),
            aggregation_method=data.get("aggregation_method", "weighted_sum"),
        )
        db.add(engine)
    await db.commit()
    await db.refresh(engine)
    return engine


# ── Assignments ────────────────────────────────────────────────────────────

async def get_assignments(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
    program_id: uuid.UUID | None = None,
    cohort_id: uuid.UUID | None = None,
) -> dict:
    base = select(CohortAssignment).where(
        CohortAssignment.tenant_id == tenant_id,
        CohortAssignment.is_current == True,
    )
    if program_id:
        base = base.where(CohortAssignment.program_id == program_id)
    if cohort_id:
        base = base.where(CohortAssignment.cohort_id == cohort_id)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()

    result = await db.execute(
        base.options(
            selectinload(CohortAssignment.patient),
            selectinload(CohortAssignment.cohort),
        )
        .order_by(CohortAssignment.assigned_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(result.scalars().all())

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if page_size else 0,
    }


async def get_dashboard_stats(db: AsyncSession, tenant_id: uuid.UUID) -> dict:
    """Cross-program population dashboard stats."""
    # Total active patients
    total_patients = (await db.execute(
        select(func.count()).where(Patient.tenant_id == tenant_id, Patient.is_active == True)
    )).scalar_one()

    # Assigned (have current assignment)
    assigned = (await db.execute(
        select(func.count(func.distinct(CohortAssignment.patient_id))).where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.is_current == True,
        )
    )).scalar_one()

    # Pending events
    pending_events = (await db.execute(
        select(func.count()).where(
            CohortisationEvent.tenant_id == tenant_id,
            CohortisationEvent.status == "pending",
        )
    )).scalar_one()

    return {
        "total_patients": total_patients,
        "assigned": assigned,
        "unassigned": total_patients - assigned,
        "pending_rescore": pending_events,
    }


async def get_cohort_distribution(
    db: AsyncSession, tenant_id: uuid.UUID, program_id: uuid.UUID,
) -> list[dict]:
    """Member count per cohort within a program."""
    result = await db.execute(
        select(CohortAssignment.cohort_id, func.count().label("count"))
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.is_current == True,
        )
        .group_by(CohortAssignment.cohort_id)
    )
    return [{"cohort_id": str(row.cohort_id), "count": row.count} for row in result.all()]
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: program service (CRUD + versioning) and reworked cohort service"
```

---

## Task 7: Cohortisation Engine Worker — Event-Driven Background Processing

**Files:**
- Create: `backend/app/workers/__init__.py`
- Create: `backend/app/workers/cohortisation_worker.py`
- Create: `backend/app/workers/event_emitter.py`

- [ ] **Step 1: Create `backend/app/workers/__init__.py`**

Empty file.

- [ ] **Step 2: Create `backend/app/workers/event_emitter.py`**

```python
"""Helper to emit cohortisation events from other services."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cohort import CohortisationEvent


async def emit_event(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
    event_type: str,
    event_data: dict | None = None,
) -> CohortisationEvent:
    """Insert a pending cohortisation event."""
    event = CohortisationEvent(
        tenant_id=tenant_id,
        patient_id=patient_id,
        event_type=event_type,
        event_data=event_data,
        status="pending",
    )
    db.add(event)
    await db.flush()
    return event


async def emit_bulk_events(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_ids: list[uuid.UUID],
    event_type: str = "bulk_recalculate",
) -> int:
    """Emit one event per patient for bulk recalculation."""
    events = [
        CohortisationEvent(
            tenant_id=tenant_id,
            patient_id=pid,
            event_type=event_type,
            status="pending",
        )
        for pid in patient_ids
    ]
    db.add_all(events)
    await db.flush()
    return len(events)
```

- [ ] **Step 3: Create `backend/app/workers/cohortisation_worker.py`**

```python
"""Async background worker that processes cohortisation events.

Polls the cohortisation_events table for pending events, scores the affected
patients against all active programs in the tenant, and creates/updates
cohort assignments.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import async_session
from app.models.cohort import (
    Cohort, CohortAssignment, CohortisationEvent, ScoringEngine,
)
from app.models.patient import Patient
from app.models.program import Program
from app.services.criteria_evaluator import evaluate_criteria_tree
from app.services.patient_data import build_patient_data
from app.services.scoring_engine_service import score_patient

logger = logging.getLogger(__name__)

POLL_INTERVAL = 5  # seconds
BATCH_SIZE = 50


async def run(shutdown_event: asyncio.Event | None = None) -> None:
    """Main worker loop. Polls for pending events and processes them."""
    logger.info("Cohortisation worker started")
    while True:
        if shutdown_event and shutdown_event.is_set():
            break
        try:
            async with async_session() as db:
                processed = await _process_batch(db)
                if processed > 0:
                    logger.info(f"Processed {processed} cohortisation events")
        except Exception:
            logger.exception("Error in cohortisation worker")

        await asyncio.sleep(POLL_INTERVAL)


async def _process_batch(db: AsyncSession) -> int:
    """Process a batch of pending events."""
    # Fetch pending events
    result = await db.execute(
        select(CohortisationEvent)
        .where(CohortisationEvent.status == "pending")
        .order_by(CohortisationEvent.created_at)
        .limit(BATCH_SIZE)
    )
    events = list(result.scalars().all())
    if not events:
        return 0

    # Mark as processing
    event_ids = [e.id for e in events]
    await db.execute(
        update(CohortisationEvent)
        .where(CohortisationEvent.id.in_(event_ids))
        .values(status="processing")
    )
    await db.commit()

    # Group by tenant + patient for efficiency
    processed = 0
    for event in events:
        try:
            await _process_event(db, event)
            event.status = "completed"
            event.processed_at = datetime.now(timezone.utc)
        except Exception as exc:
            logger.exception(f"Failed to process event {event.id}")
            event.status = "failed"
            event.error = str(exc)
        processed += 1

    await db.commit()
    return processed


async def _process_event(db: AsyncSession, event: CohortisationEvent) -> None:
    """Process a single cohortisation event — score patient against all active programs."""
    # Load patient
    result = await db.execute(
        select(Patient)
        .where(Patient.id == event.patient_id, Patient.tenant_id == event.tenant_id)
        .options(selectinload(Patient.labs), selectinload(Patient.diagnoses))
    )
    patient = result.scalar_one_or_none()
    if not patient or not patient.is_active:
        return

    # Build patient data
    patient_data = build_patient_data(patient, list(patient.labs), list(patient.diagnoses))

    # Load active programs for tenant
    programs_result = await db.execute(
        select(Program)
        .where(Program.tenant_id == event.tenant_id, Program.status == "active")
        .options(
            selectinload(Program.cohorts).selectinload(Cohort.criteria),
            selectinload(Program.scoring_engine),
        )
    )
    programs = list(programs_result.scalars().all())

    for program in programs:
        await _assign_patient_to_program(db, event.tenant_id, patient, patient_data, program)


async def _assign_patient_to_program(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient: Patient,
    patient_data,
    program: Program,
) -> None:
    """Assign a patient to a cohort within a program."""
    cohorts = sorted(program.cohorts, key=lambda c: c.sort_order)
    if not cohorts:
        return

    score_result: dict | None = None
    matched_cohort: Cohort | None = None
    assignment_type = "criteria"

    # If program has a scoring engine, use it
    if program.scoring_engine and program.scoring_engine.is_active:
        score_result = score_patient(patient_data, program.scoring_engine, cohorts)
        matched_cohort = next(
            (c for c in cohorts if c.id == score_result["cohort_id"]), None
        )
        assignment_type = "engine"

    # Otherwise, use criteria matching — find first cohort whose criteria match
    if matched_cohort is None:
        for cohort in cohorts:
            criteria = list(cohort.criteria) if cohort.criteria else []
            if evaluate_criteria_tree(criteria, patient_data):
                matched_cohort = cohort
                break

    if not matched_cohort:
        return  # Patient doesn't match any cohort

    # Get current assignment for this patient+program
    current_result = await db.execute(
        select(CohortAssignment).where(
            CohortAssignment.patient_id == patient.id,
            CohortAssignment.program_id == program.id,
            CohortAssignment.is_current == True,
        )
    )
    current = current_result.scalar_one_or_none()

    # Skip if already assigned to the same cohort
    if current and current.cohort_id == matched_cohort.id:
        return

    # Mark old as not current
    if current:
        current.is_current = False

    # Create new assignment
    now = datetime.now(timezone.utc)
    assignment = CohortAssignment(
        tenant_id=tenant_id,
        patient_id=patient.id,
        program_id=program.id,
        cohort_id=matched_cohort.id,
        score=score_result["score"] if score_result else None,
        score_breakdown=score_result["breakdown"] if score_result else None,
        assignment_type=assignment_type,
        reason=score_result.get("reason") if score_result else None,
        previous_cohort_id=current.cohort_id if current else None,
        is_current=True,
        assigned_at=now,
        review_due_at=now + timedelta(days=matched_cohort.review_cadence_days),
    )
    db.add(assignment)

    # Update cohort member counts
    matched_cohort.member_count = (matched_cohort.member_count or 0) + 1
    if current:
        old_cohort = next((c for c in program.cohorts if c.id == current.cohort_id), None)
        if old_cohort and old_cohort.member_count > 0:
            old_cohort.member_count -= 1

    await db.flush()
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(worker): event-driven cohortisation worker with event emitter"
```

---

## Task 8: API Routes — Programs, Cohorts, Cohortisation Operations

**Files:**
- Create: `backend/app/schemas/program.py`
- Rewrite: `backend/app/schemas/cohort.py`
- Create: `backend/app/routers/programs.py`
- Rewrite: `backend/app/routers/cohortisation.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create `backend/app/schemas/program.py`**

```python
from __future__ import annotations
from typing import Any
from pydantic import BaseModel


class ProgramCreate(BaseModel):
    name: str
    slug: str | None = None
    condition: str | None = None
    description: str | None = None


class ProgramUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    condition: str | None = None
    description: str | None = None
    status: str | None = None


class CohortSummary(BaseModel):
    id: str
    name: str
    slug: str
    color: str
    sort_order: int
    review_cadence_days: int
    score_range_min: int | None
    score_range_max: int | None
    member_count: int


class ScoringEngineSummary(BaseModel):
    id: str
    components: list[dict[str, Any]]
    tiebreaker_rules: list[dict[str, Any]]
    aggregation_method: str


class ProgramListItem(BaseModel):
    id: str
    name: str
    slug: str
    condition: str | None
    status: str
    version: int
    cohort_count: int
    has_scoring_engine: bool


class ProgramDetail(BaseModel):
    id: str
    name: str
    slug: str
    condition: str | None
    description: str | None
    status: str
    version: int
    published_at: str | None
    cohorts: list[CohortSummary]
    scoring_engine: ScoringEngineSummary | None


class ProgramVersionSchema(BaseModel):
    id: str
    version: int
    published_at: str
    snapshot: dict[str, Any]
```

- [ ] **Step 2: Rewrite `backend/app/schemas/cohort.py`**

```python
from __future__ import annotations
from typing import Any
from pydantic import BaseModel


class CohortCreate(BaseModel):
    name: str
    slug: str | None = None
    description: str | None = None
    color: str | None = None
    sort_order: int | None = None
    review_cadence_days: int | None = None
    score_range_min: int | None = None
    score_range_max: int | None = None


class CohortUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    color: str | None = None
    sort_order: int | None = None
    review_cadence_days: int | None = None
    score_range_min: int | None = None
    score_range_max: int | None = None


class CriteriaNode(BaseModel):
    group_operator: str | None = None
    rule_type: str | None = None
    config: dict[str, Any] | None = None
    children: list[CriteriaNode] | None = None


class ScoringEngineUpsert(BaseModel):
    components: list[dict[str, Any]]
    tiebreaker_rules: list[dict[str, Any]] | None = None
    aggregation_method: str | None = None


class RecalculateRequest(BaseModel):
    patient_ids: list[str] | None = None


class RecalculateResponse(BaseModel):
    events_created: int


class AssignmentRecord(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    program_id: str
    cohort_id: str
    cohort_name: str
    cohort_color: str
    score: int | None
    score_breakdown: dict[str, Any] | None
    assignment_type: str
    reason: str | None
    previous_cohort_id: str | None
    assigned_at: str
    review_due_at: str | None


class AssignmentListResponse(BaseModel):
    items: list[AssignmentRecord]
    total: int
    page: int
    page_size: int
    pages: int


class DashboardStats(BaseModel):
    total_patients: int
    assigned: int
    unassigned: int
    pending_rescore: int
    active_programs: int


class CohortDistribution(BaseModel):
    cohort_id: str
    cohort_name: str
    cohort_color: str
    count: int
```

- [ ] **Step 3: Create `backend/app/routers/programs.py`**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.program import (
    ProgramCreate, ProgramDetail, ProgramListItem, ProgramUpdate,
    ProgramVersionSchema, CohortSummary, ScoringEngineSummary,
)
from app.schemas.cohort import (
    CohortCreate, CohortUpdate, CriteriaNode, ScoringEngineUpsert,
)
from app.services.program_service import (
    create_program, get_program, list_programs, publish_program, update_program,
)
from app.services.cohort_service import (
    create_cohort, delete_cohort, get_cohort, get_scoring_engine,
    list_cohorts, replace_criteria, update_cohort, upsert_scoring_engine,
)

router = APIRouter()


@router.get("", response_model=list[ProgramListItem])
async def programs_list(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    programs = await list_programs(db, auth.tenant_id)
    return [
        ProgramListItem(
            id=str(p.id),
            name=p.name,
            slug=p.slug,
            condition=p.condition,
            status=p.status,
            version=p.version,
            cohort_count=len(p.cohorts) if p.cohorts else 0,
            has_scoring_engine=p.scoring_engine is not None,
        )
        for p in programs
    ]


@router.post("", response_model=ProgramDetail, status_code=status.HTTP_201_CREATED)
async def programs_create(
    data: ProgramCreate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    program = await create_program(db, auth.tenant_id, auth.user_id, data.model_dump())
    return _serialize_program(program)


@router.get("/{program_id}", response_model=ProgramDetail)
async def programs_get(
    program_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    program = await get_program(db, auth.tenant_id, program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return _serialize_program(program)


@router.patch("/{program_id}", response_model=ProgramDetail)
async def programs_update(
    program_id: uuid.UUID,
    data: ProgramUpdate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    program = await update_program(db, auth.tenant_id, program_id, data.model_dump(exclude_none=True))
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return _serialize_program(program)


@router.post("/{program_id}/publish", response_model=ProgramVersionSchema)
async def programs_publish(
    program_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    version = await publish_program(db, auth.tenant_id, program_id, auth.user_id)
    if not version:
        raise HTTPException(status_code=404, detail="Program not found")
    return ProgramVersionSchema(
        id=str(version.id),
        version=version.version,
        published_at=version.published_at.isoformat(),
        snapshot=version.snapshot,
    )


# ── Cohorts (nested under program) ────────────────────────────────────────

@router.get("/{program_id}/cohorts")
async def cohorts_list(
    program_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    cohorts = await list_cohorts(db, auth.tenant_id, program_id)
    return [_serialize_cohort(c) for c in cohorts]


@router.post("/{program_id}/cohorts", status_code=status.HTTP_201_CREATED)
async def cohorts_create(
    program_id: uuid.UUID,
    data: CohortCreate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    cohort = await create_cohort(db, auth.tenant_id, program_id, data.model_dump())
    return _serialize_cohort(cohort)


@router.patch("/{program_id}/cohorts/{cohort_id}")
async def cohorts_update(
    program_id: uuid.UUID,
    cohort_id: uuid.UUID,
    data: CohortUpdate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    cohort = await update_cohort(db, auth.tenant_id, cohort_id, data.model_dump(exclude_none=True))
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    return _serialize_cohort(cohort)


@router.delete("/{program_id}/cohorts/{cohort_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cohorts_delete(
    program_id: uuid.UUID,
    cohort_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    if not await delete_cohort(db, auth.tenant_id, cohort_id):
        raise HTTPException(status_code=404, detail="Cohort not found")


@router.put("/{program_id}/cohorts/{cohort_id}/criteria")
async def cohorts_criteria_replace(
    program_id: uuid.UUID,
    cohort_id: uuid.UUID,
    data: list[CriteriaNode],
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    criteria = await replace_criteria(
        db, auth.tenant_id, cohort_id,
        [n.model_dump() for n in data],
    )
    return {"count": len(criteria)}


# ── Scoring Engine ─────────────────────────────────────────────────────────

@router.get("/{program_id}/engine")
async def engine_get(
    program_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    engine = await get_scoring_engine(db, auth.tenant_id, program_id)
    if not engine:
        raise HTTPException(status_code=404, detail="No scoring engine for this program")
    return ScoringEngineSummary(
        id=str(engine.id),
        components=engine.components,
        tiebreaker_rules=engine.tiebreaker_rules,
        aggregation_method=engine.aggregation_method,
    )


@router.put("/{program_id}/engine")
async def engine_upsert(
    program_id: uuid.UUID,
    data: ScoringEngineUpsert,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    engine = await upsert_scoring_engine(
        db, auth.tenant_id, program_id, data.model_dump(exclude_none=True),
    )
    return ScoringEngineSummary(
        id=str(engine.id),
        components=engine.components,
        tiebreaker_rules=engine.tiebreaker_rules,
        aggregation_method=engine.aggregation_method,
    )


# ── Helpers ────────────────────────────────────────────────────────────────

def _serialize_program(p) -> ProgramDetail:
    cohorts = [_serialize_cohort(c) for c in (p.cohorts or [])]
    engine = None
    if p.scoring_engine:
        engine = ScoringEngineSummary(
            id=str(p.scoring_engine.id),
            components=p.scoring_engine.components,
            tiebreaker_rules=p.scoring_engine.tiebreaker_rules,
            aggregation_method=p.scoring_engine.aggregation_method,
        )
    return ProgramDetail(
        id=str(p.id),
        name=p.name,
        slug=p.slug,
        condition=p.condition,
        description=p.description,
        status=p.status,
        version=p.version,
        published_at=p.published_at.isoformat() if p.published_at else None,
        cohorts=cohorts,
        scoring_engine=engine,
    )


def _serialize_cohort(c) -> CohortSummary:
    return CohortSummary(
        id=str(c.id),
        name=c.name,
        slug=c.slug,
        color=c.color,
        sort_order=c.sort_order,
        review_cadence_days=c.review_cadence_days,
        score_range_min=c.score_range_min,
        score_range_max=c.score_range_max,
        member_count=c.member_count,
    )
```

- [ ] **Step 4: Rewrite `backend/app/routers/cohortisation.py`**

```python
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.models.patient import Patient
from app.schemas.cohort import (
    AssignmentListResponse, AssignmentRecord, DashboardStats,
    RecalculateRequest, RecalculateResponse, CohortDistribution,
)
from app.services.cohort_service import (
    get_assignments, get_dashboard_stats, get_cohort_distribution,
)
from app.services.program_service import list_programs
from app.workers.event_emitter import emit_bulk_events

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    stats = await get_dashboard_stats(db, auth.tenant_id)
    programs = await list_programs(db, auth.tenant_id)
    stats["active_programs"] = sum(1 for p in programs if p.status == "active")
    return DashboardStats(**stats)


@router.post("/recalculate", response_model=RecalculateResponse)
async def recalculate(
    data: RecalculateRequest | None = None,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    if data and data.patient_ids:
        patient_ids = [uuid.UUID(pid) for pid in data.patient_ids]
    else:
        # All active patients
        result = await db.execute(
            select(Patient.id).where(
                Patient.tenant_id == auth.tenant_id,
                Patient.is_active == True,
            )
        )
        patient_ids = [row[0] for row in result.all()]

    count = await emit_bulk_events(db, auth.tenant_id, patient_ids)
    await db.commit()
    return RecalculateResponse(events_created=count)


@router.get("/assignments", response_model=AssignmentListResponse)
async def assignments_list(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    program_id: uuid.UUID | None = None,
    cohort_id: uuid.UUID | None = None,
):
    result = await get_assignments(
        db, auth.tenant_id, page, page_size, program_id, cohort_id,
    )
    items = []
    for a in result["items"]:
        patient_name = ""
        if a.patient:
            patient_name = f"{a.patient.first_name} {a.patient.last_name}"
        cohort_name = a.cohort.name if a.cohort else ""
        cohort_color = a.cohort.color if a.cohort else "#e2e8f0"
        items.append(AssignmentRecord(
            id=str(a.id),
            patient_id=str(a.patient_id),
            patient_name=patient_name,
            program_id=str(a.program_id),
            cohort_id=str(a.cohort_id),
            cohort_name=cohort_name,
            cohort_color=cohort_color,
            score=a.score,
            score_breakdown=a.score_breakdown,
            assignment_type=a.assignment_type,
            reason=a.reason,
            previous_cohort_id=str(a.previous_cohort_id) if a.previous_cohort_id else None,
            assigned_at=a.assigned_at.isoformat() if a.assigned_at else "",
            review_due_at=a.review_due_at.isoformat() if a.review_due_at else None,
        ))
    return AssignmentListResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        pages=result["pages"],
    )


@router.get("/distribution/{program_id}", response_model=list[CohortDistribution])
async def distribution(
    program_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    from app.services.cohort_service import list_cohorts
    cohorts = await list_cohorts(db, auth.tenant_id, program_id)
    cohort_map = {str(c.id): c for c in cohorts}

    dist = await get_cohort_distribution(db, auth.tenant_id, program_id)
    result = []
    for d in dist:
        cohort = cohort_map.get(d["cohort_id"])
        result.append(CohortDistribution(
            cohort_id=d["cohort_id"],
            cohort_name=cohort.name if cohort else "Unknown",
            cohort_color=cohort.color if cohort else "#e2e8f0",
            count=d["count"],
        ))
    return result
```

- [ ] **Step 5: Update `backend/app/main.py`**

```python
import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import async_session, engine
from app.models import Base
from app.routers import ai, ai_sessions, auth, cohortisation, pathways, patients, programs
from app.services.seed_service import seed_all
from app.workers import cohortisation_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("data", exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as db:
        await seed_all(db)

    # Start cohortisation worker
    shutdown_event = asyncio.Event()
    worker_task = asyncio.create_task(cohortisation_worker.run(shutdown_event))

    yield

    shutdown_event.set()
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Bradesco Care Admin API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROUTER_REGISTRY = [
    (auth.router, "/api/auth", ["Auth"]),
    (patients.router, "/api/patients", ["Patients"]),
    (pathways.router, "/api/pathways", ["Pathways"]),
    (programs.router, "/api/programs", ["Programs"]),
    (cohortisation.router, "/api/cohortisation", ["Cohortisation"]),
    (ai.router, "/api/ai", ["AI"]),
    (ai_sessions.router, "/api/ai/sessions", ["AI Sessions"]),
]

for router, prefix, tags in ROUTER_REGISTRY:
    app.include_router(router, prefix=prefix, tags=tags)
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(api): programs + cohortisation API routes, reworked schemas, worker startup"
```

---

## Task 9: Seed Data — Diabetes Care Program with Cohorts + Engine

**Files:**
- Rewrite: `backend/app/services/cohort_seed.py`
- Modify: `backend/app/services/seed_service.py`
- Modify: `backend/app/services/patient_seed.py` (remove tier/crs_score references)

- [ ] **Step 1: Rewrite `backend/app/services/cohort_seed.py`**

This seeds the Diabetes Care program with 5 cohorts (formerly tiers), a scoring engine with the exact clinical doc tables, criteria per cohort, and tiebreaker rules. Use the exact same scoring table data from the existing seed but with `data_source` keys added to each component for the generic engine.

The seed function should:
1. Create the Diabetes Care program (status="active")
2. Create 5 cohorts with colors, score ranges, review cadences
3. Create the scoring engine with 5 components (each with `data_source` field), tiebreaker rules
4. Create criteria for each cohort (simplified — just key diagnosis + lab rules)
5. Publish version 1

Refer to the existing `cohort_seed.py` for the scoring table data. Add `"data_source": "lab_range"` to the Glycaemic Control component, `"data_source": "diagnosis_match"` to Complication Burden, `"data_source": "pharmacy_adherence"` to Adherence, `"data_source": "utilisation"` to Utilisation, `"data_source": "sdoh"` to SDOH.

Also add proxy config to Glycaemic Control:
```python
"proxy_field": "fpg",
"proxy_map": [
    {"min": 126, "max": None, "mapped_value": 7.0},
    {"min": 100, "max": 126, "mapped_value": 5.8},
    {"min": None, "max": 100, "mapped_value": 5.0},
],
```

Update tiebreaker rules to use the new format with `condition` objects and `target_sort_order`/`min_sort_order` instead of tier numbers.

- [ ] **Step 2: Update `backend/app/services/patient_seed.py`**

Remove references to `Patient.tier`, `Patient.crs_score`, and `Patient.crs_breakdown` since those columns no longer exist. The patient seed should still generate labs, diagnoses, and medications — the cohortisation engine will assign patients to cohorts.

- [ ] **Step 3: Update `backend/app/services/seed_service.py`**

Keep the same structure but update the cohort seed import. After seeding patients, emit bulk cohortisation events so the worker assigns them to cohorts on first startup.

```python
    from app.services.cohort_seed import seed_diabetes_program
    await seed_diabetes_program(db)

    # Emit events for initial cohortisation
    from app.workers.event_emitter import emit_bulk_events
    from app.models.patient import Patient
    from sqlalchemy import select
    result = await db.execute(select(Patient.id).where(Patient.tenant_id == DEFAULT_TENANT_ID))
    patient_ids = [row[0] for row in result.all()]
    await emit_bulk_events(db, DEFAULT_TENANT_ID, patient_ids, "initial_seed")
    await db.commit()
```

- [ ] **Step 4: Delete DB, start server, verify seed + worker processes events**

```bash
rm -f backend/data/care-admin.db
cd backend && source .venv/bin/activate && timeout 30 python -m uvicorn app.main:app --port 8000 2>&1 | tail -20
```

Expected: Server starts, seed runs, worker logs "Processed N cohortisation events" within 10-15 seconds.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(seed): diabetes care program with 5 cohorts, scoring engine, initial cohortisation"
```

---

## Task 10: Docker Packaging

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/requirements.txt` (if not exists — extract from pyproject.toml or pip freeze)
- Create: `Dockerfile` (frontend, project root)
- Create: `docker-compose.yml` (project root)
- Modify: `next.config.ts` (enable standalone output)

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/

RUN mkdir -p data

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Generate `backend/requirements.txt`**

```bash
cd backend && source .venv/bin/activate && pip freeze > requirements.txt
```

- [ ] **Step 3: Create frontend `Dockerfile` at project root**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static .next/static
COPY --from=builder /app/public public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 4: Enable standalone output in `next.config.ts`**

Add `output: "standalone"` to the Next.js config.

- [ ] **Step 5: Create `docker-compose.yml` at project root**

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/data:/app/data
    environment:
      - DATABASE_URL=sqlite+aiosqlite:///data/care-admin.db
      - CORS_ORIGINS=http://localhost:3000
      - JWT_SECRET=dev-secret-change-in-production

  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(docker): backend + frontend Dockerfiles and docker-compose for local dev"
```

---

## Task 11: Fix Patient References — Update Patient Router, Seed, Frontend Types

**Files:**
- Modify: `backend/app/routers/patients.py` — remove tier/crs_score/crs_breakdown from serialisation
- Modify: `backend/app/schemas/patient.py` — remove tier/crs_score/crs_breakdown fields
- Modify: `backend/app/services/patient_service.py` — remove tier/crs references
- Modify: `src/services/types/patient.ts` — remove tier/crs_score/crs_breakdown
- Modify: `src/features/patients/components/patient-header.tsx` — remove tier badge (will be replaced in Phase 4B)
- Modify: `src/features/patients/components/patient-kpi-strip.tsx` — remove CRS KPI
- Remove: `src/features/patients/components/risk-crs-tab.tsx` — replaced in Phase 4B
- Modify: `src/features/patients/components/patient-tabs.tsx` — remove Risk & CRS tab
- Remove: `src/config/tiers.ts` — cohort metadata comes from API now
- Modify: `src/components/shared/tier-badge.tsx` — remove (or stub to prevent import errors)

This task cleans up all references to the old tier/CRS system. Read each file first to identify exact lines to change.

- [ ] **Step 1: Update backend patient router, schemas, service — remove tier/crs references**

Read each file, remove `tier`, `crs_score`, `crs_breakdown` from serialisation and response schemas.

- [ ] **Step 2: Update frontend types, components — remove tier/crs references**

Read each file, remove tier/crs fields from types, remove tier badge and CRS KPI from patient header/strip, remove Risk & CRS tab.

- [ ] **Step 3: Remove `src/config/tiers.ts`**

Replace with a stub that won't break imports elsewhere:

```typescript
// Deprecated — cohort metadata now comes from the API.
// This file is a stub to prevent import errors during migration.
export interface TierConfig {
  number: number;
  label: string;
  name: string;
  colorVar: string;
  reviewCadence: string;
}

export const TIERS: TierConfig[] = [];

export function getTier(number: number): TierConfig {
  return { number, label: `Tier ${number}`, name: "", colorVar: "", reviewCadence: "" };
}
```

- [ ] **Step 4: Verify backend starts and frontend compiles**

```bash
rm -f backend/data/care-admin.db
cd backend && source .venv/bin/activate && timeout 8 python -m uvicorn app.main:app --port 8000 2>&1 | tail -5
# In another terminal:
cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: remove tier/crs references from patient models, routes, and frontend"
```

---

## Task 12: Integration Verification

- [ ] **Step 1: Delete DB, start server, verify full API**

```bash
rm -f backend/data/care-admin.db
cd backend && source .venv/bin/activate && python -m uvicorn app.main:app --port 8000 &
sleep 15  # Give worker time to process initial events

TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@bradesco.com","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Programs
echo "=== Programs ==="
curl -s http://localhost:8000/api/programs -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Programs: {len(d)}, First: {d[0][\"name\"]} ({d[0][\"cohort_count\"]} cohorts)')"

# Program detail
PROGRAM_ID=$(curl -s http://localhost:8000/api/programs -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "=== Program Detail ==="
curl -s "http://localhost:8000/api/programs/$PROGRAM_ID" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Cohorts: {len(d[\"cohorts\"])}, Engine: {d[\"scoring_engine\"] is not None}')"

# Dashboard
echo "=== Dashboard ==="
curl -s http://localhost:8000/api/cohortisation/dashboard -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Distribution
echo "=== Distribution ==="
curl -s "http://localhost:8000/api/cohortisation/distribution/$PROGRAM_ID" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Assignments
echo "=== Assignments (first 3) ==="
curl -s "http://localhost:8000/api/cohortisation/assignments?page=1&page_size=3" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Total: {d[\"total\"]}'); [print(f'  {a[\"patient_name\"]}: {a[\"cohort_name\"]} score={a[\"score\"]}') for a in d['items']]"

kill %1
```

- [ ] **Step 2: Verify frontend compiles**

```bash
npx tsc --noEmit && npx next build 2>&1 | tail -15
```

- [ ] **Step 3: Fix any issues found**

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "feat(phase-4a): complete — generic cohort system backend with programs, scoring engine, event worker, Docker"
```
