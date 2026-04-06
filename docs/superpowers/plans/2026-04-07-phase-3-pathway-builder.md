# Phase 3: Pathway Builder — Models, API, Block Registry, Canvas, AI Builder

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the generic Pathway Builder engine — pathway CRUD, block type registry (22 types), React Flow visual canvas with drag-and-drop, component library panel, config drawer, AI builder mode (stub LLM), and pathway list page. Diabetes care is the first pathway but the engine is condition-agnostic.

**Architecture:** Backend pathway models + block registry + CRUD + AI generation endpoint (stubbed). Frontend block type registry (mirrored) + pathway store + three-mode builder shell (AI Builder, Visual Canvas, Configuration) + React Flow canvas + component library + config drawer with per-block-type forms.

**Tech Stack:** Same as Phases 1-2. New: React Flow (`@xyflow/react`), backend pathway models, block type registry (shared source of truth), LLM abstraction layer (stubbed).

**Spec reference:** `docs/superpowers/specs/2026-04-07-bradesco-care-admin-redesign.md` — Sections 5.2 (DB models: pathways, pathway_blocks, pathway_edges), 5.3 (API endpoints), 7 (Block Type Registry), 8 (LLM Layer), 9.5 (Pathway Builder screen spec)

**Critical rules (apply to every task):**
- NO emojis — Lucide icons only
- NO custom UI components — shadcn/ui only
- NO hardcoded paths/colors/labels — config only
- `cn()` for all class composition
- Follow existing patterns exactly (stores, API client, router registry, seed service)
- BLOCK_TYPE_REGISTRY is the single source of truth — frontend and backend mirror it

---

## Task 1: Backend Pathway Models

**Files:**
- Create: `backend/app/models/pathway.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create backend/app/models/pathway.py**

```python
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, func
)
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Pathway(Base, TimestampMixin):
    __tablename__ = "pathways"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    condition: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_tiers: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    version: Mapped[int] = mapped_column(Integer, default=1)
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    published_by: Mapped[uuid.UUID | None] = mapped_column(nullable=True)

    blocks = relationship(
        "PathwayBlock", back_populates="pathway", cascade="all, delete-orphan"
    )
    edges = relationship(
        "PathwayEdge", back_populates="pathway", cascade="all, delete-orphan"
    )


class PathwayBlock(Base, TimestampMixin):
    __tablename__ = "pathway_blocks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pathway_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pathways.id", ondelete="CASCADE"), nullable=False, index=True
    )
    block_type: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    position: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    pathway = relationship("Pathway", back_populates="blocks")


class PathwayEdge(Base):
    __tablename__ = "pathway_edges"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    pathway_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pathways.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_block_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pathway_blocks.id", ondelete="CASCADE"), nullable=False
    )
    target_block_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pathway_blocks.id", ondelete="CASCADE"), nullable=False
    )
    edge_type: Mapped[str] = mapped_column(String(20), default="default")
    label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    pathway = relationship("Pathway", back_populates="edges")
```

- [ ] **Step 2: Update backend/app/models/__init__.py**

Add `Pathway`, `PathwayBlock`, `PathwayEdge` to imports and `__all__`.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add Pathway, PathwayBlock, PathwayEdge models"
```

---

## Task 2: Backend Pathway Schemas + Service + Router

**Files:**
- Create: `backend/app/schemas/pathway.py`
- Create: `backend/app/services/pathway_service.py`
- Create: `backend/app/routers/pathways.py`
- Modify: `backend/app/main.py` (add pathway router)

### Schemas (backend/app/schemas/pathway.py)

```python
from pydantic import BaseModel


class PathwayBlockSchema(BaseModel):
    id: str
    block_type: str
    category: str
    label: str
    config: dict
    position: dict | None = None
    order_index: int = 0


class PathwayEdgeSchema(BaseModel):
    id: str
    source_block_id: str
    target_block_id: str
    edge_type: str = "default"
    label: str | None = None


class PathwayListItem(BaseModel):
    id: str
    name: str
    description: str | None
    condition: str | None
    target_tiers: list[int]
    status: str
    version: int
    block_count: int = 0
    created_at: str
    updated_at: str


class PathwayDetail(PathwayListItem):
    created_by: str
    published_at: str | None
    published_by: str | None
    blocks: list[PathwayBlockSchema]
    edges: list[PathwayEdgeSchema]


class PathwayCreate(BaseModel):
    name: str
    description: str | None = None
    condition: str | None = None
    target_tiers: list[int] = []


class PathwayUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    condition: str | None = None
    target_tiers: list[int] | None = None
    status: str | None = None


class BlockCreate(BaseModel):
    block_type: str
    category: str
    label: str
    config: dict = {}
    position: dict | None = None
    order_index: int = 0


class BlockUpdate(BaseModel):
    label: str | None = None
    config: dict | None = None
    position: dict | None = None
    order_index: int | None = None


class PathwayListResponse(BaseModel):
    items: list[PathwayListItem]
    total: int


class PathwayGenerateRequest(BaseModel):
    prompt: str
    pathway_id: str | None = None
```

### Service (backend/app/services/pathway_service.py)

Implement:
- `list_pathways(db, tenant_id)` — list all pathways with block count
- `get_pathway(db, tenant_id, pathway_id)` — full pathway with blocks + edges
- `create_pathway(db, tenant_id, user_id, data: PathwayCreate)` — create empty pathway
- `update_pathway(db, tenant_id, pathway_id, data: PathwayUpdate)` — update metadata
- `publish_pathway(db, tenant_id, pathway_id, user_id)` — set status to "published", set published_at/by
- `add_block(db, tenant_id, pathway_id, data: BlockCreate)` — add block to pathway
- `update_block(db, tenant_id, pathway_id, block_id, data: BlockUpdate)` — update block config/position
- `delete_block(db, tenant_id, pathway_id, block_id)` — remove block and its edges
- `save_edges(db, pathway_id, edges: list)` — bulk save edges (delete old, insert new)

All queries filter by `tenant_id`.

### Router (backend/app/routers/pathways.py)

Endpoints:
- `GET /` — list pathways
- `POST /` — create pathway
- `GET /{pathway_id}` — get pathway with blocks + edges
- `PATCH /{pathway_id}` — update pathway metadata
- `POST /{pathway_id}/publish` — publish pathway
- `POST /{pathway_id}/blocks` — add block
- `PATCH /{pathway_id}/blocks/{block_id}` — update block
- `DELETE /{pathway_id}/blocks/{block_id}` — delete block
- `PUT /{pathway_id}/edges` — bulk save edges

All require `auth: AuthContext = Depends(get_auth)`.

### Modify main.py

Add to ROUTER_REGISTRY:
```python
(pathways.router, "/api/pathways", ["Pathways"]),
```

- [ ] **Step 1: Create schemas**
- [ ] **Step 2: Create service**
- [ ] **Step 3: Create router**
- [ ] **Step 4: Add router to main.py**
- [ ] **Step 5: Delete DB, restart, test with curl**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add pathway API (CRUD, blocks, edges, publish)"
```

---

## Task 3: Pathway Seed Data

**Files:**
- Create: `backend/app/services/pathway_seed.py`
- Modify: `backend/app/services/seed_service.py`

Seed 3 sample pathways to give the builder something to display:

1. **Comprehensive Diabetes Support** (status: "published", target_tiers: [2, 3, 4])
   - 6 blocks: eligibility_diagnosis (E11.*), eligibility_lab (HbA1c ≥ 7), action_outreach, action_lab_order (HbA1c quarterly), logic_conditional (HbA1c > 10 → uptier), escalation_uptier
   - Edges connecting them sequentially with a branch at the conditional

2. **Diabetes Prevention — Tier 0** (status: "published", target_tiers: [0])
   - 4 blocks: eligibility_demographics (BMI ≥ 25), eligibility_lab (HbA1c 5.7-6.4), action_assessment (DDS), schedule_recurring (quarterly check-in)
   - Sequential edges

3. **Heart Failure Comorbidity** (status: "draft", target_tiers: [3, 4])
   - 3 blocks: eligibility_diagnosis (I50.*), action_referral (cardiology), schedule_recurring (monthly review)
   - Sequential edges

Use `DEFAULT_TENANT_ID` and admin user ID from seed_service. Fixed seed (43) for determinism.

- [ ] **Step 1: Create backend/app/services/pathway_seed.py**
- [ ] **Step 2: Call pathway seed from seed_service after patient seed**
- [ ] **Step 3: Delete DB, restart, verify with curl**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: seed 3 sample pathways with blocks and edges"
```

---

## Task 4: Frontend Block Type Registry

**Files:**
- Create: `src/config/block-types.ts`

This is the frontend mirror of the backend block type registry. Single source of truth for the UI — component library, config drawer, and canvas all read from here.

```typescript
export interface BlockTypeDefinition {
  type: string;
  category: BlockCategory;
  label: string;
  description: string;
  icon: string; // key into Icons config
  configFields: ConfigFieldDefinition[];
}

export interface ConfigFieldDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "multiselect" | "toggle" | "textarea" | "json" | "list";
  options?: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: unknown;
}

export type BlockCategory = "eligibility" | "action" | "logic" | "escalation" | "schedule";

export interface CategoryDefinition {
  key: BlockCategory;
  label: string;
  colorClass: string; // Tailwind class for category accent
  bgClass: string;    // Tailwind class for light bg
  borderClass: string;
  icon: string;       // key into Icons config
}
```

Define:
- `BLOCK_CATEGORIES`: 5 categories with color classes:
  - eligibility: green (`text-green-700`, `bg-green-50`, `border-green-200`)
  - action: blue (`text-blue-700`, `bg-blue-50`, `border-blue-200`)
  - logic: amber (`text-amber-700`, `bg-amber-50`, `border-amber-200`)
  - escalation: red (`text-red-700`, `bg-red-50`, `border-red-200`)
  - schedule: cyan (`text-cyan-700`, `bg-cyan-50`, `border-cyan-200`)

- `BLOCK_TYPE_REGISTRY`: Record of all 22 block types. For Phase 3, define the full type + category + label + description + icon for all 22, but only include detailed `configFields` for the 8 most commonly used blocks (to keep task manageable):
  1. `eligibility_diagnosis` — icd10_codes (text), match_type (select: exact/prefix), include (toggle)
  2. `eligibility_lab` — test_type (select), operator (select), value (number), unit (text), missing_data_rule (select)
  3. `eligibility_demographics` — age_min (number), age_max (number), gender (select), bmi_threshold (number)
  4. `action_outreach` — channel (select), template_slug (text), ai_personalisation (toggle), escalation_action (select)
  5. `action_lab_order` — test_type (select), frequency (select), notification_target (select)
  6. `action_referral` — specialty (text), urgency (select), prerequisite_data (text)
  7. `logic_conditional` — field (text), operator (select), value (text), true_branch_label (text), false_branch_label (text)
  8. `escalation_uptier` — target_tier (number), timing (select), notification_targets (multiselect)

  Remaining 14 types get type + category + label + description + icon + empty configFields array (config forms added in later phases).

- `getBlockType(type: string)`: lookup helper
- `getBlocksByCategory(category: BlockCategory)`: filter helper

- [ ] **Step 1: Create src/config/block-types.ts with all definitions**
- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add frontend block type registry (22 types, 8 with config fields)"
```

---

## Task 5: Frontend Pathway Types + API Service + Store

**Files:**
- Create: `src/services/types/pathway.ts`
- Create: `src/services/api/pathways.ts`
- Create: `src/stores/pathway-builder-store.ts`

### Types (src/services/types/pathway.ts)

Match backend schemas. Include: PathwayListItem, PathwayDetail, PathwayBlockSchema, PathwayEdgeSchema, PathwayCreate, PathwayUpdate, BlockCreate, BlockUpdate, PathwayListResponse, PathwayGenerateRequest.

### API Service (src/services/api/pathways.ts)

Functions using `apiRequest`:
- `fetchPathways()` — GET list
- `fetchPathway(id)` — GET detail with blocks + edges
- `createPathway(data)` — POST create
- `updatePathway(id, data)` — PATCH update
- `publishPathway(id)` — POST publish
- `addBlock(pathwayId, data)` — POST block
- `updateBlock(pathwayId, blockId, data)` — PATCH block
- `deleteBlock(pathwayId, blockId)` — DELETE block
- `saveEdges(pathwayId, edges)` — PUT edges
- `generatePathway(data)` — POST AI generation

### Store (src/stores/pathway-builder-store.ts)

Follow patients-store pattern:
- **List state:** `pathways`, `total`, `loading`, `error`
- **Builder state:** `selectedPathway`, `blocks`, `edges`, `selectedBlockId`, `builderMode` ("ai" | "canvas" | "config"), `isDirty`
- **Actions:**
  - `loadPathways()` — fetch list
  - `loadPathway(id)` — fetch detail, populate blocks/edges
  - `createPathway(data)` — create and navigate
  - `updatePathway(data)` — update metadata
  - `publishPathway()` — publish current pathway
  - `addBlock(data)` — add block, mark dirty
  - `updateBlock(blockId, data)` — update block config/position, mark dirty
  - `deleteBlock(blockId)` — remove block + its edges, mark dirty
  - `selectBlock(blockId | null)` — select/deselect block (opens/closes config drawer)
  - `saveEdges(edges)` — save edge connections
  - `setBuilderMode(mode)` — switch between modes
  - `onNodesChange(changes)` — React Flow node position updates
  - `onEdgesChange(changes)` — React Flow edge updates
  - `onConnect(connection)` — React Flow new connection

- [ ] **Step 1: Create all three files**
- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add pathway types, API service, and Zustand store"
```

---

## Task 6: Pathway List Page

**Files:**
- Modify: `src/app/dashboard/pathways/page.tsx`

Replace placeholder with full pathway list:
- PageHeader with "Create Pathway" button (primary, with `Icons.plus`)
- Table with columns: Name, Condition, Tiers (as tier badges), Status (badge: draft/review/published/archived), Blocks (count), Version, Updated
- Click row navigates to `/dashboard/pathways/[id]` using `buildPath`
- Status badges use config from `src/config/status.ts` — add `PATHWAY_STATUS` config:
  - draft: label "Draft", bg slate, text slate
  - review: label "Review", bg amber, text amber
  - published: label "Published", bg green, text green
  - archived: label "Archived", bg neutral, text neutral
- Empty state when no pathways
- Loading spinner
- Same fixed-header scrollable pattern as patients page (`flex h-full flex-col`, table in `flex-1 overflow-y-auto`)

- [ ] **Step 1: Add PATHWAY_STATUS to src/config/status.ts**
- [ ] **Step 2: Build the pathway list page**
- [ ] **Step 3: Verify it renders with backend running**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add pathway list page with status badges and navigation"
```

---

## Task 7: Builder Shell + Mode Switcher

**Files:**
- Create: `src/app/dashboard/pathways/[id]/page.tsx`
- Create: `src/features/pathway-builder/components/builder-shell.tsx`

### Page (src/app/dashboard/pathways/[id]/page.tsx)

- Loads pathway by ID from URL params (same pattern as patient detail)
- Loading/error states
- Renders `<BuilderShell pathway={selectedPathway} />`

### Builder Shell

Three-part layout:
1. **Top bar** — Pathway name (editable inline), status badge, mode tabs (AI Builder | Visual Canvas | Config), action buttons (Preview, Save Draft, Publish & Rollout)
2. **Content area** — Switches based on `builderMode`:
   - `"ai"` → `<AiBuilder />` (Task 11)
   - `"canvas"` → Three-column layout: `<ComponentLibrary />` | `<VisualCanvas />` | `<ConfigDrawer />`
   - `"config"` → `<ConfigDrawer />` in full-width mode with block list sidebar
3. **Mode tabs** use shadcn Tabs with `variant="line"` matching the patient detail pattern

The shell reads `builderMode` from the store and renders accordingly.

- [ ] **Step 1: Create the page.tsx**
- [ ] **Step 2: Create builder-shell.tsx with top bar and mode switching**
- [ ] **Step 3: Verify navigation from list to builder works**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add pathway builder shell with mode switcher and top bar"
```

---

## Task 8: Component Library Panel

**Files:**
- Create: `src/features/pathway-builder/components/component-library.tsx`

Left sidebar panel for the visual canvas mode:
- Reads from `BLOCK_CATEGORIES` and `BLOCK_TYPE_REGISTRY`
- Groups blocks by category with category header (icon + label + colored accent)
- Each block is a draggable card showing:
  - Category color left border
  - Block label (bold)
  - Block description (muted, truncated)
  - `cursor-grab` on hover
- Blocks are made draggable via HTML5 drag API (`draggable="true"`, `onDragStart` sets block_type in dataTransfer)
- Search/filter input at top to filter blocks by name
- Panel width: `w-64`, border-r, overflow-y-auto, full height

- [ ] **Step 1: Create component-library.tsx**
- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add component library panel with draggable blocks"
```

---

## Task 9: React Flow Visual Canvas

**Files:**
- Create: `src/features/pathway-builder/components/visual-canvas.tsx`
- Create: `src/features/pathway-builder/components/pathway-block-node.tsx`
- Modify: `package.json` (add `@xyflow/react` dependency)

### Install React Flow

```bash
pnpm add @xyflow/react
```

### Visual Canvas (visual-canvas.tsx)

- Uses `@xyflow/react` `ReactFlow` component
- Converts store `blocks` to React Flow nodes (using block position, type, label)
- Converts store `edges` to React Flow edges
- Custom node type `PathwayBlockNode` for rendering blocks
- Handles:
  - `onNodesChange` → update block positions in store
  - `onEdgesChange` → update edges in store
  - `onConnect` → create new edge in store
  - `onNodeClick` → select block (opens config drawer)
  - `onDrop` + `onDragOver` → accept drops from component library, create new block at drop position
- Controls: zoom in/out/fit buttons using React Flow's `<Controls />`
- Minimap: `<MiniMap />` in bottom-right
- Background: `<Background variant="dots" />`
- Node click selects block → opens config drawer

### Pathway Block Node (pathway-block-node.tsx)

Custom React Flow node:
- Reads block type from `BLOCK_TYPE_REGISTRY`
- Shows category-colored left border
- Shows icon + label + block type description
- Selected state: ring around node
- Source/target handles for connections

- [ ] **Step 1: Install @xyflow/react**
- [ ] **Step 2: Create pathway-block-node.tsx**
- [ ] **Step 3: Create visual-canvas.tsx**
- [ ] **Step 4: Verify canvas renders with seeded pathway blocks**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add React Flow visual canvas with custom block nodes"
```

---

## Task 10: Config Drawer

**Files:**
- Create: `src/features/pathway-builder/components/config-drawer.tsx`
- Create: `src/features/pathway-builder/components/block-config-form.tsx`

### Config Drawer (config-drawer.tsx)

Right sidebar panel:
- Appears when a block is selected (`selectedBlockId` in store)
- Header: block icon + label + close button (X)
- Body: renders `<BlockConfigForm />` based on selected block's `block_type`
- Footer: "Save Block" (primary button) + "Delete" (destructive ghost button)
- Save calls `updateBlock()` in store
- Delete calls `deleteBlock()` in store with confirmation dialog
- Panel width: `w-80`, border-l, overflow-y-auto, full height
- Slides in/out with transition

### Block Config Form (block-config-form.tsx)

Generic form renderer that reads `configFields` from `BLOCK_TYPE_REGISTRY`:
- For each `ConfigFieldDefinition`, renders the appropriate shadcn input:
  - `text` → `<Input />`
  - `number` → `<Input type="number" />`
  - `select` → `<Select />` with options
  - `multiselect` → multiple `<Checkbox />` items
  - `toggle` → `<Switch />`
  - `textarea` → `<Textarea />`
  - `json` → `<Textarea />` with JSON validation
  - `list` → repeatable text inputs with add/remove buttons
- Uses `useForm` pattern — local state, saves on "Save Block" click
- Labels match the field label, grouped logically
- For blocks with empty `configFields` (the 14 not yet detailed), shows a message: "Configuration form coming soon. Use JSON editor below." with a JSON textarea fallback

- [ ] **Step 1: Create block-config-form.tsx**
- [ ] **Step 2: Create config-drawer.tsx**
- [ ] **Step 3: Wire into builder-shell canvas mode**
- [ ] **Step 4: Verify selecting a block opens drawer with correct fields**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add config drawer with dynamic block config forms"
```

---

## Task 11: AI Builder Mode (Stubbed)

**Files:**
- Create: `src/features/pathway-builder/components/ai-builder.tsx`
- Create: `backend/app/routers/ai.py`
- Modify: `backend/app/main.py` (add AI router)

### Backend AI Endpoint (backend/app/routers/ai.py)

Stubbed endpoint that returns a mock pathway generation:

```python
from fastapi import APIRouter, Depends
from app.auth.dependencies import get_auth, AuthContext
from app.schemas.pathway import PathwayGenerateRequest

router = APIRouter()

@router.post("/pathway-generate")
async def generate_pathway(
    request: PathwayGenerateRequest,
    auth: AuthContext = Depends(get_auth),
):
    """Stubbed AI pathway generation. Returns mock response.
    Will be wired to real LLM in Phase 7."""
    return {
        "message": (
            f"Based on your description: \"{request.prompt}\", "
            "I've designed a care pathway with eligibility criteria, "
            "clinical actions, and escalation triggers. "
            "You can review and edit the blocks below, or switch to "
            "Visual Canvas mode to refine the flow."
        ),
        "is_complete": True,
        "pathway": {
            "name": "AI-Generated Pathway",
            "description": f"Generated from: {request.prompt}",
            "condition": "diabetes",
            "target_tiers": [2, 3, 4],
            "blocks": [
                {
                    "block_type": "eligibility_diagnosis",
                    "category": "eligibility",
                    "label": "Diabetes Diagnosis",
                    "config": {"icd10_codes": ["E11"], "match_type": "prefix", "include": True},
                    "order_index": 0,
                },
                {
                    "block_type": "eligibility_lab",
                    "category": "eligibility",
                    "label": "HbA1c Threshold",
                    "config": {"test_type": "hba1c", "operator": "gte", "value": 7.0, "unit": "%"},
                    "order_index": 1,
                },
                {
                    "block_type": "action_outreach",
                    "category": "action",
                    "label": "Initial Patient Contact",
                    "config": {"channel": "whatsapp", "template_slug": "enrollment_intro", "ai_personalisation": True},
                    "order_index": 2,
                },
                {
                    "block_type": "action_lab_order",
                    "category": "action",
                    "label": "Quarterly HbA1c",
                    "config": {"test_type": "hba1c", "frequency": "quarterly", "notification_target": "care_manager"},
                    "order_index": 3,
                },
                {
                    "block_type": "logic_conditional",
                    "category": "logic",
                    "label": "Severe Hyperglycemia Check",
                    "config": {"field": "hba1c", "operator": "gt", "value": "10", "true_branch_label": "Escalate", "false_branch_label": "Continue"},
                    "order_index": 4,
                },
                {
                    "block_type": "escalation_uptier",
                    "category": "escalation",
                    "label": "Escalate to Tier 4",
                    "config": {"target_tier": 4, "timing": "within_48h", "notification_targets": ["care_manager", "physician"]},
                    "order_index": 5,
                },
            ],
            "edges": [
                {"source_index": 0, "target_index": 1, "edge_type": "default"},
                {"source_index": 1, "target_index": 2, "edge_type": "default"},
                {"source_index": 2, "target_index": 3, "edge_type": "default"},
                {"source_index": 3, "target_index": 4, "edge_type": "default"},
                {"source_index": 4, "target_index": 5, "edge_type": "true_branch", "label": "HbA1c > 10"},
            ],
        },
    }
```

Add to main.py ROUTER_REGISTRY:
```python
(ai.router, "/api/ai", ["AI"]),
```

### Frontend AI Builder (ai-builder.tsx)

Two-panel layout:
- **Left panel (w-1/2):** Chat interface
  - Message list (AI messages + user messages)
  - Input bar at bottom with textarea + send button
  - On send: calls `generatePathway` API
  - Shows AI response as a chat bubble
  - Shows "Accept & Edit" button after AI responds
- **Right panel (w-1/2):** Live preview
  - Renders the AI-generated blocks as a simple vertical flow diagram (not full React Flow — just a preview list)
  - Each block shown as a card with category color + label + description
  - Edges shown as connecting arrows between cards
  - "Accept & Edit" loads blocks into the store and switches to canvas mode

- [ ] **Step 1: Create backend AI endpoint**
- [ ] **Step 2: Add AI router to main.py**
- [ ] **Step 3: Create ai-builder.tsx**
- [ ] **Step 4: Wire into builder-shell AI mode**
- [ ] **Step 5: Test: type prompt → see mock response → accept → switch to canvas**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add AI builder mode with stubbed pathway generation"
```

---

## Task 12: Add Icons for Pathway Builder

**Files:**
- Modify: `src/config/icons.ts`

Add any missing icons needed for the builder:
- `plus: Plus` (create pathway button)
- `drag: GripVertical` (drag handle)
- `canvas: Layout` (canvas mode icon)
- `config: SlidersHorizontal` (config mode icon)
- `diagnosis: Stethoscope` (eligibility_diagnosis)
- `lab: TestTube` (eligibility_lab, action_lab_order)
- `pharmacy: Pill` (eligibility_pharmacy)
- `utilisation: Activity` (eligibility_utilisation)
- `demographics: UserCheck` (eligibility_demographics)
- `sdoh: Home` (eligibility_sdoh)
- `pro: ClipboardCheck` (eligibility_pro)
- `exclusion: ShieldX` (eligibility_exclusion)
- `outreach: MessageSquare` (action_outreach)
- `referral: ArrowRightLeft` (action_referral)
- `medication: Pill` (action_medication — shared with pharmacy)
- `assessment: ClipboardList` (action_assessment)
- `careTeam: UserPlus` (action_care_team)
- `wait: Clock` (logic_wait)
- `missingData: AlertCircle` (logic_missing_data)
- `compositeScore: Calculator` (logic_composite_score)
- `uptier: TrendingUp` (escalation_uptier)
- `downtier: TrendingDown` (escalation_downtier)
- `external: ExternalLink` (escalation_external)
- `override: ShieldCheck` (escalation_override)
- `schedule: Calendar` (schedule_recurring, schedule_template)
- `preview: Eye` (preview button)
- `publish: Rocket` (publish button)
- `saveDraft: Save` (save draft button)

Only add icons not already in the registry. Check existing icons first to avoid duplicates.

- [ ] **Step 1: Add missing icons to src/config/icons.ts**
- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add pathway builder icons to registry"
```

---

## Task 13: Wire Everything Together + Polish

**Files:**
- Modify: `src/features/pathway-builder/components/builder-shell.tsx` (wire all panels)
- Modify: `src/app/dashboard/pathways/[id]/page.tsx` (verify)

Final integration:
- Canvas mode: ComponentLibrary (left) + VisualCanvas (center) + ConfigDrawer (right, conditional)
- AI mode: AiBuilder (full width)
- Verify the full flow:
  1. Navigate to /dashboard/pathways → see list with seeded pathways
  2. Click "Create Pathway" → creates new pathway, navigates to builder
  3. AI mode → type prompt → see mock response → accept → loads blocks into canvas
  4. Canvas mode → see blocks on canvas → drag new block from library → connect blocks → click block → config drawer opens
  5. Config drawer → edit fields → save → block updates
  6. Click existing seeded pathway → builder loads with blocks and edges rendered on canvas
- Fix any layout/spacing issues
- Ensure all transitions work

- [ ] **Step 1: Wire all components into builder-shell**
- [ ] **Step 2: Test full flow end to end**
- [ ] **Step 3: Fix any issues**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: wire pathway builder components and polish integration"
```

---

## Phase 3 Complete Checklist

- [ ] Pathway, PathwayBlock, PathwayEdge models created
- [ ] Pathway CRUD API works (list, create, get, update, publish)
- [ ] Block CRUD API works (add, update, delete)
- [ ] Edge bulk save API works
- [ ] 3 sample pathways seeded with blocks and edges
- [ ] Block type registry defined (22 types, 8 with config fields)
- [ ] Pathway list page shows seeded pathways with status badges
- [ ] Builder shell loads with mode switcher (AI / Canvas / Config)
- [ ] Component library shows blocks grouped by category, draggable
- [ ] React Flow canvas renders blocks and edges
- [ ] Dragging block from library creates new block on canvas
- [ ] Clicking block opens config drawer with correct fields
- [ ] Config drawer saves block config
- [ ] AI builder shows chat interface with stubbed response
- [ ] "Accept & Edit" loads AI-generated blocks into canvas
- [ ] All components use shadcn/ui, Lucide icons, config registries
- [ ] No hardcoded colors, paths, or labels
