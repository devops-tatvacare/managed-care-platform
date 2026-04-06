# Phase 1: Foundation — Backend + Frontend Shell + Design System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Destroy the current app and rebuild the skeleton — backend (FastAPI + DB + auth + seed), frontend (Next.js + Tailwind + shadcn/ui + app shell with sidebar/topbar), and design system (tokens, shared components, route registry). At the end of this phase, a user can log in, see the app shell with sidebar navigation, and hit placeholder pages for each route.

**Architecture:** Next.js 15 frontend with Tailwind CSS 4 + shadcn/ui. FastAPI backend with SQLAlchemy 2 async + SQLite. JWT auth. Multi-tenant DB model following the ai-evals platform pattern (TenantUserMixin, TimestampMixin). Zustand for state. All routes, icons, tier colors, and API endpoints from config registries — zero hardcoded values in components.

**Tech Stack:** Next.js 15, TypeScript 5 strict, Tailwind CSS 4, shadcn/ui, Lucide React, Zustand, FastAPI, SQLAlchemy 2, Pydantic v2, JWT, SQLite

**Spec reference:** `docs/superpowers/specs/2026-04-07-bradesco-care-admin-redesign.md`

**Critical rules (apply to every task):**
- NO emojis anywhere — every icon is a Lucide React component
- NO custom UI components — only shadcn/ui compositions
- NO hardcoded paths, colors, labels — everything from config
- NO template literal class concatenation — always `cn()`
- NO `npm` or `yarn` — use `pnpm` only

---

## Phase Plan (7 phases total)

| Phase | Scope | Depends On |
|-------|-------|------------|
| **1 (this)** | Backend foundation + frontend shell + design system | — |
| 2 | Patients (registry + detail + AI summary) | Phase 1 |
| 3 | Pathway Builder (blocks, canvas, AI builder) | Phase 1 |
| 4 | Cohortisation engine (tiers, CRS, assignments) | Phase 1 |
| 5 | Communications (threads, AI concierge) | Phase 1 |
| 6 | Outcomes dashboard (metrics, HEDIS, ROI) | Phase 1 |
| 7 | Command Center (AI action queue, insights) | Phases 2-6 |

---

## File Map

### Files to DELETE (entire current codebase)

```
# Delete everything except docs/ and .gitignore
rm -rf app/ components/ hooks/ lib/ public/ scripts/ styles/ types/ utils/
rm -rf analysis/ design/ tatva-assets/
rm -f next.config.mjs tailwind.config.ts postcss.config.js tsconfig.json tsconfig.*.json
rm -f eslint.config.js .eslintrc.json index.html package.json pnpm-lock.yaml
```

### Files to CREATE — Backend

```
backend/
  requirements.txt
  app/
    __init__.py
    main.py                          # FastAPI app, CORS, startup, router registry
    config.py                        # pydantic-settings: env vars
    database.py                      # async engine, session, get_db
    
    models/
      __init__.py
      base.py                        # Base, TimestampMixin, TenantUserMixin
      tenant.py                      # Tenant, TenantConfig
      user.py                        # User, RefreshToken
      role.py                        # Role
      patient.py                     # Patient (stub for phase 1 seed)
    
    schemas/
      __init__.py
      auth.py                        # LoginRequest, TokenResponse, UserResponse
      common.py                      # PaginatedResponse, ErrorResponse
    
    routers/
      __init__.py
      auth.py                        # POST /login, /refresh, GET /me
    
    services/
      __init__.py
      auth_service.py                # authenticate, create_tokens, refresh
      seed_service.py                # seed_all: tenant, user, roles
    
    auth/
      __init__.py
      context.py                     # AuthContext dataclass
      dependencies.py                # get_auth dependency
      jwt.py                         # create/verify JWT
      permission_catalog.py          # permission strings
```

### Files to CREATE — Frontend

```
package.json
next.config.ts
tsconfig.json
postcss.config.mjs
tailwind.config.ts
components.json                      # shadcn/ui config

src/
  app/
    layout.tsx                       # Root layout (fonts, providers)
    globals.css                      # CSS custom properties (design tokens)
    (auth)/
      login/page.tsx                 # Login page
    dashboard/
      layout.tsx                     # App shell (sidebar + topbar)
      page.tsx                       # Command Center (placeholder)
      patients/page.tsx              # Placeholder
      communications/page.tsx        # Placeholder
      outcomes/page.tsx              # Placeholder
      cohortisation/page.tsx         # Placeholder
      pathways/page.tsx              # Placeholder
  
  components/
    ui/                              # shadcn/ui generated (Button, Badge, Card, etc.)
    layout/
      app-sidebar.tsx                # Sidebar navigation
      app-topbar.tsx                 # Top bar (search + notifications)
      app-shell.tsx                  # Shell wrapper
    shared/
      tier-badge.tsx                 # Tier badge component
      status-badge.tsx               # Generic status badge
      kpi-card.tsx                   # KPI metric card
      empty-state.tsx                # Empty state component
      page-header.tsx                # Page header with title + actions
  
  config/
    routes.ts                        # Route registry
    navigation.ts                    # Sidebar nav config (derived from routes)
    tiers.ts                         # Tier definitions (number, name, color, icon)
    api.ts                           # API base URL + endpoints registry
    icons.ts                         # Lucide icon registry
    status.ts                        # Status badge variant mappings
  
  stores/
    auth-store.ts                    # Auth state (token, user, login/logout)
  
  services/
    api/
      client.ts                      # Base fetch wrapper with auth
      auth.ts                        # Login, refresh, me
    types/
      auth.ts                        # User, LoginRequest, TokenResponse
      common.ts                      # Pagination, ApiError, etc.
  
  lib/
    cn.ts                            # clsx + tailwind-merge utility
    format.ts                        # Date, number, percentage formatters
```

---

## Task 1: Delete Current Codebase

**Files:**
- Delete: Everything in project root except `docs/`, `.gitignore`, `.superpowers/`

- [ ] **Step 1: Back up gitignore, delete everything, restore gitignore**

```bash
cd prototypes/bradesco-care-admin
cp .gitignore /tmp/bradesco-gitignore-backup
# Remove all app code
rm -rf app/ components/ hooks/ lib/ public/ scripts/ styles/ types/ utils/
rm -rf analysis/ design/ tatva-assets/
rm -f next.config.mjs tailwind.config.ts postcss.config.js postcss.config.mjs
rm -f tsconfig.json tsconfig.app.json tsconfig.node.json tsconfig.server.json
rm -f eslint.config.js .eslintrc.json index.html package.json pnpm-lock.yaml
rm -rf node_modules/ .next/
cp /tmp/bradesco-gitignore-backup .gitignore
```

- [ ] **Step 2: Verify only docs and gitignore remain**

```bash
ls -la
# Expected: .gitignore, docs/, .superpowers/ (brainstorm mockups)
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove entire legacy codebase for rebuild"
```

---

## Task 2: Scaffold Next.js Frontend

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/globals.css`
- Create: `src/lib/cn.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@tc/bradesco-care-admin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:backend": "cd backend && uvicorn app.main:app --reload --port 8000",
    "dev:all": "concurrently \"pnpm dev\" \"pnpm dev:backend\"",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.2.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0",
    "lucide-react": "^0.460.0",
    "recharts": "^2.15.0",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.24.0",
    "sonner": "^1.7.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0",
    "geist": "^1.3.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "concurrently": "^9.0.0"
  }
}
```

- [ ] **Step 2: Create next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create postcss.config.mjs**

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 5: Create src/lib/cn.ts**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: Create src/app/globals.css with design tokens**

```css
@import "tailwindcss";

@theme {
  /* Brand */
  --color-brand-primary: #4f46e5;
  --color-brand-primary-light: #eef2ff;
  --color-brand-primary-hover: #4338ca;

  /* Neutral */
  --color-text-primary: #0f172a;
  --color-text-secondary: #374151;
  --color-text-muted: #64748b;
  --color-text-placeholder: #94a3b8;
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-hover: #f1f5f9;
  --color-border-default: #e2e8f0;
  --color-border-subtle: #f1f5f9;

  /* Status */
  --color-status-success: #22c55e;
  --color-status-success-bg: #f0fdf4;
  --color-status-success-border: #bbf7d0;
  --color-status-warning: #f59e0b;
  --color-status-warning-bg: #fefce8;
  --color-status-warning-border: #fde68a;
  --color-status-error: #ef4444;
  --color-status-error-bg: #fef2f2;
  --color-status-error-border: #fecaca;
  --color-status-info: #0891b2;
  --color-status-info-bg: #f0f9ff;
  --color-status-info-border: #bae6fd;

  /* AI */
  --color-ai-primary: #4f46e5;
  --color-ai-border: #c7d2fe;

  /* Tier Colors */
  --color-tier-0: #86efac;
  --color-tier-1: #93c5fd;
  --color-tier-2: #fcd34d;
  --color-tier-3: #fdba74;
  --color-tier-4: #fca5a5;

  /* Sidebar */
  --color-sidebar-bg: #0a1628;
  --color-sidebar-text: #94a3b8;
  --color-sidebar-active-bg: #1e293b;
  --color-sidebar-active-text: #38bdf8;
  --color-sidebar-active-border: #38bdf8;
  --color-sidebar-divider: #1e293b;

  /* Typography */
  --font-sans: "Geist Sans", system-ui, sans-serif;
  --font-mono: "Geist Mono", monospace;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
}

@layer base {
  body {
    font-family: var(--font-sans);
    color: var(--color-text-primary);
    background-color: var(--color-bg-secondary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

- [ ] **Step 7: Create src/app/layout.tsx**

```tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "@/app/globals.css";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Tatva Care — Bradesco Saude",
  description: "AI-powered care management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" className={cn(GeistSans.variable, GeistMono.variable)}>
      <body className="min-h-screen bg-bg-secondary font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Install dependencies and verify dev server starts**

```bash
pnpm install
pnpm dev
# Expected: Next.js dev server on http://localhost:3000 — blank page, no errors
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 with Tailwind CSS 4 and design tokens"
```

---

## Task 3: Initialize shadcn/ui and Install Components

**Files:**
- Create: `components.json`
- Create: `src/components/ui/` (generated by shadcn CLI)

- [ ] **Step 1: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init
# When prompted:
# Style: New York
# Base color: Slate
# CSS variables: yes
# Alias: @/components
# Tailwind CSS config: use CSS variables
```

If the CLI doesn't work cleanly with Tailwind v4, create `components.json` manually:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/cn",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 2: Install required shadcn/ui components**

```bash
pnpm dlx shadcn@latest add button badge card separator scroll-area tabs \
  breadcrumb dropdown-menu input textarea select checkbox switch slider \
  tooltip dialog alert-dialog popover command table pagination accordion \
  collapsible avatar alert progress sheet drawer
```

- [ ] **Step 3: Verify components are generated**

```bash
ls src/components/ui/
# Expected: button.tsx, badge.tsx, card.tsx, tabs.tsx, etc.
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: install shadcn/ui components"
```

---

## Task 4: Config Registries (Routes, Icons, Tiers, API, Status)

**Files:**
- Create: `src/config/routes.ts`
- Create: `src/config/navigation.ts`
- Create: `src/config/icons.ts`
- Create: `src/config/tiers.ts`
- Create: `src/config/api.ts`
- Create: `src/config/status.ts`

- [ ] **Step 1: Create src/config/icons.ts**

```typescript
import {
  Zap,
  Users,
  MessageSquare,
  BarChart3,
  FlaskConical,
  Route,
  Bell,
  Search,
  Settings,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Circle,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Send,
  Mic,
  Phone,
  FileText,
  Heart,
  Shield,
  Receipt,
  Calendar,
  Plus,
  X,
  Filter,
  Download,
  RefreshCw,
  GitBranch,
  Pause,
  Play,
  LogOut,
  User,
  type LucideIcon,
} from "lucide-react";

export const Icons = {
  commandCenter: Zap,
  patients: Users,
  communications: MessageSquare,
  outcomes: BarChart3,
  cohortisation: FlaskConical,
  pathwayBuilder: Route,
  notifications: Bell,
  search: Search,
  settings: Settings,
  ai: Sparkles,
  uptier: ArrowUpRight,
  downtier: ArrowDownRight,
  warning: AlertTriangle,
  completed: CheckCircle2,
  pending: Clock,
  idle: Circle,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  more: MoreHorizontal,
  send: Send,
  mic: Mic,
  phone: Phone,
  documents: FileText,
  health: Heart,
  risk: Shield,
  claims: Receipt,
  calendar: Calendar,
  add: Plus,
  close: X,
  filter: Filter,
  download: Download,
  recurring: RefreshCw,
  conditional: GitBranch,
  paused: Pause,
  active: Play,
  logout: LogOut,
  user: User,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof Icons;
```

- [ ] **Step 2: Create src/config/routes.ts**

```typescript
import { type LucideIcon } from "lucide-react";
import { Icons } from "@/config/icons";

export interface RouteConfig {
  path: string;
  label: string;
  icon: LucideIcon;
  group: "primary" | "config";
  showInSidebar: boolean;
}

export const ROUTES = {
  login: {
    path: "/login",
    label: "Login",
    icon: Icons.user,
    group: "primary" as const,
    showInSidebar: false,
  },
  commandCenter: {
    path: "/dashboard",
    label: "Command Center",
    icon: Icons.commandCenter,
    group: "primary" as const,
    showInSidebar: true,
  },
  patients: {
    path: "/dashboard/patients",
    label: "Patients",
    icon: Icons.patients,
    group: "primary" as const,
    showInSidebar: true,
  },
  patientDetail: {
    path: "/dashboard/patients/[id]",
    label: "Patient Detail",
    icon: Icons.patients,
    group: "primary" as const,
    showInSidebar: false,
  },
  communications: {
    path: "/dashboard/communications",
    label: "Communications",
    icon: Icons.communications,
    group: "primary" as const,
    showInSidebar: true,
  },
  outcomes: {
    path: "/dashboard/outcomes",
    label: "Outcomes",
    icon: Icons.outcomes,
    group: "primary" as const,
    showInSidebar: true,
  },
  cohortisation: {
    path: "/dashboard/cohortisation",
    label: "Cohortisation",
    icon: Icons.cohortisation,
    group: "config" as const,
    showInSidebar: true,
  },
  pathways: {
    path: "/dashboard/pathways",
    label: "Pathway Builder",
    icon: Icons.pathwayBuilder,
    group: "config" as const,
    showInSidebar: true,
  },
  pathwayEditor: {
    path: "/dashboard/pathways/[id]",
    label: "Edit Pathway",
    icon: Icons.pathwayBuilder,
    group: "config" as const,
    showInSidebar: false,
  },
} as const;

export type RouteName = keyof typeof ROUTES;

export function getRoute(name: RouteName): RouteConfig {
  return ROUTES[name];
}

export function buildPath(name: RouteName, params?: Record<string, string>): string {
  let path = ROUTES[name].path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`[${key}]`, value);
    }
  }
  return path;
}
```

- [ ] **Step 3: Create src/config/navigation.ts**

```typescript
import { ROUTES, type RouteName } from "@/config/routes";

export interface NavItem {
  key: RouteName;
  path: string;
  label: string;
  icon: typeof ROUTES[RouteName]["icon"];
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

function buildNavItems(group: "primary" | "config"): NavItem[] {
  return Object.entries(ROUTES)
    .filter(([, config]) => config.group === group && config.showInSidebar)
    .map(([key, config]) => ({
      key: key as RouteName,
      path: config.path,
      label: config.label,
      icon: config.icon,
    }));
}

export const SIDEBAR_GROUPS: NavGroup[] = [
  { label: null, items: buildNavItems("primary") },
  { label: "Configuration", items: buildNavItems("config") },
];
```

- [ ] **Step 4: Create src/config/tiers.ts**

```typescript
export interface TierConfig {
  number: number;
  label: string;
  name: string;
  colorVar: string;
  reviewCadence: string;
}

export const TIERS: TierConfig[] = [
  { number: 0, label: "Tier 0", name: "Prevention Program",                colorVar: "var(--color-tier-0)", reviewCadence: "Annual" },
  { number: 1, label: "Tier 1", name: "Pre-Diabetes Reversal Program",     colorVar: "var(--color-tier-1)", reviewCadence: "Every 6 months" },
  { number: 2, label: "Tier 2", name: "Diabetes Wellness Program",         colorVar: "var(--color-tier-2)", reviewCadence: "Quarterly" },
  { number: 3, label: "Tier 3", name: "Advanced Diabetes Care Program",    colorVar: "var(--color-tier-3)", reviewCadence: "Monthly" },
  { number: 4, label: "Tier 4", name: "Comprehensive Diabetes Support",    colorVar: "var(--color-tier-4)", reviewCadence: "Weekly" },
];

export function getTier(number: number): TierConfig {
  const tier = TIERS.find((t) => t.number === number);
  if (!tier) throw new Error(`Unknown tier: ${number}`);
  return tier;
}
```

- [ ] **Step 5: Create src/config/api.ts**

```typescript
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    refresh: "/api/auth/refresh",
    me: "/api/auth/me",
  },
  patients: {
    list: "/api/patients",
    detail: (id: string) => `/api/patients/${id}`,
    labs: (id: string) => `/api/patients/${id}/labs`,
    medications: (id: string) => `/api/patients/${id}/medications`,
    protocols: (id: string) => `/api/patients/${id}/protocols`,
    timeline: (id: string) => `/api/patients/${id}/timeline`,
    communications: (id: string) => `/api/patients/${id}/communications`,
  },
  pathways: {
    list: "/api/pathways",
    detail: (id: string) => `/api/pathways/${id}`,
    publish: (id: string) => `/api/pathways/${id}/publish`,
    blocks: (id: string) => `/api/pathways/${id}/blocks`,
    block: (id: string, blockId: string) => `/api/pathways/${id}/blocks/${blockId}`,
  },
  cohortisation: {
    tiers: "/api/cohortisation/tiers",
    crsConfig: "/api/cohortisation/crs-config",
    assignments: "/api/cohortisation/assignments",
    recalculate: "/api/cohortisation/recalculate",
  },
  communications: {
    threads: "/api/communications/threads",
    thread: (id: string) => `/api/communications/threads/${id}`,
    send: "/api/communications/send",
    orchestration: "/api/communications/orchestration",
    templates: "/api/communications/templates",
  },
  outcomes: {
    clinical: "/api/outcomes/clinical",
    hedis: "/api/outcomes/hedis",
    engagement: "/api/outcomes/engagement",
    financial: "/api/outcomes/financial",
    recohortisation: "/api/outcomes/recohortisation",
  },
  ai: {
    careSummary: "/api/ai/care-summary",
    pathwayGenerate: "/api/ai/pathway-generate",
    commsDraft: "/api/ai/comms-draft",
    populationInsights: "/api/ai/population-insights",
    commsRewrite: "/api/ai/comms-rewrite",
  },
} as const;
```

- [ ] **Step 6: Create src/config/status.ts**

```typescript
export interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
}

export const TIER_BADGE_STYLES: Record<number, { className: string }> = {
  0: { className: "bg-tier-0/20 text-green-800 border-tier-0/40" },
  1: { className: "bg-tier-1/20 text-blue-800 border-tier-1/40" },
  2: { className: "bg-tier-2/20 text-yellow-800 border-tier-2/40" },
  3: { className: "bg-tier-3/20 text-orange-800 border-tier-3/40" },
  4: { className: "bg-tier-4/20 text-red-800 border-tier-4/40" },
};

export const PROTOCOL_STEP_STATUS: Record<string, StatusConfig> = {
  completed:   { label: "Completed",   variant: "default",     className: "bg-status-success-bg text-green-700 border-status-success-border" },
  in_progress: { label: "In Progress", variant: "default",     className: "bg-brand-primary-light text-brand-primary border-ai-border" },
  pending:     { label: "Pending",     variant: "secondary",   className: "bg-bg-hover text-text-muted border-border-default" },
  overdue:     { label: "Overdue",     variant: "destructive", className: "bg-status-error-bg text-red-700 border-status-error-border" },
};

export const CLINICAL_STATUS: Record<string, StatusConfig> = {
  on_track: { label: "On track", variant: "default",     className: "bg-status-warning-bg text-yellow-700 border-status-warning-border" },
  behind:   { label: "Behind",   variant: "destructive", className: "bg-status-error-bg text-red-700 border-status-error-border" },
  ahead:    { label: "Ahead",    variant: "default",     className: "bg-status-success-bg text-green-700 border-status-success-border" },
  at_risk:  { label: "At Risk",  variant: "destructive", className: "bg-status-error-bg text-red-700 border-status-error-border" },
};

export const ORCHESTRATION_STATUS: Record<string, StatusConfig> = {
  idle:         { label: "Idle",          variant: "secondary",   className: "bg-bg-hover text-text-muted border-border-default" },
  sent:         { label: "Sent",         variant: "default",     className: "bg-brand-primary-light text-brand-primary border-ai-border" },
  awaiting:     { label: "Awaiting",     variant: "default",     className: "bg-brand-primary-light text-brand-primary border-ai-border" },
  confirmed:    { label: "Confirmed",    variant: "default",     className: "bg-status-success-bg text-green-700 border-status-success-border" },
  needs_review: { label: "Needs Review", variant: "default",     className: "bg-status-warning-bg text-yellow-700 border-status-warning-border" },
  escalated:    { label: "Escalated",    variant: "destructive", className: "bg-status-error-bg text-red-700 border-status-error-border" },
  declined:     { label: "Declined",     variant: "secondary",   className: "bg-bg-hover text-text-muted border-border-default" },
};
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add config registries (routes, icons, tiers, API endpoints, status)"
```

---

## Task 5: Shared Components (TierBadge, StatusBadge, KpiCard, EmptyState, PageHeader)

**Files:**
- Create: `src/components/shared/tier-badge.tsx`
- Create: `src/components/shared/status-badge.tsx`
- Create: `src/components/shared/kpi-card.tsx`
- Create: `src/components/shared/empty-state.tsx`
- Create: `src/components/shared/page-header.tsx`

- [ ] **Step 1: Create src/components/shared/tier-badge.tsx**

```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { getTier } from "@/config/tiers";
import { TIER_BADGE_STYLES } from "@/config/status";

interface TierBadgeProps {
  tier: number;
  showName?: boolean;
  className?: string;
}

export function TierBadge({ tier, showName = false, className }: TierBadgeProps) {
  const config = getTier(tier);
  const style = TIER_BADGE_STYLES[tier];

  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold", style.className, className)}>
      {config.label}
      {showName && ` — ${config.name}`}
    </Badge>
  );
}
```

- [ ] **Step 2: Create src/components/shared/status-badge.tsx**

```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { type StatusConfig } from "@/config/status";

interface StatusBadgeProps {
  config: StatusConfig;
  className?: string;
}

export function StatusBadge({ config, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium", config.className, className)}>
      {config.label}
    </Badge>
  );
}
```

- [ ] **Step 3: Create src/components/shared/kpi-card.tsx**

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { ArrowUp, ArrowDown } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { direction: "up" | "down"; value: string; positive?: boolean };
  className?: string;
}

export function KpiCard({ label, value, subtitle, trend, className }: KpiCardProps) {
  const trendPositive = trend?.positive ?? trend?.direction === "up";
  const TrendIcon = trend?.direction === "up" ? ArrowUp : ArrowDown;

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
        {trend && (
          <p className={cn("mt-0.5 flex items-center gap-1 text-[11px]", trendPositive ? "text-status-success" : "text-status-error")}>
            <TrendIcon className="h-3 w-3" />
            {trend.value}
          </p>
        )}
        {subtitle && !trend && (
          <p className="mt-0.5 text-[11px] text-text-muted">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create src/components/shared/empty-state.tsx**

```tsx
import { cn } from "@/lib/cn";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <Icon className="h-10 w-10 text-text-placeholder" />
      <h3 className="mt-3 text-sm font-semibold text-text-primary">{title}</h3>
      {description && <p className="mt-1 text-xs text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 5: Create src/components/shared/page-header.tsx**

```tsx
import { cn } from "@/lib/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <h1 className="text-xl font-bold text-text-primary">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add shared components (TierBadge, StatusBadge, KpiCard, EmptyState, PageHeader)"
```

---

## Task 6: App Shell (Sidebar + Topbar + Layout)

**Files:**
- Create: `src/components/layout/app-sidebar.tsx`
- Create: `src/components/layout/app-topbar.tsx`
- Create: `src/components/layout/app-shell.tsx`
- Create: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Create src/components/layout/app-sidebar.tsx**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { SIDEBAR_GROUPS } from "@/config/navigation";
import { Icons } from "@/config/icons";
import { Separator } from "@/components/ui/separator";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[220px] flex-col bg-sidebar-bg text-sidebar-text">
      {/* Brand */}
      <div className="border-b border-sidebar-divider px-4 py-4">
        <p className="text-[15px] font-bold text-white">Tatva Care</p>
        <p className="text-[11px] text-text-placeholder">Bradesco Saude</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {SIDEBAR_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.label && (
              <>
                <Separator className="mx-4 my-3 bg-sidebar-divider" />
                <p className="px-4 pb-2 text-[10px] font-medium uppercase tracking-widest text-text-placeholder">
                  {group.label}
                </p>
              </>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.key}
                  href={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 text-[13px] transition-colors",
                    isActive
                      ? "border-l-[3px] border-sidebar-active-border bg-sidebar-active-bg font-semibold text-sidebar-active-text"
                      : "border-l-[3px] border-transparent hover:bg-sidebar-active-bg/50 hover:text-white"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-divider px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-active-bg text-[11px] font-semibold text-white">
            CM
          </div>
          <div>
            <p className="text-[12px] text-white">Care Manager</p>
            <p className="text-[10px] text-text-placeholder">admin@bradesco.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create src/components/layout/app-topbar.tsx**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/config/icons";

export function AppTopbar() {
  return (
    <header className="flex h-[52px] items-center justify-between border-b border-border-default bg-bg-primary px-6">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex w-[320px] items-center gap-2 rounded-lg bg-bg-secondary px-3 py-2 text-[13px] text-text-placeholder">
          <Icons.search className="h-4 w-4" />
          <span>Search patients, pathways, actions...</span>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Icons.notifications className="h-4 w-4 text-text-muted" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-error text-[9px] font-semibold text-white">
            7
          </span>
        </Button>
        <Button variant="ghost" size="icon">
          <Icons.settings className="h-4 w-4 text-text-muted" />
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create src/components/layout/app-shell.tsx**

```tsx
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto bg-bg-secondary p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create src/app/dashboard/layout.tsx**

```tsx
import { AppShell } from "@/components/layout/app-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 5: Create placeholder pages for each route**

Create `src/app/dashboard/page.tsx`:
```tsx
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export default function CommandCenterPage() {
  return (
    <div>
      <PageHeader title="Command Center" description="AI-driven population overview" />
      <EmptyState
        icon={Icons.commandCenter}
        title="Command Center"
        description="AI action queue, population KPIs, and insights will appear here."
        className="mt-8"
      />
    </div>
  );
}
```

Create `src/app/dashboard/patients/page.tsx`:
```tsx
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export default function PatientsPage() {
  return (
    <div>
      <PageHeader title="Patients" description="Patient registry and search" />
      <EmptyState icon={Icons.patients} title="Patient Registry" description="Search and manage patients." className="mt-8" />
    </div>
  );
}
```

Create `src/app/dashboard/communications/page.tsx`:
```tsx
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export default function CommunicationsPage() {
  return (
    <div>
      <PageHeader title="Communications" description="AI concierge and message threads" />
      <EmptyState icon={Icons.communications} title="Communications" description="AI orchestration and outreach threads." className="mt-8" />
    </div>
  );
}
```

Create `src/app/dashboard/outcomes/page.tsx`:
```tsx
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export default function OutcomesPage() {
  return (
    <div>
      <PageHeader title="Outcomes" description="Clinical metrics, HEDIS, and ROI" />
      <EmptyState icon={Icons.outcomes} title="Outcomes Dashboard" description="Clinical and financial outcome tracking." className="mt-8" />
    </div>
  );
}
```

Create `src/app/dashboard/cohortisation/page.tsx`:
```tsx
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export default function CohortisationPage() {
  return (
    <div>
      <PageHeader title="Cohortisation" description="Tier definitions, CRS weights, and scoring" />
      <EmptyState icon={Icons.cohortisation} title="Cohortisation Engine" description="Configure risk tiers and scoring." className="mt-8" />
    </div>
  );
}
```

Create `src/app/dashboard/pathways/page.tsx`:
```tsx
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export default function PathwaysPage() {
  return (
    <div>
      <PageHeader title="Pathway Builder" description="Create and manage care pathways" />
      <EmptyState icon={Icons.pathwayBuilder} title="Pathway Builder" description="Design care pathways with AI or drag-and-drop." className="mt-8" />
    </div>
  );
}
```

- [ ] **Step 6: Run dev server and verify all routes work**

```bash
pnpm dev
# Visit: http://localhost:3000/dashboard — should show sidebar + topbar + Command Center placeholder
# Click each sidebar link — each should show its placeholder page with correct title
# Active sidebar item should highlight with blue border
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add app shell (sidebar, topbar) and placeholder pages for all routes"
```

---

## Task 7: Auth Store + API Client

**Files:**
- Create: `src/services/types/auth.ts`
- Create: `src/services/types/common.ts`
- Create: `src/services/api/client.ts`
- Create: `src/services/api/auth.ts`
- Create: `src/stores/auth-store.ts`

- [ ] **Step 1: Create src/services/types/common.ts**

```typescript
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ApiError {
  detail: string;
}
```

- [ ] **Step 2: Create src/services/types/auth.ts**

```typescript
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  display_name: string;
  role: string;
  tenant_id: string;
  tenant_name: string;
}
```

- [ ] **Step 3: Create src/services/api/client.ts**

```typescript
import { API_BASE } from "@/config/api";

interface RequestConfig {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export async function apiRequest<T>(config: RequestConfig): Promise<T> {
  const url = new URL(`${API_BASE}${config.path}`);

  if (config.params) {
    for (const [key, value] of Object.entries(config.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!config.skipAuth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url.toString(), {
    method: config.method,
    headers,
    body: config.body ? JSON.stringify(config.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

- [ ] **Step 4: Create src/services/api/auth.ts**

```typescript
import { apiRequest } from "@/services/api/client";
import { API_ENDPOINTS } from "@/config/api";
import type { LoginRequest, TokenResponse, UserResponse } from "@/services/types/auth";

export async function login(data: LoginRequest): Promise<TokenResponse> {
  return apiRequest<TokenResponse>({
    method: "POST",
    path: API_ENDPOINTS.auth.login,
    body: data,
    skipAuth: true,
  });
}

export async function refreshToken(token: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>({
    method: "POST",
    path: API_ENDPOINTS.auth.refresh,
    body: { refresh_token: token },
    skipAuth: true,
  });
}

export async function getMe(): Promise<UserResponse> {
  return apiRequest<UserResponse>({
    method: "GET",
    path: API_ENDPOINTS.auth.me,
  });
}
```

- [ ] **Step 5: Create src/stores/auth-store.ts**

```typescript
import { create } from "zustand";
import type { UserResponse } from "@/services/types/auth";
import * as authApi from "@/services/api/auth";

interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: typeof window !== "undefined" && !!localStorage.getItem("access_token"),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await authApi.login({ email, password });
      localStorage.setItem("access_token", tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Login failed", isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false });
    window.location.href = "/login";
  },

  loadUser: async () => {
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add auth store, API client, and auth service"
```

---

## Task 8: Login Page

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/page.tsx` (redirect to login)

- [ ] **Step 1: Create src/app/(auth)/login/page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { Icons } from "@/config/icons";
import { ROUTES } from "@/config/routes";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState("admin@bradesco.com");
  const [password, setPassword] = useState("admin123");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      router.push(ROUTES.commandCenter.path);
    } catch {
      // error is set in store
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <h1 className="text-xl font-bold text-text-primary">Tatva Care</h1>
          <p className="text-sm text-text-muted">Bradesco Saude Care Admin</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@bradesco.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-xs text-status-error">{error}</p>
            )}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <Icons.recurring className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sign In
            </Button>
            <p className="text-center text-[11px] text-text-placeholder">
              Demo: admin@bradesco.com / admin123
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create src/app/page.tsx (redirect)**

```tsx
import { redirect } from "next/navigation";
import { ROUTES } from "@/config/routes";

export default function RootPage() {
  redirect(ROUTES.login.path);
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add login page and root redirect"
```

---

## Task 9: Backend Foundation (FastAPI + DB + Models)

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`, `backend/app/main.py`, `backend/app/config.py`, `backend/app/database.py`
- Create: `backend/app/models/base.py`, `backend/app/models/tenant.py`, `backend/app/models/user.py`, `backend/app/models/role.py`
- Create: `backend/app/models/__init__.py`

- [ ] **Step 1: Create backend/requirements.txt**

```
fastapi[standard]>=0.115.0
uvicorn[standard]>=0.32.0
sqlalchemy[asyncio]>=2.0.0
aiosqlite>=0.20.0
pydantic>=2.10.0
pydantic-settings>=2.6.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.17
```

- [ ] **Step 2: Create backend/app/config.py**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./data/care-admin.db"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 60
    jwt_refresh_expire_days: int = 7
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
```

- [ ] **Step 3: Create backend/app/database.py**

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        yield session
```

- [ ] **Step 4: Create backend/app/models/base.py**

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class TenantUserMixin:
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
```

- [ ] **Step 5: Create backend/app/models/tenant.py**

```python
import uuid
from sqlalchemy import Boolean, String
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    config = relationship("TenantConfig", back_populates="tenant", uselist=False)


class TenantConfig(Base, TimestampMixin):
    __tablename__ = "tenant_configs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        __import__("sqlalchemy").ForeignKey("tenants.id", ondelete="CASCADE"),
        unique=True, nullable=False
    )
    app_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    llm_provider: Mapped[str] = mapped_column(String(50), default="gemini")
    llm_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    tenant = relationship("Tenant", back_populates="config")
```

- [ ] **Step 6: Create backend/app/models/user.py**

```python
import uuid
from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("tenant_id", "email"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("roles.id"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    tenant = relationship("Tenant", back_populates="users")
    role = relationship("Role", lazy="joined")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[__import__("datetime").datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[__import__("datetime").datetime] = mapped_column(
        DateTime(timezone=True), server_default=__import__("sqlalchemy").func.now()
    )
```

- [ ] **Step 7: Create backend/app/models/role.py**

```python
import uuid
from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class Role(Base, TimestampMixin):
    __tablename__ = "roles"
    __table_args__ = (UniqueConstraint("tenant_id", "name"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), default="")
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    permissions: Mapped[list] = mapped_column(JSON, default=list)
```

- [ ] **Step 8: Create backend/app/models/__init__.py**

```python
from app.models.base import Base
from app.models.tenant import Tenant, TenantConfig
from app.models.user import User, RefreshToken
from app.models.role import Role

__all__ = ["Base", "Tenant", "TenantConfig", "User", "RefreshToken", "Role"]
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add backend foundation (FastAPI config, DB engine, core models)"
```

---

## Task 10: Backend Auth (JWT + Routes + Seed)

**Files:**
- Create: `backend/app/auth/jwt.py`, `backend/app/auth/context.py`, `backend/app/auth/dependencies.py`, `backend/app/auth/permission_catalog.py`, `backend/app/auth/__init__.py`
- Create: `backend/app/schemas/auth.py`, `backend/app/schemas/common.py`, `backend/app/schemas/__init__.py`
- Create: `backend/app/services/auth_service.py`, `backend/app/services/seed_service.py`, `backend/app/services/__init__.py`
- Create: `backend/app/routers/auth.py`, `backend/app/routers/__init__.py`
- Create: `backend/app/main.py`

- [ ] **Step 1: Create backend/app/auth/__init__.py**

```python
```

- [ ] **Step 2: Create backend/app/auth/permission_catalog.py**

```python
PERMISSIONS = {
    "patient:read",
    "patient:write",
    "pathway:read",
    "pathway:write",
    "pathway:publish",
    "cohort:read",
    "cohort:write",
    "communication:read",
    "communication:write",
    "outcome:read",
    "outcome:write",
    "ai:use",
    "config:edit",
    "user:manage",
}

ALL_PERMISSIONS = list(PERMISSIONS)
```

- [ ] **Step 3: Create backend/app/auth/jwt.py**

```python
import uuid
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.config import settings


def create_access_token(user_id: uuid.UUID, tenant_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_expire_minutes)
    payload = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expire_days)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")
```

- [ ] **Step 4: Create backend/app/auth/context.py**

```python
import uuid
from dataclasses import dataclass


@dataclass(frozen=True)
class AuthContext:
    user_id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    role_name: str
    is_owner: bool
    permissions: frozenset[str]
```

- [ ] **Step 5: Create backend/app/auth/dependencies.py**

```python
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.context import AuthContext
from app.auth.jwt import decode_token
from app.database import get_db
from app.models.user import User

security = HTTPBearer()


async def get_auth(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> AuthContext:
    try:
        payload = decode_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id = uuid.UUID(payload["sub"])
    stmt = select(User).where(User.id == user_id, User.is_active == True)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return AuthContext(
        user_id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        role_name=user.role.name,
        is_owner=user.role.is_system and user.role.name == "Owner",
        permissions=frozenset(user.role.permissions or []),
    )
```

- [ ] **Step 6: Create backend/app/schemas/__init__.py and schemas**

```python
# backend/app/schemas/__init__.py
```

Create `backend/app/schemas/common.py`:
```python
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int
```

Create `backend/app/schemas/auth.py`:
```python
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    tenant_id: str
    tenant_name: str
```

- [ ] **Step 7: Create backend/app/services/auth_service.py**

```python
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext
from app.models.user import User
from app.auth.jwt import create_access_token, create_refresh_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
    stmt = select(User).where(User.email == email, User.is_active == True)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user and verify_password(password, user.password_hash):
        return user
    return None


def create_tokens(user: User) -> dict:
    return {
        "access_token": create_access_token(user.id, user.tenant_id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }
```

- [ ] **Step 8: Create backend/app/services/seed_service.py**

```python
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.tenant import Tenant, TenantConfig
from app.models.user import User
from app.models.role import Role
from app.services.auth_service import hash_password
from app.auth.permission_catalog import ALL_PERMISSIONS

SYSTEM_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEFAULT_TENANT_ID = uuid.UUID("10000000-0000-0000-0000-000000000001")
DEFAULT_USER_ID = uuid.UUID("20000000-0000-0000-0000-000000000001")


async def seed_all(db: AsyncSession) -> None:
    # Check if already seeded
    result = await db.execute(select(Tenant).where(Tenant.id == DEFAULT_TENANT_ID))
    if result.scalar_one_or_none():
        return

    # Create tenant
    tenant = Tenant(id=DEFAULT_TENANT_ID, name="Bradesco Saude", slug="bradesco-saude")
    db.add(tenant)

    # Create tenant config
    config = TenantConfig(
        tenant_id=DEFAULT_TENANT_ID,
        llm_provider="gemini",
    )
    db.add(config)

    # Create roles
    owner_role = Role(
        id=uuid.UUID("30000000-0000-0000-0000-000000000001"),
        tenant_id=DEFAULT_TENANT_ID,
        name="Owner",
        description="Full system access",
        is_system=True,
        permissions=ALL_PERMISSIONS,
    )
    care_manager_role = Role(
        id=uuid.UUID("30000000-0000-0000-0000-000000000002"),
        tenant_id=DEFAULT_TENANT_ID,
        name="Care Manager",
        description="Patient care and communications",
        is_system=False,
        permissions=[
            "patient:read", "patient:write",
            "pathway:read",
            "cohort:read",
            "communication:read", "communication:write",
            "outcome:read",
            "ai:use",
        ],
    )
    architect_role = Role(
        id=uuid.UUID("30000000-0000-0000-0000-000000000003"),
        tenant_id=DEFAULT_TENANT_ID,
        name="Program Architect",
        description="Pathway design and cohortisation",
        is_system=False,
        permissions=[
            "patient:read",
            "pathway:read", "pathway:write", "pathway:publish",
            "cohort:read", "cohort:write",
            "outcome:read",
            "ai:use",
            "config:edit",
        ],
    )
    db.add_all([owner_role, care_manager_role, architect_role])

    # Create default admin user
    admin = User(
        id=DEFAULT_USER_ID,
        tenant_id=DEFAULT_TENANT_ID,
        email="admin@bradesco.com",
        password_hash=hash_password("admin123"),
        display_name="Admin User",
        role_id=owner_role.id,
    )
    db.add(admin)

    await db.commit()
```

- [ ] **Step 9: Create backend/app/routers/__init__.py and auth router**

```python
# backend/app/routers/__init__.py
```

Create `backend/app/routers/auth.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import authenticate, create_tokens
from app.auth.dependencies import get_auth
from app.auth.context import AuthContext

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate(db, data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return create_tokens(user)


@router.get("/me", response_model=UserResponse)
async def me(auth: AuthContext = Depends(get_auth)):
    return UserResponse(
        id=str(auth.user_id),
        email=auth.email,
        display_name=auth.email.split("@")[0].title(),
        role=auth.role_name,
        tenant_id=str(auth.tenant_id),
        tenant_name="Bradesco Saude",
    )
```

- [ ] **Step 10: Create backend/app/main.py**

```python
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, async_session
from app.models import Base
from app.routers import auth
from app.services.seed_service import seed_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create data directory
    os.makedirs("data", exist_ok=True)
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Seed defaults
    async with async_session() as db:
        await seed_all(db)
    yield


app = FastAPI(title="Bradesco Care Admin API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router registry
ROUTER_REGISTRY = [
    (auth.router, "/api/auth", ["Auth"]),
]

for router, prefix, tags in ROUTER_REGISTRY:
    app.include_router(router, prefix=prefix, tags=tags)
```

- [ ] **Step 11: Create backend/app/__init__.py and services/__init__.py**

```python
# backend/app/__init__.py
```

```python
# backend/app/services/__init__.py
```

- [ ] **Step 12: Install backend dependencies and verify**

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Expected: Server starts, creates data/care-admin.db, seeds tenant + user
# Test: curl http://localhost:8000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"admin@bradesco.com","password":"admin123"}'
# Expected: {"access_token":"...","refresh_token":"...","token_type":"bearer"}
```

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: add backend auth (JWT, login, seed tenant/user/roles)"
```

---

## Task 11: Create .env and wire frontend to backend

**Files:**
- Create: `.env.local`
- Modify: `src/app/dashboard/layout.tsx` (add auth check)

- [ ] **Step 1: Create .env.local**

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 2: Add .env.local to .gitignore**

Verify `.gitignore` already has `.env*` — it should from the original.

- [ ] **Step 3: Verify full stack works end-to-end**

Terminal 1:
```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

Terminal 2:
```bash
pnpm dev
```

Visit `http://localhost:3000` — should redirect to `/login`.
Enter `admin@bradesco.com` / `admin123` — should redirect to `/dashboard`.
Sidebar should show all nav items, active highlighting should work.

- [ ] **Step 4: Create src/lib/format.ts**

```typescript
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire frontend to backend, add formatters, verify full stack"
```

---

## Phase 1 Complete Checklist

After completing all tasks, verify:

- [ ] `pnpm dev` starts Next.js on port 3000
- [ ] `cd backend && uvicorn app.main:app --reload --port 8000` starts FastAPI on port 8000
- [ ] Login with `admin@bradesco.com` / `admin123` works
- [ ] Dashboard shows sidebar with 6 nav items (4 primary + 2 config)
- [ ] Each nav item navigates to its placeholder page
- [ ] Active sidebar item highlights correctly
- [ ] Topbar shows search bar and notification bell
- [ ] All design tokens are CSS custom properties — no hardcoded hex in components
- [ ] All routes come from `src/config/routes.ts` — no hardcoded paths
- [ ] All icons are Lucide React — no emojis
- [ ] All UI components are shadcn/ui — no custom components
- [ ] All class composition uses `cn()` — no template literals
- [ ] Backend DB has tables: tenants, tenant_configs, users, roles, refresh_tokens
- [ ] Seed data: 1 tenant, 3 roles, 1 admin user
