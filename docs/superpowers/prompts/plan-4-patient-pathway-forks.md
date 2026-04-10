# Plan 4: Patient Pathway Forks — Execution Prompt

## Context

You are building the patient-level pathway fork system. A pathway is the standard protocol for a cohort — every patient in Tier 3 follows the same blocks. But a care manager may need to customise a specific patient's pathway without changing the standard: override a block's config (change outreach frequency from monthly to weekly), skip a block (patient already had that screening), or add a new block (this patient needs an extra referral).

The pathway builder (Plan 2) and execution engine (Plan 3) are already in place. Patients are enrolled in pathways and the worker advances them through blocks.

## What You Are Building

1. Fork + block override DB models (sparse diff on parent pathway)
2. Merge logic (parent blocks + fork overrides → merged block list)
3. CRUD API for forks and overrides
4. Execution engine integration (worker uses merged config when fork exists)
5. Patient detail UI for viewing and editing forks

## Plan Location

Read the full plan at: `docs/superpowers/plans/2026-04-10-patient-pathway-forks.md`

Read the spec at: `docs/superpowers/specs/2026-04-10-pathway-builder-redesign.md` (Part F)

## Critical Implementation Standards

### Fork Model — Sparse Diff, Not Full Copy

This is the most important design principle: **a fork is NOT a copy of the pathway.** It is a sparse set of overrides on top of the parent.

- `pathway_patient_forks`: One row per (patient, pathway) pair. Stores who created it, why, and whether it's active.
- `pathway_block_overrides`: Individual overrides on the fork. Three types:
  - **`config`**: Override a parent block's config. `block_id` points to the parent block. `config_override` is a JSON dict that gets deep-merged over the parent's config.
  - **`skip`**: Skip a parent block. `block_id` points to the parent block. No config needed.
  - **`add`**: Add a new block. `block_id` is null. `block_type`, `category`, `label`, `config_override` define the new block. `order_after` points to the parent block after which this new block is inserted.

If a patient has no fork, they get the standard pathway. If they have a fork with 3 overrides out of 8 blocks, those 3 blocks are customised and the other 5 are inherited from the parent unchanged.

**Never duplicate parent blocks into the fork.** The merge happens at query time, not at creation time.

### Merge Algorithm

```python
def merge(parent_blocks, fork_overrides):
    result = []
    for block in parent_blocks:
        override = overrides_by_block.get(block.id)
        if override and override.type == "skip":
            result.append(block, is_skipped=True)
        elif override and override.type == "config":
            merged_config = deep_merge(block.config, override.config_override)
            result.append(block, config=merged_config, is_overridden=True)
        else:
            result.append(block)  # unchanged
        
        # Insert any ADD overrides that go after this block
        for add_override in adds_after(block.id):
            result.append(new_block_from(add_override), is_added=True)
    
    return result
```

The merge produces a `MergedBlock` dataclass with flags: `is_overridden`, `is_added`, `is_skipped`. These flags drive both the execution engine (skip evaluation, use merged config) and the UI (visual indicators).

### Execution Engine Integration

In `pathway_worker.py`, when processing an enrollment that has a `fork_id`:

1. Call `get_merged_blocks(db, pathway_id, patient_id)` instead of using raw parent blocks
2. If the current block is `is_skipped` in the merge → set execution status to `"skipped"`, auto-advance to next block
3. If the current block is `is_overridden` → use the merged config for evaluation, not the parent config
4. If the current block is `is_added` → evaluate normally using the override's config

**The worker does not need to know about forks explicitly.** It just uses merged blocks. The merge logic encapsulates the fork complexity.

### CRUD API

- `POST /api/pathways/{pathway_id}/forks` — Create a fork. Body: `{patient_id, reason}`. Returns fork ID.
- `GET /api/pathways/{pathway_id}/forks/{patient_id}` — Get merged blocks for a patient. Returns the full merged block list with `is_overridden/is_added/is_skipped` flags.
- `POST /api/pathways/{pathway_id}/forks/{fork_id}/overrides` — Add an override. Body: `{block_id, override_type, config_override, label, block_type, category, order_after}`.
- `DELETE /api/pathways/{pathway_id}/forks/{fork_id}/overrides/{override_id}` — Remove a single override.
- `DELETE /api/pathways/{pathway_id}/forks/{fork_id}` — Delete the entire fork (reset to standard). Cascades to all overrides.

All endpoints are auth-gated and tenant-scoped.

### Patient Detail UI

The fork editor in the patient detail Pathways tab shows a **linear block list** (not a React Flow canvas). This is intentional — forks are about config changes and block additions/skips, not flow restructuring. The visual canvas is for pathway design; the fork editor is for patient-level tweaks.

**Visual indicators:**
- Standard blocks: normal border, no badge
- Overridden blocks: amber border, "Modified" badge
- Skipped blocks: greyed out, strikethrough text, "Skipped" badge
- Added blocks: indigo border, "Custom" badge

**Actions:**
- "Customise Pathway" button: creates a fork (if none exists), enables editing
- "Reset to Standard" button: deletes the fork, reverts to standard pathway
- Click a block to open a config panel showing parent config (read-only) and override fields (editable)
- Toggle to skip/unskip a block
- "Add Block After" button on each block to insert a custom block

### Database Integrity

- Unique constraint on `(patient_id, pathway_id)` on forks — one fork per patient per pathway.
- FK from `pathway_block_overrides.block_id` to `pathway_blocks.id` — if a parent block is deleted, the override becomes orphaned. Handle this gracefully in the merge logic (skip orphaned overrides).
- FK from `pathway_block_overrides.order_after` to `pathway_blocks.id` — for ADD blocks, this determines insertion point.
- `ON DELETE CASCADE` from fork to overrides — deleting a fork cleans up all its overrides.

### Existing Code To Study First

- `backend/app/workers/pathway_worker.py` — the worker you're modifying
- `backend/app/services/pathway_enrollment.py` — enrollment service
- `backend/app/services/pathway_execution.py` — block evaluation logic
- `backend/app/models/pathway.py` — existing models (you're adding to this)
- `src/features/patients/components/` — patient detail component patterns

### What NOT To Do

- Do not copy parent blocks into the fork. The fork is a sparse diff, not a full copy.
- Do not modify the parent pathway when creating a fork. The parent stays unchanged.
- Do not add fork editing to the visual canvas (React Flow). Forks are edited in the patient detail Pathways tab as a linear block list.
- Do not allow forks to change the edge structure (connections between blocks). Forks can override configs, skip blocks, and add blocks, but the flow graph stays as defined by the parent pathway. Added blocks are inserted linearly after a specified block.
- Do not implement concurrent fork editing. One fork per patient per pathway, edited by one user at a time. No optimistic locking needed.
- Do not store the merged result. The merge is computed at query time from parent + fork. This ensures changes to the parent pathway automatically propagate to all forks (except where overridden).
