# Phase 7: Outcomes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live outcomes dashboard that computes clinical, HEDIS, engagement, and financial metrics from real patient data — no hardcoded values — with cohort migration tracking, metric snapshots, and AI quarterly insights.

**Architecture:** Backend-first. A new `OutcomeMetric` model stores point-in-time snapshots. Four service modules compute metrics from live SQL queries against `patient_labs`, `patient_diagnoses`, `cohort_assignments`, `concierge_actions`, and `active_medications`. A snapshot service persists computed metrics for trend analysis. A cohort migration service queries `cohort_assignments` history (no new tables). An LLM prompt generates quarterly narrative insights. The frontend is a tabbed outcomes page with filter bar, KPI cards, outcomes table, migration summary, and AI insight panel.

**Tech Stack:** FastAPI, SQLAlchemy async (SQLite), Pydantic v2, Next.js 15, Tailwind 4, shadcn/ui, Zustand, Recharts, Gemini LLM via existing provider abstraction.

---

## File Map

### Backend — New Files

| File | Responsibility |
|------|---------------|
| `backend/app/models/outcome_metric.py` | `OutcomeMetric` SQLAlchemy model |
| `backend/app/schemas/outcomes.py` | Pydantic request/response schemas for all outcomes endpoints |
| `backend/app/services/outcome_metrics_service.py` | Live SQL metric computation (clinical, HEDIS, engagement, financial) |
| `backend/app/services/cohort_migration_service.py` | Migration summary/history/overrides from `cohort_assignments` |
| `backend/app/services/metric_snapshot_service.py` | Persist + retrieve metric snapshots |
| `backend/app/routers/outcomes.py` | FastAPI router: `/api/outcomes/*` |

### Backend — Modified Files

| File | Change |
|------|--------|
| `backend/app/models/__init__.py` | Add `OutcomeMetric` import + `__all__` entry |
| `backend/app/models/cohort.py` | Add `approved_at`, `approved_by` nullable fields to `CohortAssignment` |
| `backend/app/llm/prompts.py` | Add `quarterly_insight` prompt template |
| `backend/app/main.py` | Register outcomes router |

### Frontend — New Files

| File | Responsibility |
|------|---------------|
| `src/services/types/outcomes.ts` | TypeScript interfaces for outcomes API responses |
| `src/services/api/outcomes.ts` | API client functions for outcomes endpoints |
| `src/stores/outcomes-store.ts` | Zustand store for outcomes page state |
| `src/features/outcomes/components/outcomes-kpi-strip.tsx` | 4 KPI cards for active tab |
| `src/features/outcomes/components/outcomes-table.tsx` | Primary outcomes table (baseline → 90d → current → target → status) |
| `src/features/outcomes/components/migration-summary.tsx` | Cohort migration matrix + recent migrations list |
| `src/features/outcomes/components/ai-quarterly-insight.tsx` | AI narrative panel with structured insights |
| `src/features/outcomes/components/migration-approval-table.tsx` | Pending overrides with approve/reject actions |

### Frontend — Modified Files

| File | Change |
|------|--------|
| `src/app/dashboard/outcomes/page.tsx` | Replace empty state with full outcomes page |
| `src/config/api.ts` | Add snapshot and approval endpoints to `outcomes` section |

---

## Task 1: OutcomeMetric Model + CohortAssignment Approval Fields

**Files:**
- Create: `backend/app/models/outcome_metric.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/models/cohort.py`

- [ ] **Step 1: Create the OutcomeMetric model**

```python
# backend/app/models/outcome_metric.py
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class OutcomeMetric(Base):
    """Point-in-time metric snapshot for historical comparison."""
    __tablename__ = "outcome_metrics"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    program_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cohort_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("cohorts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    metric_key: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    baseline_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_outcome_metrics_lookup", "tenant_id", "metric_key", "period_start"),
    )
```

- [ ] **Step 2: Add approval fields to CohortAssignment**

In `backend/app/models/cohort.py`, add two new columns to `CohortAssignment` after the `review_due_at` field:

```python
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
```

- [ ] **Step 3: Register OutcomeMetric in models __init__**

In `backend/app/models/__init__.py`, add:

```python
from app.models.outcome_metric import OutcomeMetric
```

And add `"OutcomeMetric"` to the `__all__` list.

- [ ] **Step 4: Verify the app starts and tables are created**

Run: `cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && rm -f backend/data/care-admin.db && pnpm dev`

Wait for both frontend and backend to start. Check backend logs for table creation errors. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/outcome_metric.py backend/app/models/__init__.py backend/app/models/cohort.py
git commit -m "feat(outcomes): add OutcomeMetric model and CohortAssignment approval fields"
```

---

## Task 2: Pydantic Schemas for Outcomes API

**Files:**
- Create: `backend/app/schemas/outcomes.py`

- [ ] **Step 1: Create outcomes schemas**

```python
# backend/app/schemas/outcomes.py
"""Pydantic schemas for outcomes endpoints."""

from __future__ import annotations

from pydantic import BaseModel


# ── Individual Metric ────────────────────────────────────────────────────

class MetricValue(BaseModel):
    metric_key: str
    category: str
    label: str
    value: float | None
    unit: str
    data_available: bool
    baseline_value: float | None = None
    target_value: float | None = None


class MetricCategoryResponse(BaseModel):
    """Response for a single metric category (clinical, hedis, engagement, financial)."""
    metrics: list[MetricValue]
    program_id: str
    cohort_id: str | None = None
    period_start: str | None = None
    period_end: str | None = None


# ── Migration ────────────────────────────────────────────────────────────

class MigrationFlow(BaseModel):
    from_cohort_id: str
    from_cohort_name: str
    to_cohort_id: str
    to_cohort_name: str
    count: int


class MigrationSummaryResponse(BaseModel):
    flows: list[MigrationFlow]
    total_migrations: int


class MigrationHistoryItem(BaseModel):
    assignment_id: str
    patient_id: str
    patient_name: str
    from_cohort_name: str
    from_cohort_color: str
    to_cohort_name: str
    to_cohort_color: str
    score_before: int | None
    score_after: int | None
    assignment_type: str
    reason: str | None
    assigned_at: str


class MigrationHistoryResponse(BaseModel):
    items: list[MigrationHistoryItem]
    total: int
    page: int
    page_size: int


# ── Overrides ────────────────────────────────────────────────────────────

class PendingOverrideItem(BaseModel):
    assignment_id: str
    patient_id: str
    patient_name: str
    from_cohort_name: str
    from_cohort_color: str
    to_cohort_name: str
    to_cohort_color: str
    score: int | None
    reason: str | None
    assigned_by_name: str | None
    assigned_at: str


class PendingOverridesResponse(BaseModel):
    items: list[PendingOverrideItem]
    total: int


class OverrideActionResponse(BaseModel):
    status: str
    assignment_id: str


# ── Snapshot ─────────────────────────────────────────────────────────────

class SnapshotResponse(BaseModel):
    snapshot_count: int
    program_id: str


class MetricHistoryPoint(BaseModel):
    value: float
    period_start: str
    period_end: str
    baseline_value: float | None = None
    target_value: float | None = None


class MetricHistoryResponse(BaseModel):
    metric_key: str
    points: list[MetricHistoryPoint]


# ── AI Quarterly Insight ─────────────────────────────────────────────────

class KeyImprovement(BaseModel):
    metric: str
    change: str
    interpretation: str


class Concern(BaseModel):
    metric: str
    issue: str
    recommendation: str


class QuarterlyInsightResponse(BaseModel):
    narrative_markdown: str
    key_improvements: list[KeyImprovement]
    concerns: list[Concern]
    strategic_recommendations: list[str]
    generated_at: str
    is_fallback: bool = False
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/outcomes.py
git commit -m "feat(outcomes): add Pydantic schemas for all outcomes endpoints"
```

---

## Task 3: Clinical Metrics Service

**Files:**
- Create: `backend/app/services/outcome_metrics_service.py`

- [ ] **Step 1: Create the metrics service with clinical metrics**

```python
# backend/app/services/outcome_metrics_service.py
"""Live metric computation from patient data. Every metric is a real SQL query."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cohort import CohortAssignment
from app.models.communication import ConciergeAction
from app.models.patient import Patient, PatientLab


def _base_patient_filter(tenant_id: uuid.UUID, program_id: uuid.UUID, cohort_id: uuid.UUID | None):
    """Return a list of WHERE clauses to filter active patients in a program (optionally a cohort)."""
    conditions = [
        CohortAssignment.tenant_id == tenant_id,
        CohortAssignment.program_id == program_id,
        CohortAssignment.is_current == True,
    ]
    if cohort_id is not None:
        conditions.append(CohortAssignment.cohort_id == cohort_id)
    return conditions


async def _get_active_patient_ids(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None,
) -> list[uuid.UUID]:
    """Get patient IDs with current assignments in the program/cohort."""
    q = select(CohortAssignment.patient_id).where(
        *_base_patient_filter(tenant_id, program_id, cohort_id)
    )
    result = await db.execute(q)
    return [row[0] for row in result.all()]


# ── Clinical Metrics ─────────────────────────────────────────────────────

async def hba1c_control_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of patients with latest HbA1c < 7.0"""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    # Subquery: latest HbA1c per patient
    rn = (
        func.row_number()
        .over(partition_by=PatientLab.patient_id, order_by=PatientLab.recorded_at.desc())
        .label("rn")
    )
    date_filters = [PatientLab.patient_id.in_(patient_ids), PatientLab.test_type == "HbA1c"]
    if period_end is not None:
        date_filters.append(PatientLab.recorded_at <= datetime.combine(period_end, datetime.max.time(), tzinfo=timezone.utc))

    sq = select(PatientLab.patient_id, PatientLab.value, rn).where(*date_filters).subquery()
    latest = select(sq.c.patient_id, sq.c.value).where(sq.c.rn == 1).subquery()

    total = (await db.execute(select(func.count()).select_from(latest))).scalar_one()
    if total == 0:
        return {"value": None, "data_available": False}

    controlled = (await db.execute(
        select(func.count()).select_from(latest).where(latest.c.value < 7.0)
    )).scalar_one()

    return {"value": round(controlled / total * 100, 1), "data_available": True}


async def hba1c_improvement_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of patients whose latest HbA1c is lower than their first recorded HbA1c."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    # First HbA1c per patient
    rn_first = (
        func.row_number()
        .over(partition_by=PatientLab.patient_id, order_by=PatientLab.recorded_at.asc())
        .label("rn")
    )
    first_sq = select(PatientLab.patient_id, PatientLab.value.label("first_val"), rn_first).where(
        PatientLab.patient_id.in_(patient_ids), PatientLab.test_type == "HbA1c"
    ).subquery()
    first = select(first_sq.c.patient_id, first_sq.c.first_val).where(first_sq.c.rn == 1).subquery()

    # Latest HbA1c per patient
    rn_last = (
        func.row_number()
        .over(partition_by=PatientLab.patient_id, order_by=PatientLab.recorded_at.desc())
        .label("rn")
    )
    last_sq = select(PatientLab.patient_id, PatientLab.value.label("last_val"), rn_last).where(
        PatientLab.patient_id.in_(patient_ids), PatientLab.test_type == "HbA1c"
    ).subquery()
    last = select(last_sq.c.patient_id, last_sq.c.last_val).where(last_sq.c.rn == 1).subquery()

    # Join first and last, count where last < first
    joined = (
        select(first.c.patient_id, first.c.first_val, last.c.last_val)
        .join(last, first.c.patient_id == last.c.patient_id)
        .subquery()
    )

    total = (await db.execute(select(func.count()).select_from(joined))).scalar_one()
    if total == 0:
        return {"value": None, "data_available": False}

    improved = (await db.execute(
        select(func.count()).select_from(joined).where(joined.c.last_val < joined.c.first_val)
    )).scalar_one()

    return {"value": round(improved / total * 100, 1), "data_available": True}


async def hospitalisation_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """Hospitalizations per 1000 member-months. Derived from diagnosis codes (I50.*, E11.10 DKA, etc.)."""
    from app.models.patient import PatientDiagnosis

    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    member_months = len(patient_ids) * 12  # Annualized assumption

    # Hospital-related ICD10 codes: heart failure, DKA, acute kidney injury
    hosp_codes = ("I50%", "E11.10", "E10.10", "N17%")
    conditions = [
        PatientDiagnosis.patient_id.in_(patient_ids),
        PatientDiagnosis.is_active == True,
    ]
    code_filters = [PatientDiagnosis.icd10_code.like(code) for code in hosp_codes]
    from sqlalchemy import or_
    conditions.append(or_(*code_filters))

    hosp_count = (await db.execute(
        select(func.count()).where(*conditions)
    )).scalar_one()

    rate = round(hosp_count / member_months * 1000, 1) if member_months > 0 else 0
    return {"value": rate, "data_available": True}


async def care_gap_closure_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of patients who had care gaps that are now resolved (empty care_gaps array)."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    # Total patients in population
    total = len(patient_ids)

    # Patients with no care gaps (empty array or null)
    no_gaps = (await db.execute(
        select(func.count()).where(
            Patient.id.in_(patient_ids),
            Patient.is_active == True,
        ).where(
            func.coalesce(func.json_array_length(Patient.care_gaps), 0) == 0
        )
    )).scalar_one()

    return {"value": round(no_gaps / total * 100, 1), "data_available": True}


async def avg_pdc(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """Average PDC across all active medications for the filtered population."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    result = await db.execute(
        select(Patient.active_medications).where(
            Patient.id.in_(patient_ids),
            Patient.is_active == True,
            Patient.active_medications.isnot(None),
        )
    )
    med_rows = result.all()

    pdc_sum = 0.0
    pdc_count = 0
    for (meds,) in med_rows:
        if not meds or not isinstance(meds, list):
            continue
        for m in meds:
            if isinstance(m, dict) and "pdc_90day" in m:
                pdc_sum += m["pdc_90day"]
                pdc_count += 1

    if pdc_count == 0:
        return {"value": None, "data_available": False}

    return {"value": round(pdc_sum / pdc_count * 100, 1), "data_available": True}


async def pdc_above_80_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of patients with average PDC >= 0.80."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    result = await db.execute(
        select(Patient.active_medications).where(
            Patient.id.in_(patient_ids),
            Patient.is_active == True,
            Patient.active_medications.isnot(None),
        )
    )
    med_rows = result.all()

    total_with_meds = 0
    compliant = 0
    for (meds,) in med_rows:
        if not meds or not isinstance(meds, list) or len(meds) == 0:
            continue
        pdc_values = [m.get("pdc_90day", 0) for m in meds if isinstance(m, dict)]
        if not pdc_values:
            continue
        total_with_meds += 1
        if sum(pdc_values) / len(pdc_values) >= 0.80:
            compliant += 1

    if total_with_meds == 0:
        return {"value": None, "data_available": False}

    return {"value": round(compliant / total_with_meds * 100, 1), "data_available": True}


# ── HEDIS Metrics ────────────────────────────────────────────────────────

async def hedis_hba1c_testing(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of diabetic patients with at least 1 HbA1c test in the measurement period."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    total = len(patient_ids)

    date_filters = [PatientLab.patient_id.in_(patient_ids), PatientLab.test_type == "HbA1c"]
    if period_start:
        date_filters.append(PatientLab.recorded_at >= datetime.combine(period_start, datetime.min.time(), tzinfo=timezone.utc))
    if period_end:
        date_filters.append(PatientLab.recorded_at <= datetime.combine(period_end, datetime.max.time(), tzinfo=timezone.utc))

    tested = (await db.execute(
        select(func.count(func.distinct(PatientLab.patient_id))).where(*date_filters)
    )).scalar_one()

    return {"value": round(tested / total * 100, 1), "data_available": True}


async def hedis_eye_exam(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% with eye exam — proxied via care_gaps (patients WITHOUT 'Eye exam' in care_gaps have completed it)."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    total = len(patient_ids)

    # Patients whose care_gaps do NOT contain "Eye exam" are considered compliant
    # SQLite JSON: check if 'Eye exam' is NOT in the care_gaps array
    result = await db.execute(
        select(Patient.id, Patient.care_gaps).where(Patient.id.in_(patient_ids))
    )
    compliant = 0
    for pid, gaps in result.all():
        gap_list = gaps if isinstance(gaps, list) else []
        if "Eye exam" not in gap_list:
            compliant += 1

    return {"value": round(compliant / total * 100, 1), "data_available": True}


async def hedis_nephropathy(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% with nephropathy screening (eGFR or uACR test in patient_labs)."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    total = len(patient_ids)

    date_filters = [
        PatientLab.patient_id.in_(patient_ids),
        PatientLab.test_type.in_(["eGFR", "uACR"]),
    ]
    if period_start:
        date_filters.append(PatientLab.recorded_at >= datetime.combine(period_start, datetime.min.time(), tzinfo=timezone.utc))
    if period_end:
        date_filters.append(PatientLab.recorded_at <= datetime.combine(period_end, datetime.max.time(), tzinfo=timezone.utc))

    screened = (await db.execute(
        select(func.count(func.distinct(PatientLab.patient_id))).where(*date_filters)
    )).scalar_one()

    return {"value": round(screened / total * 100, 1), "data_available": True}


async def hedis_bp_control(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% with BP < 140/90 (from latest BP Systolic in patient_labs)."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    rn = (
        func.row_number()
        .over(partition_by=PatientLab.patient_id, order_by=PatientLab.recorded_at.desc())
        .label("rn")
    )
    sq = select(PatientLab.patient_id, PatientLab.value, rn).where(
        PatientLab.patient_id.in_(patient_ids),
        PatientLab.test_type == "BP Systolic",
    ).subquery()
    latest = select(sq.c.patient_id, sq.c.value).where(sq.c.rn == 1).subquery()

    total = (await db.execute(select(func.count()).select_from(latest))).scalar_one()
    if total == 0:
        return {"value": None, "data_available": False}

    controlled = (await db.execute(
        select(func.count()).select_from(latest).where(latest.c.value < 140)
    )).scalar_one()

    return {"value": round(controlled / total * 100, 1), "data_available": True}


# ── Engagement Metrics ───────────────────────────────────────────────────

async def enrollment_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of active patients with a current cohort assignment in this program."""
    total_active = (await db.execute(
        select(func.count()).where(Patient.tenant_id == tenant_id, Patient.is_active == True)
    )).scalar_one()

    if total_active == 0:
        return {"value": None, "data_available": False}

    enrolled = (await db.execute(
        select(func.count(func.distinct(CohortAssignment.patient_id))).where(
            *_base_patient_filter(tenant_id, program_id, cohort_id)
        )
    )).scalar_one()

    return {"value": round(enrolled / total_active * 100, 1), "data_available": True}


async def touchpoint_completion_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of concierge_actions with status='success'."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    total_actions = (await db.execute(
        select(func.count()).where(
            ConciergeAction.tenant_id == tenant_id,
            ConciergeAction.patient_id.in_(patient_ids),
        )
    )).scalar_one()

    if total_actions == 0:
        return {"value": None, "data_available": False}

    success_actions = (await db.execute(
        select(func.count()).where(
            ConciergeAction.tenant_id == tenant_id,
            ConciergeAction.patient_id.in_(patient_ids),
            ConciergeAction.status == "success",
        )
    )).scalar_one()

    return {"value": round(success_actions / total_actions * 100, 1), "data_available": True}


async def avg_response_time(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """Average hours between wa_dispatched and wa_replied actions per patient."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    # Get dispatched actions
    dispatched = await db.execute(
        select(ConciergeAction.patient_id, ConciergeAction.created_at).where(
            ConciergeAction.tenant_id == tenant_id,
            ConciergeAction.patient_id.in_(patient_ids),
            ConciergeAction.action_type == "wa_dispatched",
        ).order_by(ConciergeAction.patient_id, ConciergeAction.created_at)
    )
    dispatch_map: dict[uuid.UUID, list[datetime]] = {}
    for pid, ts in dispatched.all():
        dispatch_map.setdefault(pid, []).append(ts)

    # Get replied actions
    replied = await db.execute(
        select(ConciergeAction.patient_id, ConciergeAction.created_at).where(
            ConciergeAction.tenant_id == tenant_id,
            ConciergeAction.patient_id.in_(patient_ids),
            ConciergeAction.action_type == "wa_replied",
        ).order_by(ConciergeAction.patient_id, ConciergeAction.created_at)
    )
    reply_map: dict[uuid.UUID, list[datetime]] = {}
    for pid, ts in replied.all():
        reply_map.setdefault(pid, []).append(ts)

    # Pair dispatched → replied (greedy: first reply after each dispatch)
    total_hours = 0.0
    pair_count = 0
    for pid, dispatches in dispatch_map.items():
        replies = reply_map.get(pid, [])
        reply_idx = 0
        for d_ts in dispatches:
            while reply_idx < len(replies) and replies[reply_idx] <= d_ts:
                reply_idx += 1
            if reply_idx < len(replies):
                delta = (replies[reply_idx] - d_ts).total_seconds() / 3600
                total_hours += delta
                pair_count += 1
                reply_idx += 1

    if pair_count == 0:
        return {"value": None, "data_available": False}

    return {"value": round(total_hours / pair_count, 1), "data_available": True}


async def active_sequence_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of patients with at least one concierge_action in last 30 days."""
    from datetime import timedelta
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    total = len(patient_ids)
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    active_patients = (await db.execute(
        select(func.count(func.distinct(ConciergeAction.patient_id))).where(
            ConciergeAction.tenant_id == tenant_id,
            ConciergeAction.patient_id.in_(patient_ids),
            ConciergeAction.created_at >= cutoff,
        )
    )).scalar_one()

    return {"value": round(active_patients / total * 100, 1), "data_available": True}


# ── Financial Metrics ────────────────────────────────────────────────────

async def cost_avoidance_per_member(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
    savings_per_migration: float = 500.0,
) -> dict:
    """Estimated cost avoidance from patients who moved to lower-risk cohorts.
    Patients who moved from higher sort_order cohort to lower sort_order = improvement."""
    from app.models.cohort import Cohort

    # Get cohort sort orders for this program
    cohorts_result = await db.execute(
        select(Cohort.id, Cohort.sort_order).where(Cohort.program_id == program_id)
    )
    sort_map = {cid: order for cid, order in cohorts_result.all()}

    if not sort_map:
        return {"value": None, "data_available": False}

    # Count migrations where patient moved to a lower sort_order cohort (improvement)
    migrations = await db.execute(
        select(CohortAssignment.cohort_id, CohortAssignment.previous_cohort_id).where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.previous_cohort_id.isnot(None),
        )
    )

    improvement_count = 0
    total_members = len(await _get_active_patient_ids(db, tenant_id, program_id, cohort_id))

    for to_cohort, from_cohort in migrations.all():
        from_order = sort_map.get(from_cohort)
        to_order = sort_map.get(to_cohort)
        if from_order is not None and to_order is not None and to_order < from_order:
            improvement_count += 1

    if total_members == 0:
        return {"value": None, "data_available": False}

    total_avoidance = improvement_count * savings_per_migration
    per_member = round(total_avoidance / total_members, 2)

    return {"value": per_member, "data_available": True}


async def roi_ratio(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
    savings_per_migration: float = 500.0,
    per_member_cost: float = 50.0,
) -> dict:
    """ROI = total cost avoidance / estimated program cost."""
    from app.models.cohort import Cohort

    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    cohorts_result = await db.execute(
        select(Cohort.id, Cohort.sort_order).where(Cohort.program_id == program_id)
    )
    sort_map = {cid: order for cid, order in cohorts_result.all()}

    migrations = await db.execute(
        select(CohortAssignment.cohort_id, CohortAssignment.previous_cohort_id).where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.previous_cohort_id.isnot(None),
        )
    )

    improvement_count = 0
    for to_cohort, from_cohort in migrations.all():
        from_order = sort_map.get(from_cohort)
        to_order = sort_map.get(to_cohort)
        if from_order is not None and to_order is not None and to_order < from_order:
            improvement_count += 1

    total_avoidance = improvement_count * savings_per_migration
    program_cost = len(patient_ids) * per_member_cost

    if program_cost == 0:
        return {"value": None, "data_available": False}

    return {"value": round(total_avoidance / program_cost, 2), "data_available": True}


async def er_avoidance_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% reduction in ER-related diagnoses comparing first vs latest quarter.
    Uses ER-related ICD10 codes as proxy."""
    from app.models.patient import PatientDiagnosis
    from sqlalchemy import or_

    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    er_codes = [PatientDiagnosis.icd10_code.like(c) for c in ("I50%", "E11.10", "E10.10", "N17%")]

    # Get all ER diagnoses with dates
    result = await db.execute(
        select(PatientDiagnosis.diagnosed_at).where(
            PatientDiagnosis.patient_id.in_(patient_ids),
            or_(*er_codes),
            PatientDiagnosis.diagnosed_at.isnot(None),
        ).order_by(PatientDiagnosis.diagnosed_at)
    )
    dates = [row[0] for row in result.all()]

    if len(dates) < 2:
        return {"value": None, "data_available": False}

    # Split into first quarter and latest quarter of data
    from datetime import timedelta
    span = (dates[-1] - dates[0]).days
    if span < 180:
        return {"value": None, "data_available": False}

    quarter_days = 90
    first_cutoff = dates[0] + timedelta(days=quarter_days)
    last_start = dates[-1] - timedelta(days=quarter_days)

    first_q = sum(1 for d in dates if d <= first_cutoff)
    last_q = sum(1 for d in dates if d >= last_start)

    if first_q == 0:
        return {"value": None, "data_available": False}

    reduction = round((first_q - last_q) / first_q * 100, 1)
    return {"value": reduction, "data_available": True}


# ── Aggregation ──────────────────────────────────────────────────────────

METRIC_REGISTRY: dict[str, dict] = {
    # Clinical
    "hba1c_control_rate": {"fn": hba1c_control_rate, "category": "clinical", "label": "HbA1c Control Rate (<7%)", "unit": "percent", "target": 60.0},
    "hba1c_improvement_rate": {"fn": hba1c_improvement_rate, "category": "clinical", "label": "HbA1c Improvement Rate", "unit": "percent", "target": 50.0},
    "hospitalisation_rate": {"fn": hospitalisation_rate, "category": "clinical", "label": "Hospitalisation Rate", "unit": "per_1k_mm", "target": 5.0},
    "care_gap_closure_rate": {"fn": care_gap_closure_rate, "category": "clinical", "label": "Care Gap Closure Rate", "unit": "percent", "target": 80.0},
    "avg_pdc": {"fn": avg_pdc, "category": "clinical", "label": "Average PDC", "unit": "percent", "target": 85.0},
    "pdc_above_80_rate": {"fn": pdc_above_80_rate, "category": "clinical", "label": "PDC ≥80% Adherence", "unit": "percent", "target": 75.0},
    # HEDIS
    "hedis_hba1c_testing": {"fn": hedis_hba1c_testing, "category": "hedis", "label": "HbA1c Testing Rate", "unit": "percent", "target": 90.0},
    "hedis_eye_exam": {"fn": hedis_eye_exam, "category": "hedis", "label": "Diabetic Eye Exam", "unit": "percent", "target": 70.0},
    "hedis_nephropathy": {"fn": hedis_nephropathy, "category": "hedis", "label": "Nephropathy Screening", "unit": "percent", "target": 80.0},
    "hedis_bp_control": {"fn": hedis_bp_control, "category": "hedis", "label": "BP Control (<140 mmHg)", "unit": "percent", "target": 65.0},
    # Engagement
    "enrollment_rate": {"fn": enrollment_rate, "category": "engagement", "label": "Enrollment Rate", "unit": "percent", "target": 90.0},
    "touchpoint_completion_rate": {"fn": touchpoint_completion_rate, "category": "engagement", "label": "Touchpoint Completion", "unit": "percent", "target": 80.0},
    "avg_response_time": {"fn": avg_response_time, "category": "engagement", "label": "Avg Response Time", "unit": "hours", "target": 24.0},
    "active_sequence_rate": {"fn": active_sequence_rate, "category": "engagement", "label": "Active Sequence Rate", "unit": "percent", "target": 70.0},
    # Financial
    "cost_avoidance_per_member": {"fn": cost_avoidance_per_member, "category": "financial", "label": "Cost Avoidance / Member", "unit": "currency", "target": None},
    "roi_ratio": {"fn": roi_ratio, "category": "financial", "label": "ROI Ratio", "unit": "ratio", "target": 2.0},
    "er_avoidance_rate": {"fn": er_avoidance_rate, "category": "financial", "label": "ER Avoidance Rate", "unit": "percent", "target": 20.0},
}


async def compute_category(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    category: str,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> list[dict]:
    """Compute all metrics in a category. Returns list of MetricValue-shaped dicts."""
    results = []
    for key, meta in METRIC_REGISTRY.items():
        if meta["category"] != category:
            continue
        computed = await meta["fn"](db, tenant_id, program_id, cohort_id, period_start, period_end)
        results.append({
            "metric_key": key,
            "category": meta["category"],
            "label": meta["label"],
            "value": computed["value"],
            "unit": meta["unit"],
            "data_available": computed["data_available"],
            "baseline_value": None,
            "target_value": meta.get("target"),
        })
    return results
```

- [ ] **Step 2: Verify imports work**

Run: `cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && python -c "from backend.app.services.outcome_metrics_service import METRIC_REGISTRY; print(len(METRIC_REGISTRY), 'metrics registered')"`

If import path doesn't work standalone, verify by starting the server and checking startup logs.

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/outcome_metrics_service.py
git commit -m "feat(outcomes): add live metric computation service — clinical, HEDIS, engagement, financial"
```

---

## Task 4: Cohort Migration Service

**Files:**
- Create: `backend/app/services/cohort_migration_service.py`

- [ ] **Step 1: Create the migration service**

```python
# backend/app/services/cohort_migration_service.py
"""Cohort migration tracking — built entirely on cohort_assignments table."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cohort import Cohort, CohortAssignment


async def get_migration_summary(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
) -> dict:
    """Matrix of (from_cohort -> to_cohort -> count) using previous_cohort_id."""
    # Get all cohorts for name/color lookup
    cohorts_result = await db.execute(
        select(Cohort).where(Cohort.program_id == program_id).order_by(Cohort.sort_order)
    )
    cohorts = {c.id: c for c in cohorts_result.scalars().all()}

    # Count migrations grouped by (previous_cohort_id, cohort_id)
    q = (
        select(
            CohortAssignment.previous_cohort_id,
            CohortAssignment.cohort_id,
            func.count().label("cnt"),
        )
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.previous_cohort_id.isnot(None),
        )
        .group_by(CohortAssignment.previous_cohort_id, CohortAssignment.cohort_id)
    )
    result = await db.execute(q)

    flows = []
    total = 0
    for from_id, to_id, count in result.all():
        from_c = cohorts.get(from_id)
        to_c = cohorts.get(to_id)
        if from_c and to_c:
            flows.append({
                "from_cohort_id": str(from_id),
                "from_cohort_name": from_c.name,
                "to_cohort_id": str(to_id),
                "to_cohort_name": to_c.name,
                "count": count,
            })
            total += count

    return {"flows": flows, "total_migrations": total}


async def get_migration_history(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """Paginated list of cohort migrations with patient details."""
    # Get all cohorts for lookup
    cohorts_result = await db.execute(
        select(Cohort).where(Cohort.program_id == program_id)
    )
    cohorts = {c.id: c for c in cohorts_result.scalars().all()}

    # Count total
    count_q = select(func.count()).where(
        CohortAssignment.tenant_id == tenant_id,
        CohortAssignment.program_id == program_id,
        CohortAssignment.previous_cohort_id.isnot(None),
    )
    total = (await db.execute(count_q)).scalar_one()

    # Fetch page
    q = (
        select(CohortAssignment)
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.previous_cohort_id.isnot(None),
        )
        .options(selectinload(CohortAssignment.patient))
        .order_by(CohortAssignment.assigned_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(q)
    assignments = result.scalars().all()

    items = []
    for a in assignments:
        from_c = cohorts.get(a.previous_cohort_id)
        to_c = cohorts.get(a.cohort_id)
        patient_name = f"{a.patient.first_name} {a.patient.last_name}" if a.patient else "Unknown"

        # Look up previous assignment's score
        prev_q = select(CohortAssignment.score).where(
            CohortAssignment.patient_id == a.patient_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.cohort_id == a.previous_cohort_id,
        ).order_by(CohortAssignment.assigned_at.desc()).limit(1)
        prev_result = await db.execute(prev_q)
        score_before = prev_result.scalar_one_or_none()

        items.append({
            "assignment_id": str(a.id),
            "patient_id": str(a.patient_id),
            "patient_name": patient_name,
            "from_cohort_name": from_c.name if from_c else "Unknown",
            "from_cohort_color": from_c.color if from_c else "#e2e8f0",
            "to_cohort_name": to_c.name if to_c else "Unknown",
            "to_cohort_color": to_c.color if to_c else "#e2e8f0",
            "score_before": score_before,
            "score_after": a.score,
            "assignment_type": a.assignment_type,
            "reason": a.reason,
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
        })

    return {"items": items, "total": total, "page": page, "page_size": page_size}


async def get_pending_overrides(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
) -> dict:
    """Manual overrides that haven't been approved yet."""
    # Get all cohorts for lookup
    cohorts_result = await db.execute(
        select(Cohort).where(Cohort.program_id == program_id)
    )
    cohorts = {c.id: c for c in cohorts_result.scalars().all()}

    q = (
        select(CohortAssignment)
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.assignment_type == "manual",
            CohortAssignment.approved_at.is_(None),
            CohortAssignment.is_current == True,
        )
        .options(selectinload(CohortAssignment.patient))
        .order_by(CohortAssignment.assigned_at.desc())
    )
    result = await db.execute(q)
    assignments = result.scalars().all()

    items = []
    for a in assignments:
        from_c = cohorts.get(a.previous_cohort_id) if a.previous_cohort_id else None
        to_c = cohorts.get(a.cohort_id)
        patient_name = f"{a.patient.first_name} {a.patient.last_name}" if a.patient else "Unknown"

        items.append({
            "assignment_id": str(a.id),
            "patient_id": str(a.patient_id),
            "patient_name": patient_name,
            "from_cohort_name": from_c.name if from_c else "N/A",
            "from_cohort_color": from_c.color if from_c else "#e2e8f0",
            "to_cohort_name": to_c.name if to_c else "Unknown",
            "to_cohort_color": to_c.color if to_c else "#e2e8f0",
            "score": a.score,
            "reason": a.reason,
            "assigned_by_name": None,  # Would need user join — keep simple
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
        })

    return {"items": items, "total": len(items)}


async def approve_override(
    db: AsyncSession,
    assignment_id: uuid.UUID,
    reviewer_id: uuid.UUID,
) -> dict:
    """Approve a manual override by setting approved_at."""
    result = await db.execute(
        select(CohortAssignment).where(CohortAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        return {"status": "not_found", "assignment_id": str(assignment_id)}

    assignment.approved_at = datetime.now(timezone.utc)
    assignment.approved_by = reviewer_id
    await db.commit()

    return {"status": "approved", "assignment_id": str(assignment_id)}


async def reject_override(
    db: AsyncSession,
    assignment_id: uuid.UUID,
    reviewer_id: uuid.UUID,
) -> dict:
    """Reject a manual override — mark as not current and restore previous assignment."""
    result = await db.execute(
        select(CohortAssignment).where(CohortAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        return {"status": "not_found", "assignment_id": str(assignment_id)}

    # Mark this override as not current
    assignment.is_current = False
    assignment.approved_at = datetime.now(timezone.utc)
    assignment.approved_by = reviewer_id
    assignment.reason = (assignment.reason or "") + " [REJECTED]"

    # Restore the previous assignment if one exists
    if assignment.previous_cohort_id:
        prev_q = (
            select(CohortAssignment)
            .where(
                CohortAssignment.patient_id == assignment.patient_id,
                CohortAssignment.program_id == assignment.program_id,
                CohortAssignment.cohort_id == assignment.previous_cohort_id,
                CohortAssignment.id != assignment_id,
            )
            .order_by(CohortAssignment.assigned_at.desc())
            .limit(1)
        )
        prev_result = await db.execute(prev_q)
        prev_assignment = prev_result.scalar_one_or_none()
        if prev_assignment:
            prev_assignment.is_current = True

    await db.commit()
    return {"status": "rejected", "assignment_id": str(assignment_id)}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/cohort_migration_service.py
git commit -m "feat(outcomes): add cohort migration service — summary, history, overrides"
```

---

## Task 5: Metric Snapshot Service

**Files:**
- Create: `backend/app/services/metric_snapshot_service.py`

- [ ] **Step 1: Create the snapshot service**

```python
# backend/app/services/metric_snapshot_service.py
"""Persist and retrieve metric snapshots for trend analysis."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outcome_metric import OutcomeMetric
from app.services.outcome_metrics_service import METRIC_REGISTRY


async def take_snapshot(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    period_start: date | None = None,
    period_end: date | None = None,
) -> int:
    """Compute all metrics and save to outcome_metrics table. Returns count of metrics saved."""
    if period_start is None:
        period_start = date.today().replace(day=1)
    if period_end is None:
        period_end = date.today()

    count = 0
    for key, meta in METRIC_REGISTRY.items():
        computed = await meta["fn"](db, tenant_id, program_id, None, period_start, period_end)
        if computed["value"] is None:
            continue

        metric = OutcomeMetric(
            tenant_id=tenant_id,
            program_id=program_id,
            cohort_id=None,
            metric_key=key,
            category=meta["category"],
            label=meta["label"],
            value=computed["value"],
            unit=meta["unit"],
            period_start=period_start,
            period_end=period_end,
            baseline_value=None,
            target_value=meta.get("target"),
        )
        db.add(metric)
        count += 1

    await db.commit()
    return count


async def get_metric_history(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    metric_key: str,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
) -> dict:
    """Return historical snapshots for a single metric."""
    conditions = [
        OutcomeMetric.tenant_id == tenant_id,
        OutcomeMetric.metric_key == metric_key,
        OutcomeMetric.program_id == program_id,
    ]
    if cohort_id is not None:
        conditions.append(OutcomeMetric.cohort_id == cohort_id)
    else:
        conditions.append(OutcomeMetric.cohort_id.is_(None))

    result = await db.execute(
        select(OutcomeMetric)
        .where(*conditions)
        .order_by(OutcomeMetric.period_start.asc())
    )
    snapshots = result.scalars().all()

    points = [
        {
            "value": s.value,
            "period_start": s.period_start.isoformat(),
            "period_end": s.period_end.isoformat(),
            "baseline_value": s.baseline_value,
            "target_value": s.target_value,
        }
        for s in snapshots
    ]

    return {"metric_key": metric_key, "points": points}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/metric_snapshot_service.py
git commit -m "feat(outcomes): add metric snapshot service — persist and retrieve historical metrics"
```

---

## Task 6: AI Quarterly Insight Prompt

**Files:**
- Modify: `backend/app/llm/prompts.py`

- [ ] **Step 1: Add quarterly_insight prompt to the registry**

In `backend/app/llm/prompts.py`, add the following template inside the `_register(...)` call, after the `population_insights` template:

```python
    PromptTemplate(
        slug="quarterly_insight",
        system=(
            "You are a clinical outcomes analyst for a healthcare payer's care management platform. "
            "Generate a 4-6 bullet narrative analyzing population health trends. "
            "Be specific with numbers. Compare current vs baseline where available. "
            "Highlight improvements and areas of concern. "
            "End with 2-3 strategic recommendations. "
            "Return a JSON object with exactly these keys: "
            '"narrative_markdown" (string, the full narrative in markdown), '
            '"key_improvements" (array of {metric, change, interpretation}), '
            '"concerns" (array of {metric, issue, recommendation}), '
            '"strategic_recommendations" (array of strings). '
            "Do not fabricate data. Only reference numbers provided in the input."
        ),
        user=(
            "Program: {program_name}\n"
            "Period: {period_start} to {period_end}\n\n"
            "== Clinical Metrics ==\n{clinical_metrics}\n\n"
            "== HEDIS Metrics ==\n{hedis_metrics}\n\n"
            "== Engagement Metrics ==\n{engagement_metrics}\n\n"
            "== Financial Metrics ==\n{financial_metrics}\n\n"
            "== Cohort Migration Summary ==\n{migration_summary}\n\n"
            "Analyze these metrics and generate the quarterly insight JSON."
        ),
    ),
```

- [ ] **Step 2: Verify prompt is registered**

Run the dev server and hit a Python REPL check, or just confirm the app starts without errors.

- [ ] **Step 3: Commit**

```bash
git add backend/app/llm/prompts.py
git commit -m "feat(outcomes): add quarterly_insight prompt to LLM registry"
```

---

## Task 7: Outcomes Router (API Endpoints)

**Files:**
- Create: `backend/app/routers/outcomes.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the outcomes router**

```python
# backend/app/routers/outcomes.py
"""Outcomes API endpoints."""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.outcomes import (
    MetricCategoryResponse,
    MetricHistoryResponse,
    MigrationHistoryResponse,
    MigrationSummaryResponse,
    OverrideActionResponse,
    PendingOverridesResponse,
    QuarterlyInsightResponse,
    SnapshotResponse,
)
from app.services import cohort_migration_service, metric_snapshot_service
from app.services.outcome_metrics_service import compute_category

router = APIRouter()


def _parse_uuid(val: str | None) -> uuid.UUID | None:
    if val is None:
        return None
    return uuid.UUID(val)


def _parse_date(val: str | None) -> date | None:
    if val is None:
        return None
    return date.fromisoformat(val)


@router.get("/clinical", response_model=MetricCategoryResponse)
async def clinical_metrics(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
    cohort_id: str | None = Query(None),
    period_start: str | None = Query(None),
    period_end: str | None = Query(None),
):
    metrics = await compute_category(
        db, auth.tenant_id, uuid.UUID(program_id), "clinical",
        _parse_uuid(cohort_id), _parse_date(period_start), _parse_date(period_end),
    )
    return MetricCategoryResponse(
        metrics=metrics, program_id=program_id, cohort_id=cohort_id,
        period_start=period_start, period_end=period_end,
    )


@router.get("/hedis", response_model=MetricCategoryResponse)
async def hedis_metrics(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
    cohort_id: str | None = Query(None),
    period_start: str | None = Query(None),
    period_end: str | None = Query(None),
):
    metrics = await compute_category(
        db, auth.tenant_id, uuid.UUID(program_id), "hedis",
        _parse_uuid(cohort_id), _parse_date(period_start), _parse_date(period_end),
    )
    return MetricCategoryResponse(
        metrics=metrics, program_id=program_id, cohort_id=cohort_id,
        period_start=period_start, period_end=period_end,
    )


@router.get("/engagement", response_model=MetricCategoryResponse)
async def engagement_metrics(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
    cohort_id: str | None = Query(None),
    period_start: str | None = Query(None),
    period_end: str | None = Query(None),
):
    metrics = await compute_category(
        db, auth.tenant_id, uuid.UUID(program_id), "engagement",
        _parse_uuid(cohort_id), _parse_date(period_start), _parse_date(period_end),
    )
    return MetricCategoryResponse(
        metrics=metrics, program_id=program_id, cohort_id=cohort_id,
        period_start=period_start, period_end=period_end,
    )


@router.get("/financial", response_model=MetricCategoryResponse)
async def financial_metrics(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
    cohort_id: str | None = Query(None),
    period_start: str | None = Query(None),
    period_end: str | None = Query(None),
):
    metrics = await compute_category(
        db, auth.tenant_id, uuid.UUID(program_id), "financial",
        _parse_uuid(cohort_id), _parse_date(period_start), _parse_date(period_end),
    )
    return MetricCategoryResponse(
        metrics=metrics, program_id=program_id, cohort_id=cohort_id,
        period_start=period_start, period_end=period_end,
    )


@router.get("/recohortisation", response_model=PendingOverridesResponse)
async def pending_overrides(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
):
    data = await cohort_migration_service.get_pending_overrides(
        db, auth.tenant_id, uuid.UUID(program_id),
    )
    return PendingOverridesResponse(**data)


@router.post("/recohortisation/{assignment_id}/approve", response_model=OverrideActionResponse)
async def approve_override(
    assignment_id: str,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    data = await cohort_migration_service.approve_override(
        db, uuid.UUID(assignment_id), auth.user_id,
    )
    return OverrideActionResponse(**data)


@router.post("/recohortisation/{assignment_id}/reject", response_model=OverrideActionResponse)
async def reject_override(
    assignment_id: str,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    data = await cohort_migration_service.reject_override(
        db, uuid.UUID(assignment_id), auth.user_id,
    )
    return OverrideActionResponse(**data)


@router.get("/migrations/summary", response_model=MigrationSummaryResponse)
async def migration_summary(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
):
    data = await cohort_migration_service.get_migration_summary(
        db, auth.tenant_id, uuid.UUID(program_id),
    )
    return MigrationSummaryResponse(**data)


@router.get("/migrations/history", response_model=MigrationHistoryResponse)
async def migration_history(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    data = await cohort_migration_service.get_migration_history(
        db, auth.tenant_id, uuid.UUID(program_id), page, page_size,
    )
    return MigrationHistoryResponse(**data)


@router.post("/snapshots", response_model=SnapshotResponse)
async def take_snapshot(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
):
    count = await metric_snapshot_service.take_snapshot(
        db, auth.tenant_id, uuid.UUID(program_id),
    )
    return SnapshotResponse(snapshot_count=count, program_id=program_id)


@router.get("/snapshots/history", response_model=MetricHistoryResponse)
async def metric_history(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    metric_key: str = Query(...),
    program_id: str = Query(...),
    cohort_id: str | None = Query(None),
):
    data = await metric_snapshot_service.get_metric_history(
        db, auth.tenant_id, metric_key, uuid.UUID(program_id), _parse_uuid(cohort_id),
    )
    return MetricHistoryResponse(**data)


@router.post("/quarterly-insight", response_model=QuarterlyInsightResponse)
async def quarterly_insight(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
):
    """Generate AI quarterly insight from computed metrics."""
    from datetime import datetime, timezone
    from app.services.outcome_metrics_service import compute_category
    from app.services.cohort_migration_service import get_migration_summary
    from app.models.program import Program

    pid = uuid.UUID(program_id)

    # Get program name
    from sqlalchemy import select
    prog_result = await db.execute(select(Program.name).where(Program.id == pid))
    program_name = prog_result.scalar_one_or_none() or "Unknown Program"

    # Compute all metrics
    clinical = await compute_category(db, auth.tenant_id, pid, "clinical")
    hedis = await compute_category(db, auth.tenant_id, pid, "hedis")
    engagement = await compute_category(db, auth.tenant_id, pid, "engagement")
    financial = await compute_category(db, auth.tenant_id, pid, "financial")
    migration = await get_migration_summary(db, auth.tenant_id, pid)

    def _fmt_metrics(metrics: list[dict]) -> str:
        lines = []
        for m in metrics:
            val = m["value"]
            if val is None:
                lines.append(f"- {m['label']}: N/A (data unavailable)")
            else:
                target = m.get("target_value")
                target_str = f" (target: {target}{m['unit']})" if target else ""
                lines.append(f"- {m['label']}: {val} {m['unit']}{target_str}")
        return "\n".join(lines) if lines else "No data available"

    def _fmt_migrations(data: dict) -> str:
        if data["total_migrations"] == 0:
            return "No cohort migrations recorded"
        lines = [f"Total migrations: {data['total_migrations']}"]
        for f in data["flows"]:
            lines.append(f"- {f['from_cohort_name']} -> {f['to_cohort_name']}: {f['count']} patients")
        return "\n".join(lines)

    now = datetime.now(timezone.utc)
    period_start = now.replace(month=max(1, now.month - 3)).strftime("%Y-%m-%d")
    period_end = now.strftime("%Y-%m-%d")

    try:
        from app.llm import get_provider
        from app.llm.prompts import PROMPT_REGISTRY

        provider = get_provider()
        template = PROMPT_REGISTRY["quarterly_insight"]
        system_prompt, user_prompt = template.render(
            program_name=program_name,
            period_start=period_start,
            period_end=period_end,
            clinical_metrics=_fmt_metrics(clinical),
            hedis_metrics=_fmt_metrics(hedis),
            engagement_metrics=_fmt_metrics(engagement),
            financial_metrics=_fmt_metrics(financial),
            migration_summary=_fmt_migrations(migration),
        )

        result = await provider.generate(
            user_prompt, system=system_prompt, max_tokens=1024, parse_json=True,
        )

        if isinstance(result, dict):
            return QuarterlyInsightResponse(
                narrative_markdown=result.get("narrative_markdown", ""),
                key_improvements=result.get("key_improvements", []),
                concerns=result.get("concerns", []),
                strategic_recommendations=result.get("strategic_recommendations", []),
                generated_at=now.isoformat(),
                is_fallback=False,
            )
    except Exception:
        pass

    # Fallback: template-based narrative
    fallback_lines = ["## Quarterly Outcomes Summary\n"]
    for m in clinical + hedis + engagement + financial:
        if m["value"] is not None:
            fallback_lines.append(f"- **{m['label']}**: {m['value']} {m['unit']}")

    return QuarterlyInsightResponse(
        narrative_markdown="\n".join(fallback_lines),
        key_improvements=[],
        concerns=[],
        strategic_recommendations=["Review clinical metrics with care team", "Schedule quarterly outcomes review meeting"],
        generated_at=now.isoformat(),
        is_fallback=True,
    )
```

- [ ] **Step 2: Register the outcomes router in main.py**

In `backend/app/main.py`, add the import:

```python
from app.routers import ai, ai_sessions, auth, cohortisation, command_center, communications, outcomes, pathways, patients, programs
```

And add this entry to `ROUTER_REGISTRY`:

```python
    (outcomes.router, "/api/outcomes", ["Outcomes"]),
```

- [ ] **Step 3: Delete the SQLite database, start the server, test endpoints**

```bash
cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin
rm -f backend/data/care-admin.db
pnpm dev
```

In another terminal, test (after logging in to get a token):

```bash
# Login
TOKEN=$(curl -s http://localhost:8000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@tatvacare.in","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Get program ID
PROG=$(curl -s http://localhost:8000/api/programs -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

# Test clinical metrics
curl -s "http://localhost:8000/api/outcomes/clinical?program_id=$PROG" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Test migration summary
curl -s "http://localhost:8000/api/outcomes/migrations/summary?program_id=$PROG" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: JSON responses with computed metric values (not null for most metrics since we have 500 seeded patients with labs).

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/outcomes.py backend/app/main.py
git commit -m "feat(outcomes): add outcomes router with all API endpoints"
```

---

## Task 8: Frontend Types + API Client

**Files:**
- Create: `src/services/types/outcomes.ts`
- Create: `src/services/api/outcomes.ts`
- Modify: `src/config/api.ts`

- [ ] **Step 1: Create TypeScript types**

```typescript
// src/services/types/outcomes.ts

export interface MetricValue {
  metric_key: string;
  category: string;
  label: string;
  value: number | null;
  unit: string;
  data_available: boolean;
  baseline_value: number | null;
  target_value: number | null;
}

export interface MetricCategoryResponse {
  metrics: MetricValue[];
  program_id: string;
  cohort_id: string | null;
  period_start: string | null;
  period_end: string | null;
}

export interface MigrationFlow {
  from_cohort_id: string;
  from_cohort_name: string;
  to_cohort_id: string;
  to_cohort_name: string;
  count: number;
}

export interface MigrationSummaryResponse {
  flows: MigrationFlow[];
  total_migrations: number;
}

export interface MigrationHistoryItem {
  assignment_id: string;
  patient_id: string;
  patient_name: string;
  from_cohort_name: string;
  from_cohort_color: string;
  to_cohort_name: string;
  to_cohort_color: string;
  score_before: number | null;
  score_after: number | null;
  assignment_type: string;
  reason: string | null;
  assigned_at: string;
}

export interface MigrationHistoryResponse {
  items: MigrationHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface PendingOverrideItem {
  assignment_id: string;
  patient_id: string;
  patient_name: string;
  from_cohort_name: string;
  from_cohort_color: string;
  to_cohort_name: string;
  to_cohort_color: string;
  score: number | null;
  reason: string | null;
  assigned_by_name: string | null;
  assigned_at: string;
}

export interface PendingOverridesResponse {
  items: PendingOverrideItem[];
  total: number;
}

export interface OverrideActionResponse {
  status: string;
  assignment_id: string;
}

export interface KeyImprovement {
  metric: string;
  change: string;
  interpretation: string;
}

export interface Concern {
  metric: string;
  issue: string;
  recommendation: string;
}

export interface QuarterlyInsightResponse {
  narrative_markdown: string;
  key_improvements: KeyImprovement[];
  concerns: Concern[];
  strategic_recommendations: string[];
  generated_at: string;
  is_fallback: boolean;
}
```

- [ ] **Step 2: Create API client functions**

```typescript
// src/services/api/outcomes.ts

import { API_ENDPOINTS } from "@/config/api";
import { apiRequest } from "./client";
import type {
  MetricCategoryResponse,
  MigrationHistoryResponse,
  MigrationSummaryResponse,
  OverrideActionResponse,
  PendingOverridesResponse,
  QuarterlyInsightResponse,
} from "../types/outcomes";

interface MetricParams {
  program_id: string;
  cohort_id?: string;
  period_start?: string;
  period_end?: string;
}

function buildParams(p: MetricParams): Record<string, string> {
  const params: Record<string, string> = { program_id: p.program_id };
  if (p.cohort_id) params.cohort_id = p.cohort_id;
  if (p.period_start) params.period_start = p.period_start;
  if (p.period_end) params.period_end = p.period_end;
  return params;
}

export async function fetchClinicalMetrics(p: MetricParams): Promise<MetricCategoryResponse> {
  return apiRequest<MetricCategoryResponse>({ method: "GET", path: API_ENDPOINTS.outcomes.clinical, params: buildParams(p) });
}

export async function fetchHedisMetrics(p: MetricParams): Promise<MetricCategoryResponse> {
  return apiRequest<MetricCategoryResponse>({ method: "GET", path: API_ENDPOINTS.outcomes.hedis, params: buildParams(p) });
}

export async function fetchEngagementMetrics(p: MetricParams): Promise<MetricCategoryResponse> {
  return apiRequest<MetricCategoryResponse>({ method: "GET", path: API_ENDPOINTS.outcomes.engagement, params: buildParams(p) });
}

export async function fetchFinancialMetrics(p: MetricParams): Promise<MetricCategoryResponse> {
  return apiRequest<MetricCategoryResponse>({ method: "GET", path: API_ENDPOINTS.outcomes.financial, params: buildParams(p) });
}

export async function fetchMigrationSummary(programId: string): Promise<MigrationSummaryResponse> {
  return apiRequest<MigrationSummaryResponse>({ method: "GET", path: API_ENDPOINTS.outcomes.migrationSummary, params: { program_id: programId } });
}

export async function fetchMigrationHistory(programId: string, page?: number, pageSize?: number): Promise<MigrationHistoryResponse> {
  return apiRequest<MigrationHistoryResponse>({
    method: "GET",
    path: API_ENDPOINTS.outcomes.migrationHistory,
    params: { program_id: programId, page: page ?? 1, page_size: pageSize ?? 20 },
  });
}

export async function fetchPendingOverrides(programId: string): Promise<PendingOverridesResponse> {
  return apiRequest<PendingOverridesResponse>({ method: "GET", path: API_ENDPOINTS.outcomes.recohortisation, params: { program_id: programId } });
}

export async function approveOverride(assignmentId: string): Promise<OverrideActionResponse> {
  return apiRequest<OverrideActionResponse>({ method: "POST", path: `${API_ENDPOINTS.outcomes.recohortisation}/${assignmentId}/approve` });
}

export async function rejectOverride(assignmentId: string): Promise<OverrideActionResponse> {
  return apiRequest<OverrideActionResponse>({ method: "POST", path: `${API_ENDPOINTS.outcomes.recohortisation}/${assignmentId}/reject` });
}

export async function fetchQuarterlyInsight(programId: string): Promise<QuarterlyInsightResponse> {
  return apiRequest<QuarterlyInsightResponse>({ method: "POST", path: API_ENDPOINTS.outcomes.quarterlyInsight, params: { program_id: programId } });
}
```

- [ ] **Step 3: Update API endpoints config**

In `src/config/api.ts`, replace the `outcomes` section:

```typescript
  outcomes: {
    clinical: "/api/outcomes/clinical",
    hedis: "/api/outcomes/hedis",
    engagement: "/api/outcomes/engagement",
    financial: "/api/outcomes/financial",
    recohortisation: "/api/outcomes/recohortisation",
    migrationSummary: "/api/outcomes/migrations/summary",
    migrationHistory: "/api/outcomes/migrations/history",
    quarterlyInsight: "/api/outcomes/quarterly-insight",
    snapshots: "/api/outcomes/snapshots",
    snapshotHistory: "/api/outcomes/snapshots/history",
  },
```

- [ ] **Step 4: Commit**

```bash
git add src/services/types/outcomes.ts src/services/api/outcomes.ts src/config/api.ts
git commit -m "feat(outcomes): add frontend types, API client, and endpoint config"
```

---

## Task 9: Outcomes Zustand Store

**Files:**
- Create: `src/stores/outcomes-store.ts`

- [ ] **Step 1: Create the outcomes store**

```typescript
// src/stores/outcomes-store.ts

import { create } from "zustand";
import {
  fetchClinicalMetrics,
  fetchHedisMetrics,
  fetchEngagementMetrics,
  fetchFinancialMetrics,
  fetchMigrationSummary,
  fetchMigrationHistory,
  fetchPendingOverrides,
  approveOverride,
  rejectOverride,
  fetchQuarterlyInsight,
} from "@/services/api/outcomes";
import { fetchPrograms } from "@/services/api/programs";
import type {
  MetricCategoryResponse,
  MigrationHistoryResponse,
  MigrationSummaryResponse,
  PendingOverridesResponse,
  QuarterlyInsightResponse,
} from "@/services/types/outcomes";
import type { ProgramListItem } from "@/services/types/program";

type TabKey = "clinical" | "hedis" | "engagement" | "financial" | "recohortisation";

interface OutcomesState {
  // Filters
  programs: ProgramListItem[];
  selectedProgramId: string | null;
  selectedCohortId: string | null;
  activeTab: TabKey;

  // Data
  clinical: MetricCategoryResponse | null;
  hedis: MetricCategoryResponse | null;
  engagement: MetricCategoryResponse | null;
  financial: MetricCategoryResponse | null;
  migrationSummary: MigrationSummaryResponse | null;
  migrationHistory: MigrationHistoryResponse | null;
  pendingOverrides: PendingOverridesResponse | null;
  quarterlyInsight: QuarterlyInsightResponse | null;

  // Loading
  metricsLoading: boolean;
  migrationLoading: boolean;
  overridesLoading: boolean;
  insightLoading: boolean;

  // Actions
  loadPrograms: () => Promise<void>;
  setActiveTab: (tab: TabKey) => void;
  setSelectedProgramId: (id: string) => void;
  setSelectedCohortId: (id: string | null) => void;
  loadMetrics: () => Promise<void>;
  loadMigrations: (page?: number) => Promise<void>;
  loadOverrides: () => Promise<void>;
  loadInsight: () => Promise<void>;
  handleApprove: (assignmentId: string) => Promise<void>;
  handleReject: (assignmentId: string) => Promise<void>;
  loadAll: () => Promise<void>;
  reset: () => void;
}

export const useOutcomesStore = create<OutcomesState>((set, get) => ({
  programs: [],
  selectedProgramId: null,
  selectedCohortId: null,
  activeTab: "clinical",

  clinical: null,
  hedis: null,
  engagement: null,
  financial: null,
  migrationSummary: null,
  migrationHistory: null,
  pendingOverrides: null,
  quarterlyInsight: null,

  metricsLoading: false,
  migrationLoading: false,
  overridesLoading: false,
  insightLoading: false,

  loadPrograms: async () => {
    try {
      const programs = await fetchPrograms();
      set({ programs });
      if (programs.length > 0 && !get().selectedProgramId) {
        set({ selectedProgramId: programs[0].id });
      }
    } catch {
      // silent
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedProgramId: (id) => set({ selectedProgramId: id }),
  setSelectedCohortId: (id) => set({ selectedCohortId: id }),

  loadMetrics: async () => {
    const { selectedProgramId, selectedCohortId } = get();
    if (!selectedProgramId) return;

    set({ metricsLoading: true });
    const params = { program_id: selectedProgramId, cohort_id: selectedCohortId ?? undefined };

    try {
      const [clinical, hedis, engagement, financial] = await Promise.all([
        fetchClinicalMetrics(params),
        fetchHedisMetrics(params),
        fetchEngagementMetrics(params),
        fetchFinancialMetrics(params),
      ]);
      set({ clinical, hedis, engagement, financial, metricsLoading: false });
    } catch {
      set({ metricsLoading: false });
    }
  },

  loadMigrations: async (page = 1) => {
    const { selectedProgramId } = get();
    if (!selectedProgramId) return;

    set({ migrationLoading: true });
    try {
      const [summary, history] = await Promise.all([
        fetchMigrationSummary(selectedProgramId),
        fetchMigrationHistory(selectedProgramId, page),
      ]);
      set({ migrationSummary: summary, migrationHistory: history, migrationLoading: false });
    } catch {
      set({ migrationLoading: false });
    }
  },

  loadOverrides: async () => {
    const { selectedProgramId } = get();
    if (!selectedProgramId) return;

    set({ overridesLoading: true });
    try {
      const pendingOverrides = await fetchPendingOverrides(selectedProgramId);
      set({ pendingOverrides, overridesLoading: false });
    } catch {
      set({ overridesLoading: false });
    }
  },

  loadInsight: async () => {
    const { selectedProgramId } = get();
    if (!selectedProgramId) return;

    set({ insightLoading: true });
    try {
      const quarterlyInsight = await fetchQuarterlyInsight(selectedProgramId);
      set({ quarterlyInsight, insightLoading: false });
    } catch {
      set({ insightLoading: false });
    }
  },

  handleApprove: async (assignmentId) => {
    try {
      await approveOverride(assignmentId);
      await get().loadOverrides();
    } catch {
      // silent
    }
  },

  handleReject: async (assignmentId) => {
    try {
      await rejectOverride(assignmentId);
      await get().loadOverrides();
    } catch {
      // silent
    }
  },

  loadAll: async () => {
    await get().loadPrograms();
    await Promise.all([
      get().loadMetrics(),
      get().loadMigrations(),
      get().loadOverrides(),
    ]);
  },

  reset: () => set({
    programs: [], selectedProgramId: null, selectedCohortId: null, activeTab: "clinical",
    clinical: null, hedis: null, engagement: null, financial: null,
    migrationSummary: null, migrationHistory: null, pendingOverrides: null, quarterlyInsight: null,
    metricsLoading: false, migrationLoading: false, overridesLoading: false, insightLoading: false,
  }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/outcomes-store.ts
git commit -m "feat(outcomes): add Zustand store for outcomes page"
```

---

## Task 10: Outcomes KPI Strip Component

**Files:**
- Create: `src/features/outcomes/components/outcomes-kpi-strip.tsx`

- [ ] **Step 1: Create the KPI strip**

```tsx
// src/features/outcomes/components/outcomes-kpi-strip.tsx
"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import type { MetricValue } from "@/services/types/outcomes";

interface OutcomesKpiStripProps {
  metrics: MetricValue[];
  loading: boolean;
}

function formatValue(m: MetricValue): string {
  if (m.value === null) return "—";
  if (m.unit === "percent") return `${m.value}%`;
  if (m.unit === "currency") return `$${m.value.toLocaleString()}`;
  if (m.unit === "ratio") return `${m.value}x`;
  if (m.unit === "per_1k_mm") return `${m.value}`;
  if (m.unit === "hours") return `${m.value}h`;
  return String(m.value);
}

function statusColor(m: MetricValue): string {
  if (m.value === null || m.target_value === null) return "text-text-primary";
  // For most metrics, meeting target is good. For hospitalisation_rate and avg_response_time, lower is better.
  const lowerIsBetter = m.metric_key === "hospitalisation_rate" || m.metric_key === "avg_response_time";
  const atTarget = lowerIsBetter ? m.value <= m.target_value : m.value >= m.target_value;
  return atTarget ? "text-status-success" : "text-status-warning";
}

export function OutcomesKpiStrip({ metrics, loading }: OutcomesKpiStripProps) {
  const display = metrics.slice(0, 4);

  return (
    <div className="flex shrink-0 gap-px overflow-hidden rounded-xl bg-border-default">
      {display.map((m) => (
        <div key={m.metric_key} className="flex-1 bg-bg-primary px-3.5 py-2.5">
          {loading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ) : (
            <>
              <div className="text-[9px] font-medium uppercase tracking-[0.06em] text-text-muted">
                {m.label}
              </div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className={cn("text-xl font-bold", statusColor(m))}>
                  {formatValue(m)}
                </span>
                {m.target_value !== null && (
                  <span className="text-xs text-text-muted">
                    / {m.unit === "currency" ? `$${m.target_value}` : m.target_value}{m.unit === "percent" ? "%" : ""}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/outcomes/components/outcomes-kpi-strip.tsx
git commit -m "feat(outcomes): add KPI strip component"
```

---

## Task 11: Outcomes Table Component

**Files:**
- Create: `src/features/outcomes/components/outcomes-table.tsx`

- [ ] **Step 1: Create the outcomes table**

```tsx
// src/features/outcomes/components/outcomes-table.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import type { MetricValue } from "@/services/types/outcomes";

interface OutcomesTableProps {
  metrics: MetricValue[];
  loading: boolean;
}

function fmtVal(value: number | null, unit: string): string {
  if (value === null) return "—";
  if (unit === "percent") return `${value}%`;
  if (unit === "currency") return `$${value.toLocaleString()}`;
  if (unit === "ratio") return `${value}x`;
  if (unit === "per_1k_mm") return `${value} /1k MM`;
  if (unit === "hours") return `${value}h`;
  return String(value);
}

function statusBadge(m: MetricValue): React.ReactNode {
  if (!m.data_available) {
    return <Badge variant="secondary">No Data</Badge>;
  }
  if (m.value === null || m.target_value === null) {
    return <Badge variant="outline">N/A</Badge>;
  }
  const lowerIsBetter = m.metric_key === "hospitalisation_rate" || m.metric_key === "avg_response_time";
  const atTarget = lowerIsBetter ? m.value <= m.target_value : m.value >= m.target_value;
  const nearTarget = lowerIsBetter
    ? m.value <= m.target_value * 1.2
    : m.value >= m.target_value * 0.8;

  if (atTarget) return <Badge className="bg-status-success-bg text-status-success">On Track</Badge>;
  if (nearTarget) return <Badge className="bg-status-warning-bg text-status-warning">Near Target</Badge>;
  return <Badge className="bg-status-error-bg text-status-error">Below Target</Badge>;
}

export function OutcomesTable({ metrics, loading }: OutcomesTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Metric</TableHead>
          <TableHead className="text-right">Baseline</TableHead>
          <TableHead className="text-right">Current</TableHead>
          <TableHead className="text-right">Target</TableHead>
          <TableHead className="text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {metrics.map((m) => (
          <TableRow key={m.metric_key}>
            <TableCell className="font-medium">{m.label}</TableCell>
            <TableCell className="text-right text-text-muted">
              {fmtVal(m.baseline_value, m.unit)}
            </TableCell>
            <TableCell className={cn("text-right font-semibold")}>
              {fmtVal(m.value, m.unit)}
            </TableCell>
            <TableCell className="text-right text-text-muted">
              {fmtVal(m.target_value, m.unit)}
            </TableCell>
            <TableCell className="text-center">{statusBadge(m)}</TableCell>
          </TableRow>
        ))}
        {metrics.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-text-muted">
              No metrics available for this category
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/outcomes/components/outcomes-table.tsx
git commit -m "feat(outcomes): add outcomes table component with status badges"
```

---

## Task 12: Migration Summary Component

**Files:**
- Create: `src/features/outcomes/components/migration-summary.tsx`

- [ ] **Step 1: Create the migration summary component**

```tsx
// src/features/outcomes/components/migration-summary.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight } from "lucide-react";
import type { MigrationHistoryItem, MigrationSummaryResponse } from "@/services/types/outcomes";

interface MigrationSummaryProps {
  summary: MigrationSummaryResponse | null;
  history: MigrationHistoryItem[];
  loading: boolean;
}

export function MigrationSummary({ summary, history, loading }: MigrationSummaryProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Flow Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Migration Flows</CardTitle>
        </CardHeader>
        <CardContent>
          {!summary || summary.total_migrations === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">No migrations recorded</p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {summary.flows.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{f.from_cohort_name}</Badge>
                    <ArrowRight className="h-3 w-3 text-text-muted" />
                    <Badge variant="outline">{f.to_cohort_name}</Badge>
                    <span className="ml-auto font-semibold">{f.count}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Recent Migrations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Migrations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4 text-center text-text-muted">
                      No recent migrations
                    </TableCell>
                  </TableRow>
                ) : (
                  history.slice(0, 10).map((item) => (
                    <TableRow key={item.assignment_id}>
                      <TableCell className="text-sm">{item.patient_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ borderColor: item.from_cohort_color }}
                          className="text-xs"
                        >
                          {item.from_cohort_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ borderColor: item.to_cohort_color }}
                          className="text-xs"
                        >
                          {item.to_cohort_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.score_before ?? "—"} → {item.score_after ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/outcomes/components/migration-summary.tsx
git commit -m "feat(outcomes): add migration summary component"
```

---

## Task 13: AI Quarterly Insight Component

**Files:**
- Create: `src/features/outcomes/components/ai-quarterly-insight.tsx`

- [ ] **Step 1: Create the AI insight component**

```tsx
// src/features/outcomes/components/ai-quarterly-insight.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { BrainCircuit, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { QuarterlyInsightResponse } from "@/services/types/outcomes";

interface AIQuarterlyInsightProps {
  insight: QuarterlyInsightResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

export function AIQuarterlyInsight({ insight, loading, onRefresh }: AIQuarterlyInsightProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!insight) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BrainCircuit className="h-4 w-4 text-brand-primary" />
            AI Quarterly Insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-text-muted">
            Generate an AI-powered quarterly analysis
          </p>
          <Button variant="outline" size="sm" onClick={onRefresh} className="w-full">
            Generate Insight
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <BrainCircuit className="h-4 w-4 text-brand-primary" />
          AI Quarterly Insight
          {insight.is_fallback && (
            <Badge variant="secondary" className="text-[10px]">Fallback</Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {/* Narrative */}
          <div className="prose prose-sm max-w-none text-text-secondary">
            <ReactMarkdown>{insight.narrative_markdown}</ReactMarkdown>
          </div>

          {/* Key Improvements */}
          {insight.key_improvements.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Key Improvements
              </h4>
              <div className="space-y-1.5">
                {insight.key_improvements.map((imp, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success" />
                    <span>
                      <strong>{imp.metric}</strong>: {imp.change} — {imp.interpretation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Concerns */}
          {insight.concerns.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Areas of Concern
              </h4>
              <div className="space-y-1.5">
                {insight.concerns.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-error" />
                    <span>
                      <strong>{c.metric}</strong>: {c.issue} — {c.recommendation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategic Recommendations */}
          {insight.strategic_recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Recommendations
              </h4>
              <ul className="ml-4 list-disc space-y-1 text-sm text-text-secondary">
                {insight.strategic_recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/outcomes/components/ai-quarterly-insight.tsx
git commit -m "feat(outcomes): add AI quarterly insight component"
```

---

## Task 14: Migration Approval Table Component

**Files:**
- Create: `src/features/outcomes/components/migration-approval-table.tsx`

- [ ] **Step 1: Create the approval table**

```tsx
// src/features/outcomes/components/migration-approval-table.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";
import type { PendingOverrideItem } from "@/services/types/outcomes";

interface MigrationApprovalTableProps {
  items: PendingOverrideItem[];
  loading: boolean;
  onApprove: (assignmentId: string) => void;
  onReject: (assignmentId: string) => void;
}

export function MigrationApprovalTable({ items, loading, onApprove, onReject }: MigrationApprovalTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        No pending cohort overrides to review
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient</TableHead>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.assignment_id}>
            <TableCell className="font-medium">{item.patient_name}</TableCell>
            <TableCell>
              <Badge variant="outline" style={{ borderColor: item.from_cohort_color }} className="text-xs">
                {item.from_cohort_name}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline" style={{ borderColor: item.to_cohort_color }} className="text-xs">
                {item.to_cohort_name}
              </Badge>
            </TableCell>
            <TableCell>{item.score ?? "—"}</TableCell>
            <TableCell className="max-w-[200px] truncate text-sm text-text-muted">
              {item.reason || "—"}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onApprove(item.assignment_id)}
                  className="h-7 w-7 p-0 text-status-success hover:bg-status-success-bg"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReject(item.assignment_id)}
                  className="h-7 w-7 p-0 text-status-error hover:bg-status-error-bg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/outcomes/components/migration-approval-table.tsx
git commit -m "feat(outcomes): add migration approval table with approve/reject actions"
```

---

## Task 15: Outcomes Page — Assemble Everything

**Files:**
- Modify: `src/app/dashboard/outcomes/page.tsx`

- [ ] **Step 1: Replace the empty page with the full outcomes page**

```tsx
// src/app/dashboard/outcomes/page.tsx
"use client";

import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { useOutcomesStore } from "@/stores/outcomes-store";
import { OutcomesKpiStrip } from "@/features/outcomes/components/outcomes-kpi-strip";
import { OutcomesTable } from "@/features/outcomes/components/outcomes-table";
import { MigrationSummary } from "@/features/outcomes/components/migration-summary";
import { AIQuarterlyInsight } from "@/features/outcomes/components/ai-quarterly-insight";
import { MigrationApprovalTable } from "@/features/outcomes/components/migration-approval-table";

export default function OutcomesPage() {
  const {
    programs,
    selectedProgramId,
    activeTab,
    clinical,
    hedis,
    engagement,
    financial,
    migrationSummary,
    migrationHistory,
    pendingOverrides,
    quarterlyInsight,
    metricsLoading,
    migrationLoading,
    overridesLoading,
    insightLoading,
    loadAll,
    loadMetrics,
    loadMigrations,
    loadOverrides,
    loadInsight,
    setActiveTab,
    setSelectedProgramId,
    handleApprove,
    handleReject,
  } = useOutcomesStore();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Reload data when program changes
  useEffect(() => {
    if (selectedProgramId) {
      loadMetrics();
      loadMigrations();
      loadOverrides();
    }
  }, [selectedProgramId, loadMetrics, loadMigrations, loadOverrides]);

  const tabMetrics = {
    clinical: clinical?.metrics ?? [],
    hedis: hedis?.metrics ?? [],
    engagement: engagement?.metrics ?? [],
    financial: financial?.metrics ?? [],
  };

  const currentMetrics = activeTab !== "recohortisation" ? tabMetrics[activeTab] : [];

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <PageHeader title="Outcomes" description="Clinical metrics, HEDIS measures, and ROI" />
        <Select value={selectedProgramId ?? ""} onValueChange={setSelectedProgramId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select program" />
          </SelectTrigger>
          <SelectContent>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="w-full justify-start border-b bg-transparent px-0">
          <TabsTrigger value="clinical" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary">
            Clinical Outcomes
          </TabsTrigger>
          <TabsTrigger value="hedis" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary">
            HEDIS Measures
          </TabsTrigger>
          <TabsTrigger value="engagement" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary">
            Engagement
          </TabsTrigger>
          <TabsTrigger value="financial" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary">
            Financial / ROI
          </TabsTrigger>
          <TabsTrigger value="recohortisation" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary">
            Re-Cohortisation
          </TabsTrigger>
        </TabsList>

        {/* Metric tabs share KPI + table + migration + AI layout */}
        {(["clinical", "hedis", "engagement", "financial"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="min-h-0 flex-1 overflow-auto">
            <div className="space-y-4 py-3">
              <OutcomesKpiStrip metrics={tabMetrics[tab]} loading={metricsLoading} />
              <OutcomesTable metrics={tabMetrics[tab]} loading={metricsLoading} />
              {tab === "clinical" && (
                <>
                  <MigrationSummary
                    summary={migrationSummary}
                    history={migrationHistory?.items ?? []}
                    loading={migrationLoading}
                  />
                  <AIQuarterlyInsight
                    insight={quarterlyInsight}
                    loading={insightLoading}
                    onRefresh={loadInsight}
                  />
                </>
              )}
            </div>
          </TabsContent>
        ))}

        {/* Re-Cohortisation tab */}
        <TabsContent value="recohortisation" className="min-h-0 flex-1 overflow-auto">
          <div className="space-y-4 py-3">
            <MigrationApprovalTable
              items={pendingOverrides?.items ?? []}
              loading={overridesLoading}
              onApprove={handleApprove}
              onReject={handleReject}
            />
            <MigrationSummary
              summary={migrationSummary}
              history={migrationHistory?.items ?? []}
              loading={migrationLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Delete the SQLite database and start the dev server**

```bash
cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin
rm -f backend/data/care-admin.db
pnpm dev
```

- [ ] **Step 3: Verify the page loads**

Open `http://localhost:3000/dashboard/outcomes` in the browser. Verify:
- Program selector shows "Diabetes Care"
- Tabs render: Clinical Outcomes, HEDIS, Engagement, Financial, Re-Cohortisation
- Clinical tab shows KPI strip with 4 metrics + outcomes table with 6 rows
- Switching tabs loads different metric sets
- Re-Cohortisation tab shows approval table (likely empty — no manual overrides seeded)
- No console errors

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/outcomes/page.tsx
git commit -m "feat(outcomes): assemble full outcomes page with tabs, filters, metrics, migrations, AI insight"
```

---

## Task 16: Final Verification + Fix Any Issues

- [ ] **Step 1: Full backend test**

```bash
cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin
rm -f backend/data/care-admin.db
pnpm dev
```

Login and test all endpoints:

```bash
TOKEN=$(curl -s http://localhost:8000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@tatvacare.in","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
PROG=$(curl -s http://localhost:8000/api/programs -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

echo "=== Clinical ==="
curl -s "http://localhost:8000/api/outcomes/clinical?program_id=$PROG" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

echo "=== HEDIS ==="
curl -s "http://localhost:8000/api/outcomes/hedis?program_id=$PROG" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

echo "=== Engagement ==="
curl -s "http://localhost:8000/api/outcomes/engagement?program_id=$PROG" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

echo "=== Financial ==="
curl -s "http://localhost:8000/api/outcomes/financial?program_id=$PROG" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

echo "=== Migration Summary ==="
curl -s "http://localhost:8000/api/outcomes/migrations/summary?program_id=$PROG" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo "=== Snapshot ==="
curl -s -X POST "http://localhost:8000/api/outcomes/snapshots?program_id=$PROG" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: All endpoints return valid JSON with computed metric values.

- [ ] **Step 2: Full frontend test**

Open the outcomes page, verify each tab shows data, check for console errors.

- [ ] **Step 3: Fix any issues found**

Address any errors from the above verification steps.

- [ ] **Step 4: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix(outcomes): address issues from Phase 7 verification"
```
