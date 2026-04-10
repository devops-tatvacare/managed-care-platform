# Pathway Execution Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pathway execution engine that links cohorts to pathways, enrolls patients when assigned to cohorts, and walks blocks (evaluating gates, firing actions, tracking state per patient).

**Architecture:** Cohort ↔ pathway linkage via FK. Enrollment table tracks per-patient pathway state. Block execution table tracks per-block completion. Background worker polls enrollments and advances patients through blocks based on block type evaluation logic.

**Tech Stack:** PostgreSQL, SQLAlchemy 2.0 async, FastAPI, asyncio background worker

**Depends on:** Pathway Builder Redesign (Plan 2) must be completed first.

---

## File Inventory

| File | Action | Purpose |
|---|---|---|
| `backend/app/models/pathway.py` | Modify | Add `pathway_enrollments`, `pathway_block_executions` tables |
| `backend/app/models/cohort.py` | Modify | Add `pathway_id` FK to Cohort |
| `backend/app/workers/pathway_worker.py` | Create | Background worker that advances enrollments |
| `backend/app/services/pathway_execution.py` | Create | Block evaluation logic per block type |
| `backend/app/services/pathway_enrollment.py` | Create | Enrollment lifecycle (enroll, pause, complete, exit) |
| `backend/app/routers/pathways.py` | Modify | Add enrollment endpoints |
| `backend/app/main.py` | Modify | Start pathway worker in lifespan |
| `backend/app/workers/cohortisation_worker.py` | Modify | Auto-enroll patients when assigned to a cohort with a linked pathway |

---

### Task 1: DB Models — Enrollments + Block Executions

**Files:**
- Modify: `backend/app/models/pathway.py`
- Modify: `backend/app/models/cohort.py`

- [ ] **Step 1: Add pathway_id to Cohort model**

In `backend/app/models/cohort.py`, add to the `Cohort` class:

```python
    pathway_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pathways.id"), nullable=True
    )
```

- [ ] **Step 2: Add enrollment and execution models to pathway.py**

```python
class PathwayEnrollment(Base):
    """Per-patient pathway execution state."""
    __tablename__ = "pathway_enrollments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    pathway_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pathways.id", ondelete="CASCADE"), nullable=False, index=True)
    cohort_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("cohorts.id"))
    fork_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pathway_patient_forks.id"))
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | completed | paused | exited
    current_block_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pathway_blocks.id"))
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("patient_id", "pathway_id", name="uq_enrollment_patient_pathway"),
    )


class PathwayBlockExecution(Base):
    """Per-block execution record within an enrollment."""
    __tablename__ = "pathway_block_executions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    enrollment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pathway_enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    block_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pathway_blocks.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | in_progress | completed | skipped | failed
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    result: Mapped[dict | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/pathway.py backend/app/models/cohort.py
git commit -m "feat: pathway enrollment + block execution models, cohort pathway linkage"
```

---

### Task 2: Enrollment Service

**Files:**
- Create: `backend/app/services/pathway_enrollment.py`

- [ ] **Step 1: Create enrollment lifecycle service**

```python
"""Pathway enrollment lifecycle — enroll, advance, pause, complete, exit."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pathway import Pathway, PathwayBlock, PathwayEdge, PathwayEnrollment, PathwayBlockExecution


async def enroll_patient(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
    pathway_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
) -> PathwayEnrollment | None:
    """Enroll a patient in a pathway. Returns None if already enrolled."""
    existing = await db.execute(
        select(PathwayEnrollment).where(
            PathwayEnrollment.patient_id == patient_id,
            PathwayEnrollment.pathway_id == pathway_id,
        )
    )
    if existing.scalar_one_or_none():
        return None

    # Find the first block (order_index = 0)
    first_block = await db.execute(
        select(PathwayBlock)
        .where(PathwayBlock.pathway_id == pathway_id)
        .order_by(PathwayBlock.order_index)
        .limit(1)
    )
    first = first_block.scalar_one_or_none()

    enrollment = PathwayEnrollment(
        tenant_id=tenant_id,
        patient_id=patient_id,
        pathway_id=pathway_id,
        cohort_id=cohort_id,
        status="active",
        current_block_id=first.id if first else None,
    )
    db.add(enrollment)

    # Create pending execution for first block
    if first:
        db.add(PathwayBlockExecution(
            enrollment_id=enrollment.id,
            block_id=first.id,
            status="pending",
        ))

    await db.flush()
    return enrollment


async def get_next_blocks(
    db: AsyncSession,
    pathway_id: uuid.UUID,
    current_block_id: uuid.UUID,
    edge_type: str = "success",
) -> list[PathwayBlock]:
    """Get the next block(s) via edges from the current block."""
    result = await db.execute(
        select(PathwayBlock)
        .join(PathwayEdge, PathwayEdge.target_block_id == PathwayBlock.id)
        .where(
            PathwayEdge.pathway_id == pathway_id,
            PathwayEdge.source_block_id == current_block_id,
            PathwayEdge.edge_type == edge_type,
        )
    )
    return list(result.scalars().all())


async def advance_enrollment(
    db: AsyncSession,
    enrollment: PathwayEnrollment,
    next_block: PathwayBlock,
) -> None:
    """Advance enrollment to the next block."""
    enrollment.current_block_id = next_block.id
    db.add(PathwayBlockExecution(
        enrollment_id=enrollment.id,
        block_id=next_block.id,
        status="pending",
    ))
    await db.flush()


async def complete_enrollment(
    db: AsyncSession,
    enrollment: PathwayEnrollment,
) -> None:
    """Mark enrollment as completed (no more blocks to execute)."""
    enrollment.status = "completed"
    enrollment.completed_at = datetime.now(timezone.utc)
    await db.flush()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/pathway_enrollment.py
git commit -m "feat: pathway enrollment lifecycle service"
```

---

### Task 3: Block Execution Logic

**Files:**
- Create: `backend/app/services/pathway_execution.py`

- [ ] **Step 1: Create block evaluation functions per block type**

```python
"""Block execution logic — evaluates each block type against patient data."""

from __future__ import annotations

import logging
from typing import Any

from app.engine.base import PatientData

logger = logging.getLogger(__name__)


def evaluate_block(block_type: str, config: dict[str, Any], patient_data: PatientData) -> dict[str, Any]:
    """Evaluate a block against patient data. Returns {passed: bool, result: dict, edge_type: str}."""
    handler = BLOCK_HANDLERS.get(block_type)
    if not handler:
        logger.warning(f"No handler for block type: {block_type}")
        return {"passed": True, "result": {}, "edge_type": "success"}
    return handler(config, patient_data)


def _eval_eligibility_diagnosis(config: dict, patient_data: PatientData) -> dict:
    patterns = config.get("icd10_patterns", [])
    match_type = config.get("match_type", "prefix")
    include = config.get("include", True)

    matched = False
    for code in patient_data.active_diagnosis_codes:
        for pattern in patterns:
            if match_type == "prefix" and code.startswith(pattern):
                matched = True
                break
            elif match_type == "exact" and code == pattern:
                matched = True
                break
        if matched:
            break

    passed = matched if include else not matched
    return {"passed": passed, "result": {"matched": matched}, "edge_type": "success" if passed else "false_branch"}


def _eval_eligibility_lab(config: dict, patient_data: PatientData) -> dict:
    test_code = config.get("test_code", "")
    # Match by code or by common name (case-insensitive)
    value = patient_data.latest_labs.get(test_code.lower())
    if value is None:
        # Try matching by display name
        test_display = config.get("test_display", test_code).lower()
        value = patient_data.latest_labs.get(test_display)

    if value is None:
        missing_rule = config.get("missing_rule", "block")
        return {"passed": missing_rule != "block", "result": {"missing": True, "rule": missing_rule}, "edge_type": "success" if missing_rule != "block" else "false_branch"}

    operator = config.get("operator", "gte")
    threshold = config.get("value", 0)
    passed = _compare(value, operator, threshold)
    return {"passed": passed, "result": {"value": value, "threshold": threshold}, "edge_type": "success" if passed else "false_branch"}


def _eval_eligibility_demographics(config: dict, patient_data: PatientData) -> dict:
    # Demographics not in PatientData currently — pass through
    return {"passed": True, "result": {}, "edge_type": "success"}


def _eval_eligibility_pharmacy(config: dict, patient_data: PatientData) -> dict:
    meds = patient_data.medications
    if not meds:
        return {"passed": False, "result": {"no_medications": True}, "edge_type": "false_branch"}

    pdc_values = [m.get("pdc_90day", 1.0) * 100 for m in meds if m.get("pdc_90day") is not None]
    if not pdc_values:
        return {"passed": True, "result": {}, "edge_type": "success"}

    worst_pdc = min(pdc_values)
    pdc_op = config.get("pdc_operator", "gte")
    pdc_val = config.get("pdc_value", 80)
    passed = _compare(worst_pdc, pdc_op, pdc_val)
    return {"passed": passed, "result": {"worst_pdc": worst_pdc}, "edge_type": "success" if passed else "false_branch"}


def _eval_logic_conditional(config: dict, patient_data: PatientData) -> dict:
    field = config.get("field", "").lower()
    value = patient_data.latest_labs.get(field)
    if value is None:
        return {"passed": False, "result": {"missing": True}, "edge_type": "false_branch"}

    operator = config.get("operator", "gt")
    threshold_str = config.get("value", "0")
    try:
        threshold = float(threshold_str)
    except (ValueError, TypeError):
        return {"passed": False, "result": {"error": "invalid threshold"}, "edge_type": "false_branch"}

    passed = _compare(value, operator, threshold)
    return {"passed": passed, "result": {"value": value, "threshold": threshold}, "edge_type": "success" if passed else "false_branch"}


def _eval_logic_score_eval(config: dict, patient_data: PatientData) -> dict:
    # Score evaluation requires access to cohort assignment — pass through for now
    return {"passed": True, "result": {}, "edge_type": "success"}


def _eval_passthrough(config: dict, patient_data: PatientData) -> dict:
    """For action/schedule/assessment blocks that always pass (execution happens externally)."""
    return {"passed": True, "result": {"action": "executed"}, "edge_type": "success"}


def _compare(value: float, operator: str, threshold: float) -> bool:
    if operator in ("gt", ">"):
        return value > threshold
    if operator in ("lt", "<"):
        return value < threshold
    if operator in ("gte", ">="):
        return value >= threshold
    if operator in ("lte", "<="):
        return value <= threshold
    if operator in ("eq", "="):
        return value == threshold
    if operator in ("neq", "!="):
        return value != threshold
    return False


BLOCK_HANDLERS = {
    "eligibility_diagnosis": _eval_eligibility_diagnosis,
    "eligibility_lab": _eval_eligibility_lab,
    "eligibility_demographics": _eval_eligibility_demographics,
    "eligibility_pharmacy": _eval_eligibility_pharmacy,
    "assessment_screening": _eval_passthrough,
    "assessment_clinical": _eval_passthrough,
    "assessment_sdoh": _eval_passthrough,
    "action_outreach": _eval_passthrough,
    "action_clinical_order": _eval_passthrough,
    "action_referral": _eval_passthrough,
    "action_care_team": _eval_passthrough,
    "logic_conditional": _eval_logic_conditional,
    "logic_wait": _eval_passthrough,  # wait handled by worker timing
    "logic_data_check": _eval_passthrough,
    "logic_score_eval": _eval_logic_score_eval,
    "escalation_tier_change": _eval_passthrough,
    "escalation_external": _eval_passthrough,
    "escalation_override": _eval_passthrough,
    "schedule_recurring": _eval_passthrough,
    "schedule_milestone": _eval_passthrough,
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/pathway_execution.py
git commit -m "feat: block execution logic with handlers per block type"
```

---

### Task 4: Pathway Background Worker

**Files:**
- Create: `backend/app/workers/pathway_worker.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the pathway worker**

```python
"""Background worker that advances patients through pathway blocks."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import async_session
from app.models.pathway import PathwayBlock, PathwayEnrollment, PathwayBlockExecution
from app.models.patient import Patient
from app.services.patient_data import build_patient_data
from app.services.pathway_execution import evaluate_block
from app.services.pathway_enrollment import get_next_blocks, advance_enrollment, complete_enrollment

logger = logging.getLogger(__name__)

POLL_INTERVAL = 10  # seconds
BATCH_SIZE = 50


async def run(shutdown_event: asyncio.Event | None = None) -> None:
    logger.info("Pathway worker started")
    while True:
        if shutdown_event and shutdown_event.is_set():
            break
        try:
            async with async_session() as db:
                processed = await _process_batch(db)
                if processed > 0:
                    logger.info(f"Advanced {processed} pathway enrollments")
        except Exception:
            logger.exception("Error in pathway worker")
        await asyncio.sleep(POLL_INTERVAL)


async def _process_batch(db: AsyncSession) -> int:
    # Find active enrollments with pending block executions
    result = await db.execute(
        select(PathwayEnrollment)
        .where(PathwayEnrollment.status == "active")
        .where(PathwayEnrollment.current_block_id.isnot(None))
        .limit(BATCH_SIZE)
    )
    enrollments = list(result.scalars().all())
    if not enrollments:
        return 0

    processed = 0
    for enrollment in enrollments:
        try:
            await _process_enrollment(db, enrollment)
            processed += 1
        except Exception:
            logger.exception(f"Failed to process enrollment {enrollment.id}")

    await db.commit()
    return processed


async def _process_enrollment(db: AsyncSession, enrollment: PathwayEnrollment) -> None:
    # Get current block
    block_result = await db.execute(
        select(PathwayBlock).where(PathwayBlock.id == enrollment.current_block_id)
    )
    block = block_result.scalar_one_or_none()
    if not block:
        await complete_enrollment(db, enrollment)
        return

    # Get pending execution for this block
    exec_result = await db.execute(
        select(PathwayBlockExecution).where(
            PathwayBlockExecution.enrollment_id == enrollment.id,
            PathwayBlockExecution.block_id == block.id,
            PathwayBlockExecution.status == "pending",
        )
    )
    execution = exec_result.scalar_one_or_none()
    if not execution:
        return

    # Load patient data
    patient_result = await db.execute(
        select(Patient)
        .where(Patient.id == enrollment.patient_id)
        .options(selectinload(Patient.labs), selectinload(Patient.diagnoses))
    )
    patient = patient_result.scalar_one_or_none()
    if not patient:
        return

    patient_data = build_patient_data(patient, list(patient.labs), list(patient.diagnoses))

    # Evaluate block
    now = datetime.now(timezone.utc)
    execution.started_at = now
    eval_result = evaluate_block(block.block_type, block.config or {}, patient_data)

    execution.status = "completed" if eval_result["passed"] else "failed"
    execution.completed_at = now
    execution.result = eval_result.get("result")

    # Find next block via edges
    edge_type = eval_result.get("edge_type", "success")
    next_blocks = await get_next_blocks(db, enrollment.pathway_id, block.id, edge_type)

    if next_blocks:
        await advance_enrollment(db, enrollment, next_blocks[0])
    else:
        await complete_enrollment(db, enrollment)
```

- [ ] **Step 2: Start pathway worker in lifespan**

In `backend/app/main.py`, add alongside the cohortisation worker:

```python
from app.workers import pathway_worker

# In lifespan, after cohortisation worker start:
    pathway_shutdown = asyncio.Event()
    pathway_task = asyncio.create_task(pathway_worker.run(pathway_shutdown))

# In yield cleanup:
    pathway_shutdown.set()
    pathway_task.cancel()
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/workers/pathway_worker.py backend/app/main.py
git commit -m "feat: pathway background worker — advances enrollments through blocks"
```

---

### Task 5: Auto-Enroll on Cohort Assignment

**Files:**
- Modify: `backend/app/workers/cohortisation_worker.py`

- [ ] **Step 1: After cohort assignment, enroll patient in cohort's pathway**

In `_assign_patient_to_program`, after the assignment is created and flushed, check if the matched cohort has a `pathway_id` and auto-enroll:

```python
    # Auto-enroll in cohort's pathway if linked
    if matched_cohort.pathway_id:
        from app.services.pathway_enrollment import enroll_patient
        await enroll_patient(db, tenant_id, patient.id, matched_cohort.pathway_id, cohort_id=matched_cohort.id)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/workers/cohortisation_worker.py
git commit -m "feat: auto-enroll patients in cohort pathway on assignment"
```

---

### Task 6: Enrollment API Endpoints

**Files:**
- Modify: `backend/app/routers/pathways.py`

- [ ] **Step 1: Add enrollment endpoints**

```python
@router.get("/{pathway_id}/enrollments")
async def list_enrollments(
    pathway_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    status: str = Query("active"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List pathway enrollments with execution progress."""
    # ... pagination query on PathwayEnrollment
    pass


@router.get("/{pathway_id}/enrollments/{enrollment_id}")
async def get_enrollment(
    pathway_id: uuid.UUID,
    enrollment_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get enrollment detail with block execution history."""
    # ... query enrollment + block executions
    pass
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/pathways.py
git commit -m "feat: pathway enrollment API endpoints"
```
