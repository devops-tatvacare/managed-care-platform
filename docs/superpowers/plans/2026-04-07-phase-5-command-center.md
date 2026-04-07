# Phase 5: Command Center — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Command Center page with an AI-driven dashboard showing population KPIs, an action queue, AI insights, cohort distribution chart, and upcoming reviews.

**Architecture:** Backend adds a `command_center_service.py` that aggregates KPIs from `patients`, `patient_labs`, `cohort_assignments`, plus two AI endpoints (action queue + population insights) that use a new LLM abstraction layer. A new `command_center` router exposes all endpoints. Frontend adds a Zustand store, API service, types, and a full Command Center page with KPI cards, action queue, cohort distribution bar chart (Recharts), AI insights panel, and upcoming reviews table.

**Tech Stack:** FastAPI, SQLAlchemy async, SQLite, Pydantic, Next.js 15, Tailwind 4, shadcn/ui, Zustand, Recharts, ReactMarkdown, Lucide icons

---

## File Map

### Backend — New Files
| File | Responsibility |
|------|----------------|
| `backend/app/llm/__init__.py` | Package init |
| `backend/app/llm/base.py` | Abstract `LLMProvider` class |
| `backend/app/llm/gemini.py` | Google Gemini adapter |
| `backend/app/llm/registry.py` | Provider registry, `get_provider()` |
| `backend/app/services/command_center_service.py` | KPI aggregation, action queue generation, insights generation, upcoming reviews |
| `backend/app/schemas/command_center.py` | Pydantic schemas for all command center endpoints |
| `backend/app/routers/command_center.py` | FastAPI router for command center endpoints |

### Backend — Modified Files
| File | Change |
|------|--------|
| `backend/app/main.py` | Register command_center router |
| `backend/app/config.py` | Add `gemini_api_key` setting |

### Frontend — New Files
| File | Responsibility |
|------|----------------|
| `src/services/types/command-center.ts` | TypeScript types for command center data |
| `src/services/api/command-center.ts` | API client functions |
| `src/stores/command-center-store.ts` | Zustand store |
| `src/features/command-center/components/action-queue.tsx` | AI action queue card list |
| `src/features/command-center/components/cohort-distribution-chart.tsx` | Recharts bar chart |
| `src/features/command-center/components/ai-insights-panel.tsx` | Markdown-rendered AI insights |
| `src/features/command-center/components/upcoming-reviews.tsx` | Upcoming reviews table |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `src/app/dashboard/page.tsx` | Replace placeholder with full Command Center |
| `src/config/api.ts` | Add `commandCenter` endpoint group |
| `src/config/icons.ts` | Add missing icons (careGap, pdc, riskScore, hba1c, review) |

---

## Task 1: LLM Abstraction Layer

**Files:**
- Create: `backend/app/llm/__init__.py`
- Create: `backend/app/llm/base.py`
- Create: `backend/app/llm/gemini.py`
- Create: `backend/app/llm/registry.py`
- Modify: `backend/app/config.py`

- [ ] **Step 1: Create `backend/app/llm/__init__.py`**

```python
from app.llm.base import LLMProvider
from app.llm.registry import get_provider

__all__ = ["LLMProvider", "get_provider"]
```

- [ ] **Step 2: Create `backend/app/llm/base.py`**

```python
"""Abstract LLM provider interface."""

from __future__ import annotations

from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Base class for LLM providers."""

    @abstractmethod
    async def generate(self, prompt: str, *, system: str | None = None, max_tokens: int = 1024) -> str:
        """Generate text from a prompt. Returns the generated string."""
        ...
```

- [ ] **Step 3: Create `backend/app/llm/gemini.py`**

```python
"""Google Gemini LLM adapter."""

from __future__ import annotations

import httpx

from app.config import settings
from app.llm.base import LLMProvider


class GeminiProvider(LLMProvider):
    """Calls Google Gemini REST API (generateContent)."""

    MODEL = "gemini-2.0-flash"
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    async def generate(self, prompt: str, *, system: str | None = None, max_tokens: int = 1024) -> str:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY not configured")

        url = f"{self.BASE_URL}/{self.MODEL}:generateContent?key={settings.gemini_api_key}"
        contents = []
        if system:
            contents.append({"role": "user", "parts": [{"text": system}]})
            contents.append({"role": "model", "parts": [{"text": "Understood."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.7},
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        candidates = data.get("candidates", [])
        if not candidates:
            return ""
        parts = candidates[0].get("content", {}).get("parts", [])
        return parts[0].get("text", "") if parts else ""
```

- [ ] **Step 4: Create `backend/app/llm/registry.py`**

```python
"""LLM provider registry."""

from __future__ import annotations

from app.llm.base import LLMProvider
from app.llm.gemini import GeminiProvider

_PROVIDERS: dict[str, type[LLMProvider]] = {
    "gemini": GeminiProvider,
}

_instances: dict[str, LLMProvider] = {}


def get_provider(name: str = "gemini") -> LLMProvider:
    """Return a singleton LLM provider instance by name."""
    if name not in _instances:
        cls = _PROVIDERS.get(name)
        if cls is None:
            raise ValueError(f"Unknown LLM provider: {name}. Available: {list(_PROVIDERS.keys())}")
        _instances[name] = cls()
    return _instances[name]
```

- [ ] **Step 5: Add `gemini_api_key` to config**

In `backend/app/config.py`, add to the `Settings` class:

```python
gemini_api_key: str = ""
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/llm/ backend/app/config.py
git commit -m "feat(command-center): add LLM abstraction layer with Gemini adapter"
```

---

## Task 2: Command Center Schemas

**Files:**
- Create: `backend/app/schemas/command_center.py`

- [ ] **Step 1: Create schemas**

```python
"""Pydantic schemas for command center endpoints."""

from __future__ import annotations

from pydantic import BaseModel


# ── KPIs ──────────────────────────────────────────────────────────────────

class CommandCenterKPIs(BaseModel):
    total_members: int
    avg_risk_score: float | None
    hba1c_control_rate: float | None  # percentage of patients with latest HbA1c < 7
    open_care_gaps: int
    pdc_above_80_rate: float | None  # percentage of patients with avg PDC >= 0.80


# ── Action Queue ──────────────────────────────────────────────────────────

class ActionChip(BaseModel):
    label: str
    action_type: str  # "navigate" | "outreach"
    target: str  # patient detail path or outreach type


class ActionQueueItem(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    alert_type: str  # "care_gap" | "overdue_review" | "cohort_change" | "missed_touchpoint"
    title: str
    description: str
    priority: str  # "high" | "medium" | "low"
    cohort_name: str
    cohort_color: str
    actions: list[ActionChip]


class ActionQueueResponse(BaseModel):
    items: list[ActionQueueItem]
    total: int


# ── AI Insights ───────────────────────────────────────────────────────────

class AIInsightsResponse(BaseModel):
    markdown: str
    generated_at: str
    is_cached: bool


# ── Upcoming Reviews ──────────────────────────────────────────────────────

class UpcomingReviewItem(BaseModel):
    patient_id: str
    patient_name: str
    program_id: str
    program_name: str
    cohort_name: str
    cohort_color: str
    review_due_at: str
    days_until_due: int


class UpcomingReviewsResponse(BaseModel):
    items: list[UpcomingReviewItem]
    total: int
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/command_center.py
git commit -m "feat(command-center): add Pydantic schemas for command center endpoints"
```

---

## Task 3: Command Center Service

**Files:**
- Create: `backend/app/services/command_center_service.py`

- [ ] **Step 1: Create service with KPI aggregation**

```python
"""Command Center data aggregation service."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import case, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cohort import Cohort, CohortAssignment
from app.models.patient import Patient, PatientLab
from app.models.program import Program

# ── In-memory cache for AI insights ──────────────────────────────────────

_insights_cache: dict[str, dict] = {}
INSIGHTS_CACHE_TTL_SECONDS = 86400  # 24 hours


# ── KPIs ──────────────────────────────────────────────────────────────────

async def get_kpis(db: AsyncSession, tenant_id: uuid.UUID) -> dict:
    """Compute command center KPI values from real patient data."""

    # Total active members
    total_members = (await db.execute(
        select(func.count()).where(Patient.tenant_id == tenant_id, Patient.is_active == True)
    )).scalar_one()

    # Avg risk score from current assignments
    avg_risk_score = (await db.execute(
        select(func.avg(CohortAssignment.score)).where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.is_current == True,
            CohortAssignment.score.isnot(None),
        )
    )).scalar_one()

    # HbA1c < 7% rate: latest HbA1c per patient, count those < 7
    # Subquery: latest HbA1c per patient
    latest_hba1c_sq = (
        select(
            PatientLab.patient_id,
            PatientLab.value,
            func.row_number()
            .over(partition_by=PatientLab.patient_id, order_by=PatientLab.recorded_at.desc())
            .label("rn"),
        )
        .where(
            PatientLab.tenant_id == tenant_id,
            PatientLab.test_type == "HbA1c",
        )
        .subquery()
    )
    latest_hba1c = select(latest_hba1c_sq.c.patient_id, latest_hba1c_sq.c.value).where(
        latest_hba1c_sq.c.rn == 1
    ).subquery()

    total_with_hba1c = (await db.execute(
        select(func.count()).select_from(latest_hba1c)
    )).scalar_one()

    controlled_count = (await db.execute(
        select(func.count()).select_from(latest_hba1c).where(latest_hba1c.c.value < 7.0)
    )).scalar_one()

    hba1c_control_rate = round(controlled_count / total_with_hba1c * 100, 1) if total_with_hba1c > 0 else None

    # Open care gaps: count patients with non-empty care_gaps JSON array
    # SQLite JSON: care_gaps is stored as JSON array, empty = '[]' or null
    open_care_gaps = (await db.execute(
        select(func.count()).where(
            Patient.tenant_id == tenant_id,
            Patient.is_active == True,
            Patient.care_gaps.isnot(None),
            func.json_array_length(Patient.care_gaps) > 0,
        )
    )).scalar_one()

    # PDC >= 80% rate: patients where avg pdc_90day across meds >= 0.80
    # active_medications is a JSON array of objects with pdc_90day field
    # We need to compute this in Python since SQLite JSON support is limited
    result = await db.execute(
        select(Patient.active_medications).where(
            Patient.tenant_id == tenant_id,
            Patient.is_active == True,
            Patient.active_medications.isnot(None),
        )
    )
    med_rows = result.all()
    total_with_meds = 0
    pdc_compliant = 0
    for (meds,) in med_rows:
        if not meds or not isinstance(meds, list) or len(meds) == 0:
            continue
        pdc_values = [m.get("pdc_90day", 0) for m in meds if isinstance(m, dict)]
        if not pdc_values:
            continue
        total_with_meds += 1
        avg_pdc = sum(pdc_values) / len(pdc_values)
        if avg_pdc >= 0.80:
            pdc_compliant += 1

    pdc_above_80_rate = round(pdc_compliant / total_with_meds * 100, 1) if total_with_meds > 0 else None

    return {
        "total_members": total_members,
        "avg_risk_score": round(avg_risk_score, 1) if avg_risk_score is not None else None,
        "hba1c_control_rate": hba1c_control_rate,
        "open_care_gaps": open_care_gaps,
        "pdc_above_80_rate": pdc_above_80_rate,
    }


# ── Action Queue ──────────────────────────────────────────────────────────

async def get_action_queue(
    db: AsyncSession, tenant_id: uuid.UUID, limit: int = 20,
) -> dict:
    """Generate prioritised patient alerts from care gaps, overdue reviews, and cohort changes."""
    items: list[dict] = []
    now = datetime.now(timezone.utc)

    # 1. Overdue reviews — HIGH priority
    overdue_q = (
        select(CohortAssignment)
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.is_current == True,
            CohortAssignment.review_due_at.isnot(None),
            CohortAssignment.review_due_at < now,
        )
        .options(
            selectinload(CohortAssignment.patient),
            selectinload(CohortAssignment.cohort),
        )
        .order_by(CohortAssignment.review_due_at.asc())
        .limit(limit)
    )
    overdue_result = await db.execute(overdue_q)
    for a in overdue_result.scalars().all():
        if not a.patient:
            continue
        name = f"{a.patient.first_name} {a.patient.last_name}"
        cohort_name = a.cohort.name if a.cohort else "Unknown"
        cohort_color = a.cohort.color if a.cohort else "#e2e8f0"
        items.append({
            "id": f"overdue-{a.id}",
            "patient_id": str(a.patient_id),
            "patient_name": name,
            "alert_type": "overdue_review",
            "title": f"Overdue review for {name}",
            "description": f"Review was due {a.review_due_at.strftime('%b %d, %Y')}",
            "priority": "high",
            "cohort_name": cohort_name,
            "cohort_color": cohort_color,
            "actions": [
                {"label": "View Patient", "action_type": "navigate", "target": str(a.patient_id)},
                {"label": "Schedule Review", "action_type": "outreach", "target": "schedule_review"},
            ],
        })

    # 2. Care gaps — MEDIUM priority
    gap_q = (
        select(Patient)
        .where(
            Patient.tenant_id == tenant_id,
            Patient.is_active == True,
            Patient.care_gaps.isnot(None),
            func.json_array_length(Patient.care_gaps) > 0,
        )
        .limit(limit)
    )
    gap_result = await db.execute(gap_q)
    for p in gap_result.scalars().all():
        # Get current cohort assignment for this patient
        ca_q = (
            select(CohortAssignment)
            .where(
                CohortAssignment.tenant_id == tenant_id,
                CohortAssignment.patient_id == p.id,
                CohortAssignment.is_current == True,
            )
            .options(selectinload(CohortAssignment.cohort))
            .limit(1)
        )
        ca_result = await db.execute(ca_q)
        ca = ca_result.scalar_one_or_none()
        cohort_name = ca.cohort.name if ca and ca.cohort else "Unassigned"
        cohort_color = ca.cohort.color if ca and ca.cohort else "#e2e8f0"

        gaps = p.care_gaps if isinstance(p.care_gaps, list) else []
        gap_str = ", ".join(gaps[:3])
        items.append({
            "id": f"gap-{p.id}",
            "patient_id": str(p.id),
            "patient_name": f"{p.first_name} {p.last_name}",
            "alert_type": "care_gap",
            "title": f"Open care gaps: {gap_str}",
            "description": f"{len(gaps)} care gap(s) need attention",
            "priority": "medium",
            "cohort_name": cohort_name,
            "cohort_color": cohort_color,
            "actions": [
                {"label": "View Patient", "action_type": "navigate", "target": str(p.id)},
                {"label": "Send Outreach", "action_type": "outreach", "target": "care_gap_outreach"},
            ],
        })

    # 3. Recent cohort changes — LOW priority
    change_q = (
        select(CohortAssignment)
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.is_current == True,
            CohortAssignment.previous_cohort_id.isnot(None),
        )
        .options(
            selectinload(CohortAssignment.patient),
            selectinload(CohortAssignment.cohort),
        )
        .order_by(CohortAssignment.assigned_at.desc())
        .limit(limit)
    )
    change_result = await db.execute(change_q)
    for a in change_result.scalars().all():
        if not a.patient:
            continue
        name = f"{a.patient.first_name} {a.patient.last_name}"
        cohort_name = a.cohort.name if a.cohort else "Unknown"
        cohort_color = a.cohort.color if a.cohort else "#e2e8f0"
        items.append({
            "id": f"change-{a.id}",
            "patient_id": str(a.patient_id),
            "patient_name": name,
            "alert_type": "cohort_change",
            "title": f"{name} moved to {cohort_name}",
            "description": "Recent cohort reassignment — verify care plan alignment",
            "priority": "low",
            "cohort_name": cohort_name,
            "cohort_color": cohort_color,
            "actions": [
                {"label": "View Patient", "action_type": "navigate", "target": str(a.patient_id)},
            ],
        })

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    items.sort(key=lambda x: priority_order.get(x["priority"], 9))

    # Limit total
    items = items[:limit]

    return {"items": items, "total": len(items)}


# ── AI Population Insights ────────────────────────────────────────────────

async def get_population_insights(
    db: AsyncSession, tenant_id: uuid.UUID,
) -> dict:
    """Generate AI daily digest. Returns cached version if available."""
    cache_key = f"insights-{tenant_id}"
    now = datetime.now(timezone.utc)

    # Check cache
    if cache_key in _insights_cache:
        cached = _insights_cache[cache_key]
        age = (now - datetime.fromisoformat(cached["generated_at"])).total_seconds()
        if age < INSIGHTS_CACHE_TTL_SECONDS:
            return {**cached, "is_cached": True}

    # Gather summary data for the LLM prompt
    kpis = await get_kpis(db, tenant_id)

    # Try LLM
    try:
        from app.llm import get_provider
        provider = get_provider()

        system_prompt = (
            "You are a clinical analytics AI assistant for a healthcare payer's care management platform. "
            "Generate a concise daily digest (3-5 bullet points in markdown) summarizing the population health status. "
            "Be specific with numbers. Use clinical terminology appropriate for care managers. "
            "End with 1-2 recommended actions."
        )

        data_prompt = (
            f"Population data as of today:\n"
            f"- Total members: {kpis['total_members']}\n"
            f"- Average risk score: {kpis['avg_risk_score']}\n"
            f"- HbA1c <7% control rate: {kpis['hba1c_control_rate']}%\n"
            f"- Patients with open care gaps: {kpis['open_care_gaps']}\n"
            f"- PDC ≥80% adherence rate: {kpis['pdc_above_80_rate']}%\n"
            f"\nGenerate a daily digest for the care management team."
        )

        markdown = await provider.generate(data_prompt, system=system_prompt, max_tokens=512)
    except Exception:
        # Fallback to static summary
        markdown = _build_static_insights(kpis)

    result = {
        "markdown": markdown,
        "generated_at": now.isoformat(),
        "is_cached": False,
    }
    _insights_cache[cache_key] = result
    return result


def _build_static_insights(kpis: dict) -> str:
    """Fallback static insights when LLM is unavailable."""
    total = kpis["total_members"]
    avg_score = kpis["avg_risk_score"]
    hba1c_rate = kpis["hba1c_control_rate"]
    gaps = kpis["open_care_gaps"]
    pdc_rate = kpis["pdc_above_80_rate"]

    lines = ["## Daily Population Digest\n"]
    lines.append(f"- **{total}** active members under management")
    if avg_score is not None:
        lines.append(f"- Average risk score: **{avg_score}** across all programs")
    if hba1c_rate is not None:
        lines.append(f"- HbA1c control rate (<7%): **{hba1c_rate}%** of tested patients")
    lines.append(f"- **{gaps}** patients have open care gaps requiring attention")
    if pdc_rate is not None:
        lines.append(f"- Medication adherence (PDC ≥80%): **{pdc_rate}%** of patients on therapy")
    lines.append("\n**Recommended actions:**")
    if gaps > 0:
        lines.append(f"- Prioritise outreach to {min(gaps, 20)} patients with overdue screenings")
    if pdc_rate is not None and pdc_rate < 80:
        lines.append("- Review medication adherence barriers for non-compliant patients")

    return "\n".join(lines)


# ── Upcoming Reviews ──────────────────────────────────────────────────────

async def get_upcoming_reviews(
    db: AsyncSession, tenant_id: uuid.UUID, limit: int = 20,
) -> dict:
    """Patients with review_due_at approaching, grouped by program/cohort."""
    now = datetime.now(timezone.utc)

    q = (
        select(CohortAssignment)
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.is_current == True,
            CohortAssignment.review_due_at.isnot(None),
            CohortAssignment.review_due_at >= now,
        )
        .options(
            selectinload(CohortAssignment.patient),
            selectinload(CohortAssignment.cohort),
        )
        .order_by(CohortAssignment.review_due_at.asc())
        .limit(limit)
    )
    result = await db.execute(q)
    assignments = result.scalars().all()

    # We need program names — batch-fetch programs
    program_ids = list({a.program_id for a in assignments})
    programs_map: dict[uuid.UUID, str] = {}
    if program_ids:
        prog_result = await db.execute(
            select(Program.id, Program.name).where(Program.id.in_(program_ids))
        )
        for pid, pname in prog_result.all():
            programs_map[pid] = pname

    items = []
    for a in assignments:
        if not a.patient:
            continue
        days_until = (a.review_due_at - now).days
        items.append({
            "patient_id": str(a.patient_id),
            "patient_name": f"{a.patient.first_name} {a.patient.last_name}",
            "program_id": str(a.program_id),
            "program_name": programs_map.get(a.program_id, "Unknown"),
            "cohort_name": a.cohort.name if a.cohort else "Unknown",
            "cohort_color": a.cohort.color if a.cohort else "#e2e8f0",
            "review_due_at": a.review_due_at.isoformat(),
            "days_until_due": max(days_until, 0),
        })

    return {"items": items, "total": len(items)}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/command_center_service.py
git commit -m "feat(command-center): add command center service with KPIs, action queue, insights, reviews"
```

---

## Task 4: Command Center Router

**Files:**
- Create: `backend/app/routers/command_center.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create router**

```python
"""Command Center API endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.command_center import (
    ActionQueueResponse,
    AIInsightsResponse,
    CommandCenterKPIs,
    UpcomingReviewsResponse,
)
from app.services.command_center_service import (
    get_action_queue,
    get_kpis,
    get_population_insights,
    get_upcoming_reviews,
)

router = APIRouter()


@router.get("/kpis", response_model=CommandCenterKPIs)
async def kpis(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    data = await get_kpis(db, auth.tenant_id)
    return CommandCenterKPIs(**data)


@router.get("/action-queue", response_model=ActionQueueResponse)
async def action_queue(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    data = await get_action_queue(db, auth.tenant_id, limit=limit)
    return ActionQueueResponse(**data)


@router.post("/insights", response_model=AIInsightsResponse)
async def population_insights(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    data = await get_population_insights(db, auth.tenant_id)
    return AIInsightsResponse(**data)


@router.get("/upcoming-reviews", response_model=UpcomingReviewsResponse)
async def upcoming_reviews(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    data = await get_upcoming_reviews(db, auth.tenant_id, limit=limit)
    return UpcomingReviewsResponse(**data)
```

- [ ] **Step 2: Register router in `main.py`**

Add import at top of `backend/app/main.py`:

```python
from app.routers import ai, ai_sessions, auth, cohortisation, command_center, pathways, patients, programs
```

Add to `ROUTER_REGISTRY`:

```python
(command_center.router, "/api/command-center", ["Command Center"]),
```

- [ ] **Step 3: Verify backend starts**

```bash
cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && cd backend && python -c "from app.main import app; print('OK')"
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/command_center.py backend/app/main.py
git commit -m "feat(command-center): add command center router with KPIs, action queue, insights, reviews"
```

---

## Task 5: Frontend Types + API Service + Config Updates

**Files:**
- Create: `src/services/types/command-center.ts`
- Create: `src/services/api/command-center.ts`
- Modify: `src/config/api.ts`
- Modify: `src/config/icons.ts`

- [ ] **Step 1: Create TypeScript types**

Create `src/services/types/command-center.ts`:

```typescript
export interface CommandCenterKPIs {
  total_members: number;
  avg_risk_score: number | null;
  hba1c_control_rate: number | null;
  open_care_gaps: number;
  pdc_above_80_rate: number | null;
}

export interface ActionChip {
  label: string;
  action_type: "navigate" | "outreach";
  target: string;
}

export interface ActionQueueItem {
  id: string;
  patient_id: string;
  patient_name: string;
  alert_type: "care_gap" | "overdue_review" | "cohort_change" | "missed_touchpoint";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  cohort_name: string;
  cohort_color: string;
  actions: ActionChip[];
}

export interface ActionQueueResponse {
  items: ActionQueueItem[];
  total: number;
}

export interface AIInsightsResponse {
  markdown: string;
  generated_at: string;
  is_cached: boolean;
}

export interface UpcomingReviewItem {
  patient_id: string;
  patient_name: string;
  program_id: string;
  program_name: string;
  cohort_name: string;
  cohort_color: string;
  review_due_at: string;
  days_until_due: number;
}

export interface UpcomingReviewsResponse {
  items: UpcomingReviewItem[];
  total: number;
}
```

- [ ] **Step 2: Create API service**

Create `src/services/api/command-center.ts`:

```typescript
import { API_ENDPOINTS } from "@/config/api";
import { apiRequest } from "./client";
import type {
  ActionQueueResponse,
  AIInsightsResponse,
  CommandCenterKPIs,
  UpcomingReviewsResponse,
} from "../types/command-center";

export async function fetchKPIs(): Promise<CommandCenterKPIs> {
  return apiRequest<CommandCenterKPIs>({ method: "GET", path: API_ENDPOINTS.commandCenter.kpis });
}

export async function fetchActionQueue(limit?: number): Promise<ActionQueueResponse> {
  return apiRequest<ActionQueueResponse>({
    method: "GET",
    path: API_ENDPOINTS.commandCenter.actionQueue,
    params: limit ? { limit } : undefined,
  });
}

export async function fetchInsights(): Promise<AIInsightsResponse> {
  return apiRequest<AIInsightsResponse>({ method: "POST", path: API_ENDPOINTS.commandCenter.insights });
}

export async function fetchUpcomingReviews(limit?: number): Promise<UpcomingReviewsResponse> {
  return apiRequest<UpcomingReviewsResponse>({
    method: "GET",
    path: API_ENDPOINTS.commandCenter.upcomingReviews,
    params: limit ? { limit } : undefined,
  });
}
```

- [ ] **Step 3: Add `commandCenter` endpoints to `src/config/api.ts`**

Add after the `cohortisation` block:

```typescript
commandCenter: {
  kpis: "/api/command-center/kpis",
  actionQueue: "/api/command-center/action-queue",
  insights: "/api/command-center/insights",
  upcomingReviews: "/api/command-center/upcoming-reviews",
},
```

- [ ] **Step 4: Add icons to `src/config/icons.ts`**

Add these imports at the top (merge into existing import statement):

```
Crosshair, HeartPulse, Gauge, ClipboardMinus
```

Add to the Icons object:

```typescript
careGap: ClipboardMinus,
pdc: HeartPulse,
riskScore: Gauge,
hba1c: Crosshair,
review: Calendar,
```

- [ ] **Step 5: Commit**

```bash
git add src/services/types/command-center.ts src/services/api/command-center.ts src/config/api.ts src/config/icons.ts
git commit -m "feat(command-center): add frontend types, API service, and config updates"
```

---

## Task 6: Zustand Store

**Files:**
- Create: `src/stores/command-center-store.ts`

- [ ] **Step 1: Create store**

```typescript
import { create } from "zustand";
import {
  fetchKPIs,
  fetchActionQueue,
  fetchInsights,
  fetchUpcomingReviews,
} from "@/services/api/command-center";
import { fetchDistribution } from "@/services/api/cohortisation";
import { fetchPrograms } from "@/services/api/programs";
import type { CommandCenterKPIs, ActionQueueResponse, AIInsightsResponse, UpcomingReviewsResponse } from "@/services/types/command-center";
import type { CohortDistribution } from "@/services/types/cohort";
import type { ProgramListItem } from "@/services/types/program";

interface CommandCenterState {
  // KPIs
  kpis: CommandCenterKPIs | null;
  kpisLoading: boolean;

  // Action Queue
  actionQueue: ActionQueueResponse | null;
  actionQueueLoading: boolean;

  // AI Insights
  insights: AIInsightsResponse | null;
  insightsLoading: boolean;

  // Upcoming Reviews
  upcomingReviews: UpcomingReviewsResponse | null;
  reviewsLoading: boolean;

  // Cohort Distribution (per-program)
  programs: ProgramListItem[];
  distributions: Record<string, CohortDistribution[]>;
  distributionsLoading: boolean;

  // Actions
  loadKPIs: () => Promise<void>;
  loadActionQueue: () => Promise<void>;
  loadInsights: () => Promise<void>;
  loadUpcomingReviews: () => Promise<void>;
  loadDistributions: () => Promise<void>;
  loadAll: () => Promise<void>;
  reset: () => void;
}

export const useCommandCenterStore = create<CommandCenterState>((set, get) => ({
  kpis: null,
  kpisLoading: false,
  actionQueue: null,
  actionQueueLoading: false,
  insights: null,
  insightsLoading: false,
  upcomingReviews: null,
  reviewsLoading: false,
  programs: [],
  distributions: {},
  distributionsLoading: false,

  loadKPIs: async () => {
    set({ kpisLoading: true });
    try {
      const kpis = await fetchKPIs();
      set({ kpis, kpisLoading: false });
    } catch {
      set({ kpisLoading: false });
    }
  },

  loadActionQueue: async () => {
    set({ actionQueueLoading: true });
    try {
      const actionQueue = await fetchActionQueue(20);
      set({ actionQueue, actionQueueLoading: false });
    } catch {
      set({ actionQueueLoading: false });
    }
  },

  loadInsights: async () => {
    set({ insightsLoading: true });
    try {
      const insights = await fetchInsights();
      set({ insights, insightsLoading: false });
    } catch {
      set({ insightsLoading: false });
    }
  },

  loadUpcomingReviews: async () => {
    set({ reviewsLoading: true });
    try {
      const upcomingReviews = await fetchUpcomingReviews(15);
      set({ upcomingReviews, reviewsLoading: false });
    } catch {
      set({ reviewsLoading: false });
    }
  },

  loadDistributions: async () => {
    set({ distributionsLoading: true });
    try {
      const programs = await fetchPrograms();
      set({ programs });
      const distributions: Record<string, CohortDistribution[]> = {};
      for (const program of programs) {
        const dist = await fetchDistribution(program.id);
        distributions[program.id] = dist;
      }
      set({ distributions, distributionsLoading: false });
    } catch {
      set({ distributionsLoading: false });
    }
  },

  loadAll: async () => {
    const { loadKPIs, loadActionQueue, loadInsights, loadUpcomingReviews, loadDistributions } = get();
    await Promise.all([
      loadKPIs(),
      loadActionQueue(),
      loadInsights(),
      loadUpcomingReviews(),
      loadDistributions(),
    ]);
  },

  reset: () =>
    set({
      kpis: null, kpisLoading: false,
      actionQueue: null, actionQueueLoading: false,
      insights: null, insightsLoading: false,
      upcomingReviews: null, reviewsLoading: false,
      programs: [], distributions: {}, distributionsLoading: false,
    }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/command-center-store.ts
git commit -m "feat(command-center): add Zustand store for command center state"
```

---

## Task 7: Action Queue Component

**Files:**
- Create: `src/features/command-center/components/action-queue.tsx`

- [ ] **Step 1: Create component**

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { buildPath } from "@/config/routes";
import type { ActionQueueItem } from "@/services/types/command-center";

const PRIORITY_STYLES: Record<string, string> = {
  high: "border-l-status-error",
  medium: "border-l-status-warning",
  low: "border-l-border",
};

const ALERT_ICONS: Record<string, React.ElementType> = {
  overdue_review: Icons.warning,
  care_gap: Icons.careGap,
  cohort_change: Icons.arrowUp,
  missed_touchpoint: Icons.phone,
};

interface ActionQueueProps {
  items: ActionQueueItem[];
  loading: boolean;
}

export function ActionQueue({ items, loading }: ActionQueueProps) {
  const router = useRouter();

  function handleAction(action: { action_type: string; target: string }) {
    if (action.action_type === "navigate") {
      router.push(buildPath("patientDetail", { id: action.target }));
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Icons.ai className="h-4 w-4" />
            AI Action Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icons.ai className="h-4 w-4" />
          AI Action Queue
          <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px]">
          <div className="space-y-0 divide-y divide-border">
            {items.map((item) => {
              const AlertIcon = ALERT_ICONS[item.alert_type] ?? Icons.warning;
              return (
                <div
                  key={item.id}
                  className={cn("border-l-4 px-4 py-3", PRIORITY_STYLES[item.priority])}
                >
                  <div className="flex items-start gap-2">
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">{item.title}</p>
                      <p className="text-xs text-text-muted">{item.description}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{ borderColor: item.cohort_color, color: item.cohort_color }}
                        >
                          {item.cohort_name}
                        </Badge>
                        {item.actions.map((action) => (
                          <Button
                            key={action.label}
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => handleAction(action)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-text-muted">No pending actions</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/command-center/
git commit -m "feat(command-center): add action queue component"
```

---

## Task 8: Cohort Distribution Chart Component

**Files:**
- Create: `src/features/command-center/components/cohort-distribution-chart.tsx`

- [ ] **Step 1: Verify recharts is installed**

```bash
cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && grep recharts package.json
```

If not installed:
```bash
pnpm add recharts
```

- [ ] **Step 2: Create component**

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { CohortDistribution } from "@/services/types/cohort";
import type { ProgramListItem } from "@/services/types/program";

interface CohortDistributionChartProps {
  programs: ProgramListItem[];
  distributions: Record<string, CohortDistribution[]>;
  loading: boolean;
}

export function CohortDistributionChart({ programs, distributions, loading }: CohortDistributionChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Icons.outcomes className="h-4 w-4" />
            Cohort Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[240px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Flatten all programs' distributions into chart data
  const chartData: { name: string; count: number; color: string }[] = [];
  for (const program of programs) {
    const dist = distributions[program.id] ?? [];
    for (const cohort of dist) {
      chartData.push({
        name: cohort.cohort_name,
        count: cohort.count,
        color: cohort.cohort_color,
      });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icons.outcomes className="h-4 w-4" />
          Cohort Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">No distribution data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: number) => [value, "Members"]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
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

- [ ] **Step 3: Commit**

```bash
git add src/features/command-center/
git commit -m "feat(command-center): add cohort distribution chart component"
```

---

## Task 9: AI Insights Panel Component

**Files:**
- Create: `src/features/command-center/components/ai-insights-panel.tsx`

- [ ] **Step 1: Verify react-markdown is installed**

```bash
cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && grep react-markdown package.json
```

If not installed:
```bash
pnpm add react-markdown
```

- [ ] **Step 2: Create component**

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import ReactMarkdown from "react-markdown";
import type { AIInsightsResponse } from "@/services/types/command-center";

interface AIInsightsPanelProps {
  insights: AIInsightsResponse | null;
  loading: boolean;
}

export function AIInsightsPanel({ insights, loading }: AIInsightsPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Icons.ai className="h-4 w-4" />
            AI Population Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icons.ai className="h-4 w-4" />
          AI Population Insights
          {insights?.is_cached && (
            <Badge variant="outline" className="ml-auto text-[10px]">Cached</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights ? (
          <div className="prose prose-sm max-w-none text-text-secondary [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-text-primary [&_li]:text-sm [&_p]:text-sm [&_strong]:text-text-primary">
            <ReactMarkdown>{insights.markdown}</ReactMarkdown>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-text-muted">No insights available</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/command-center/
git commit -m "feat(command-center): add AI insights panel component"
```

---

## Task 10: Upcoming Reviews Component

**Files:**
- Create: `src/features/command-center/components/upcoming-reviews.tsx`

- [ ] **Step 1: Create component**

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { buildPath } from "@/config/routes";
import type { UpcomingReviewItem } from "@/services/types/command-center";

interface UpcomingReviewsProps {
  items: UpcomingReviewItem[];
  loading: boolean;
}

export function UpcomingReviews({ items, loading }: UpcomingReviewsProps) {
  const router = useRouter();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Icons.calendar className="h-4 w-4" />
            Upcoming Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icons.calendar className="h-4 w-4" />
          Upcoming Reviews
          <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">No upcoming reviews</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Patient</TableHead>
                <TableHead className="text-xs">Program</TableHead>
                <TableHead className="text-xs">Cohort</TableHead>
                <TableHead className="text-xs">Due</TableHead>
                <TableHead className="text-right text-xs">Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={`${item.patient_id}-${item.program_id}`}
                  className="cursor-pointer"
                  onClick={() => router.push(buildPath("patientDetail", { id: item.patient_id }))}
                >
                  <TableCell className="text-sm font-medium">{item.patient_name}</TableCell>
                  <TableCell className="text-sm text-text-muted">{item.program_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{ borderColor: item.cohort_color, color: item.cohort_color }}
                    >
                      {item.cohort_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-text-muted">
                    {new Date(item.review_due_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        item.days_until_due <= 3 ? "text-status-error" : item.days_until_due <= 7 ? "text-status-warning" : "text-text-muted"
                      )}
                    >
                      {item.days_until_due}d
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/command-center/
git commit -m "feat(command-center): add upcoming reviews table component"
```

---

## Task 11: Command Center Page — Assemble Everything

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Replace the placeholder page**

Replace entire contents of `src/app/dashboard/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { useCommandCenterStore } from "@/stores/command-center-store";
import { ActionQueue } from "@/features/command-center/components/action-queue";
import { CohortDistributionChart } from "@/features/command-center/components/cohort-distribution-chart";
import { AIInsightsPanel } from "@/features/command-center/components/ai-insights-panel";
import { UpcomingReviews } from "@/features/command-center/components/upcoming-reviews";
import { Icons } from "@/config/icons";

export default function CommandCenterPage() {
  const {
    kpis, kpisLoading,
    actionQueue, actionQueueLoading,
    insights, insightsLoading,
    upcomingReviews, reviewsLoading,
    programs, distributions, distributionsLoading,
    loadAll,
  } = useCommandCenterStore();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="space-y-6">
      <PageHeader title="Command Center" description="AI-driven population overview" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Total Members"
          value={kpis?.total_members ?? "—"}
          subtitle="Active patients"
        />
        <KpiCard
          label="Avg Risk Score"
          value={kpis?.avg_risk_score ?? "—"}
          subtitle="Across programs"
        />
        <KpiCard
          label="HbA1c <7% Rate"
          value={kpis?.hba1c_control_rate != null ? `${kpis.hba1c_control_rate}%` : "—"}
          subtitle="Glycemic control"
        />
        <KpiCard
          label="Open Care Gaps"
          value={kpis?.open_care_gaps ?? "—"}
          subtitle="Patients needing attention"
        />
        <KpiCard
          label="PDC ≥80%"
          value={kpis?.pdc_above_80_rate != null ? `${kpis.pdc_above_80_rate}%` : "—"}
          subtitle="Medication adherence"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <ActionQueue
            items={actionQueue?.items ?? []}
            loading={actionQueueLoading}
          />
          <CohortDistributionChart
            programs={programs}
            distributions={distributions}
            loading={distributionsLoading}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <AIInsightsPanel
            insights={insights}
            loading={insightsLoading}
          />
          <UpcomingReviews
            items={upcomingReviews?.items ?? []}
            loading={reviewsLoading}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(command-center): assemble full Command Center page with KPIs, queue, chart, insights, reviews"
```

---

## Task 12: Install Dependencies + Verify

- [ ] **Step 1: Install missing npm dependencies (if needed)**

```bash
cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin
pnpm add recharts react-markdown
```

- [ ] **Step 2: Install httpx in backend (if needed)**

```bash
cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin/backend
pip install httpx
```

- [ ] **Step 3: Start backend and verify endpoints**

```bash
cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin/backend
python -m uvicorn app.main:app --port 8000 &
sleep 3

# Login to get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bradesco.com","password":"admin123"}' | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Test KPIs
curl -s http://localhost:8000/api/command-center/kpis -H "Authorization: Bearer $TOKEN" | python -m json.tool

# Test Action Queue
curl -s http://localhost:8000/api/command-center/action-queue -H "Authorization: Bearer $TOKEN" | python -m json.tool

# Test Insights
curl -s -X POST http://localhost:8000/api/command-center/insights -H "Authorization: Bearer $TOKEN" | python -m json.tool

# Test Upcoming Reviews
curl -s http://localhost:8000/api/command-center/upcoming-reviews -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

- [ ] **Step 4: Start frontend and verify page renders**

```bash
cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin
pnpm dev
```

Navigate to http://localhost:3000/dashboard. Verify:
- 5 KPI cards render with real data
- Action queue shows prioritised alerts
- Cohort distribution bar chart renders
- AI insights panel shows markdown content (static fallback if no Gemini key)
- Upcoming reviews table shows patient names, cohort badges, due dates

- [ ] **Step 5: Final commit (dependencies)**

```bash
git add package.json pnpm-lock.yaml backend/requirements.txt
git commit -m "chore: add recharts, react-markdown, httpx dependencies for command center"
```
