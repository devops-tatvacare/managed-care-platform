# Phase 4: Cohortisation Engine — CRS Scoring, Tier Assignment, Configuration UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full cohortisation engine — tenant-configurable CRS formula with 5 weighted components, exact scoring tables from the Diabetes Care Pathway document, CRS→tier mapping with hard clinical prerequisites and tie-breaking rules, bulk recalculation, assignment audit log, and a configuration UI replacing the current placeholder page.

**Architecture:** Backend: Two new models (CRSConfig, CohortAssignment) + CRS calculation engine + cohort assignment service + REST API. The CRS formula weights, scoring tables, tier thresholds, and tie-breaking rules are stored as tenant-configurable JSON in the `crs_configs` table — not hardcoded. The engine reads this config, scores each patient against their labs/diagnoses/medications/SDOH data, applies overrides, and writes assignments. Frontend: Cohortisation page with CRS config panel, tier threshold panel, population distribution chart, recalculate action, and audit log. Patient detail gets a CRS breakdown visualization in the Risk & CRS tab.

**Tech Stack:** Same as Phases 1-3. New: Recharts (already installed) for tier distribution chart. No new dependencies.

**Spec reference:** `docs/superpowers/specs/2026-04-07-bradesco-care-admin-redesign.md` — Sections 6.2 (DB: crs_configs, cohort_assignments), 5.3 (API: /api/cohortisation/*), 9.7 (Cohortisation Config screen). Clinical reference: `Diabetes Care Pathway.docx` Module 2 — scoring tables (Tables 12-17), tie-breaking rules, review cadence (Table 18).

**Critical rules (apply to every task):**
- NO emojis — Lucide icons only
- NO custom UI components — shadcn/ui only
- NO hardcoded paths/colors/labels — config registries only
- `cn()` for all class composition
- `selectinload` on all relationship queries — no lazy loading
- CRS formula/weights/scoring tables stored in DB as tenant-configurable JSON — NOT hardcoded constants
- All endpoints require auth + tenant filtering
- Follow existing patterns exactly (stores, API client, router registry, seed service)

---

## Task 1: Backend CRS Config & Cohort Assignment Models

**Files:**
- Create: `backend/app/models/cohort.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create `backend/app/models/cohort.py`**

```python
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CRSConfig(Base, TimestampMixin):
    """Tenant-configurable CRS formula: component weights, scoring tables, tier thresholds, tie-breakers."""
    __tablename__ = "crs_configs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    components: Mapped[list] = mapped_column(JSON, nullable=False)
    # Schema: [{ name: str, weight: float (0-1), scoring_table: [{criterion: str, points: int}], cap: int }]
    tier_thresholds: Mapped[list] = mapped_column(JSON, nullable=False)
    # Schema: [{ min_score: int, max_score: int, tier_number: int, prerequisites: str | null }]
    tiebreaker_rules: Mapped[list] = mapped_column(JSON, nullable=False)
    # Schema: [{ rule: str, condition: str, action: str }]
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class CohortAssignment(Base):
    """Audit log of every CRS calculation and tier assignment for a patient."""
    __tablename__ = "cohort_assignments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tier_number: Mapped[int] = mapped_column(Integer, nullable=False)
    crs_score: Mapped[int] = mapped_column(Integer, nullable=False)
    crs_breakdown: Mapped[dict] = mapped_column(JSON, nullable=False)
    # Schema: { glycaemic: float, complication: float, adherence: float, utilisation: float, sdoh: float }
    assignment_type: Mapped[str] = mapped_column(String(20), default="auto")
    # "auto" | "manual" | "override"
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    previous_tier: Mapped[int | None] = mapped_column(Integer, nullable=True)
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

    patient = relationship("Patient", lazy="raise")
```

- [ ] **Step 2: Update `backend/app/models/__init__.py`**

Add the new models to the imports and `__all__`:

```python
from app.models.base import Base
from app.models.tenant import Tenant, TenantConfig
from app.models.user import User, RefreshToken
from app.models.role import Role
from app.models.patient import Patient, PatientLab, PatientDiagnosis
from app.models.pathway import Pathway, PathwayBlock, PathwayEdge
from app.models.ai_session import AISession
from app.models.cohort import CRSConfig, CohortAssignment

__all__ = [
    "Base", "Tenant", "TenantConfig", "User", "RefreshToken", "Role",
    "Patient", "PatientLab", "PatientDiagnosis",
    "Pathway", "PathwayBlock", "PathwayEdge",
    "AISession",
    "CRSConfig", "CohortAssignment",
]
```

- [ ] **Step 3: Delete the SQLite database so tables get recreated on next startup**

```bash
rm -f backend/data/app.db
```

- [ ] **Step 4: Verify models load by starting the backend briefly**

```bash
cd backend && source .venv/bin/activate && timeout 5 python -m uvicorn app.main:app --port 8000 2>&1 | tail -5
```

Expected: Server starts without import errors. Tables are created.

---

## Task 2: Seed CRS Config with Diabetes Care Pathway Scoring Tables

**Files:**
- Create: `backend/app/services/cohort_seed.py`
- Modify: `backend/app/services/seed_service.py`

- [ ] **Step 1: Create `backend/app/services/cohort_seed.py`**

This seeds the exact CRS config from the Diabetes Care Pathway document Module 2, Tables 12-17.

```python
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cohort import CRSConfig
from app.services.seed_service import DEFAULT_TENANT_ID


async def seed_crs_config(db: AsyncSession) -> None:
    """Seed the CRS configuration with exact values from Diabetes Care Pathway doc Module 2."""

    config = CRSConfig(
        id=uuid.UUID("40000000-0000-0000-0000-000000000001"),
        tenant_id=DEFAULT_TENANT_ID,
        components=[
            {
                "name": "glycaemic",
                "label": "Glycaemic Control",
                "weight": 0.35,
                "cap": 100,
                "scoring_table": [
                    {"criterion": "HbA1c < 5.7%", "min": None, "max": 5.69, "field": "hba1c", "points": 0},
                    {"criterion": "HbA1c 5.7-6.4%", "min": 5.7, "max": 6.49, "field": "hba1c", "points": 20},
                    {"criterion": "HbA1c 6.5-7.9%", "min": 6.5, "max": 7.99, "field": "hba1c", "points": 40},
                    {"criterion": "HbA1c 8.0-9.9%", "min": 8.0, "max": 9.99, "field": "hba1c", "points": 70},
                    {"criterion": "HbA1c >= 10.0%", "min": 10.0, "max": None, "field": "hba1c", "points": 90},
                ],
                "bonus_table": [
                    {"criterion": "TIR < 50% (CGM)", "field": "tir", "operator": "lt", "value": 50, "points": 10},
                    {"criterion": "CV > 36% (high variability)", "field": "cv", "operator": "gt", "value": 36, "points": 5},
                    {"criterion": "TBR > 4% (hypoglycaemia)", "field": "tbr", "operator": "gt", "value": 4, "points": 8},
                ],
            },
            {
                "name": "complication",
                "label": "Complication Burden",
                "weight": 0.25,
                "cap": 100,
                "scoring_table": [
                    {"criterion": "No complications", "type": "default", "points": 0},
                    {"criterion": "Microalbuminuria (uACR 30-300)", "type": "diagnosis", "icd10_prefix": None, "lab_field": "uacr", "lab_min": 30, "lab_max": 300, "points": 25},
                    {"criterion": "Macroalbuminuria (uACR > 300)", "type": "diagnosis", "icd10_prefix": None, "lab_field": "uacr", "lab_min": 300, "lab_max": None, "points": 50},
                    {"criterion": "CKD G3a (eGFR 45-59)", "type": "lab", "lab_field": "egfr", "lab_min": 45, "lab_max": 59, "points": 35},
                    {"criterion": "CKD G3b (eGFR 30-44)", "type": "lab", "lab_field": "egfr", "lab_min": 30, "lab_max": 44, "points": 55},
                    {"criterion": "CKD G4 (eGFR 15-29)", "type": "lab", "lab_field": "egfr", "lab_min": 15, "lab_max": 29, "points": 75},
                    {"criterion": "Non-proliferative retinopathy", "type": "diagnosis", "icd10_prefix": "E11.31", "points": 20},
                    {"criterion": "Proliferative retinopathy", "type": "diagnosis", "icd10_prefix": "E11.35", "points": 45},
                    {"criterion": "Peripheral neuropathy", "type": "diagnosis", "icd10_prefix": "E11.4", "points": 20},
                    {"criterion": "Established CVD (MI, stroke, PAD)", "type": "diagnosis", "icd10_prefixes": ["I25", "I63", "I73.9"], "points": 40},
                    {"criterion": "Heart failure (any EF)", "type": "diagnosis", "icd10_prefix": "I50", "points": 40},
                    {"criterion": "DM-related amputation history", "type": "diagnosis", "icd10_prefixes": ["Z89.4", "Z89.5", "Z89.6"], "points": 60},
                ],
            },
            {
                "name": "adherence",
                "label": "Behavioural / Adherence",
                "weight": 0.20,
                "cap": 100,
                "scoring_table": [
                    {"criterion": "PDC >= 80% all DM meds", "type": "pdc", "min": 0.80, "max": None, "points": 0},
                    {"criterion": "PDC 70-79%", "type": "pdc", "min": 0.70, "max": 0.7999, "points": 20},
                    {"criterion": "PDC 60-69%", "type": "pdc", "min": 0.60, "max": 0.6999, "points": 40},
                    {"criterion": "PDC < 60%", "type": "pdc", "min": None, "max": 0.5999, "points": 70},
                ],
                "bonus_table": [
                    {"criterion": "DDS mean >= 3.0 (high distress)", "field": "dds", "operator": "gte", "value": 3.0, "points": 20},
                    {"criterion": "PHQ-9 >= 10 (moderate depression)", "field": "phq9", "operator": "gte", "value": 10, "points": 20},
                    {"criterion": "SED-9 < 6 (low self-efficacy)", "field": "sed9", "operator": "lt", "value": 6, "points": 10},
                    {"criterion": "No app engagement 60+ days", "field": "app_inactive_days", "operator": "gte", "value": 60, "points": 15},
                ],
            },
            {
                "name": "utilisation",
                "label": "Utilisation",
                "weight": 0.15,
                "cap": 100,
                "scoring_table": [
                    {"criterion": "0 ER visits; 0 hospitalisations", "er_visits": 0, "hospitalisations": 0, "dka": False, "points": 0},
                    {"criterion": "1 DM-related ER visit", "er_visits": 1, "hospitalisations": 0, "dka": False, "points": 30},
                    {"criterion": "2+ DM-related ER visits", "er_visits_min": 2, "points": 60},
                    {"criterion": "1 DM-related hospitalisation", "hospitalisations": 1, "dka": False, "points": 50},
                    {"criterion": "DKA hospitalisation (any)", "dka": True, "points": 85},
                    {"criterion": "2+ hospitalisations (any cause)", "hospitalisations_min": 2, "points": 80},
                ],
            },
            {
                "name": "sdoh",
                "label": "SDOH Burden",
                "weight": 0.05,
                "cap": 100,
                "scoring_table": [
                    {"criterion": "0 high-risk domains", "domains": 0, "points": 0},
                    {"criterion": "1 high-risk domain", "domains": 1, "points": 33},
                    {"criterion": "2 high-risk domains", "domains": 2, "points": 66},
                    {"criterion": "3+ high-risk domains", "domains_min": 3, "points": 100},
                ],
            },
        ],
        tier_thresholds=[
            {"min_score": 0, "max_score": 15, "tier_number": 0, "prerequisites": "BMI >= 25 required; no DM diagnosis"},
            {"min_score": 16, "max_score": 30, "tier_number": 1, "prerequisites": "HbA1c 5.7-6.4% or FPG 100-125 required"},
            {"min_score": 31, "max_score": 50, "tier_number": 2, "prerequisites": "T2DM diagnosis required; HbA1c < 8.0%"},
            {"min_score": 51, "max_score": 70, "tier_number": 3, "prerequisites": "T2DM diagnosis required"},
            {"min_score": 71, "max_score": 100, "tier_number": 4, "prerequisites": "Any DM diagnosis"},
        ],
        tiebreaker_rules=[
            {
                "priority": 1,
                "rule": "DKA event in prior 12 months",
                "condition": "dka_12mo",
                "action": "set_tier_4",
                "description": "Any DKA event in prior 12 months -> Tier 4 regardless of CRS",
            },
            {
                "priority": 2,
                "rule": "T1DM diagnosis",
                "condition": "t1dm",
                "action": "min_tier_3_or_4",
                "description": "T1DM (E10.x) -> minimum Tier 3; if CRS >= 51 -> Tier 4",
            },
            {
                "priority": 3,
                "rule": "Any Tier 3 hard criterion met",
                "condition": "tier3_hard_criterion",
                "action": "min_tier_3",
                "description": "Any Tier 3 hard criterion met -> minimum Tier 3 regardless of CRS",
            },
            {
                "priority": 4,
                "rule": "HbA1c >= 5.7% but CRS assigns Tier 0",
                "condition": "hba1c_gte_5_7_tier_0",
                "action": "escalate_tier_1",
                "description": "CRS assigns Tier 0 but HbA1c >= 5.7% -> escalate to Tier 1",
            },
        ],
        is_active=True,
    )

    db.add(config)
    await db.commit()
```

- [ ] **Step 2: Update `backend/app/services/seed_service.py` to call cohort seed**

Add after the `seed_pathways` call at the end of `seed_all`:

```python
    from app.services.cohort_seed import seed_crs_config
    await seed_crs_config(db)
```

- [ ] **Step 3: Delete DB and verify seed runs**

```bash
rm -f backend/data/app.db
cd backend && source .venv/bin/activate && timeout 8 python -m uvicorn app.main:app --port 8000 2>&1 | tail -5
```

Expected: Server starts, seeds run without errors.

---

## Task 3: CRS Calculation Engine

**Files:**
- Create: `backend/app/services/crs_engine.py`

This is the core scoring engine. It reads a patient's data (labs, diagnoses, medications, SDOH flags) and the tenant's CRS config, then computes all 5 component scores + final weighted CRS. No hardcoded values — everything comes from the CRSConfig JSON.

- [ ] **Step 1: Create `backend/app/services/crs_engine.py`**

```python
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from app.models.patient import Patient, PatientDiagnosis, PatientLab


def calculate_crs(
    patient: Patient,
    labs: list[PatientLab],
    diagnoses: list[PatientDiagnosis],
    config_components: list[dict],
) -> dict[str, Any]:
    """
    Calculate Composite Risk Score for a patient using tenant-configurable scoring tables.

    Returns:
        {
            "total": int (0-100),
            "components": {
                "glycaemic": {"raw": int, "weighted": float},
                "complication": {"raw": int, "weighted": float},
                "adherence": {"raw": int, "weighted": float},
                "utilisation": {"raw": int, "weighted": float},
                "sdoh": {"raw": int, "weighted": float},
            }
        }
    """
    latest_labs = _get_latest_labs(labs)
    active_diagnoses = [d for d in diagnoses if d.is_active]
    medications = patient.active_medications or []
    sdoh_flags = patient.sdoh_flags or {}

    components_result = {}
    total = 0.0

    for component in config_components:
        name = component["name"]
        weight = component["weight"]
        cap = component.get("cap", 100)

        if name == "glycaemic":
            raw = _score_glycaemic(latest_labs, component)
        elif name == "complication":
            raw = _score_complication(latest_labs, active_diagnoses, component)
        elif name == "adherence":
            raw = _score_adherence(medications, component)
        elif name == "utilisation":
            raw = _score_utilisation(patient, component)
        elif name == "sdoh":
            raw = _score_sdoh(sdoh_flags, component)
        else:
            raw = 0

        raw = min(raw, cap)
        weighted = round(raw * weight, 2)
        components_result[name] = {"raw": raw, "weighted": weighted}
        total += weighted

    return {
        "total": round(total),
        "components": components_result,
    }


def apply_tiebreakers(
    crs_score: int,
    tier_number: int,
    patient: Patient,
    labs: list[PatientLab],
    diagnoses: list[PatientDiagnosis],
    tiebreaker_rules: list[dict],
) -> tuple[int, str | None]:
    """
    Apply tie-breaking rules to adjust tier assignment.
    Returns (final_tier, reason_or_None).
    Rules are applied in priority order (lowest priority number first).
    """
    latest_labs = _get_latest_labs(labs)
    active_diag_codes = [d.icd10_code for d in diagnoses if d.is_active]
    hba1c = latest_labs.get("hba1c")

    sorted_rules = sorted(tiebreaker_rules, key=lambda r: r.get("priority", 99))

    for rule in sorted_rules:
        condition = rule["condition"]
        action = rule["action"]

        if condition == "dka_12mo":
            # Check for DKA-related diagnoses or utilisation flags
            has_dka = any(
                code.startswith("E11.1") or code.startswith("E10.1") or code.startswith("E13.1")
                for code in active_diag_codes
            )
            # Also check patient utilisation data if available
            if not has_dka:
                util_data = patient.crs_breakdown or {}
                if isinstance(util_data, dict):
                    has_dka = util_data.get("dka_12mo", False)
            if has_dka and action == "set_tier_4":
                return 4, rule["description"]

        elif condition == "t1dm":
            has_t1dm = any(code.startswith("E10") for code in active_diag_codes)
            if has_t1dm:
                if crs_score >= 51:
                    return 4, rule["description"]
                return max(tier_number, 3), rule["description"]

        elif condition == "tier3_hard_criterion":
            # Tier 3 hard criteria: HbA1c 8-10%, PDC < 80%, active complication,
            # ER visit/hospitalisation, >= 3 oral agents or new injectable
            has_tier3 = False
            if hba1c is not None and 8.0 <= hba1c <= 10.0:
                has_tier3 = True
            medications = patient.active_medications or []
            if medications:
                min_pdc = min((m.get("pdc_90day", 1.0) or 1.0) for m in medications)
                if min_pdc < 0.80:
                    has_tier3 = True
            tier3_icd10 = ["E11.4", "E11.31", "E11.311"]
            if any(any(code.startswith(p) for p in tier3_icd10) for code in active_diag_codes):
                has_tier3 = True
            if has_tier3 and action == "min_tier_3":
                return max(tier_number, 3), rule["description"]

        elif condition == "hba1c_gte_5_7_tier_0":
            if tier_number == 0 and hba1c is not None and hba1c >= 5.7:
                return 1, rule["description"]

    return tier_number, None


def map_score_to_tier(crs_score: int, tier_thresholds: list[dict]) -> int:
    """Map a CRS score to a tier number using the threshold table."""
    for threshold in tier_thresholds:
        if threshold["min_score"] <= crs_score <= threshold["max_score"]:
            return threshold["tier_number"]
    # Default: highest tier if score exceeds all thresholds
    return 4


def get_review_cadence_days(tier_number: int) -> int:
    """Return the number of days until next review based on tier (Table 18)."""
    cadence_map = {0: 365, 1: 180, 2: 90, 3: 30, 4: 7}
    return cadence_map.get(tier_number, 90)


# --- Private scoring helpers ---

def _get_latest_labs(labs: list[PatientLab]) -> dict[str, float]:
    """Get the most recent value for each lab test type."""
    latest: dict[str, tuple[datetime, float]] = {}
    for lab in labs:
        key = lab.test_type.lower()
        recorded = lab.recorded_at
        if isinstance(recorded, str):
            recorded = datetime.fromisoformat(recorded)
        if key not in latest or recorded > latest[key][0]:
            latest[key] = (recorded, lab.value)
    return {k: v[1] for k, v in latest.items()}


def _score_glycaemic(latest_labs: dict[str, float], component: dict) -> int:
    """Score glycaemic component using HbA1c range table + CGM bonuses."""
    hba1c = latest_labs.get("hba1c")
    if hba1c is None:
        # If no HbA1c, use FPG as proxy: >= 126 -> treat as HbA1c 6.5+
        fpg = latest_labs.get("fpg")
        if fpg is not None:
            if fpg >= 126:
                hba1c = 7.0  # proxy
            elif fpg >= 100:
                hba1c = 5.8  # proxy
            else:
                hba1c = 5.0  # proxy
        else:
            return 0  # No data

    score = 0
    for row in component["scoring_table"]:
        row_min = row.get("min")
        row_max = row.get("max")
        if row_min is None and row_max is not None:
            if hba1c <= row_max:
                score = row["points"]
                break
        elif row_min is not None and row_max is None:
            if hba1c >= row_min:
                score = row["points"]
                break
        elif row_min is not None and row_max is not None:
            if row_min <= hba1c <= row_max:
                score = row["points"]
                break

    # Add bonus points from CGM data if available
    for bonus in component.get("bonus_table", []):
        field_val = latest_labs.get(bonus["field"])
        if field_val is not None:
            if _check_operator(field_val, bonus["operator"], bonus["value"]):
                score += bonus["points"]

    return score


def _score_complication(
    latest_labs: dict[str, float],
    diagnoses: list[PatientDiagnosis],
    component: dict,
) -> int:
    """Score complication burden — sum all applicable findings, cap at component cap."""
    score = 0
    diag_codes = [d.icd10_code for d in diagnoses]

    for row in component["scoring_table"]:
        row_type = row.get("type", "default")

        if row_type == "default":
            continue  # 0 points baseline

        if row_type == "lab":
            field = row.get("lab_field")
            val = latest_labs.get(field)
            if val is not None:
                lab_min = row.get("lab_min")
                lab_max = row.get("lab_max")
                if lab_min is not None and lab_max is not None:
                    if lab_min <= val <= lab_max:
                        score += row["points"]
                elif lab_min is not None and lab_max is None:
                    if val >= lab_min:
                        score += row["points"]
                elif lab_min is None and lab_max is not None:
                    if val <= lab_max:
                        score += row["points"]

        elif row_type == "diagnosis":
            prefixes = row.get("icd10_prefixes", [])
            if row.get("icd10_prefix"):
                prefixes = [row["icd10_prefix"]] + prefixes

            # Also check lab-based criteria (uACR ranges for albuminuria)
            lab_field = row.get("lab_field")
            if lab_field:
                val = latest_labs.get(lab_field)
                if val is not None:
                    lab_min = row.get("lab_min")
                    lab_max = row.get("lab_max")
                    in_range = True
                    if lab_min is not None and val < lab_min:
                        in_range = False
                    if lab_max is not None and val > lab_max:
                        in_range = False
                    if in_range:
                        score += row["points"]
                        continue

            if prefixes and any(
                any(code.startswith(p) for p in prefixes) for code in diag_codes
            ):
                score += row["points"]

    return score


def _score_adherence(medications: list[dict], component: dict) -> int:
    """Score adherence using worst PDC across all DM medications."""
    score = 0

    if not medications:
        return 0

    # Get worst PDC
    pdc_values = [m.get("pdc_90day") for m in medications if m.get("pdc_90day") is not None]
    if pdc_values:
        worst_pdc = min(pdc_values)
        for row in component["scoring_table"]:
            row_min = row.get("min")
            row_max = row.get("max")
            if row_min is not None and row_max is not None:
                if row_min <= worst_pdc <= row_max:
                    score = row["points"]
                    break
            elif row_min is not None and row_max is None:
                if worst_pdc >= row_min:
                    score = row["points"]
                    break
            elif row_min is None and row_max is not None:
                if worst_pdc <= row_max:
                    score = row["points"]
                    break

    # Bonus table (PROs — not available in current seed data, but engine supports them)
    for bonus in component.get("bonus_table", []):
        # PRO data would come from patient record; skip if not available
        pass

    return score


def _score_utilisation(patient: Patient, component: dict) -> int:
    """Score utilisation based on ER visits/hospitalisations from patient data."""
    # Utilisation data stored in crs_breakdown or as a separate field
    # For seed data, we derive from patient tier and existing crs_breakdown
    util_data = {}
    if patient.crs_breakdown and isinstance(patient.crs_breakdown, dict):
        util_data = patient.crs_breakdown

    er_visits = util_data.get("er_visits_12mo", 0)
    hospitalisations = util_data.get("hospitalisations_12mo", 0)
    has_dka = util_data.get("dka_12mo", False)

    best_score = 0
    for row in component["scoring_table"]:
        if row.get("dka") is True and has_dka:
            best_score = max(best_score, row["points"])
        elif row.get("hospitalisations_min") is not None:
            if hospitalisations >= row["hospitalisations_min"]:
                best_score = max(best_score, row["points"])
        elif row.get("er_visits_min") is not None:
            if er_visits >= row["er_visits_min"]:
                best_score = max(best_score, row["points"])
        elif row.get("er_visits") is not None and row.get("hospitalisations") is not None:
            if er_visits == row["er_visits"] and hospitalisations == row["hospitalisations"]:
                best_score = max(best_score, row["points"])
        elif row.get("hospitalisations") is not None and er_visits == 0:
            if hospitalisations == row["hospitalisations"]:
                best_score = max(best_score, row["points"])
        elif row.get("er_visits") is not None and row.get("hospitalisations") is None:
            if er_visits == row["er_visits"]:
                best_score = max(best_score, row["points"])

    return best_score


def _score_sdoh(sdoh_flags: dict, component: dict) -> int:
    """Score SDOH burden based on count of high-risk domains present."""
    high_risk_count = sum(1 for v in sdoh_flags.values() if v is True)

    for row in component["scoring_table"]:
        if row.get("domains_min") is not None:
            if high_risk_count >= row["domains_min"]:
                return row["points"]
        elif row.get("domains") is not None:
            if high_risk_count == row["domains"]:
                return row["points"]

    return 0


def _check_operator(value: float, operator: str, threshold: float) -> bool:
    """Evaluate a comparison operator."""
    if operator == "lt":
        return value < threshold
    elif operator == "lte":
        return value <= threshold
    elif operator == "gt":
        return value > threshold
    elif operator == "gte":
        return value >= threshold
    elif operator == "eq":
        return value == threshold
    return False
```

---

## Task 4: Cohort Assignment Service

**Files:**
- Create: `backend/app/services/cohort_service.py`

This service orchestrates CRS calculation + tier assignment + audit logging. It handles single-patient and bulk recalculation.

- [ ] **Step 1: Create `backend/app/services/cohort_service.py`**

```python
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cohort import CohortAssignment, CRSConfig
from app.models.patient import Patient, PatientDiagnosis, PatientLab
from app.services.crs_engine import (
    apply_tiebreakers,
    calculate_crs,
    get_review_cadence_days,
    map_score_to_tier,
)


async def get_crs_config(db: AsyncSession, tenant_id: uuid.UUID) -> CRSConfig | None:
    """Get the active CRS config for a tenant."""
    result = await db.execute(
        select(CRSConfig).where(
            CRSConfig.tenant_id == tenant_id,
            CRSConfig.is_active == True,
        )
    )
    return result.scalar_one_or_none()


async def update_crs_config(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    data: dict,
) -> CRSConfig | None:
    """Update the CRS config for a tenant."""
    config = await get_crs_config(db, tenant_id)
    if not config:
        return None
    if "components" in data:
        config.components = data["components"]
    if "tier_thresholds" in data:
        config.tier_thresholds = data["tier_thresholds"]
    if "tiebreaker_rules" in data:
        config.tiebreaker_rules = data["tiebreaker_rules"]
    await db.commit()
    await db.refresh(config)
    return config


async def calculate_patient_crs(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
    assigned_by: uuid.UUID | None = None,
    assignment_type: str = "auto",
) -> CohortAssignment | None:
    """Calculate CRS for a single patient and create/update assignment."""
    config = await get_crs_config(db, tenant_id)
    if not config:
        return None

    # Load patient with labs and diagnoses
    result = await db.execute(
        select(Patient)
        .where(Patient.id == patient_id, Patient.tenant_id == tenant_id)
        .options(selectinload(Patient.labs), selectinload(Patient.diagnoses))
    )
    patient = result.scalar_one_or_none()
    if not patient:
        return None

    return await _score_and_assign(db, patient, config, assigned_by, assignment_type)


async def bulk_recalculate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    assigned_by: uuid.UUID | None = None,
    patient_ids: list[uuid.UUID] | None = None,
) -> dict:
    """Recalculate CRS for all patients (or a filtered subset) in a tenant."""
    config = await get_crs_config(db, tenant_id)
    if not config:
        return {"processed": 0, "error": "No CRS config found"}

    query = (
        select(Patient)
        .where(Patient.tenant_id == tenant_id, Patient.is_active == True)
        .options(selectinload(Patient.labs), selectinload(Patient.diagnoses))
    )
    if patient_ids:
        query = query.where(Patient.id.in_(patient_ids))

    result = await db.execute(query)
    patients = result.scalars().all()

    processed = 0
    tier_changes = 0

    for patient in patients:
        assignment = await _score_and_assign(db, patient, config, assigned_by, "auto")
        if assignment:
            processed += 1
            if assignment.previous_tier is not None and assignment.previous_tier != assignment.tier_number:
                tier_changes += 1

    return {"processed": processed, "tier_changes": tier_changes}


async def get_assignments(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
    current_only: bool = True,
) -> dict:
    """Get paginated cohort assignments with patient info."""
    base_query = select(CohortAssignment).where(
        CohortAssignment.tenant_id == tenant_id,
    )
    if current_only:
        base_query = base_query.where(CohortAssignment.is_current == True)

    # Count
    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar() or 0

    # Paginate
    assignments = await db.execute(
        base_query
        .options(selectinload(CohortAssignment.patient))
        .order_by(CohortAssignment.assigned_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = assignments.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


async def get_tier_distribution(db: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    """Get count of current patients per tier."""
    result = await db.execute(
        select(Patient.tier, func.count(Patient.id))
        .where(Patient.tenant_id == tenant_id, Patient.is_active == True)
        .group_by(Patient.tier)
        .order_by(Patient.tier)
    )
    rows = result.all()
    return [{"tier": row[0], "count": row[1]} for row in rows]


# --- Private helpers ---

async def _score_and_assign(
    db: AsyncSession,
    patient: Patient,
    config: CRSConfig,
    assigned_by: uuid.UUID | None,
    assignment_type: str,
) -> CohortAssignment:
    """Score a patient and create/update their cohort assignment."""
    labs = list(patient.labs) if patient.labs else []
    diagnoses = list(patient.diagnoses) if patient.diagnoses else []

    # Calculate CRS
    crs_result = calculate_crs(patient, labs, diagnoses, config.components)
    crs_score = crs_result["total"]

    # Map to tier
    tier_number = map_score_to_tier(crs_score, config.tier_thresholds)

    # Apply tie-breakers
    final_tier, override_reason = apply_tiebreakers(
        crs_score, tier_number, patient, labs, diagnoses, config.tiebreaker_rules
    )

    # Get previous tier
    previous_tier = patient.tier

    # Mark old assignments as not current
    await db.execute(
        update(CohortAssignment)
        .where(
            CohortAssignment.patient_id == patient.id,
            CohortAssignment.tenant_id == config.tenant_id,
            CohortAssignment.is_current == True,
        )
        .values(is_current=False)
    )

    # Create new assignment
    now = datetime.now(timezone.utc)
    review_days = get_review_cadence_days(final_tier)
    assignment = CohortAssignment(
        tenant_id=config.tenant_id,
        patient_id=patient.id,
        tier_number=final_tier,
        crs_score=crs_score,
        crs_breakdown=crs_result["components"],
        assignment_type=assignment_type,
        assigned_by=assigned_by,
        reason=override_reason,
        previous_tier=previous_tier,
        is_current=True,
        assigned_at=now,
        review_due_at=now + timedelta(days=review_days),
    )
    db.add(assignment)

    # Update patient record
    patient.tier = final_tier
    patient.crs_score = crs_score
    patient.crs_breakdown = crs_result["components"]

    await db.commit()
    return assignment
```

---

## Task 5: Cohortisation API Router & Schemas

**Files:**
- Create: `backend/app/schemas/cohort.py`
- Create: `backend/app/routers/cohortisation.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create `backend/app/schemas/cohort.py`**

```python
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class CRSComponentSchema(BaseModel):
    name: str
    label: str
    weight: float
    cap: int
    scoring_table: list[dict[str, Any]]
    bonus_table: list[dict[str, Any]] | None = None


class TierThresholdSchema(BaseModel):
    min_score: int
    max_score: int
    tier_number: int
    prerequisites: str | None = None


class TiebreakerRuleSchema(BaseModel):
    priority: int
    rule: str
    condition: str
    action: str
    description: str


class CRSConfigResponse(BaseModel):
    id: str
    components: list[CRSComponentSchema]
    tier_thresholds: list[TierThresholdSchema]
    tiebreaker_rules: list[TiebreakerRuleSchema]


class CRSConfigUpdate(BaseModel):
    components: list[dict[str, Any]] | None = None
    tier_thresholds: list[dict[str, Any]] | None = None
    tiebreaker_rules: list[dict[str, Any]] | None = None


class RecalculateRequest(BaseModel):
    patient_ids: list[str] | None = None


class RecalculateResponse(BaseModel):
    processed: int
    tier_changes: int


class CRSBreakdownComponent(BaseModel):
    raw: int
    weighted: float


class AssignmentRecord(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    tier_number: int
    previous_tier: int | None
    crs_score: int
    crs_breakdown: dict[str, CRSBreakdownComponent]
    assignment_type: str
    reason: str | None
    assigned_at: str
    review_due_at: str | None


class AssignmentListResponse(BaseModel):
    items: list[AssignmentRecord]
    total: int
    page: int
    page_size: int
    pages: int


class TierDistribution(BaseModel):
    tier: int
    count: int


class TierDistributionResponse(BaseModel):
    distribution: list[TierDistribution]
    total: int
```

- [ ] **Step 2: Create `backend/app/routers/cohortisation.py`**

```python
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.cohort import (
    AssignmentListResponse,
    AssignmentRecord,
    CRSBreakdownComponent,
    CRSConfigResponse,
    CRSConfigUpdate,
    RecalculateRequest,
    RecalculateResponse,
    TierDistributionResponse,
    TierDistribution,
)
from app.services.cohort_service import (
    bulk_recalculate,
    get_assignments,
    get_crs_config,
    get_tier_distribution,
    update_crs_config,
)

router = APIRouter()


@router.get("/crs-config", response_model=CRSConfigResponse)
async def get_config(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    config = await get_crs_config(db, auth.tenant_id)
    if not config:
        raise HTTPException(status_code=404, detail="CRS config not found")
    return CRSConfigResponse(
        id=str(config.id),
        components=config.components,
        tier_thresholds=config.tier_thresholds,
        tiebreaker_rules=config.tiebreaker_rules,
    )


@router.put("/crs-config", response_model=CRSConfigResponse)
async def update_config(
    data: CRSConfigUpdate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    config = await update_crs_config(db, auth.tenant_id, data.model_dump(exclude_none=True))
    if not config:
        raise HTTPException(status_code=404, detail="CRS config not found")
    return CRSConfigResponse(
        id=str(config.id),
        components=config.components,
        tier_thresholds=config.tier_thresholds,
        tiebreaker_rules=config.tiebreaker_rules,
    )


@router.post("/recalculate", response_model=RecalculateResponse)
async def recalculate(
    data: RecalculateRequest | None = None,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    patient_ids = None
    if data and data.patient_ids:
        patient_ids = [uuid.UUID(pid) for pid in data.patient_ids]
    result = await bulk_recalculate(
        db, auth.tenant_id, assigned_by=auth.user_id, patient_ids=patient_ids
    )
    return RecalculateResponse(**result)


@router.get("/assignments", response_model=AssignmentListResponse)
async def list_assignments(
    page: int = 1,
    page_size: int = 50,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await get_assignments(db, auth.tenant_id, page, page_size)
    items = []
    for a in result["items"]:
        patient = a.patient if a.patient else None
        patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown"
        breakdown = a.crs_breakdown or {}
        items.append(AssignmentRecord(
            id=str(a.id),
            patient_id=str(a.patient_id),
            patient_name=patient_name,
            tier_number=a.tier_number,
            previous_tier=a.previous_tier,
            crs_score=a.crs_score,
            crs_breakdown={
                k: CRSBreakdownComponent(**v) if isinstance(v, dict) else CRSBreakdownComponent(raw=0, weighted=0)
                for k, v in breakdown.items()
            },
            assignment_type=a.assignment_type,
            reason=a.reason,
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


@router.get("/distribution", response_model=TierDistributionResponse)
async def distribution(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    dist = await get_tier_distribution(db, auth.tenant_id)
    total = sum(d["count"] for d in dist)
    return TierDistributionResponse(
        distribution=[TierDistribution(**d) for d in dist],
        total=total,
    )
```

- [ ] **Step 3: Register the cohortisation router in `backend/app/main.py`**

Add to imports:

```python
from app.routers import ai, ai_sessions, auth, cohortisation, pathways, patients
```

Add to ROUTER_REGISTRY:

```python
ROUTER_REGISTRY = [
    (auth.router, "/api/auth", ["Auth"]),
    (patients.router, "/api/patients", ["Patients"]),
    (pathways.router, "/api/pathways", ["Pathways"]),
    (cohortisation.router, "/api/cohortisation", ["Cohortisation"]),
    (ai.router, "/api/ai", ["AI"]),
    (ai_sessions.router, "/api/ai/sessions", ["AI Sessions"]),
]
```

- [ ] **Step 4: Delete DB and verify all endpoints load**

```bash
rm -f backend/data/app.db
cd backend && source .venv/bin/activate && timeout 8 python -m uvicorn app.main:app --port 8000 2>&1 | tail -5
```

Then test with curl:

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@bradesco.com","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Get CRS config
curl -s http://localhost:8000/api/cohortisation/crs-config -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Get distribution
curl -s http://localhost:8000/api/cohortisation/distribution -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Recalculate all
curl -s -X POST http://localhost:8000/api/cohortisation/recalculate -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" | python3 -m json.tool

# Get assignments
curl -s "http://localhost:8000/api/cohortisation/assignments?page=1&page_size=5" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -30
```

---

## Task 6: Frontend Types & API Service for Cohortisation

**Files:**
- Create: `src/services/types/cohort.ts`
- Create: `src/services/api/cohortisation.ts`

- [ ] **Step 1: Create `src/services/types/cohort.ts`**

```typescript
export interface CRSScoringRow {
  criterion: string;
  points: number;
  [key: string]: unknown;
}

export interface CRSBonusRow {
  criterion: string;
  field: string;
  operator: string;
  value: number;
  points: number;
}

export interface CRSComponent {
  name: string;
  label: string;
  weight: number;
  cap: number;
  scoring_table: CRSScoringRow[];
  bonus_table?: CRSBonusRow[];
}

export interface TierThreshold {
  min_score: number;
  max_score: number;
  tier_number: number;
  prerequisites: string | null;
}

export interface TiebreakerRule {
  priority: number;
  rule: string;
  condition: string;
  action: string;
  description: string;
}

export interface CRSConfigResponse {
  id: string;
  components: CRSComponent[];
  tier_thresholds: TierThreshold[];
  tiebreaker_rules: TiebreakerRule[];
}

export interface CRSConfigUpdate {
  components?: CRSComponent[];
  tier_thresholds?: TierThreshold[];
  tiebreaker_rules?: TiebreakerRule[];
}

export interface CRSBreakdownComponent {
  raw: number;
  weighted: number;
}

export interface AssignmentRecord {
  id: string;
  patient_id: string;
  patient_name: string;
  tier_number: number;
  previous_tier: number | null;
  crs_score: number;
  crs_breakdown: Record<string, CRSBreakdownComponent>;
  assignment_type: string;
  reason: string | null;
  assigned_at: string;
  review_due_at: string | null;
}

export interface AssignmentListResponse {
  items: AssignmentRecord[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface TierDistributionItem {
  tier: number;
  count: number;
}

export interface TierDistributionResponse {
  distribution: TierDistributionItem[];
  total: number;
}

export interface RecalculateResponse {
  processed: number;
  tier_changes: number;
}
```

- [ ] **Step 2: Create `src/services/api/cohortisation.ts`**

```typescript
import { API_ENDPOINTS } from "@/config/api";
import { apiRequest } from "./client";
import type {
  AssignmentListResponse,
  CRSConfigResponse,
  CRSConfigUpdate,
  RecalculateResponse,
  TierDistributionResponse,
} from "../types/cohort";

export async function fetchCRSConfig(): Promise<CRSConfigResponse> {
  return apiRequest<CRSConfigResponse>({
    method: "GET",
    path: API_ENDPOINTS.cohortisation.crsConfig,
  });
}

export async function updateCRSConfig(
  data: CRSConfigUpdate
): Promise<CRSConfigResponse> {
  return apiRequest<CRSConfigResponse>({
    method: "PUT",
    path: API_ENDPOINTS.cohortisation.crsConfig,
    body: data,
  });
}

export async function recalculateAll(
  patientIds?: string[]
): Promise<RecalculateResponse> {
  return apiRequest<RecalculateResponse>({
    method: "POST",
    path: API_ENDPOINTS.cohortisation.recalculate,
    body: patientIds ? { patient_ids: patientIds } : {},
  });
}

export async function fetchAssignments(params?: {
  page?: number;
  page_size?: number;
}): Promise<AssignmentListResponse> {
  return apiRequest<AssignmentListResponse>({
    method: "GET",
    path: API_ENDPOINTS.cohortisation.assignments,
    params,
  });
}

export async function fetchTierDistribution(): Promise<TierDistributionResponse> {
  return apiRequest<TierDistributionResponse>({
    method: "GET",
    path: `${API_ENDPOINTS.cohortisation.tiers.replace("/tiers", "/distribution")}`,
  });
}
```

- [ ] **Step 3: Add the distribution endpoint to `src/config/api.ts`**

Add `distribution` to the cohortisation section:

```typescript
  cohortisation: {
    tiers: "/api/cohortisation/tiers",
    crsConfig: "/api/cohortisation/crs-config",
    assignments: "/api/cohortisation/assignments",
    recalculate: "/api/cohortisation/recalculate",
    distribution: "/api/cohortisation/distribution",
  },
```

Then update `fetchTierDistribution` in the API service to use:

```typescript
path: API_ENDPOINTS.cohortisation.distribution,
```

---

## Task 7: Cohortisation Zustand Store

**Files:**
- Create: `src/stores/cohortisation-store.ts`

- [ ] **Step 1: Create `src/stores/cohortisation-store.ts`**

Follow the exact pattern from `patients-store.ts` and `pathway-builder-store.ts`:

```typescript
import { create } from "zustand";
import {
  fetchCRSConfig,
  updateCRSConfig,
  recalculateAll,
  fetchAssignments,
  fetchTierDistribution,
} from "@/services/api/cohortisation";
import type {
  AssignmentRecord,
  CRSComponent,
  CRSConfigResponse,
  RecalculateResponse,
  TierDistributionItem,
  TierThreshold,
  TiebreakerRule,
} from "@/services/types/cohort";

interface CohortisationStore {
  // CRS Config
  config: CRSConfigResponse | null;
  configLoading: boolean;
  configError: string | null;

  // Assignments
  assignments: AssignmentRecord[];
  assignmentsTotal: number;
  assignmentsPage: number;
  assignmentsPages: number;
  assignmentsLoading: boolean;

  // Distribution
  distribution: TierDistributionItem[];
  distributionTotal: number;
  distributionLoading: boolean;

  // Recalculation
  recalculating: boolean;
  lastRecalcResult: RecalculateResponse | null;

  // Actions
  loadConfig: () => Promise<void>;
  saveConfig: (data: {
    components?: CRSComponent[];
    tier_thresholds?: TierThreshold[];
    tiebreaker_rules?: TiebreakerRule[];
  }) => Promise<void>;
  loadAssignments: (page?: number) => Promise<void>;
  loadDistribution: () => Promise<void>;
  recalculate: (patientIds?: string[]) => Promise<RecalculateResponse | null>;
  reset: () => void;
}

export const useCohortisationStore = create<CohortisationStore>((set, get) => ({
  config: null,
  configLoading: false,
  configError: null,

  assignments: [],
  assignmentsTotal: 0,
  assignmentsPage: 1,
  assignmentsPages: 1,
  assignmentsLoading: false,

  distribution: [],
  distributionTotal: 0,
  distributionLoading: false,

  recalculating: false,
  lastRecalcResult: null,

  loadConfig: async () => {
    set({ configLoading: true, configError: null });
    try {
      const config = await fetchCRSConfig();
      set({ config, configLoading: false });
    } catch (err) {
      set({ configError: "Failed to load CRS config", configLoading: false });
    }
  },

  saveConfig: async (data) => {
    set({ configLoading: true, configError: null });
    try {
      const config = await updateCRSConfig(data);
      set({ config, configLoading: false });
    } catch (err) {
      set({ configError: "Failed to save CRS config", configLoading: false });
    }
  },

  loadAssignments: async (page = 1) => {
    set({ assignmentsLoading: true });
    try {
      const result = await fetchAssignments({ page, page_size: 20 });
      set({
        assignments: result.items,
        assignmentsTotal: result.total,
        assignmentsPage: result.page,
        assignmentsPages: result.pages,
        assignmentsLoading: false,
      });
    } catch {
      set({ assignmentsLoading: false });
    }
  },

  loadDistribution: async () => {
    set({ distributionLoading: true });
    try {
      const result = await fetchTierDistribution();
      set({
        distribution: result.distribution,
        distributionTotal: result.total,
        distributionLoading: false,
      });
    } catch {
      set({ distributionLoading: false });
    }
  },

  recalculate: async (patientIds) => {
    set({ recalculating: true });
    try {
      const result = await recalculateAll(patientIds);
      set({ recalculating: false, lastRecalcResult: result });
      // Reload distribution and assignments after recalculation
      const store = get();
      await store.loadDistribution();
      await store.loadAssignments(1);
      return result;
    } catch {
      set({ recalculating: false });
      return null;
    }
  },

  reset: () => {
    set({
      config: null,
      configLoading: false,
      configError: null,
      assignments: [],
      assignmentsTotal: 0,
      assignmentsPage: 1,
      assignmentsPages: 1,
      assignmentsLoading: false,
      distribution: [],
      distributionTotal: 0,
      distributionLoading: false,
      recalculating: false,
      lastRecalcResult: null,
    });
  },
}));
```

---

## Task 8: Cohortisation Page — CRS Config Panel

**Files:**
- Create: `src/features/cohortisation/components/crs-config-panel.tsx`
- Create: `src/features/cohortisation/components/tier-threshold-panel.tsx`

- [ ] **Step 1: Create `src/features/cohortisation/components/crs-config-panel.tsx`**

Displays the 5 CRS components with weight sliders and expandable scoring tables. Uses shadcn Card, Table, Slider, Input, Collapsible.

```tsx
"use client";

import { useState } from "react";
import { ChevronRight, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import type { CRSComponent } from "@/services/types/cohort";

export function CRSConfigPanel() {
  const { config, configLoading, saveConfig } = useCohortisationStore();
  const [editedComponents, setEditedComponents] = useState<CRSComponent[] | null>(null);
  const [openComponents, setOpenComponents] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const components = editedComponents ?? config?.components ?? [];

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const isValidWeight = Math.abs(totalWeight - 1.0) < 0.001;

  const handleWeightChange = (index: number, newWeight: number) => {
    const updated = [...components];
    updated[index] = { ...updated[index], weight: newWeight };
    setEditedComponents(updated);
  };

  const toggleComponent = (name: string) => {
    const next = new Set(openComponents);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setOpenComponents(next);
  };

  const handleSave = async () => {
    if (!editedComponents || !isValidWeight) return;
    setSaving(true);
    await saveConfig({ components: editedComponents });
    setEditedComponents(null);
    setSaving(false);
  };

  if (configLoading && !config) {
    return (
      <Card>
        <CardContent className={cn("p-6 text-sm text-muted-foreground")}>
          Loading CRS configuration...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={cn("flex flex-row items-center justify-between")}>
        <CardTitle className={cn("text-lg")}>CRS Formula Components</CardTitle>
        <div className={cn("flex items-center gap-3")}>
          <Badge
            variant={isValidWeight ? "default" : "destructive"}
            className={cn("text-xs")}
          >
            Total: {Math.round(totalWeight * 100)}%
          </Badge>
          {editedComponents && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isValidWeight || saving}
            >
              <Save className={cn("mr-1.5 h-3.5 w-3.5")} />
              {saving ? "Saving..." : "Save Weights"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-3")}>
        {components.map((component, index) => (
          <Collapsible
            key={component.name}
            open={openComponents.has(component.name)}
            onOpenChange={() => toggleComponent(component.name)}
          >
            <div
              className={cn(
                "rounded-lg border p-4"
              )}
            >
              <CollapsibleTrigger asChild>
                <div className={cn("flex cursor-pointer items-center justify-between")}>
                  <div className={cn("flex items-center gap-3")}>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform",
                        openComponents.has(component.name) && "rotate-90"
                      )}
                    />
                    <span className={cn("text-sm font-medium")}>{component.label}</span>
                  </div>
                  <div className={cn("flex items-center gap-4")}>
                    <span className={cn("text-sm text-muted-foreground w-12 text-right")}>
                      {Math.round(component.weight * 100)}%
                    </span>
                    <div className={cn("w-40")} onClick={(e) => e.stopPropagation()}>
                      <Slider
                        value={[component.weight * 100]}
                        onValueChange={([v]) => handleWeightChange(index, v / 100)}
                        max={100}
                        step={5}
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className={cn("mt-4")}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Criterion</TableHead>
                        <TableHead className={cn("w-24 text-right")}>Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {component.scoring_table.map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          <TableCell className={cn("text-sm")}>{row.criterion}</TableCell>
                          <TableCell className={cn("text-right text-sm font-medium")}>
                            {row.points}
                          </TableCell>
                        </TableRow>
                      ))}
                      {component.bonus_table?.map((bonus, bIdx) => (
                        <TableRow key={`bonus-${bIdx}`}>
                          <TableCell className={cn("text-sm text-muted-foreground")}>
                            {bonus.criterion}
                          </TableCell>
                          <TableCell className={cn("text-right text-sm font-medium text-muted-foreground")}>
                            +{bonus.points}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className={cn("mt-2 text-xs text-muted-foreground")}>
                    Cap: {component.cap} points
                  </p>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create `src/features/cohortisation/components/tier-threshold-panel.tsx`**

Displays the CRS→tier threshold table and tiebreaker rules.

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { getTier } from "@/config/tiers";

export function TierThresholdPanel() {
  const { config, configLoading } = useCohortisationStore();

  if (configLoading && !config) {
    return (
      <Card>
        <CardContent className={cn("p-6 text-sm text-muted-foreground")}>
          Loading tier thresholds...
        </CardContent>
      </Card>
    );
  }

  const thresholds = config?.tier_thresholds ?? [];
  const tiebreakers = config?.tiebreaker_rules ?? [];

  return (
    <div className={cn("space-y-4")}>
      <Card>
        <CardHeader>
          <CardTitle className={cn("text-lg")}>Tier Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn("w-28")}>CRS Range</TableHead>
                <TableHead className={cn("w-28")}>Tier</TableHead>
                <TableHead>Prerequisites</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thresholds.map((t) => {
                const tierConfig = getTier(t.tier_number);
                return (
                  <TableRow key={t.tier_number}>
                    <TableCell className={cn("text-sm font-medium")}>
                      {t.min_score}–{t.max_score}
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: tierConfig?.colorVar
                            ? `var(--color-tier-${t.tier_number})`
                            : undefined,
                        }}
                        className={cn("text-xs")}
                      >
                        {tierConfig?.label ?? `Tier ${t.tier_number}`}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("text-sm text-muted-foreground")}>
                      {t.prerequisites ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={cn("text-lg")}>Tie-Breaking Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn("w-16")}>Priority</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiebreakers
                .sort((a, b) => a.priority - b.priority)
                .map((rule) => (
                  <TableRow key={rule.priority}>
                    <TableCell className={cn("text-sm font-medium text-center")}>
                      {rule.priority}
                    </TableCell>
                    <TableCell className={cn("text-sm")}>{rule.rule}</TableCell>
                    <TableCell className={cn("text-sm text-muted-foreground")}>
                      {rule.description}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Task 9: Cohortisation Page — Distribution Chart & Audit Log

**Files:**
- Create: `src/features/cohortisation/components/tier-distribution-chart.tsx`
- Create: `src/features/cohortisation/components/assignment-log.tsx`

- [ ] **Step 1: Create `src/features/cohortisation/components/tier-distribution-chart.tsx`**

Uses Recharts BarChart to show patient count per tier.

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { getTier, TIERS } from "@/config/tiers";

const TIER_COLORS = ["#86efac", "#93c5fd", "#fcd34d", "#fdba74", "#fca5a5"];

export function TierDistributionChart() {
  const { distribution, distributionTotal, distributionLoading } =
    useCohortisationStore();

  const chartData = TIERS.map((t) => {
    const found = distribution.find((d) => d.tier === t.number);
    return {
      name: t.label,
      count: found?.count ?? 0,
      tier: t.number,
    };
  });

  return (
    <Card>
      <CardHeader className={cn("flex flex-row items-center justify-between")}>
        <CardTitle className={cn("text-lg")}>Population Distribution</CardTitle>
        <span className={cn("text-sm text-muted-foreground")}>
          {distributionTotal} patients
        </span>
      </CardHeader>
      <CardContent>
        {distributionLoading ? (
          <div className={cn("flex h-48 items-center justify-center text-sm text-muted-foreground")}>
            Loading...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [value, "Patients"]}
                contentStyle={{ fontSize: 13 }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.tier}
                    fill={TIER_COLORS[entry.tier] ?? "#e2e8f0"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create `src/features/cohortisation/components/assignment-log.tsx`**

Paginated audit log of cohort assignments.

```tsx
"use client";

import { useEffect } from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { getTier } from "@/config/tiers";

export function AssignmentLog() {
  const {
    assignments,
    assignmentsPage,
    assignmentsPages,
    assignmentsTotal,
    assignmentsLoading,
    loadAssignments,
  } = useCohortisationStore();

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTierChange = (prev: number | null, current: number) => {
    if (prev === null) return null;
    if (current > prev) return "up";
    if (current < prev) return "down";
    return "same";
  };

  return (
    <Card>
      <CardHeader className={cn("flex flex-row items-center justify-between")}>
        <CardTitle className={cn("text-lg")}>Assignment Audit Log</CardTitle>
        <span className={cn("text-sm text-muted-foreground")}>
          {assignmentsTotal} records
        </span>
      </CardHeader>
      <CardContent>
        {assignmentsLoading ? (
          <div className={cn("flex h-32 items-center justify-center text-sm text-muted-foreground")}>
            Loading assignments...
          </div>
        ) : assignments.length === 0 ? (
          <div className={cn("flex h-32 items-center justify-center text-sm text-muted-foreground")}>
            No assignments yet. Run &quot;Recalculate All&quot; to generate.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead className={cn("w-20")}>CRS</TableHead>
                  <TableHead className={cn("w-28")}>Tier</TableHead>
                  <TableHead className={cn("w-20")}>Change</TableHead>
                  <TableHead className={cn("w-20")}>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className={cn("w-36")}>Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => {
                  const change = getTierChange(a.previous_tier, a.tier_number);
                  const tierConfig = getTier(a.tier_number);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className={cn("text-sm font-medium")}>
                        {a.patient_name}
                      </TableCell>
                      <TableCell className={cn("text-sm font-mono")}>
                        {a.crs_score}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs")}>
                          {tierConfig?.label ?? `Tier ${a.tier_number}`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {change === "up" && (
                          <ArrowUpRight className={cn("h-4 w-4 text-red-500")} />
                        )}
                        {change === "down" && (
                          <ArrowDownRight className={cn("h-4 w-4 text-green-500")} />
                        )}
                        {change === "same" && (
                          <Minus className={cn("h-4 w-4 text-muted-foreground")} />
                        )}
                        {change === null && (
                          <span className={cn("text-xs text-muted-foreground")}>New</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={a.assignment_type === "auto" ? "secondary" : "default"}
                          className={cn("text-xs")}
                        >
                          {a.assignment_type}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn("text-sm text-muted-foreground max-w-48 truncate")}>
                        {a.reason ?? "—"}
                      </TableCell>
                      <TableCell className={cn("text-xs text-muted-foreground")}>
                        {formatDate(a.assigned_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {assignmentsPages > 1 && (
              <div className={cn("mt-4 flex items-center justify-between")}>
                <span className={cn("text-xs text-muted-foreground")}>
                  Page {assignmentsPage} of {assignmentsPages}
                </span>
                <div className={cn("flex gap-2")}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={assignmentsPage <= 1}
                    onClick={() => loadAssignments(assignmentsPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={assignmentsPage >= assignmentsPages}
                    onClick={() => loadAssignments(assignmentsPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Task 10: Assemble the Cohortisation Page

**Files:**
- Modify: `src/app/dashboard/cohortisation/page.tsx`

- [ ] **Step 1: Replace the placeholder cohortisation page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/cn";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { CRSConfigPanel } from "@/features/cohortisation/components/crs-config-panel";
import { TierThresholdPanel } from "@/features/cohortisation/components/tier-threshold-panel";
import { TierDistributionChart } from "@/features/cohortisation/components/tier-distribution-chart";
import { AssignmentLog } from "@/features/cohortisation/components/assignment-log";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CohortisationPage() {
  const {
    loadConfig,
    loadDistribution,
    loadAssignments,
    recalculate,
    recalculating,
    lastRecalcResult,
  } = useCohortisationStore();
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    loadConfig();
    loadDistribution();
    loadAssignments();
  }, [loadConfig, loadDistribution, loadAssignments]);

  const handleRecalculate = async () => {
    const result = await recalculate();
    if (result) {
      setShowResult(true);
      setTimeout(() => setShowResult(false), 5000);
    }
  };

  return (
    <div className={cn("space-y-6")}>
      <div className={cn("flex items-center justify-between")}>
        <PageHeader
          title="Cohortisation"
          description="CRS formula, tier thresholds, and population scoring"
        />
        <div className={cn("flex items-center gap-3")}>
          {showResult && lastRecalcResult && (
            <span className={cn("text-sm text-muted-foreground")}>
              {lastRecalcResult.processed} scored, {lastRecalcResult.tier_changes} tier changes
            </span>
          )}
          <Button onClick={handleRecalculate} disabled={recalculating}>
            <RefreshCw
              className={cn("mr-1.5 h-4 w-4", recalculating && "animate-spin")}
            />
            {recalculating ? "Recalculating..." : "Recalculate All"}
          </Button>
        </div>
      </div>

      <TierDistributionChart />

      <Tabs defaultValue="crs-formula">
        <TabsList>
          <TabsTrigger value="crs-formula">CRS Formula</TabsTrigger>
          <TabsTrigger value="tier-thresholds">Tier Thresholds</TabsTrigger>
          <TabsTrigger value="assignments">Assignment Log</TabsTrigger>
        </TabsList>
        <TabsContent value="crs-formula" className={cn("mt-4")}>
          <CRSConfigPanel />
        </TabsContent>
        <TabsContent value="tier-thresholds" className={cn("mt-4")}>
          <TierThresholdPanel />
        </TabsContent>
        <TabsContent value="assignments" className={cn("mt-4")}>
          <AssignmentLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Task 11: Patient Detail — CRS Breakdown in Risk Tab

**Files:**
- Create: `src/features/patients/components/risk-crs-tab.tsx`
- Modify: `src/features/patients/components/patient-tabs.tsx`

- [ ] **Step 1: Create `src/features/patients/components/risk-crs-tab.tsx`**

Displays the 5-component CRS breakdown as horizontal bars.

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { usePatientsStore } from "@/stores/patients-store";
import { getTier } from "@/config/tiers";

const COMPONENT_LABELS: Record<string, string> = {
  glycaemic: "Glycaemic Control",
  complication: "Complication Burden",
  adherence: "Behavioural / Adherence",
  utilisation: "Utilisation",
  sdoh: "SDOH Burden",
};

const COMPONENT_WEIGHTS: Record<string, number> = {
  glycaemic: 35,
  complication: 25,
  adherence: 20,
  utilisation: 15,
  sdoh: 5,
};

export function RiskCRSTab() {
  const { selectedPatient } = usePatientsStore();

  if (!selectedPatient) return null;

  const crsScore = selectedPatient.crs_score ?? 0;
  const tier = selectedPatient.tier ?? 0;
  const tierConfig = getTier(tier);
  const breakdown = selectedPatient.crs_breakdown;

  // Handle both old format (simple percentages) and new format (raw/weighted)
  const components = breakdown
    ? Object.entries(breakdown).map(([key, value]) => {
        if (typeof value === "object" && value !== null && "raw" in value) {
          return {
            name: key,
            label: COMPONENT_LABELS[key] ?? key,
            raw: (value as { raw: number; weighted: number }).raw,
            weighted: (value as { raw: number; weighted: number }).weighted,
            weight: COMPONENT_WEIGHTS[key] ?? 0,
          };
        }
        // Legacy format
        return {
          name: key,
          label: COMPONENT_LABELS[key] ?? key,
          raw: typeof value === "number" ? value : 0,
          weighted: typeof value === "number" ? value * (COMPONENT_WEIGHTS[key] ?? 0) / 100 : 0,
          weight: COMPONENT_WEIGHTS[key] ?? 0,
        };
      })
    : [];

  return (
    <div className={cn("space-y-4")}>
      <Card>
        <CardHeader className={cn("flex flex-row items-center justify-between")}>
          <CardTitle className={cn("text-lg")}>Composite Risk Score</CardTitle>
          <div className={cn("flex items-center gap-3")}>
            <span className={cn("text-2xl font-bold")}>{crsScore}</span>
            <span className={cn("text-sm text-muted-foreground")}>/100</span>
            <Badge variant="outline">
              {tierConfig?.label ?? `Tier ${tier}`} — {tierConfig?.name ?? ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className={cn("space-y-4")}>
          {components.length > 0 ? (
            components.map((comp) => (
              <div key={comp.name} className={cn("space-y-1")}>
                <div className={cn("flex items-center justify-between")}>
                  <span className={cn("text-sm font-medium")}>{comp.label}</span>
                  <div className={cn("flex items-center gap-2")}>
                    <span className={cn("text-xs text-muted-foreground")}>
                      {comp.raw}/100 raw
                    </span>
                    <span className={cn("text-sm font-mono")}>
                      {comp.weighted.toFixed(1)}
                    </span>
                    <span className={cn("text-xs text-muted-foreground")}>
                      ({comp.weight}%)
                    </span>
                  </div>
                </div>
                <Progress value={comp.raw} className={cn("h-2")} />
              </div>
            ))
          ) : (
            <p className={cn("text-sm text-muted-foreground")}>
              No CRS breakdown available. Run cohortisation to calculate.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Add the Risk & CRS tab to patient-tabs.tsx**

Read the existing `patient-tabs.tsx` to find where tabs are defined. Add a new tab for "Risk & CRS" that renders `<RiskCRSTab />`. Import at the top:

```tsx
import { RiskCRSTab } from "./risk-crs-tab";
```

Add a new `TabsTrigger` and `TabsContent`:

```tsx
<TabsTrigger value="risk-crs">Risk & CRS</TabsTrigger>
```

```tsx
<TabsContent value="risk-crs">
  <RiskCRSTab />
</TabsContent>
```

The exact insertion point depends on the current tabs structure — insert after the existing tabs (Clinical Data, Care Protocols, Timeline).

---

## Task 12: Verify Full Stack Integration

- [ ] **Step 1: Delete DB, restart backend, verify seed**

```bash
rm -f backend/data/app.db
cd backend && source .venv/bin/activate && python -m uvicorn app.main:app --port 8000
```

- [ ] **Step 2: Verify API endpoints with curl**

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@bradesco.com","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# CRS config loads
curl -s http://localhost:8000/api/cohortisation/crs-config -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Components: {len(d[\"components\"])}, Thresholds: {len(d[\"tier_thresholds\"])}, Rules: {len(d[\"tiebreaker_rules\"])}')"
# Expected: Components: 5, Thresholds: 5, Rules: 4

# Distribution works
curl -s http://localhost:8000/api/cohortisation/distribution -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Recalculate all
curl -s -X POST http://localhost:8000/api/cohortisation/recalculate -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" | python3 -m json.tool
# Expected: {"processed": 500, "tier_changes": ...}

# Assignments populated
curl -s "http://localhost:8000/api/cohortisation/assignments?page=1&page_size=3" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Total: {d[\"total\"]}, First: {d[\"items\"][0][\"patient_name\"]} CRS={d[\"items\"][0][\"crs_score\"]} Tier={d[\"items\"][0][\"tier_number\"]}')"
```

- [ ] **Step 3: Start frontend and verify UI**

```bash
cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && pnpm dev
```

Navigate to `/dashboard/cohortisation`:
- Distribution chart shows 5 bars
- CRS Formula tab shows 5 components with weights summing to 100%
- Expanding a component shows the scoring table
- Tier Thresholds tab shows 5 threshold rows + 4 tiebreaker rules
- "Recalculate All" button works and refreshes data
- Assignment Log tab shows paginated results

Navigate to a patient detail page and check for the "Risk & CRS" tab with horizontal bars.

- [ ] **Step 4: Fix any issues found during integration testing**

Address any runtime errors, missing imports, or layout issues.
