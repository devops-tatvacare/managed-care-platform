# Risk Engine + Action System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate to PostgreSQL (Dockerized), build a score computation engine that turns scoring config into real patient scores, and an action generation system that creates prioritized clinical tasks from templates — wired into the command center and patients table.

**Architecture:** PostgreSQL in docker-compose for local dev (Azure-ready config). Score computation as a stateless service reading ScoringEngine config + patient data → CRS cached on Patient.risk_score. Action generation as a stateless service reading ActionTemplate configs + patient state → PatientAction records. Both services designed as callable functions for future job worker integration.

**Tech Stack:** PostgreSQL 16 (Docker), asyncpg, SQLAlchemy 2.0, FastAPI, React/Zustand (frontend)

---

## File Map

### Infrastructure
- `docker-compose.yml` — Add PostgreSQL `db` service
- `.env.local` — Add DATABASE_URL for PostgreSQL
- `backend/requirements.txt` — Add `asyncpg`, keep `aiosqlite` as fallback
- `backend/app/config.py` — Update default DATABASE_URL
- `backend/app/database.py` — Handle both SQLite and PostgreSQL connect_args
- `backend/app/main.py` — Remove `os.makedirs("data")` for PG, keep for SQLite fallback

### Backend Models (Create)
- `backend/app/models/action.py` — ActionTemplate + PatientAction models

### Backend Models (Modify)
- `backend/app/models/patient.py` — Add risk_score, risk_score_updated_at columns
- `backend/app/models/__init__.py` — Register new models

### Backend Services (Create)
- `backend/app/services/score_engine.py` — compute_patient_score()
- `backend/app/services/action_engine.py` — generate_patient_actions()

### Backend API (Create)
- `backend/app/routers/actions.py` — Action CRUD + execution endpoints
- `backend/app/schemas/action.py` — Pydantic schemas for actions

### Backend API (Modify)
- `backend/app/routers/patients.py` — Add risk_score to serialization
- `backend/app/routers/programs.py` — Add action template endpoints
- `backend/app/routers/command_center.py` — Wire action queue to real PatientAction data
- `backend/app/main.py` — Register actions router

### Backend Seed (Create)
- `backend/app/services/action_template_seed.py` — Diabetes program action templates

### Frontend (Modify)
- `src/services/types/patient.ts` — Add risk_score to PatientListItem
- `src/app/dashboard/patients/page.tsx` — Add Risk Score column
- `src/services/types/command-center.ts` — Update ActionQueueItem to match PatientAction
- `src/stores/command-center-store.ts` — Wire to real actions API
- `src/features/command-center/components/action-queue.tsx` — Resolution buttons

---

## Task 1: PostgreSQL in Docker + Migration

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.local`
- Modify: `backend/requirements.txt`
- Modify: `backend/app/database.py`

- [ ] **Step 1: Add PostgreSQL service to docker-compose.yml**

Replace the entire file:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: bradesco_care_admin
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    env_file:
      - path: ./.env
        required: false
      - path: ./.env.local
        required: false
      - path: ./backend/.env
        required: false
      - path: ./backend/.env.local
        required: false
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/bradesco_care_admin
      - CORS_ORIGINS=["http://localhost:3000"]
      - JWT_SECRET=dev-secret-change-in-production
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - HOSTNAME=0.0.0.0
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend

volumes:
  pgdata:
```

- [ ] **Step 2: Update .env.local with PostgreSQL URL**

Add to `.env.local`:
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bradesco_care_admin
```

- [ ] **Step 3: Add asyncpg to requirements.txt**

Add after line 1 (`aiosqlite`):
```
asyncpg==0.30.0
```

- [ ] **Step 4: Install asyncpg in venv**

```bash
cd backend && .venv/bin/pip install asyncpg==0.30.0
```

- [ ] **Step 5: Update database.py to handle both drivers**

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings

connect_args = {}
if "sqlite" in settings.database_url:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args=connect_args,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        yield session
```

- [ ] **Step 6: Update config.py default**

Change `database_url` default:
```python
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/bradesco_care_admin"
```

- [ ] **Step 7: Start PostgreSQL container and verify**

```bash
docker compose up db -d
# Wait for healthy
docker compose ps
# Should show db healthy

# Test connection
psql postgresql://postgres:postgres@localhost:5432/bradesco_care_admin -c "SELECT 1"
```

- [ ] **Step 8: Start backend against PostgreSQL and verify seeds run**

```bash
cd backend && .venv/bin/python -m uvicorn app.main:app --port 8000
# Should see: tables created, seeds run
# Test: curl http://localhost:8000/api/patients?page=1&page_size=5 -H "Authorization: Bearer ..."
```

---

## Task 2: Patient Model — Add risk_score Column

**Files:**
- Modify: `backend/app/models/patient.py`
- Modify: `backend/app/routers/patients.py`
- Modify: `backend/app/schemas/patient.py`
- Modify: `src/services/types/patient.ts`

- [ ] **Step 1: Add columns to Patient model**

In `backend/app/models/patient.py`, add after `review_due_date`:
```python
    risk_score: Mapped[float | None] = mapped_column(nullable=True)
    risk_score_updated_at: Mapped[datetime | None] = mapped_column(nullable=True)
```

Add `from datetime import datetime` import if not present.

- [ ] **Step 2: Add to backend serialization**

In `backend/app/routers/patients.py`, add to `_serialize_patient_list()`:
```python
    "risk_score": p.risk_score,
```

- [ ] **Step 3: Add to Pydantic schema**

In `backend/app/schemas/patient.py`, add to `PatientListItem`:
```python
    risk_score: float | None = None
```

- [ ] **Step 4: Add to frontend type**

In `src/services/types/patient.ts`, add to `PatientListItem` after `active_medications`:
```typescript
  risk_score: number | null;
```

- [ ] **Step 5: Add Risk Score column to patients table**

In `src/app/dashboard/patients/page.tsx`, add table header between "Care Gaps" and "Last Contact":
```tsx
<TableHead className="text-right">Risk Score</TableHead>
```

Add table cell in the row (using existing `scoreColor` from `@/config/status`):
```tsx
<TableCell className="text-right">
  {p.risk_score != null ? (
    <span className={cn("tabular-nums text-sm font-medium", scoreColor(p.risk_score))}>
      {Math.round(p.risk_score)}
    </span>
  ) : (
    <span className="text-sm text-text-placeholder">--</span>
  )}
</TableCell>
```

---

## Task 3: ActionTemplate + PatientAction Models

**Files:**
- Create: `backend/app/models/action.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create action models**

Create `backend/app/models/action.py`:

```python
"""Action system models — templates and patient-level action instances."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ActionTemplate(Base, TimestampMixin):
    __tablename__ = "action_templates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    program_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("programs.id", ondelete="CASCADE"))

    name: Mapped[str] = mapped_column(default="")
    trigger_type: Mapped[str] = mapped_column(default="care_gap")  # care_gap | lab_overdue | score_threshold | cohort_change
    trigger_config: Mapped[dict] = mapped_column(JSONB, default=dict)

    cohort_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # null = all cohorts

    priority_base: Mapped[int] = mapped_column(default=50)
    score_weight: Mapped[float] = mapped_column(default=0.3)
    title_template: Mapped[str] = mapped_column(Text, default="")
    description_template: Mapped[str | None] = mapped_column(Text, nullable=True)

    resolution_options: Mapped[list] = mapped_column(JSONB, default=list)

    is_active: Mapped[bool] = mapped_column(default=True)


class PatientAction(Base, TimestampMixin):
    __tablename__ = "patient_actions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("action_templates.id", ondelete="CASCADE"))
    program_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("programs.id", ondelete="CASCADE"))
    cohort_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("cohorts.id", ondelete="SET NULL"), nullable=True)

    priority: Mapped[int] = mapped_column(default=50)
    title: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(default="open")  # open | in_progress | resolved | dismissed
    assigned_to: Mapped[str | None] = mapped_column(nullable=True)

    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_type: Mapped[str | None] = mapped_column(nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    trigger_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    resolution_options: Mapped[list] = mapped_column(JSONB, default=list)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", lazy="selectin")
    template: Mapped["ActionTemplate"] = relationship("ActionTemplate", lazy="selectin")
```

- [ ] **Step 2: Register in __init__.py**

Add to `backend/app/models/__init__.py`:
```python
from app.models.action import ActionTemplate, PatientAction
```

- [ ] **Step 3: Handle JSONB for SQLite fallback**

The JSONB type won't work with SQLite. Since we're moving to PostgreSQL this is fine, but for safety add at the top of `action.py`:
```python
from sqlalchemy import JSON
from sqlalchemy.dialects import postgresql

# Use JSONB on PostgreSQL, JSON on SQLite
JSONB = postgresql.JSONB().with_variant(JSON(), "sqlite")
```

Remove the `from sqlalchemy.dialects.postgresql import JSONB` import and use the local `JSONB`.

---

## Task 4: Score Computation Engine

**Files:**
- Create: `backend/app/services/score_engine.py`

- [ ] **Step 1: Create the score computation service**

Create `backend/app/services/score_engine.py`:

```python
"""Score computation engine — evaluates scoring config against patient data."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cohort import Cohort, ScoringEngine
from app.models.patient import Patient, PatientLab, PatientDiagnosis


async def compute_patient_score(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
    program_id: uuid.UUID,
) -> dict | None:
    """
    Compute CRS for a patient against a program's scoring engine.
    Returns: {score, breakdown, cohort_id, cohort_name} or None if no engine.
    """
    # Load scoring engine
    engine = (await db.execute(
        select(ScoringEngine).where(
            ScoringEngine.program_id == program_id,
            ScoringEngine.tenant_id == tenant_id,
            ScoringEngine.is_active == True,  # noqa: E712
        )
    )).scalar_one_or_none()

    if not engine or not engine.components:
        return None

    # Load patient
    patient = (await db.execute(
        select(Patient).where(Patient.id == patient_id)
    )).scalar_one_or_none()

    if not patient:
        return None

    # Load patient's latest labs
    labs = (await db.execute(
        select(PatientLab)
        .where(PatientLab.patient_id == patient_id, PatientLab.tenant_id == tenant_id)
        .order_by(PatientLab.recorded_at.desc())
    )).scalars().all()

    # Load active diagnoses
    diagnoses = (await db.execute(
        select(PatientDiagnosis)
        .where(
            PatientDiagnosis.patient_id == patient_id,
            PatientDiagnosis.tenant_id == tenant_id,
            PatientDiagnosis.is_active == True,  # noqa: E712
        )
    )).scalars().all()

    # Build patient context for scoring
    latest_labs = {}
    for lab in labs:
        key = lab.test_type.lower().replace(" ", "_")
        if key not in latest_labs:
            latest_labs[key] = lab.value

    icd_codes = [d.icd10_code for d in diagnoses]
    meds = patient.active_medications or []
    sdoh = patient.sdoh_flags or {}
    care_gaps = patient.care_gaps or []

    # Evaluate each component
    breakdown = {}
    total_score = 0.0

    for comp in engine.components:
        raw = _evaluate_component(comp, latest_labs, icd_codes, meds, sdoh, care_gaps)
        cap = comp.get("cap", 100)
        raw = min(raw, cap)
        weight = comp.get("weight", 0) / 100.0
        weighted = raw * weight

        breakdown[comp["name"]] = {
            "raw": round(raw, 1),
            "weighted": round(weighted, 1),
            "weight": comp.get("weight", 0),
            "label": comp.get("label", comp["name"]),
        }
        total_score += weighted

    total_score = min(round(total_score, 1), 100)

    # Match to cohort
    cohorts = (await db.execute(
        select(Cohort)
        .where(Cohort.program_id == program_id, Cohort.tenant_id == tenant_id, Cohort.is_active == True)  # noqa: E712
        .order_by(Cohort.sort_order)
    )).scalars().all()

    matched_cohort = None
    for cohort in cohorts:
        if (cohort.score_range_min is not None and cohort.score_range_max is not None
                and cohort.score_range_min <= total_score <= cohort.score_range_max):
            matched_cohort = cohort
            break

    # Cache on patient
    patient.risk_score = total_score
    patient.risk_score_updated_at = datetime.now(timezone.utc)
    await db.flush()

    return {
        "score": total_score,
        "breakdown": breakdown,
        "cohort_id": str(matched_cohort.id) if matched_cohort else None,
        "cohort_name": matched_cohort.name if matched_cohort else None,
    }


def _evaluate_component(
    comp: dict,
    latest_labs: dict,
    icd_codes: list[str],
    meds: list[dict],
    sdoh: dict,
    care_gaps: list[str],
) -> float:
    """Evaluate a single scoring component against patient data."""
    data_source = comp.get("data_source", "")
    scoring_table = comp.get("scoring_table", [])
    bonus_table = comp.get("bonus_table", [])
    aggregation = comp.get("aggregation", "first_match")

    score = 0.0

    if data_source == "lab_range":
        score = _score_lab_range(scoring_table, latest_labs, aggregation)
    elif data_source == "diagnosis_match":
        score = _score_diagnosis(scoring_table, icd_codes, aggregation)
    elif data_source == "pharmacy_adherence":
        score = _score_pharmacy(scoring_table, meds, aggregation)
    elif data_source == "utilisation":
        # Proxy: count care gaps related to ER/hospitalisation
        score = _score_utilisation(scoring_table, care_gaps, aggregation)
    elif data_source == "sdoh":
        score = _score_sdoh(scoring_table, sdoh, aggregation)

    # Apply bonus table (always additive)
    for bonus in bonus_table:
        # Bonus rules are additive — simplified evaluation
        score += bonus.get("points", 0) * 0.3  # Discount bonus points

    return score


def _score_lab_range(table: list, labs: dict, aggregation: str) -> float:
    """Match lab values against scoring table."""
    # Try to find HbA1c or relevant lab
    hba1c = labs.get("hba1c")
    if hba1c is None:
        return 0.0

    # Walk scoring table — assumes ordered by threshold
    matched = 0.0
    for row in table:
        criterion = row.get("criterion", "").lower()
        points = row.get("points", 0)
        if ">=" in criterion or "≥" in criterion:
            try:
                threshold = float("".join(c for c in criterion.split(">=")[-1].split("≥")[-1] if c.isdigit() or c == "."))
                if hba1c >= threshold:
                    matched = max(matched, points)
            except (ValueError, IndexError):
                pass
        elif "<" in criterion:
            try:
                threshold = float("".join(c for c in criterion.split("<")[-1] if c.isdigit() or c == "."))
                if hba1c < threshold:
                    matched = max(matched, points)
            except (ValueError, IndexError):
                pass
        elif "-" in criterion or "–" in criterion:
            # Range like "5.7-6.4%" or "8.0–9.9%"
            parts = criterion.replace("–", "-").replace("%", "").split("-")
            try:
                nums = [float("".join(c for c in p if c.isdigit() or c == ".")) for p in parts if any(c.isdigit() for c in p)]
                if len(nums) >= 2 and nums[0] <= hba1c <= nums[1]:
                    matched = max(matched, points)
            except (ValueError, IndexError):
                pass

    return matched


def _score_diagnosis(table: list, icd_codes: list[str], aggregation: str) -> float:
    """Match diagnoses — sum for complication burden, first_match otherwise."""
    total = 0.0
    for row in table:
        criterion = row.get("criterion", "").lower()
        points = row.get("points", 0)
        if points == 0:
            continue
        # Simple heuristic: check if any keywords from criterion match patient context
        # In production, this would use coded conditions
        if "no complication" in criterion:
            if len(icd_codes) == 0:
                total += points
        elif any(code.startswith("E11.4") for code in icd_codes) and "neuropathy" in criterion:
            total += points
        elif any(code.startswith("E11.3") for code in icd_codes) and "retinopathy" in criterion:
            total += points
        elif any(code.startswith("I25") or code.startswith("I21") for code in icd_codes) and "cvd" in criterion:
            total += points
        elif any(code.startswith("I50") for code in icd_codes) and "heart failure" in criterion:
            total += points
        elif any(code.startswith("N18") for code in icd_codes) and "ckd" in criterion:
            total += points

    if aggregation == "first_match" and total > 0:
        return total  # For diagnosis, sum is typical even in first_match mode

    return total


def _score_pharmacy(table: list, meds: list[dict], aggregation: str) -> float:
    """Score based on medication adherence (PDC)."""
    if not meds:
        return 0.0

    # Find lowest PDC across medications
    pdcs = [m.get("pdc_90day", 100) for m in meds if m.get("pdc_90day") is not None]
    if not pdcs:
        return 0.0

    min_pdc = min(pdcs) * 100 if max(pdcs) <= 1 else min(pdcs)  # Handle 0-1 vs 0-100 scale

    for row in table:
        criterion = row.get("criterion", "").lower()
        points = row.get("points", 0)
        if ">=" in criterion or "≥" in criterion:
            try:
                threshold = float("".join(c for c in criterion.split(">=")[-1].split("≥")[-1] if c.isdigit() or c == "."))
                if min_pdc >= threshold:
                    return points
            except (ValueError, IndexError):
                pass
        elif "<" in criterion:
            try:
                threshold = float("".join(c for c in criterion.split("<")[-1] if c.isdigit() or c == "."))
                if min_pdc < threshold:
                    return points
            except (ValueError, IndexError):
                pass
        elif "-" in criterion or "–" in criterion:
            parts = criterion.replace("–", "-").replace("%", "").split("-")
            try:
                nums = [float("".join(c for c in p if c.isdigit() or c == ".")) for p in parts if any(c.isdigit() for c in p)]
                if len(nums) >= 2 and nums[0] <= min_pdc <= nums[1]:
                    return points
            except (ValueError, IndexError):
                pass

    return 0.0


def _score_utilisation(table: list, care_gaps: list[str], aggregation: str) -> float:
    """Proxy scoring for utilisation — uses care_gaps count as heuristic until Encounter model exists."""
    # Simple: more care gaps = higher utilisation risk
    gap_count = len(care_gaps)
    if gap_count == 0:
        return 0.0
    if gap_count <= 1:
        return 30.0
    if gap_count <= 3:
        return 60.0
    return 80.0


def _score_sdoh(table: list, sdoh: dict, aggregation: str) -> float:
    """Score based on SDOH risk domains."""
    high_risk_count = sum(1 for v in sdoh.values() if v is True or (isinstance(v, (int, float)) and v > 0))
    for row in table:
        criterion = row.get("criterion", "").lower()
        points = row.get("points", 0)
        if "3+" in criterion or "3 or more" in criterion:
            if high_risk_count >= 3:
                return points
        elif "2" in criterion and "domain" in criterion:
            if high_risk_count == 2:
                return points
        elif "1" in criterion and "domain" in criterion:
            if high_risk_count == 1:
                return points
        elif "0" in criterion:
            if high_risk_count == 0:
                return points
    return 0.0
```

---

## Task 5: Score API Endpoints

**Files:**
- Modify: `backend/app/routers/patients.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Add compute-score endpoint to patients router**

In `backend/app/routers/patients.py`, add:

```python
from app.services.score_engine import compute_patient_score

@router.post("/{patient_id}/compute-score")
async def patient_compute_score(
    patient_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(..., description="Program ID to score against"),
):
    result = await compute_patient_score(db, auth.tenant_id, patient_id, uuid.UUID(program_id))
    if result is None:
        raise HTTPException(status_code=404, detail="No scoring engine found")
    await db.commit()
    return result
```

- [ ] **Step 2: Add batch compute endpoint**

```python
@router.post("/batch-compute-scores")
async def batch_compute_scores(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
    limit: int = Query(100, le=500),
):
    """Compute scores for all patients (manual trigger for testing)."""
    from app.models.patient import Patient
    patients = (await db.execute(
        select(Patient).where(Patient.tenant_id == auth.tenant_id, Patient.is_active == True).limit(limit)  # noqa: E712
    )).scalars().all()

    results = []
    for p in patients:
        result = await compute_patient_score(db, auth.tenant_id, p.id, uuid.UUID(program_id))
        if result:
            results.append({"patient_id": str(p.id), **result})

    await db.commit()
    return {"computed": len(results), "results": results[:10]}  # Return first 10 as sample
```

---

## Task 6: Action Engine + API

**Files:**
- Create: `backend/app/services/action_engine.py`
- Create: `backend/app/routers/actions.py`
- Create: `backend/app/schemas/action.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create action schemas**

Create `backend/app/schemas/action.py`:

```python
"""Pydantic schemas for the action system."""

from pydantic import BaseModel


class ActionTemplateCreate(BaseModel):
    name: str
    trigger_type: str = "care_gap"
    trigger_config: dict = {}
    cohort_ids: list[str] | None = None
    priority_base: int = 50
    score_weight: float = 0.3
    title_template: str
    description_template: str | None = None
    resolution_options: list[dict] = []


class ActionTemplateRead(ActionTemplateCreate):
    id: str
    program_id: str
    is_active: bool = True


class PatientActionRead(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    template_id: str
    program_id: str
    cohort_id: str | None = None
    cohort_name: str | None = None
    priority: int
    title: str
    description: str | None = None
    status: str
    assigned_to: str | None = None
    resolution_options: list[dict]
    trigger_data: dict | None = None
    created_at: str


class PatientActionUpdate(BaseModel):
    status: str | None = None
    resolution_type: str | None = None
    resolution_note: str | None = None


class ActionQueueResponse(BaseModel):
    items: list[PatientActionRead]
    total: int
```

- [ ] **Step 2: Create action engine service**

Create `backend/app/services/action_engine.py`:

```python
"""Action generation engine — evaluates templates against patient data."""

from __future__ import annotations

import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.action import ActionTemplate, PatientAction
from app.models.patient import Patient


async def generate_patient_actions(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
    program_id: uuid.UUID,
) -> list[dict]:
    """Generate actions for a patient based on active templates. Returns dicts (not persisted)."""
    patient = (await db.execute(
        select(Patient).where(Patient.id == patient_id)
    )).scalar_one_or_none()
    if not patient:
        return []

    templates = (await db.execute(
        select(ActionTemplate).where(
            ActionTemplate.program_id == program_id,
            ActionTemplate.tenant_id == tenant_id,
            ActionTemplate.is_active == True,  # noqa: E712
        )
    )).scalars().all()

    care_gaps = patient.care_gaps or []
    risk_score = patient.risk_score or 0
    patient_name = f"{patient.first_name} {patient.last_name}"

    actions = []
    for tmpl in templates:
        if not _should_trigger(tmpl, care_gaps, risk_score):
            continue

        # Check for existing open action with same template
        existing = (await db.execute(
            select(func.count()).where(
                PatientAction.patient_id == patient_id,
                PatientAction.template_id == tmpl.id,
                PatientAction.status.in_(["open", "in_progress"]),
            )
        )).scalar_one()
        if existing > 0:
            continue

        # Resolve templates
        title = tmpl.title_template.replace("{patient_name}", patient_name)
        description = (tmpl.description_template or "").replace("{patient_name}", patient_name)
        for gap in care_gaps:
            title = title.replace("{gap_type}", gap)
            description = description.replace("{gap_type}", gap)

        priority = int(tmpl.priority_base + (risk_score * tmpl.score_weight))

        actions.append({
            "tenant_id": tenant_id,
            "patient_id": patient_id,
            "template_id": tmpl.id,
            "program_id": program_id,
            "priority": min(priority, 100),
            "title": title,
            "description": description or None,
            "status": "open",
            "assigned_to": patient.assigned_to,
            "trigger_data": {"care_gaps": care_gaps, "risk_score": risk_score},
            "resolution_options": tmpl.resolution_options,
        })

    return actions


def _should_trigger(tmpl: ActionTemplate, care_gaps: list[str], risk_score: float) -> bool:
    """Check if a template's trigger matches the patient state."""
    trigger_type = tmpl.trigger_type
    config = tmpl.trigger_config or {}

    if trigger_type == "care_gap":
        gap_type = config.get("gap_type", "")
        if gap_type:
            return any(gap_type.lower() in g.lower() for g in care_gaps)
        return len(care_gaps) > 0

    if trigger_type == "score_threshold":
        threshold = config.get("threshold", 0)
        return risk_score >= threshold

    if trigger_type == "lab_overdue":
        # Simplified: check if gap_type is in care_gaps
        gap_type = config.get("gap_type", "")
        return any(gap_type.lower() in g.lower() for g in care_gaps)

    return False


async def persist_actions(db: AsyncSession, action_dicts: list[dict]) -> list[PatientAction]:
    """Persist generated action dicts to DB."""
    actions = []
    for d in action_dicts:
        action = PatientAction(**d)
        db.add(action)
        actions.append(action)
    await db.flush()
    return actions
```

- [ ] **Step 3: Create actions router**

Create `backend/app/routers/actions.py`:

```python
"""Action queue API endpoints."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.models.action import PatientAction
from app.schemas.action import ActionQueueResponse, PatientActionRead, PatientActionUpdate

router = APIRouter()


def _serialize_action(a: PatientAction) -> dict:
    return {
        "id": str(a.id),
        "patient_id": str(a.patient_id),
        "patient_name": f"{a.patient.first_name} {a.patient.last_name}" if a.patient else "Unknown",
        "template_id": str(a.template_id),
        "program_id": str(a.program_id),
        "cohort_id": str(a.cohort_id) if a.cohort_id else None,
        "cohort_name": None,
        "priority": a.priority,
        "title": a.title,
        "description": a.description,
        "status": a.status,
        "assigned_to": a.assigned_to,
        "resolution_options": a.resolution_options or [],
        "trigger_data": a.trigger_data,
        "created_at": a.created_at.isoformat() if a.created_at else "",
    }


@router.get("", response_model=ActionQueueResponse)
async def list_actions(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    status: str = Query("open"),
    limit: int = Query(20, le=100),
):
    stmt = (
        select(PatientAction)
        .where(PatientAction.tenant_id == auth.tenant_id, PatientAction.status == status)
        .order_by(PatientAction.priority.desc())
        .limit(limit)
    )
    actions = (await db.execute(stmt)).scalars().all()
    total = (await db.execute(
        select(func.count()).where(PatientAction.tenant_id == auth.tenant_id, PatientAction.status == status)
    )).scalar_one()

    return ActionQueueResponse(
        items=[PatientActionRead(**_serialize_action(a)) for a in actions],
        total=total,
    )


@router.patch("/{action_id}")
async def update_action(
    action_id: uuid.UUID,
    body: PatientActionUpdate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    action = (await db.execute(
        select(PatientAction).where(PatientAction.id == action_id, PatientAction.tenant_id == auth.tenant_id)
    )).scalar_one_or_none()

    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    if body.status:
        action.status = body.status
        if body.status in ("resolved", "dismissed"):
            action.resolved_at = datetime.now(timezone.utc)
            action.resolved_by = auth.user_id
    if body.resolution_type:
        action.resolution_type = body.resolution_type
    if body.resolution_note:
        action.resolution_note = body.resolution_note

    await db.commit()
    return _serialize_action(action)
```

- [ ] **Step 4: Register actions router in main.py**

Add import and register:
```python
from app.routers import actions
# In ROUTER_REGISTRY:
(actions.router, "/api/actions", ["Actions"]),
```

---

## Task 7: Seed Diabetes Action Templates + Generate Actions

**Files:**
- Create: `backend/app/services/action_template_seed.py`
- Modify: `backend/app/services/seed_service.py`

- [ ] **Step 1: Create action template seed**

Create `backend/app/services/action_template_seed.py`:

```python
"""Seed action templates for the Diabetes Care program."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.action import ActionTemplate, PatientAction
from app.models.program import Program
from app.models.patient import Patient
from app.services.seed_service import DEFAULT_TENANT_ID
from app.services.score_engine import compute_patient_score
from app.services.action_engine import generate_patient_actions, persist_actions


DIABETES_ACTION_TEMPLATES = [
    {
        "name": "Eye Exam Overdue",
        "trigger_type": "care_gap",
        "trigger_config": {"gap_type": "Eye exam"},
        "priority_base": 60,
        "score_weight": 0.3,
        "title_template": "Schedule dilated eye exam for {patient_name}",
        "description_template": "Eye exam is overdue — HEDIS compliance gap",
        "resolution_options": [
            {"label": "Send Reminder", "action_type": "send_outreach", "icon": "send", "channel": "whatsapp", "template_slug": "eye_exam_reminder", "navigate_to": "patient_detail", "navigate_tab": "communications"},
            {"label": "View Patient", "action_type": "navigate", "icon": "user", "navigate_to": "patient_detail", "navigate_tab": "care-protocols"},
            {"label": "Dismiss", "action_type": "dismiss", "icon": "close", "requires_reason": True},
        ],
    },
    {
        "name": "Foot Exam Overdue",
        "trigger_type": "care_gap",
        "trigger_config": {"gap_type": "Foot exam"},
        "priority_base": 55,
        "score_weight": 0.25,
        "title_template": "Schedule foot exam for {patient_name}",
        "description_template": "Annual foot exam is overdue — neuropathy screening gap",
        "resolution_options": [
            {"label": "Send Reminder", "action_type": "send_outreach", "icon": "send", "channel": "whatsapp"},
            {"label": "View Patient", "action_type": "navigate", "icon": "user", "navigate_to": "patient_detail", "navigate_tab": "care-protocols"},
            {"label": "Dismiss", "action_type": "dismiss", "icon": "close", "requires_reason": True},
        ],
    },
    {
        "name": "Dental Referral Overdue",
        "trigger_type": "care_gap",
        "trigger_config": {"gap_type": "Dental referral"},
        "priority_base": 40,
        "score_weight": 0.2,
        "title_template": "Schedule dental referral for {patient_name}",
        "description_template": "Annual dental check overdue — periodontal disease risk",
        "resolution_options": [
            {"label": "Send Reminder", "action_type": "send_outreach", "icon": "send", "channel": "whatsapp"},
            {"label": "Dismiss", "action_type": "dismiss", "icon": "close", "requires_reason": True},
        ],
    },
    {
        "name": "HbA1c Lab Overdue",
        "trigger_type": "care_gap",
        "trigger_config": {"gap_type": "HbA1c"},
        "priority_base": 70,
        "score_weight": 0.35,
        "title_template": "Order HbA1c lab for {patient_name}",
        "description_template": "HbA1c monitoring is overdue — critical for glycaemic control tracking",
        "resolution_options": [
            {"label": "Send Lab Reminder", "action_type": "send_outreach", "icon": "lab", "channel": "whatsapp", "template_slug": "hba1c_lab_reminder"},
            {"label": "View Patient", "action_type": "navigate", "icon": "user", "navigate_to": "patient_detail", "navigate_tab": "clinical-data"},
            {"label": "Dismiss", "action_type": "dismiss", "icon": "close", "requires_reason": True},
        ],
    },
    {
        "name": "uACR Screening Overdue",
        "trigger_type": "care_gap",
        "trigger_config": {"gap_type": "uACR"},
        "priority_base": 65,
        "score_weight": 0.3,
        "title_template": "Order uACR screening for {patient_name}",
        "description_template": "Urine albumin-creatinine ratio screening overdue — nephropathy detection",
        "resolution_options": [
            {"label": "Send Reminder", "action_type": "send_outreach", "icon": "send", "channel": "whatsapp"},
            {"label": "Dismiss", "action_type": "dismiss", "icon": "close", "requires_reason": True},
        ],
    },
    {
        "name": "High Risk Score Alert",
        "trigger_type": "score_threshold",
        "trigger_config": {"threshold": 70},
        "priority_base": 80,
        "score_weight": 0.4,
        "title_template": "High risk alert for {patient_name}",
        "description_template": "Patient risk score exceeds 70 — review for tier escalation",
        "resolution_options": [
            {"label": "Review Patient", "action_type": "navigate", "icon": "user", "navigate_to": "patient_detail", "navigate_tab": "cohort"},
            {"label": "Send Outreach", "action_type": "send_outreach", "icon": "send", "channel": "whatsapp"},
            {"label": "Dismiss", "action_type": "dismiss", "icon": "close", "requires_reason": True},
        ],
    },
]


async def seed_action_templates(db: AsyncSession) -> None:
    """Seed action templates for the Diabetes Care program, compute scores, generate actions."""
    # Check if already seeded
    existing = (await db.execute(
        select(ActionTemplate).where(ActionTemplate.tenant_id == DEFAULT_TENANT_ID).limit(1)
    )).scalar_one_or_none()
    if existing:
        return

    # Find Diabetes Care program
    program = (await db.execute(
        select(Program).where(Program.tenant_id == DEFAULT_TENANT_ID, Program.name == "Diabetes Care")
    )).scalar_one_or_none()
    if not program:
        return

    # Seed templates
    for tmpl_data in DIABETES_ACTION_TEMPLATES:
        tmpl = ActionTemplate(
            tenant_id=DEFAULT_TENANT_ID,
            program_id=program.id,
            **tmpl_data,
        )
        db.add(tmpl)

    await db.flush()

    # Compute scores for all patients
    patients = (await db.execute(
        select(Patient).where(Patient.tenant_id == DEFAULT_TENANT_ID, Patient.is_active == True).limit(100)  # noqa: E712
    )).scalars().all()

    for patient in patients:
        await compute_patient_score(db, DEFAULT_TENANT_ID, patient.id, program.id)

    # Generate actions for all patients
    for patient in patients:
        action_dicts = await generate_patient_actions(db, DEFAULT_TENANT_ID, patient.id, program.id)
        await persist_actions(db, action_dicts)

    await db.commit()
```

- [ ] **Step 2: Wire into seed_service.py**

Add after the diabetes seed call:
```python
    from app.services.action_template_seed import seed_action_templates
    await seed_action_templates(db)
```

---

## Task 8: Frontend — Wire Action Queue to Real API

**Files:**
- Modify: `src/config/api.ts`
- Modify: `src/services/types/command-center.ts`
- Modify: `src/stores/command-center-store.ts`
- Modify: `src/features/command-center/components/action-queue.tsx`

- [ ] **Step 1: Add actions endpoint to api.ts**

```typescript
  actions: {
    list: "/api/actions",
    update: (id: string) => `/api/actions/${id}`,
  },
```

- [ ] **Step 2: Update ActionQueueItem type to match PatientActionRead**

In `src/services/types/command-center.ts`, replace `ActionQueueItem`:

```typescript
export interface ActionQueueItem {
  id: string;
  patient_id: string;
  patient_name: string;
  template_id: string;
  program_id: string;
  cohort_id: string | null;
  cohort_name: string | null;
  priority: number;
  title: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  resolution_options: Array<{
    label: string;
    action_type: string;
    icon?: string;
    channel?: string;
    template_slug?: string;
    navigate_to?: string;
    navigate_tab?: string;
    requires_reason?: boolean;
  }>;
  trigger_data: Record<string, unknown> | null;
  created_at: string;
}
```

- [ ] **Step 3: Update command center store to fetch from actions API**

In `src/stores/command-center-store.ts`, update `loadActionQueue` to call `GET /api/actions?status=open&limit=20` instead of the current command-center endpoint.

- [ ] **Step 4: Update action-queue.tsx to render resolution buttons**

Replace the "View →" button with actual resolution option buttons from the action data. Each button:
- `navigate` type → `router.push(buildPath("patientDetail", { id: item.patient_id }) + "?tab=" + option.navigate_tab)`
- `dismiss` type → call `PATCH /api/actions/{id}` with `{status: "dismissed"}` + toast
- `send_outreach` type → navigate to patient comms tab (Phase 1)

---

## Verification Checklist

- [ ] Docker PostgreSQL starts: `docker compose up db -d`
- [ ] Backend starts against PostgreSQL, seeds run
- [ ] `POST /api/patients/{id}/compute-score?program_id=...` returns score + breakdown
- [ ] `POST /api/patients/batch-compute-scores?program_id=...` computes all patient scores
- [ ] Patients table shows Risk Score column with color coding
- [ ] `GET /api/actions?status=open` returns real actions from PatientAction table
- [ ] Command center action queue shows real actions with resolution buttons
- [ ] Clicking resolution buttons navigates correctly / dismisses with toast
- [ ] Build passes clean (both frontend and backend)
