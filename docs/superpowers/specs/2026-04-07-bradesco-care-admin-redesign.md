# Bradesco Care Admin — Complete Redesign Specification

**Status:** Design approved, pending implementation plan
**Scope:** Full rebuild of `prototypes/bradesco-care-admin` — destroy current app and recreate
**Audience:** Internal Tatva + Bradesco Saude demo + working baseline app

---

## 1. Product Overview

### 1.1 What This Is

An AI-powered care management platform for health insurers (payers). The platform enables clinical program architects to design care pathways, automatically cohortise patients into risk tiers, and provide care managers with AI-driven tools to manage chronic disease populations. The first deployment targets Bradesco Saude's diabetes care program.

### 1.2 Narrative Architecture: Command Center + Deep Dives

The app opens with an AI-driven command center that shows what needs attention NOW. Every other screen is a deep-dive accessible from the command center's alerts and KPIs.

**Primary screens (daily use):**
- Command Center — AI alerts, population KPIs, action queue
- Patients — Registry, search, patient detail with AI summary
- Communications — AI concierge orchestration + message threads
- Outcomes — Clinical metrics, HEDIS, ROI, re-cohortisation

**Configuration screens (setup & tuning):**
- Cohortisation — Tier definitions, CRS weights, scoring rules
- Pathway Builder — Create/edit pathways (AI + drag-drop + config)

### 1.3 Key Design Decisions

- **Command Center is home** — AI-driven, action-oriented, not a passive dashboard
- **Patient detail uses dense header strip + horizontal tabs** — not a nested sidebar
- **AI summary is contextual** — sits inside Care Protocols tab, not its own tab
- **Pathway Builder is a generic engine** — diabetes is the first pathway, not hardcoded
- **AI Communications is a concierge** — autonomous multi-step orchestration with escalation
- **Multi-tenant SaaS** — tenant isolation, RBAC, configurable per tenant

---

## 2. Tech Stack

### 2.1 Frontend

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (app router, React 19, server/client components) |
| Language | TypeScript 5 (strict mode) |
| UI Components | shadcn/ui (all components from library, zero custom component creation) |
| Styling | Tailwind CSS 4 with `cn()` for conditional classes (no template literal concatenation) |
| Icons | Lucide React (no emojis anywhere — every icon is a Lucide component) |
| Charts | Recharts 2 |
| Forms | React Hook Form + Zod |
| State | Zustand (feature-scoped stores) |
| Fonts | Geist Sans + Geist Mono |
| Canvas | React Flow (pathway builder visual canvas) |
| HTTP | Custom fetch wrapper with auth token injection |

### 2.2 Backend

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (async, Python 3.12+) |
| ORM | SQLAlchemy 2 (async, declarative) |
| Database | SQLite (dev) / PostgreSQL (prod-ready via SQLAlchemy) |
| Migrations | Alembic |
| Validation | Pydantic v2 (request/response schemas) |
| Auth | JWT (access + refresh tokens) |
| LLM | Base abstraction with Gemini + Azure OpenAI adapters |
| Task Queue | Background tasks via FastAPI BackgroundTasks (upgrade to Celery when needed) |

### 2.3 Monorepo Integration

Package name: `@tc/bradesco-care-admin`
Scripts: `pnpm dev` starts both Next.js frontend and FastAPI backend (via concurrently or similar)

---

## 3. Design System

### 3.1 Design Tokens

All values defined in Tailwind config + CSS custom properties. Never hardcode hex values in components.

**Color Palette:**

```
// Brand
--brand-primary: #4f46e5      // Indigo-600 — primary actions, active states
--brand-primary-light: #eef2ff // Indigo-50 — backgrounds, badges
--brand-primary-hover: #4338ca // Indigo-700

// Neutral
--text-primary: #0f172a       // Slate-900
--text-secondary: #374151     // Gray-700
--text-muted: #64748b         // Slate-500
--text-placeholder: #94a3b8   // Slate-400
--bg-primary: #ffffff
--bg-secondary: #f8fafc       // Slate-50
--bg-hover: #f1f5f9           // Slate-100
--border-default: #e2e8f0     // Slate-200
--border-subtle: #f1f5f9      // Slate-100

// Semantic Status
--status-success: #22c55e     // Green-500
--status-success-bg: #f0fdf4  // Green-50
--status-success-border: #bbf7d0
--status-warning: #f59e0b     // Amber-500
--status-warning-bg: #fefce8  // Amber-50
--status-warning-border: #fde68a
--status-error: #ef4444       // Red-500
--status-error-bg: #fef2f2    // Red-50
--status-error-border: #fecaca
--status-info: #0891b2        // Cyan-600
--status-info-bg: #f0f9ff     // Sky-50
--status-info-border: #bae6fd

// AI
--ai-primary: #4f46e5         // Same as brand — AI is the brand
--ai-bg: linear-gradient(135deg, #eef2ff, #faf5ff)
--ai-border: #c7d2fe

// Tier Colors (used in badges, charts, cohort views)
--tier-0: #86efac             // Green-300 — Prevention
--tier-1: #93c5fd             // Blue-300 — Pre-diabetes
--tier-2: #fcd34d             // Yellow-300 — Controlled
--tier-3: #fdba74             // Orange-300 — Suboptimal
--tier-4: #fca5a5             // Red-300 — Complex

// Sidebar
--sidebar-bg: #0a1628
--sidebar-text: #94a3b8
--sidebar-active-bg: #1e293b
--sidebar-active-text: #38bdf8
--sidebar-active-border: #38bdf8
--sidebar-divider: #1e293b
```

**Typography Scale:**

```
--font-sans: 'Geist Sans', system-ui, sans-serif
--font-mono: 'Geist Mono', monospace

--text-xs: 0.75rem / 1rem      // 12px — labels, metadata
--text-sm: 0.8125rem / 1.25rem  // 13px — body, table cells
--text-base: 0.875rem / 1.5rem  // 14px — default
--text-lg: 1rem / 1.5rem        // 16px — section headings
--text-xl: 1.125rem / 1.75rem   // 18px — page headings
--text-2xl: 1.5rem / 2rem       // 24px — KPI numbers
```

**Spacing Scale:** 4px (xs), 8px (sm), 12px (md), 16px (lg), 20px (xl), 24px (2xl), 32px (3xl)

**Border Radius:** 4px (sm), 6px (md), 8px (lg), 12px (xl), 9999px (full/pill)

### 3.2 Component Primitives (all from shadcn/ui)

| Category | Components Used |
|----------|----------------|
| Layout | Card, Separator, ScrollArea, ResizablePanel, Sheet, Drawer |
| Navigation | Tabs, Breadcrumb, DropdownMenu, NavigationMenu |
| Forms | Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, DatePicker |
| Feedback | Badge, Alert, Progress, Tooltip, Toast (Sonner) |
| Overlay | Dialog, AlertDialog, Popover, HoverCard, Command (cmdk) |
| Data | Table, Pagination, Accordion, Collapsible |
| Buttons | Button (all variants: default, destructive, outline, secondary, ghost, link) |

**Badge variants for domain states:**

```typescript
// Tier badges
type TierBadgeVariant = "tier-0" | "tier-1" | "tier-2" | "tier-3" | "tier-4";

// Orchestration states
type OrchestraState = "idle" | "sent" | "awaiting" | "confirmed" | "needs-review" | "escalated" | "declined";

// Protocol step states
type ProtocolStepState = "completed" | "in-progress" | "pending" | "overdue";

// Clinical status
type ClinicalStatus = "on-track" | "behind" | "ahead" | "at-risk";
```

Each maps to shadcn Badge variants via a single lookup object — no hardcoded colors in components.

### 3.3 Lucide Icons

Every icon in the app is a Lucide React component. No emojis, no unicode symbols, no custom SVGs.

```typescript
// Icon registry — single source of truth
import {
  Zap,             // Command Center
  Users,           // Patients
  MessageSquare,   // Communications
  BarChart3,       // Outcomes
  FlaskConical,    // Cohortisation
  Route,           // Pathway Builder
  Bell,            // Notifications
  Search,          // Global search
  Settings,        // Settings
  Sparkles,        // AI features
  ArrowUpRight,    // Escalation / up-tier
  ArrowDownRight,  // Down-tier
  AlertTriangle,   // Warning / overdue
  CheckCircle2,    // Completed
  Clock,           // Pending / timer
  Circle,          // Idle / empty
  ChevronRight,    // Expand / navigate
  MoreHorizontal,  // More actions
  Send,            // Send message
  Mic,             // Voice input
  Phone,           // Call
  FileText,        // Documents
  Heart,           // Health / clinical
  Shield,          // Risk
  Receipt,         // Claims
  Calendar,        // Schedule / review
  Plus,            // Add / create
  X,               // Close / remove
  Filter,          // Filter
  Download,        // Export
  RefreshCw,       // Recurring
  GitBranch,       // Conditional logic
  Pause,           // Paused agent
  Play,            // Active agent
} from "lucide-react";
```

---

## 4. Frontend Architecture

### 4.1 Route Registry

Single source of truth for all routes. No hardcoded paths anywhere in components.

```typescript
// src/config/routes.ts

import { type LucideIcon } from "lucide-react";

export interface RouteConfig {
  path: string;
  label: string;
  icon: LucideIcon;
  group: "primary" | "config";
  badge?: () => number | null;  // dynamic badge count
}

export const ROUTES: Record<string, RouteConfig> = {
  commandCenter: {
    path: "/dashboard",
    label: "Command Center",
    icon: Zap,
    group: "primary",
  },
  patients: {
    path: "/dashboard/patients",
    label: "Patients",
    icon: Users,
    group: "primary",
  },
  patientDetail: {
    path: "/dashboard/patients/:id",
    label: "Patient Detail",
    icon: Users,
    group: "primary",
  },
  communications: {
    path: "/dashboard/communications",
    label: "Communications",
    icon: MessageSquare,
    group: "primary",
  },
  outcomes: {
    path: "/dashboard/outcomes",
    label: "Outcomes",
    icon: BarChart3,
    group: "primary",
  },
  cohortisation: {
    path: "/dashboard/cohortisation",
    label: "Cohortisation",
    icon: FlaskConical,
    group: "config",
  },
  pathwayBuilder: {
    path: "/dashboard/pathways",
    label: "Pathway Builder",
    icon: Route,
    group: "config",
  },
  pathwayEditor: {
    path: "/dashboard/pathways/:id",
    label: "Edit Pathway",
    icon: Route,
    group: "config",
  },
} as const;
```

The sidebar, breadcrumbs, and all navigation derive from this registry. No component imports a path string directly.

### 4.2 Directory Structure

```
src/
  app/                          # Next.js app router
    (auth)/
      login/page.tsx
    dashboard/
      layout.tsx                # App shell (sidebar + topbar)
      page.tsx                  # Command Center
      patients/
        page.tsx                # Patient Registry
        [id]/page.tsx           # Patient Detail
      communications/page.tsx
      outcomes/page.tsx
      cohortisation/page.tsx
      pathways/
        page.tsx                # Pathway list + builder
        [id]/page.tsx           # Pathway editor
  
  components/
    ui/                         # shadcn/ui components (generated, never modified)
    layout/
      app-sidebar.tsx           # Main sidebar (reads from route registry)
      app-topbar.tsx            # Top bar with search + notifications
      app-shell.tsx             # Combines sidebar + topbar + content
    shared/
      tier-badge.tsx            # Tier badge (reads from tier config)
      crs-breakdown.tsx         # CRS score visual breakdown
      status-badge.tsx          # Generic status badge (maps state -> variant)
      ai-card.tsx               # AI insight/summary card wrapper
      kpi-card.tsx              # KPI metric card
      data-table.tsx            # Generic data table with pagination/filtering
      empty-state.tsx           # Consistent empty state component
  
  features/
    command-center/
      components/
        action-queue.tsx
        ai-insights-panel.tsx
        tier-distribution.tsx
        upcoming-reviews.tsx
        comms-summary.tsx
      hooks/
        use-command-center.ts
    
    patients/
      components/
        patient-registry.tsx
        patient-header.tsx
        patient-kpi-strip.tsx
        patient-tabs.tsx
        care-protocols-tab.tsx
        clinical-data-tab.tsx
        timeline-tab.tsx
        communications-tab.tsx
        risk-crs-tab.tsx
        ai-care-summary.tsx
        protocol-step-card.tsx
      hooks/
        use-patients.ts
        use-patient-detail.ts
    
    communications/
      components/
        thread-list.tsx
        message-thread.tsx
        compose-area.tsx
        patient-context-panel.tsx
        orchestration-table.tsx
        orchestration-stats.tsx
      hooks/
        use-threads.ts
        use-orchestration.ts
    
    outcomes/
      components/
        outcomes-kpis.tsx
        primary-outcomes-table.tsx
        cohort-migration.tsx
        ai-quarterly-insight.tsx
        hedis-measures.tsx
        engagement-metrics.tsx
        financial-roi.tsx
        recohortisation-queue.tsx
      hooks/
        use-outcomes.ts
    
    cohortisation/
      components/
        tier-config.tsx
        crs-formula.tsx
        scoring-rules.tsx
      hooks/
        use-cohortisation.ts
    
    pathway-builder/
      components/
        pathway-list.tsx
        builder-shell.tsx         # Three-mode switcher
        ai-builder.tsx            # Chat-based creation
        visual-canvas.tsx         # React Flow canvas
        component-library.tsx     # Draggable block palette
        config-drawer.tsx         # Block config panel
        block-configs/            # Per-block-type config forms
          eligibility-diagnosis.tsx
          eligibility-lab.tsx
          eligibility-pharmacy.tsx
          eligibility-utilisation.tsx
          eligibility-demographics.tsx
          eligibility-sdoh.tsx
          eligibility-pro.tsx
          eligibility-exclusion.tsx
          action-outreach.tsx
          action-lab-order.tsx
          action-referral.tsx
          action-medication.tsx
          action-assessment.tsx
          action-care-team.tsx
          logic-conditional.tsx
          logic-wait.tsx
          logic-missing-data.tsx
          logic-composite-score.tsx
          escalation-uptier.tsx
          escalation-downtier.tsx
          escalation-external.tsx
          escalation-override.tsx
          schedule-recurring.tsx
          schedule-template.tsx
        pathway-preview.tsx       # Flow diagram preview
      hooks/
        use-pathway-builder.ts
        use-pathway-blocks.ts
    
    auth/
      components/
        login-form.tsx
      hooks/
        use-auth.ts
  
  stores/
    auth-store.ts
    command-center-store.ts
    patients-store.ts
    communications-store.ts
    outcomes-store.ts
    pathway-builder-store.ts
    cohortisation-store.ts
  
  services/
    api/
      client.ts               # Base fetch wrapper with auth injection
      auth.ts
      patients.ts
      pathways.ts
      communications.ts
      outcomes.ts
      cohortisation.ts
      ai.ts
    types/
      auth.ts
      patient.ts
      pathway.ts
      communication.ts
      outcome.ts
      cohort.ts
      common.ts               # Shared types (pagination, filters, etc.)
  
  config/
    routes.ts                  # Route registry
    navigation.ts              # Sidebar navigation config (derives from routes)
    tiers.ts                   # Tier definitions, colors, labels
    block-registry.ts          # Pathway builder block type registry
    api.ts                     # API base URL, endpoints registry
  
  lib/
    cn.ts                      # clsx + tailwind-merge
    format.ts                  # Date, number, percentage formatters
    validators.ts              # Zod schemas shared across features
```

### 4.3 State Management (Zustand)

One store per feature domain. Each store follows the same pattern:

```typescript
// Pattern for all stores
interface FeatureStore {
  // Data
  items: Item[];
  selectedItem: Item | null;
  total: number;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Pagination & filters
  page: number;
  pageSize: number;
  filters: FilterState;
  
  // Actions
  load: () => Promise<void>;
  setPage: (page: number) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  select: (id: string) => void;
  reset: () => void;
}
```

Stores hydrate on mount via `useEffect` in page components. No global hydration — each page loads what it needs.

### 4.4 API Client

```typescript
// src/services/api/client.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface RequestConfig {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T>(config: RequestConfig): Promise<T> {
  // Reads token from auth store
  // Injects Authorization header
  // Handles 401 → refresh token flow
  // Handles errors uniformly
  // Returns typed response
}
```

All API service files use `apiRequest` — no raw fetch anywhere.

### 4.5 Responsive Design

- **Sidebar:** Collapsible on tablet, hidden (hamburger menu) on mobile
- **KPI strips:** Stack to 2-column on tablet, single column on mobile
- **Data tables:** Horizontal scroll on mobile with sticky first column
- **Pathway builder:** Canvas hidden on mobile — config-only view
- **Command center:** Single column stack on mobile

Use Tailwind responsive breakpoints consistently: `sm:`, `md:`, `lg:`, `xl:`.

---

## 5. Backend Architecture

### 5.1 Project Structure

```
backend/
  app/
    main.py                    # FastAPI app + startup hooks
    database.py                # Engine, session, get_db dependency
    startup_schema.py          # Schema bootstrap + seed
    
    models/
      base.py                  # Base, TimestampMixin, TenantUserMixin
      tenant.py                # Tenant, TenantConfig
      user.py                  # User, RefreshToken
      role.py                  # Role, RolePermission
      patient.py               # Patient, PatientLab, PatientMedication
      pathway.py               # Pathway, PathwayVersion, PathwayBlock
      cohort.py                # CohortTier, CohortAssignment, CRSScore
      communication.py         # ConciergeAction, MessageTemplate
      outcome.py               # OutcomeMetric, OutcomeTarget
      care_protocol.py         # CareProtocol, ProtocolStep, ProtocolTask
    
    schemas/                   # Pydantic request/response models
      auth.py
      patient.py
      pathway.py
      cohort.py
      communication.py
      outcome.py
      common.py                # PaginatedResponse, ErrorResponse, etc.
    
    routers/
      auth.py                  # POST /auth/login, /auth/refresh, /auth/me
      patients.py              # CRUD + search + detail
      pathways.py              # CRUD + publish + blocks
      cohortisation.py         # Tier config + CRS + assignments
      communications.py        # Threads + orchestration + templates
      outcomes.py              # Metrics + targets + re-cohortisation
      ai.py                    # Care summary, pathway generation, comms
    
    services/
      auth_service.py
      patient_service.py
      pathway_service.py
      cohort_service.py
      communication_service.py
      outcome_service.py
      ai_service.py            # Orchestrates LLM calls
      seed_defaults.py         # Seed tenants, users, patients, pathways
    
    auth/
      context.py               # AuthContext dataclass
      dependencies.py          # get_auth, require_permission
      jwt.py                   # Token creation, validation
      permission_catalog.py    # Permission definitions
    
    llm/
      base.py                  # BaseLLMProvider abstract class
      gemini_adapter.py        # Google Gemini SDK adapter
      azure_openai_adapter.py  # Azure OpenAI SDK adapter
      registry.py              # Provider registry + factory
      prompts/
        care_summary.py        # System + user prompts for care summaries
        pathway_builder.py     # Prompts for pathway generation
        comms_agent.py         # Prompts for communication drafting
        insights.py            # Prompts for population insights
      schemas/
        pathway_output.py      # Pydantic models for LLM pathway output
        care_summary_output.py
        comms_output.py
    
    config.py                  # Settings from env (pydantic-settings)
```

### 5.2 Router Registry

```python
# app/main.py — all routers registered from a single list

from app.routers import auth, patients, pathways, cohortisation, communications, outcomes, ai

ROUTER_REGISTRY = [
    (auth.router,            "/api/auth",            ["Auth"]),
    (patients.router,        "/api/patients",         ["Patients"]),
    (pathways.router,        "/api/pathways",         ["Pathways"]),
    (cohortisation.router,   "/api/cohortisation",    ["Cohortisation"]),
    (communications.router,  "/api/communications",   ["Communications"]),
    (outcomes.router,        "/api/outcomes",          ["Outcomes"]),
    (ai.router,              "/api/ai",               ["AI"]),
]

for router, prefix, tags in ROUTER_REGISTRY:
    app.include_router(router, prefix=prefix, tags=tags)
```

### 5.3 API Endpoints Registry

```
# Auth
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me

# Patients
GET    /api/patients                     # Paginated list with filters
GET    /api/patients/:id                 # Full patient detail
GET    /api/patients/:id/labs            # Lab history
GET    /api/patients/:id/medications     # Medication list with PDC
GET    /api/patients/:id/protocols       # Assigned care protocols
GET    /api/patients/:id/timeline        # Activity timeline
GET    /api/patients/:id/communications  # Message threads
POST   /api/patients/:id/actions         # Create care action

# Pathways
GET    /api/pathways                     # List all pathways
POST   /api/pathways                     # Create new pathway
GET    /api/pathways/:id                 # Get pathway with blocks
PATCH  /api/pathways/:id                 # Update pathway metadata
POST   /api/pathways/:id/publish         # Publish pathway (triggers rollout)
GET    /api/pathways/:id/blocks          # Get all blocks for pathway
POST   /api/pathways/:id/blocks          # Add block
PATCH  /api/pathways/:id/blocks/:blockId # Update block config
DELETE /api/pathways/:id/blocks/:blockId # Remove block

# Cohortisation
GET    /api/cohortisation/tiers          # Get tier definitions
PATCH  /api/cohortisation/tiers/:id      # Update tier config
GET    /api/cohortisation/crs-config     # Get CRS formula weights
PATCH  /api/cohortisation/crs-config     # Update CRS weights
GET    /api/cohortisation/assignments    # Paginated patient assignments
POST   /api/cohortisation/recalculate    # Trigger CRS recalculation

# Communications
GET    /api/communications/threads       # Message threads (paginated)
GET    /api/communications/threads/:id   # Single thread with messages
POST   /api/communications/send          # Send message (manual or template)
GET    /api/communications/orchestration # Active concierge sequences
GET    /api/communications/templates     # Template registry
POST   /api/communications/templates     # Create template
PATCH  /api/communications/templates/:id # Update template

# Outcomes
GET    /api/outcomes/clinical            # Clinical outcome metrics
GET    /api/outcomes/hedis               # HEDIS measure performance
GET    /api/outcomes/engagement          # Engagement metrics
GET    /api/outcomes/financial           # Financial / ROI metrics
GET    /api/outcomes/recohortisation     # Pending tier changes
POST   /api/outcomes/recohortisation/:id/approve  # Approve tier change
POST   /api/outcomes/recohortisation/:id/reject   # Reject tier change

# AI
POST   /api/ai/care-summary             # Generate patient care summary
POST   /api/ai/pathway-generate         # Generate pathway from NLP
POST   /api/ai/comms-draft              # Draft outreach message
POST   /api/ai/population-insights      # Generate population insights
POST   /api/ai/comms-rewrite            # Rewrite message (improve tone)
```

---

## 6. Database Model

### 6.1 Multi-Tenant Foundation

Follows the AI Evals Platform pattern: `TenantUserMixin` on all user-scoped tables, application-level tenant filtering, JWT-based auth with `AuthContext`.

```python
# Core mixins (same pattern as ai-evals)
class TimestampMixin:
    created_at: DateTime(timezone=True), server_default=func.now()
    updated_at: DateTime(timezone=True), onupdate=func.now()

class TenantUserMixin:
    tenant_id: UUID, FK -> tenants.id, NOT NULL
    user_id: UUID, FK -> users.id, NOT NULL
```

### 6.2 Table Definitions

```
SYSTEM CONSTANTS:
  SYSTEM_TENANT_ID = 00000000-0000-0000-0000-000000000001
  SYSTEM_USER_ID   = 00000000-0000-0000-0000-000000000002

---

tenants
  id: UUID PK
  name: String(255)
  slug: String(100) UNIQUE
  is_active: Boolean DEFAULT true
  created_at, updated_at: TimestampMixin

tenant_configs
  id: UUID PK
  tenant_id: UUID FK -> tenants.id UNIQUE
  app_url: String(500) NULLABLE
  logo_url: String(500) NULLABLE
  primary_color: String(7) NULLABLE     # hex override
  allowed_domains: JSONB NULLABLE
  llm_provider: String(50) DEFAULT "gemini"   # "gemini" | "azure_openai"
  llm_config: JSONB NULLABLE            # provider-specific config (keys, endpoints)
  created_at, updated_at: TimestampMixin

---

users
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  email: String(255)
  password_hash: String(255)
  display_name: String(255)
  role_id: UUID FK -> roles.id
  is_active: Boolean DEFAULT true
  created_at, updated_at: TimestampMixin
  UNIQUE(tenant_id, email)

roles
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  name: String(100)
  description: String(500)
  is_system: Boolean DEFAULT false
  permissions: JSONB                     # list of permission strings
  created_at, updated_at: TimestampMixin
  UNIQUE(tenant_id, name)

refresh_tokens
  id: UUID PK
  user_id: UUID FK -> users.id
  token_hash: String(255)
  expires_at: DateTime
  created_at: DateTime

---

patients
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  empi_id: String(50)                   # external medical record ID
  first_name: String(100)
  last_name: String(100)
  date_of_birth: Date
  gender: String(20)
  email: String(255) NULLABLE
  phone: String(20) NULLABLE
  cpf: String(14) NULLABLE              # Brazilian tax ID (masked)
  address: JSONB NULLABLE               # {street, city, state, pincode}
  insurance_plan: String(100) NULLABLE
  pcp_name: String(100) NULLABLE
  pcp_id: UUID NULLABLE
  preferred_language: String(10) DEFAULT "pt"
  preferred_channel: String(20) DEFAULT "whatsapp"
  preferred_contact_time: String(20) NULLABLE  # "morning" | "afternoon" | "evening"
  allergies: JSONB NULLABLE              # list of allergy strings
  active_medications: JSONB NULLABLE     # list of {name, dose, frequency}
  sdoh_flags: JSONB NULLABLE             # {food: bool, housing: bool, literacy: int, ...}
  is_active: Boolean DEFAULT true
  created_at, updated_at: TimestampMixin
  UNIQUE(tenant_id, empi_id)

patient_labs
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  patient_id: UUID FK -> patients.id
  test_type: String(50)                  # "hba1c", "fpg", "egfr", "uacr", "ldl", "bp_sys", "bp_dia", "bmi"
  value: Float
  unit: String(20)
  source_system: String(50) NULLABLE
  recorded_at: DateTime
  created_at: TimestampMixin
  INDEX(tenant_id, patient_id, test_type, recorded_at)

patient_medications
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  patient_id: UUID FK -> patients.id
  drug_name: String(200)
  drug_class: String(100)                # "metformin", "glp1ra", "sglt2i", "insulin", "statin", "ace_arb"
  dose: String(50)
  frequency: String(50)
  pdc_90day: Float NULLABLE              # 0.0 - 1.0
  last_fill_date: Date NULLABLE
  is_active: Boolean DEFAULT true
  created_at, updated_at: TimestampMixin

patient_diagnoses
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  patient_id: UUID FK -> patients.id
  icd10_code: String(10)
  description: String(500)
  diagnosed_at: Date NULLABLE
  is_active: Boolean DEFAULT true
  created_at: TimestampMixin

---

cohort_tiers
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  tier_number: Integer                   # 0-4
  name: String(100)                      # "Prevention Program"
  label: String(50)                      # "Tier 0"
  description: Text NULLABLE
  color: String(7)                       # hex color for this tier
  review_cadence: String(20)             # "annual", "6mo", "quarterly", "monthly", "weekly"
  criteria: JSONB                        # structured criteria per tier (from doc)
  is_active: Boolean DEFAULT true
  created_at, updated_at: TimestampMixin
  UNIQUE(tenant_id, tier_number)

crs_configs
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  components: JSONB                      # [{name, weight, scoring_table, cap}]
  tier_thresholds: JSONB                 # [{min_score, max_score, tier_number, prerequisites}]
  tiebreaker_rules: JSONB               # ordered list of override rules
  is_active: Boolean DEFAULT true
  created_at, updated_at: TimestampMixin

cohort_assignments
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  patient_id: UUID FK -> patients.id
  tier_id: UUID FK -> cohort_tiers.id
  crs_score: Integer                     # 0-100
  crs_breakdown: JSONB                   # {glycaemic: 24.5, complication: 8.75, ...}
  assignment_type: String(20)            # "auto" | "manual" | "override"
  assigned_by: UUID FK -> users.id NULLABLE
  reason: Text NULLABLE
  previous_tier_id: UUID NULLABLE
  is_current: Boolean DEFAULT true
  assigned_at: DateTime
  review_due_at: DateTime NULLABLE
  created_at: TimestampMixin
  INDEX(tenant_id, patient_id, is_current)

---

pathways
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  created_by: UUID FK -> users.id
  name: String(200)
  description: Text NULLABLE
  condition: String(100) NULLABLE        # "diabetes", "hypertension", etc. (nullable = generic)
  target_tiers: JSONB                    # [0, 1, 2, 3, 4] — which tiers this pathway applies to
  status: String(20)                     # "draft" | "review" | "published" | "archived"
  version: Integer DEFAULT 1
  published_at: DateTime NULLABLE
  published_by: UUID NULLABLE
  created_at, updated_at: TimestampMixin

pathway_blocks
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  pathway_id: UUID FK -> pathways.id
  block_type: String(50)                 # from block type registry (see 6.3)
  category: String(20)                   # "eligibility" | "action" | "logic" | "escalation" | "schedule"
  label: String(200)                     # display name
  config: JSONB NOT NULL                 # block-specific configuration (see 6.3)
  position: JSONB                        # {x, y} for canvas placement
  order_index: Integer DEFAULT 0         # sequential order
  created_at, updated_at: TimestampMixin
  INDEX(tenant_id, pathway_id)

pathway_edges
  id: UUID PK
  pathway_id: UUID FK -> pathways.id
  source_block_id: UUID FK -> pathway_blocks.id
  target_block_id: UUID FK -> pathway_blocks.id
  edge_type: String(20)                  # "default" | "true_branch" | "false_branch"
  label: String(100) NULLABLE
  created_at: TimestampMixin

---

care_protocols
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  patient_id: UUID FK -> patients.id
  pathway_id: UUID FK -> pathways.id
  assigned_by: UUID FK -> users.id
  status: String(20)                     # "active" | "completed" | "paused" | "cancelled"
  started_at: DateTime
  completed_at: DateTime NULLABLE
  created_at, updated_at: TimestampMixin

protocol_steps
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  protocol_id: UUID FK -> care_protocols.id
  pathway_block_id: UUID FK -> pathway_blocks.id NULLABLE
  name: String(200)
  description: Text NULLABLE
  status: String(20)                     # "pending" | "in_progress" | "completed" | "overdue" | "skipped"
  order_index: Integer
  due_at: DateTime NULLABLE
  completed_at: DateTime NULLABLE
  completed_by: UUID NULLABLE
  task_count: Integer DEFAULT 0
  tasks_completed: Integer DEFAULT 0
  created_at, updated_at: TimestampMixin

protocol_tasks
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  step_id: UUID FK -> protocol_steps.id
  title: String(500)
  is_completed: Boolean DEFAULT false
  completed_at: DateTime NULLABLE
  completed_by: UUID NULLABLE
  created_at: TimestampMixin

---

concierge_actions
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  patient_id: UUID FK -> patients.id
  pathway_block_id: UUID FK -> pathway_blocks.id NULLABLE
  triggered_by: String(20)               # "auto" | "manual"
  channel: String(20)                    # "whatsapp" | "sms" | "call" | "app_push" | "system"
  action_type: String(30)               # enum (see below)
  status: String(20)                     # "pending" | "success" | "failed"
  template_id: UUID NULLABLE
  payload: JSONB NULLABLE                # request payload
  response: JSONB NULLABLE               # provider response
  error: Text NULLABLE
  created_at: DateTime
  completed_at: DateTime NULLABLE
  INDEX(tenant_id, patient_id, created_at)

  -- action_type enum values:
  -- wa_dispatched, wa_delivered, wa_read, wa_replied, wa_declined, wa_failed
  -- sms_dispatched, sms_delivered, sms_replied, sms_failed
  -- call_scheduled, call_answered, call_rnr, call_failed
  -- escalation_triggered, handoff_completed
  -- NO UPDATE — append-only log

message_templates
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  name: String(200)
  slug: String(100)                      # unique identifier
  category: String(50)                   # "lab_reminder" | "medication" | "appointment" | "followup" | "custom"
  channel: String(20)                    # "whatsapp" | "sms" | "app_push"
  language: String(10)                   # "pt" | "en" | "es"
  content: Text                          # with {{variable}} placeholders
  variable_map: JSONB                    # maps placeholders -> patient/pathway fields
  tier_applicability: JSONB NULLABLE     # [0,1,2,3,4] or null = all
  is_active: Boolean DEFAULT true
  created_at, updated_at: TimestampMixin
  UNIQUE(tenant_id, slug, language)

---

outcome_metrics
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  metric_key: String(100)               # "hba1c_control_rate", "hospitalisation_rate", etc.
  category: String(30)                   # "clinical" | "hedis" | "engagement" | "financial"
  label: String(200)
  value: Float
  unit: String(30)                       # "percent" | "per_1k_mm" | "count" | "currency"
  tier_filter: Integer NULLABLE          # null = all tiers
  period_start: Date
  period_end: Date
  baseline_value: Float NULLABLE
  target_value: Float NULLABLE
  created_at: TimestampMixin
  INDEX(tenant_id, metric_key, period_start)

recohortisation_events
  id: UUID PK
  tenant_id: UUID FK -> tenants.id
  patient_id: UUID FK -> patients.id
  trigger_type: String(30)               # "auto_uptier" | "auto_downtier" | "manual_override"
  trigger_reason: Text
  from_tier: Integer
  to_tier: Integer
  crs_before: Integer
  crs_after: Integer
  status: String(20)                     # "pending" | "approved" | "rejected"
  reviewed_by: UUID FK -> users.id NULLABLE
  reviewed_at: DateTime NULLABLE
  created_at: TimestampMixin
```

### 6.3 Pathway Block Type Registry & Config Schemas

Each block type has a defined config schema. The LLM output schema mirrors these exactly.

```python
# Block type registry — single source of truth
BLOCK_TYPE_REGISTRY = {
    # Eligibility
    "eligibility_diagnosis": {
        "category": "eligibility",
        "label": "Diagnosis Code",
        "description": "ICD-10 code match/exclude",
        "config_schema": {
            "icd10_codes": ["str"],           # list of codes
            "match_type": "exact | prefix",
            "include": "bool",                # true = include, false = exclude
            "routing_destination": "str | null",
        }
    },
    "eligibility_lab": {
        "category": "eligibility",
        "label": "Lab Threshold",
        "config_schema": {
            "test_type": "str",               # hba1c, fpg, egfr, uacr, ldl, etc.
            "operator": "gte | lte | gt | lt | eq | between",
            "value": "float",
            "value_upper": "float | null",     # for "between" operator
            "unit": "str",
            "source_system": "str | null",
            "refresh_frequency": "str",        # quarterly, monthly, etc.
            "completeness": "required | preferred | supplementary",
            "clinical_use": "str | null",
            "missing_data_rule": {
                "action": "block | substitute | provisional | trigger_outreach",
                "substitute_field": "str | null",
                "outreach_deadline_days": "int | null",
            },
            "threshold_alerts": [{
                "condition": "str",            # "> 10.0%"
                "action": "str",               # "uptier_4"
            }],
        }
    },
    "eligibility_pharmacy": {
        "category": "eligibility",
        "label": "Pharmacy Criteria",
        "config_schema": {
            "drug_class": "str",
            "pdc_threshold": "float",
            "pdc_operator": "gte | lte",
            "active_rx_required": "bool",
            "lookback_days": "int",
        }
    },
    "eligibility_utilisation": {
        "category": "eligibility",
        "label": "Utilisation Event",
        "config_schema": {
            "event_type": "er_visit | hospitalisation | dka",
            "icd10_codes": ["str"] | null,
            "revenue_codes": ["str"] | null,
            "lookback_months": "int",
            "count_threshold": "int",
        }
    },
    "eligibility_demographics": {
        "category": "eligibility",
        "label": "Demographics",
        "config_schema": {
            "age_min": "int | null",
            "age_max": "int | null",
            "bmi_threshold": "float | null",
            "bmi_operator": "gte | lte",
            "bmi_ethnicity_adjusted": "bool",
            "gender": "str | null",
            "min_enrollment_months": "int | null",
        }
    },
    "eligibility_sdoh": {
        "category": "eligibility",
        "label": "SDOH Flag",
        "config_schema": {
            "domain": "food | housing | literacy | transport | financial | isolation",
            "assessment_tool": "str",
            "threshold": "str",
            "high_risk_definition": "str",
        }
    },
    "eligibility_pro": {
        "category": "eligibility",
        "label": "PRO Score",
        "config_schema": {
            "instrument": "phq9 | dds | sed9 | mmas",
            "threshold": "float",
            "operator": "gte | lte",
            "action_on_breach": "str",
            "frequency": "str",
        }
    },
    "eligibility_exclusion": {
        "category": "eligibility",
        "label": "Exclusion Rule",
        "config_schema": {
            "icd10_codes": ["str"],
            "rationale": "str",
            "routing_destination": "str | null",
        }
    },

    # Actions
    "action_outreach": {
        "category": "action",
        "label": "Outreach",
        "config_schema": {
            "sequence_steps": [{
                "step_number": "int",
                "channel": "whatsapp | sms | call | app_push",
                "language": "patient_pref | str",
                "template_slug": "str",
                "ai_personalisation": "bool",
                "wait_timeout_hours": "int",
                "on_reply": "ai_process | close | route_to_human",
            }],
            "escalation": {
                "action": "assign_care_manager | schedule_rn_call | voice_call_ai | flag_command_center",
                "create_action_item": "bool",
                "notify_assigned": "bool",
            },
            "safety_keywords": [{
                "keywords": ["str"],
                "action": "immediate_rn_flag | route_pharmacist | confirm_close",
                "label": "str",
            }],
            "global_settings": {
                "max_attempts": "int",
                "cooldown_hours": "int",
                "quiet_hours_start": "str",    # "21:00"
                "quiet_hours_end": "str",      # "08:00"
                "use_patient_preferred_time": "bool",
            },
        }
    },
    "action_lab_order": {
        "category": "action",
        "label": "Lab Order",
        "config_schema": {
            "test_type": "str",
            "frequency": "str",
            "threshold_trigger": "float | null",
            "notification_target": "str",      # role
            "hedis_measure_link": "str | null",
        }
    },
    "action_referral": {
        "category": "action",
        "label": "Referral",
        "config_schema": {
            "specialty": "str",
            "urgency": "standard | warm | urgent",
            "prerequisite_data": ["str"],       # list of data to include
            "trigger_criteria": "str | null",
        }
    },
    "action_medication": {
        "category": "action",
        "label": "Medication Protocol",
        "config_schema": {
            "drug_class": "str",
            "drug_name": "str | null",
            "initiation_criteria": "str",
            "starting_dose": "str",
            "titration_rule": "str | null",
            "contraindication_gates": [{
                "field": "str",
                "operator": "str",
                "value": "float",
                "action": "str",
            }],
            "deprescribing_criteria": "str | null",
        }
    },
    "action_assessment": {
        "category": "action",
        "label": "Assessment",
        "config_schema": {
            "instrument": "str",
            "frequency": "str",
            "action_threshold": "float",
            "referral_target": "str | null",
        }
    },
    "action_care_team": {
        "category": "action",
        "label": "Care Team Assignment",
        "config_schema": {
            "role": "str",
            "type": "human | ai | automated",
            "cadence": "str",
            "function_description": "str",
            "escalation_chain_order": "int",
        }
    },

    # Logic
    "logic_conditional": {
        "category": "logic",
        "label": "Conditional Gate",
        "config_schema": {
            "field": "str",                    # data field to evaluate
            "operator": "gte | lte | gt | lt | eq | neq",
            "value": "float | str | bool",
            "true_branch_label": "str",
            "false_branch_label": "str",
        }
    },
    "logic_wait": {
        "category": "logic",
        "label": "Wait / Timer",
        "config_schema": {
            "duration_days": "int",
            "deadline_type": "fixed | relative",
            "reassess_action": "str | null",
            "timeout_escalation": "str | null",
        }
    },
    "logic_missing_data": {
        "category": "logic",
        "label": "Missing Data Rule",
        "config_schema": {
            "field": "str",
            "hold_actions": ["str"],
            "substitute_field": "str | null",
            "collection_trigger": "str",
            "deadline_days": "int",
            "chw_escalation": "bool",
        }
    },
    "logic_composite_score": {
        "category": "logic",
        "label": "Composite Score",
        "config_schema": {
            "components": [{
                "name": "str",
                "weight": "float",
                "scoring_table": [{"criterion": "str", "points": "int"}],
                "cap": "int",
            }],
            "tier_thresholds": [{
                "min_score": "int",
                "max_score": "int",
                "tier_number": "int",
                "prerequisites": "str | null",
            }],
        }
    },

    # Escalation
    "escalation_uptier": {
        "category": "escalation",
        "label": "Up-Tier Trigger",
        "config_schema": {
            "trigger_criteria": [{
                "field": "str",
                "operator": "str",
                "value": "float | str",
                "lookback_days": "int | null",
            }],
            "target_tier": "int | null",       # null = promote one tier
            "timing": "str",                    # "same_day", "within_48h", etc.
            "notification_targets": ["str"],
            "care_plan_update": "bool",
        }
    },
    "escalation_downtier": {
        "category": "escalation",
        "label": "Down-Tier Gate",
        "config_schema": {
            "all_criteria": [{
                "field": "str",
                "operator": "str",
                "value": "float | str",
                "sustained_periods": "int",
            }],
            "observation_window_days": "int",
            "clinician_confirmation_required": "bool",
        }
    },
    "escalation_external": {
        "category": "escalation",
        "label": "External Escalation",
        "config_schema": {
            "triggers": [{
                "condition": "str",
                "severity": "critical | urgent",
            }],
            "action_sequence": ["str"],
            "data_packet_fields": ["str"],
            "emergency_protocol": "bool",
        }
    },
    "escalation_override": {
        "category": "escalation",
        "label": "Manual Override",
        "config_schema": {
            "initiator_roles": ["str"],
            "required_documentation_min_words": "int",
            "approval_role": "str",
            "time_limit_days": "int | null",
            "audit_log": "bool",
        }
    },

    # Schedules
    "schedule_recurring": {
        "category": "schedule",
        "label": "Recurring Review",
        "config_schema": {
            "cadence": "weekly | biweekly | monthly | quarterly | biannual | annual",
            "touchpoint_type": "str",
            "role": "str",
            "channel": "str",
            "tier_overrides": [{"tier": "int", "cadence": "str"}] | null,
        }
    },
    "schedule_template": {
        "category": "schedule",
        "label": "Message Template",
        "config_schema": {
            "channel": "str",
            "language": "str",
            "content": "str",
            "variables": ["str"],
            "cadence": "str",
            "ai_rewrite_enabled": "bool",
        }
    },
}
```

---

## 7. LLM Abstraction Layer

### 7.1 Base Provider

```python
# app/llm/base.py

from abc import ABC, abstractmethod
from pydantic import BaseModel

class LLMMessage(BaseModel):
    role: str        # "system" | "user" | "assistant"
    content: str

class LLMResponse(BaseModel):
    content: str
    model: str
    usage: dict      # {prompt_tokens, completion_tokens, total_tokens}

class LLMStructuredResponse(BaseModel):
    data: dict       # parsed structured output
    raw_content: str
    model: str
    usage: dict

class BaseLLMProvider(ABC):
    @abstractmethod
    async def chat(self, messages: list[LLMMessage], **kwargs) -> LLMResponse: ...

    @abstractmethod
    async def structured_output(
        self,
        messages: list[LLMMessage],
        output_schema: type[BaseModel],
        **kwargs
    ) -> LLMStructuredResponse: ...
```

### 7.2 Adapters

```python
# app/llm/gemini_adapter.py
class GeminiAdapter(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"): ...

# app/llm/azure_openai_adapter.py
class AzureOpenAIAdapter(BaseLLMProvider):
    def __init__(self, api_key: str, endpoint: str, deployment: str, api_version: str): ...
```

### 7.3 Provider Registry

```python
# app/llm/registry.py

class LLMProviderRegistry:
    _providers: dict[str, type[BaseLLMProvider]] = {
        "gemini": GeminiAdapter,
        "azure_openai": AzureOpenAIAdapter,
    }

    @classmethod
    def get_provider(cls, tenant_config: TenantConfig) -> BaseLLMProvider:
        provider_cls = cls._providers[tenant_config.llm_provider]
        return provider_cls(**tenant_config.llm_config)
```

Provider is resolved per-request from tenant config. No global singleton.

### 7.4 LLM Output Schemas for Pathway Builder

The LLM's structured output schema maps canonically to `pathway_blocks.config`. When the AI Builder generates a pathway, its output is a list of blocks with configs that can be directly inserted into the database.

```python
# app/llm/schemas/pathway_output.py

class PathwayBlockOutput(BaseModel):
    block_type: str                       # must be a key in BLOCK_TYPE_REGISTRY
    category: str
    label: str
    config: dict                          # matches the config_schema for that block_type
    order_index: int

class PathwayEdgeOutput(BaseModel):
    source_index: int                     # order_index of source block
    target_index: int                     # order_index of target block
    edge_type: str                        # "default" | "true_branch" | "false_branch"
    label: str | None = None

class PathwayGenerationOutput(BaseModel):
    name: str
    description: str
    condition: str | None
    target_tiers: list[int]
    blocks: list[PathwayBlockOutput]
    edges: list[PathwayEdgeOutput]
    clarification_question: str | None    # AI asks one follow-up if ambiguous

class PathwayBuilderResponse(BaseModel):
    """Top-level response from LLM pathway generation"""
    pathway: PathwayGenerationOutput | None  # null if only asking clarification
    message: str                             # conversational response text
    is_complete: bool                        # true if pathway is ready for review
```

### 7.5 Prompt Structure for Pathway Builder

```python
# app/llm/prompts/pathway_builder.py

SYSTEM_PROMPT = """You are a clinical care pathway designer for a healthcare
management platform. You create structured care pathways from natural language
descriptions.

IMPORTANT: Your output must conform exactly to the PathwayBuilderResponse schema.
Each block's `config` must match the config_schema for its `block_type` as defined
in the block type registry below:

{block_type_registry_json}

Rules:
1. Every pathway must have at least one eligibility block and one action block.
2. Use conditional gates (logic_conditional) for branching logic.
3. Always include escalation triggers for safety.
4. If the user's description is ambiguous, set is_complete=false and ask ONE
   clarification question in the message field. Do not guess.
5. Use specific ICD-10 codes, drug names, lab thresholds from clinical guidelines.
6. Outreach blocks must include a complete concierge sequence with escalation.
7. All labels and descriptions should be clinically precise.
"""
```

The `{block_type_registry_json}` is dynamically injected from `BLOCK_TYPE_REGISTRY` — so the LLM always has the current schema definition. If we add a new block type, the LLM automatically knows about it.

### 7.6 Care Summary Prompt

```python
# app/llm/prompts/care_summary.py

SYSTEM_PROMPT = """You are a clinical care summarisation engine for a care
management platform. Generate concise, actionable care summaries for care managers.

Input: Patient demographics, diagnoses, labs, medications, PDC, care gaps,
tier assignment, CRS score, recent events.

Output format (CareSummaryOutput schema):
- narrative: 3-5 sentence clinical summary. Bold key findings. Include:
  - Current risk tier and CRS trajectory
  - Most concerning lab values with dates
  - Adherence status with probable root cause
  - Open care gaps with overdue duration
  - Recommended next actions with clinical reasoning

- action_chips: list of {label, action_type, priority, reasoning}
  action_type must be one of: schedule_referral, order_lab, assign_pharmacist,
  draft_pcp_message, approve_tier_change, send_outreach

- crs_drivers: list of {component, score, trend, concern}
  Identify which CRS components are driving the score up.

Rules:
1. Never fabricate lab values or dates. Use only provided data.
2. Always cite the clinical basis for recommendations (e.g., "eGFR 52 qualifies for SGLT2i").
3. Prioritise action chips by clinical urgency (overdue HEDIS gaps first).
4. Flag safety concerns (PHQ-9, DKA risk, severe hypo) prominently.
5. Use the patient's preferred language for any patient-facing text.
"""
```

---

## 8. Data Seeding

### 8.1 Seed Strategy

On first startup, seed:
1. System tenant + system user (non-login, owns defaults)
2. Default tenant ("Bradesco Saude") + admin user
3. Roles: Owner (system), Care Manager, Program Architect, Pharmacist, Viewer
4. Cohort tiers (0-4) with criteria from diabetes care pathway document
5. CRS config with the 5-component weighted formula from the document
6. 500 synthetic patients with realistic Brazilian names, CPFs, addresses
7. Lab history (6-24 months per patient), medications, diagnoses
8. CRS scores calculated and tier assignments made
9. One published diabetes pathway (Tier 3) with all block types populated
10. Message templates in Portuguese (lab reminders, medication, appointment, followup)
11. Outcome metrics with baseline values
12. Sample concierge action log (10-20 orchestration sequences in various states)
13. Care protocols for ~50 patients (various completion states)

### 8.2 Seed Data Quality

- Brazilian first/last names from a realistic name corpus
- Cities: Sao Paulo, Rio, Belo Horizonte, Curitiba, Salvador, Brasilia, Porto Alegre
- Phone numbers: +55 DDD format
- CPF: valid format (masked for display)
- Lab values: clinically realistic distributions per tier (Tier 4 patients have HbA1c > 10, etc.)
- PDC values: correlated with tier (Tier 0-1 high adherence, Tier 3-4 lower)
- All seed data is idempotent (check before insert)

---

## 9. Screen Specifications

### 9.1 Command Center

**Route:** `/dashboard`
**Store:** `command-center-store.ts`

Layout:
- Top: 5 KPI cards (Total Members, Avg CRS, HbA1c <7% Rate, Open Care Gaps, PDC >=80%)
- Left column: AI Action Queue (list of AI-generated patient alerts with action chips) + Tier Distribution bar chart
- Right column: AI Insights Panel (LLM daily digest) + Upcoming Reviews (tier-based schedule) + AI Comms Agent summary

Data sources:
- KPIs: `GET /api/outcomes/clinical` + `GET /api/outcomes/engagement`
- Action Queue: `GET /api/ai/action-queue` (AI-generated, backed by re-cohortisation events + care gap analysis)
- AI Insights: `POST /api/ai/population-insights` (cached daily)
- Upcoming Reviews: derived from `cohort_assignments.review_due_at`
- Comms summary: `GET /api/communications/orchestration` (aggregated stats)

### 9.2 Patient Registry

**Route:** `/dashboard/patients`
**Store:** `patients-store.ts`

Layout:
- Search bar (EMPI, name, phone — partial match)
- Filter dropdowns (tier, pathway, status, care team, source)
- Data table with columns: Name, EMPI, Tier, CRS, Pathway, PDC, Care Gaps, Last Contact, Status
- Pagination (50 per page)
- Click row -> navigate to patient detail

### 9.3 Patient Detail

**Route:** `/dashboard/patients/:id`
**Store:** `patients-store.ts` (selectedPatient)

Layout:
- Dense header strip: Avatar + Name + Age/Gender + EMPI + Condition tags + PCP + Active Rx + Action buttons
- KPI strip: CRS (with delta), Care Gaps (with list), Last Contact, Pathway Status, Key PDC, Assignee + Review Due
- Horizontal tabs: Care Protocols, Clinical Data, Timeline, Communications, Risk & CRS, Claims, Documents
- Care Protocols tab (default): AI Summary card (contextual) + Protocol step accordion cards

### 9.4 Pathway Builder

**Route:** `/dashboard/pathways` (list) and `/dashboard/pathways/:id` (editor)
**Store:** `pathway-builder-store.ts`

Layout:
- Top bar: Pathway name + status badge + Preview / Save Draft / Publish buttons
- Mode switcher tabs: AI Builder, Visual Canvas, Configuration
- AI Builder: Chat panel (left) + Live preview flow diagram (right)
- Visual Canvas: Component library (left) + React Flow canvas (center) + Config drawer (right, on block select)
- Component library: 6 categories (Eligibility, Actions, Logic, Escalation, Schedules) with all 22 block types

### 9.5 Communications

**Route:** `/dashboard/communications`
**Store:** `communications-store.ts`

Layout:
- Sub-tabs: Threads, AI Orchestration
- Threads: Thread list (left) + Message thread (center) + Patient context panel (right)
- AI Orchestration: Stats strip + Filter bar + Orchestration table (patient, tier, pathway step, channel, attempt, state, last activity)
- Compose area: Template chips + text input + AI Rewrite button + channel/language selector

### 9.6 Outcomes

**Route:** `/dashboard/outcomes`
**Store:** `outcomes-store.ts`

Layout:
- Filter bar: Condition, Tier, Period, Care Team
- Sub-tabs: Clinical Outcomes, HEDIS Measures, Engagement, Financial/ROI, Re-Cohortisation
- Clinical Outcomes: 4 KPI cards + Primary outcomes table (baseline -> 90d -> current -> target -> status) + Cohort migration summary + AI quarterly insight
- Re-Cohortisation: Pending tier changes table with approve/reject actions

### 9.7 Cohortisation Config

**Route:** `/dashboard/cohortisation`
**Store:** `cohortisation-store.ts`

Layout:
- Tier definitions: 5 cards (Tier 0-4) with criteria summary, review cadence, member count, edit button
- CRS formula: 5 component weight sliders (must sum to 100%) + scoring table per component
- Assignment overview: Current tier distribution chart + recent assignment log

---

## 10. Non-Functional Requirements

- **No hardcoded paths:** All routes from registry. All API endpoints from constants. All tier colors/labels from config.
- **No hardcoded names:** Entity labels, status text, and UI strings come from config objects or API responses.
- **No custom components:** Every UI element is a shadcn/ui component or a composition of them. Zero custom component creation.
- **No emojis:** Every icon is Lucide React. No unicode symbols, no emoji characters.
- **Responsive:** Works on desktop (1440px+), tablet (768px), and mobile (375px). Sidebar collapses, tables scroll, canvas hides on mobile.
- **Class composition:** All Tailwind classes composed via `cn()`. No template literal concatenation.
- **Type safety:** Full TypeScript strict mode. Pydantic on backend. Zod on frontend forms.
- **Multi-tenant isolation:** Every query filtered by `tenant_id` from `AuthContext`. No cross-tenant data leakage.
- **Stores:** Zustand, feature-scoped. Hydrate on mount. Reset on logout.

---

## 11. What Gets Destroyed

The entire current `bradesco-care-admin` codebase is deleted and rebuilt from scratch. Specifically:
- All current components in `/components` — replaced by feature-based structure
- All current pages in `/app` — rebuilt with new route structure
- All data generation in `/lib` — replaced by backend API + seed data
- Current `tailwind.config.ts` — replaced with new design token config
- Current `package.json` — rebuilt with correct dependencies
- No migration of existing code — clean start

The new app retains the package name `@tc/bradesco-care-admin` and its position in the monorepo.
