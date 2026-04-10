# Patient Pathway Forks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow care managers to customise a patient's pathway without modifying the cohort-level standard — config overrides, block skips, and additional blocks via a parent-child fork model.

**Architecture:** Fork table stores patient-level overrides as sparse diffs on the parent pathway. Block overrides table stores per-block config changes, skips, and additions. Execution engine merges parent + fork at runtime. Patient detail UI shows merged pathway with visual indicators for overrides.

**Tech Stack:** PostgreSQL, SQLAlchemy, FastAPI, React (patient detail pathways tab)

**Depends on:** Pathway Execution Engine (Plan 3) must be completed first.

---

### Task 1: DB Models — Fork + Block Overrides

**Files:**
- Modify: `backend/app/models/pathway.py`

- [ ] **Step 1: Add fork and override models**

```python
class PathwayPatientFork(Base):
    """Patient-level pathway customisation — sparse diff on parent pathway."""
    __tablename__ = "pathway_patient_forks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    pathway_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pathways.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    overrides: Mapped[list["PathwayBlockOverride"]] = relationship(back_populates="fork", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("patient_id", "pathway_id", name="uq_fork_patient_pathway"),
    )


class PathwayBlockOverride(Base):
    """Individual block-level override within a patient fork."""
    __tablename__ = "pathway_block_overrides"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    fork_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pathway_patient_forks.id", ondelete="CASCADE"), nullable=False, index=True)
    block_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pathway_blocks.id"))  # null for ADD type
    override_type: Mapped[str] = mapped_column(String(20), nullable=False)  # config | skip | add
    config_override: Mapped[dict | None] = mapped_column(JSON)  # merged over parent config
    label: Mapped[str | None] = mapped_column(Text)  # for ADD blocks
    block_type: Mapped[str | None] = mapped_column(String(50))  # for ADD blocks
    category: Mapped[str | None] = mapped_column(String(20))  # for ADD blocks
    order_after: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pathway_blocks.id"))  # insert after this block
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    fork: Mapped["PathwayPatientFork"] = relationship(back_populates="overrides")
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/pathway.py
git commit -m "feat: patient pathway fork + block override models"
```

---

### Task 2: Fork Merge Logic

**Files:**
- Create: `backend/app/services/pathway_fork.py`

- [ ] **Step 1: Create merge service**

```python
"""Merge parent pathway blocks with patient fork overrides."""

from __future__ import annotations

import copy
import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.pathway import PathwayBlock, PathwayPatientFork, PathwayBlockOverride


@dataclass
class MergedBlock:
    """A block after merging parent + fork overrides."""
    block_id: uuid.UUID | None  # None for added blocks
    block_type: str
    category: str
    label: str
    config: dict[str, Any]
    order_index: int
    is_overridden: bool = False  # config was modified
    is_added: bool = False       # block was added by fork
    is_skipped: bool = False     # block is skipped


async def get_merged_blocks(
    db: AsyncSession,
    pathway_id: uuid.UUID,
    patient_id: uuid.UUID,
) -> list[MergedBlock]:
    """Get the merged block list for a patient — parent blocks + fork overrides."""
    # Load parent blocks
    blocks_result = await db.execute(
        select(PathwayBlock)
        .where(PathwayBlock.pathway_id == pathway_id)
        .order_by(PathwayBlock.order_index)
    )
    parent_blocks = list(blocks_result.scalars().all())

    # Load fork (if exists)
    fork_result = await db.execute(
        select(PathwayPatientFork)
        .where(
            PathwayPatientFork.pathway_id == pathway_id,
            PathwayPatientFork.patient_id == patient_id,
            PathwayPatientFork.is_active == True,
        )
        .options(selectinload(PathwayPatientFork.overrides))
    )
    fork = fork_result.scalar_one_or_none()

    if not fork:
        # No fork — return parent blocks as-is
        return [
            MergedBlock(
                block_id=b.id,
                block_type=b.block_type,
                category=b.category,
                label=b.label,
                config=b.config or {},
                order_index=b.order_index,
            )
            for b in parent_blocks
        ]

    # Build override map
    overrides_by_block: dict[uuid.UUID, PathwayBlockOverride] = {}
    added_blocks: list[PathwayBlockOverride] = []
    for ov in fork.overrides:
        if ov.override_type == "add":
            added_blocks.append(ov)
        elif ov.block_id:
            overrides_by_block[ov.block_id] = ov

    # Merge parent blocks with overrides
    merged: list[MergedBlock] = []
    for b in parent_blocks:
        ov = overrides_by_block.get(b.id)
        if ov and ov.override_type == "skip":
            merged.append(MergedBlock(
                block_id=b.id, block_type=b.block_type, category=b.category,
                label=b.label, config=b.config or {}, order_index=b.order_index,
                is_skipped=True,
            ))
        elif ov and ov.override_type == "config":
            merged_config = copy.deepcopy(b.config or {})
            merged_config.update(ov.config_override or {})
            merged.append(MergedBlock(
                block_id=b.id, block_type=b.block_type, category=b.category,
                label=ov.label or b.label, config=merged_config, order_index=b.order_index,
                is_overridden=True,
            ))
        else:
            merged.append(MergedBlock(
                block_id=b.id, block_type=b.block_type, category=b.category,
                label=b.label, config=b.config or {}, order_index=b.order_index,
            ))

        # Insert any added blocks that go after this block
        for added in added_blocks:
            if added.order_after == b.id:
                merged.append(MergedBlock(
                    block_id=None, block_type=added.block_type or "",
                    category=added.category or "", label=added.label or "",
                    config=added.config_override or {},
                    order_index=b.order_index,
                    is_added=True,
                ))

    return merged
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/pathway_fork.py
git commit -m "feat: pathway fork merge logic — parent + overrides → merged block list"
```

---

### Task 3: Fork CRUD API

**Files:**
- Modify: `backend/app/routers/pathways.py`

- [ ] **Step 1: Add fork endpoints**

```python
@router.post("/{pathway_id}/forks")
async def create_fork(
    pathway_id: uuid.UUID,
    body: dict,  # {patient_id, reason}
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    """Create a patient fork for a pathway."""
    fork = PathwayPatientFork(
        tenant_id=auth.tenant_id,
        pathway_id=pathway_id,
        patient_id=uuid.UUID(body["patient_id"]),
        created_by=auth.user_id,
        reason=body["reason"],
    )
    db.add(fork)
    await db.flush()
    return {"id": str(fork.id), "status": "created"}


@router.get("/{pathway_id}/forks/{patient_id}")
async def get_fork(
    pathway_id: uuid.UUID,
    patient_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get fork with merged blocks for a patient."""
    from app.services.pathway_fork import get_merged_blocks
    blocks = await get_merged_blocks(db, pathway_id, patient_id)
    return {
        "blocks": [
            {
                "block_id": str(b.block_id) if b.block_id else None,
                "block_type": b.block_type,
                "category": b.category,
                "label": b.label,
                "config": b.config,
                "order_index": b.order_index,
                "is_overridden": b.is_overridden,
                "is_added": b.is_added,
                "is_skipped": b.is_skipped,
            }
            for b in blocks
        ]
    }


@router.post("/{pathway_id}/forks/{fork_id}/overrides")
async def add_override(
    pathway_id: uuid.UUID,
    fork_id: uuid.UUID,
    body: dict,  # {block_id, override_type, config_override, label, block_type, category, order_after}
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    """Add a block override to a fork."""
    override = PathwayBlockOverride(
        fork_id=fork_id,
        block_id=uuid.UUID(body["block_id"]) if body.get("block_id") else None,
        override_type=body["override_type"],
        config_override=body.get("config_override"),
        label=body.get("label"),
        block_type=body.get("block_type"),
        category=body.get("category"),
        order_after=uuid.UUID(body["order_after"]) if body.get("order_after") else None,
    )
    db.add(override)
    await db.flush()
    return {"id": str(override.id), "status": "created"}


@router.delete("/{pathway_id}/forks/{fork_id}")
async def delete_fork(
    pathway_id: uuid.UUID,
    fork_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    """Delete a fork (reset to standard pathway)."""
    fork = await db.get(PathwayPatientFork, fork_id)
    if fork:
        await db.delete(fork)
        await db.flush()
    return {"status": "deleted"}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/pathways.py
git commit -m "feat: fork CRUD API — create, get merged blocks, add overrides, delete"
```

---

### Task 4: Execution Engine Fork Integration

**Files:**
- Modify: `backend/app/workers/pathway_worker.py`

- [ ] **Step 1: Update worker to use merged blocks when fork exists**

In `_process_enrollment`, before evaluating the current block, check if the enrollment has a `fork_id`. If so, use the merged block list from `get_merged_blocks` instead of the raw parent block.

Check if the current block is skipped in the merge — if so, auto-advance to the next block. If the current block has a config override, use the merged config for evaluation.

```python
    # Check for fork
    if enrollment.fork_id:
        from app.services.pathway_fork import get_merged_blocks
        merged = await get_merged_blocks(db, enrollment.pathway_id, enrollment.patient_id)
        current_merged = next((m for m in merged if m.block_id == block.id), None)
        if current_merged and current_merged.is_skipped:
            execution.status = "skipped"
            execution.completed_at = now
            # Find next non-skipped block
            next_blocks = await get_next_blocks(db, enrollment.pathway_id, block.id, "success")
            if next_blocks:
                await advance_enrollment(db, enrollment, next_blocks[0])
            else:
                await complete_enrollment(db, enrollment)
            return
        if current_merged and current_merged.is_overridden:
            block_config = current_merged.config  # use merged config
        else:
            block_config = block.config or {}
    else:
        block_config = block.config or {}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/workers/pathway_worker.py
git commit -m "feat: pathway worker uses merged fork config for block evaluation"
```

---

### Task 5: Patient Detail — Fork Editor UI

**Files:**
- Create: `src/features/patients/components/pathway-fork-editor.tsx`

- [ ] **Step 1: Create the fork editor component**

A component shown in the patient detail Pathways tab that:
- Fetches merged blocks via `GET /api/pathways/{id}/forks/{patientId}`
- Shows the block list with visual indicators:
  - **Standard blocks**: normal rendering
  - **Overridden blocks**: orange dot indicator, shows "Modified" badge
  - **Skipped blocks**: greyed out with strikethrough
  - **Added blocks**: "Custom" badge
- "Customise Pathway" button creates a fork if none exists
- "Reset to Standard" button deletes the fork
- Clicking a block opens a config drawer showing:
  - Parent config (read-only, greyed)
  - Override config (editable)
  - "Skip this block" toggle
- "Add Block" button opens a simplified block picker (using the same block type registry from Plan 2)

This is a simplified version of the visual canvas — a linear block list (no React Flow), since forks are about config changes, not flow restructuring.

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/config/icons";
import { getCategoryDef } from "@/config/block-types";
import { cn } from "@/lib/cn";
import { apiRequest } from "@/services/api/client";
import { API_ENDPOINTS } from "@/config/api";
import { toast } from "sonner";

interface MergedBlock {
  block_id: string | null;
  block_type: string;
  category: string;
  label: string;
  config: Record<string, unknown>;
  order_index: number;
  is_overridden: boolean;
  is_added: boolean;
  is_skipped: boolean;
}

interface PathwayForkEditorProps {
  patientId: string;
  pathwayId: string;
  pathwayName: string;
}

export function PathwayForkEditor({ patientId, pathwayId, pathwayName }: PathwayForkEditorProps) {
  const [blocks, setBlocks] = useState<MergedBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFork, setHasFork] = useState(false);

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ blocks: MergedBlock[] }>({
        method: "GET",
        path: `/api/pathways/${pathwayId}/forks/${patientId}`,
      });
      setBlocks(data.blocks);
      setHasFork(data.blocks.some((b) => b.is_overridden || b.is_added || b.is_skipped));
    } catch {
      setBlocks([]);
    }
    setLoading(false);
  }, [pathwayId, patientId]);

  useEffect(() => { loadBlocks(); }, [loadBlocks]);

  if (loading) {
    return <div className="py-8 text-center text-text-muted text-sm">Loading pathway...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{pathwayName}</h3>
        {hasFork && (
          <Button variant="ghost" size="sm" className="text-xs text-status-error" onClick={() => {/* delete fork */}}>
            Reset to Standard
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        {blocks.map((block, i) => {
          const cat = getCategoryDef(block.category as any);
          return (
            <div
              key={block.block_id ?? `added-${i}`}
              className={cn(
                "flex items-center gap-3 rounded-md border px-3 py-2",
                block.is_skipped && "opacity-40 line-through",
                block.is_overridden && "border-amber-400 dark:border-amber-600",
                block.is_added && "border-indigo-400 dark:border-indigo-600",
                !block.is_overridden && !block.is_added && !block.is_skipped && "border-border-default",
              )}
            >
              <div className={cn("h-2 w-2 rounded-full shrink-0", cat?.iconBgClass ?? "bg-slate-400")} />
              <span className="text-xs font-medium text-text-primary flex-1">{block.label}</span>
              {block.is_overridden && <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-400">Modified</Badge>}
              {block.is_added && <Badge variant="outline" className="text-[9px] text-indigo-600 border-indigo-400">Custom</Badge>}
              {block.is_skipped && <Badge variant="outline" className="text-[9px] text-text-muted">Skipped</Badge>}
            </div>
          );
        })}
      </div>

      {!hasFork && (
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => {
          toast.info("Customise pathway for this patient");
          // Create fork via API then reload
        }}>
          <Icons.edit className="mr-1.5 h-3 w-3" />
          Customise Pathway
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/patients/components/pathway-fork-editor.tsx
git commit -m "feat: patient pathway fork editor UI with merged block display"
```
