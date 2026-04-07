# Command Center Redesign — Design Spec

## Goal

Replace the current Command Center page with a tight, elegant, fixed-viewport dashboard. Same data, completely new presentation. The page must feel like a polished ops console — dense where data matters, breathing room where it helps readability, no page-level scroll.

## Layout

The page fills the full viewport height within the AppShell (sidebar + main area). No page-level scrolling. Vertical structure:

```
┌─────────────────────────────────────────────────────┐
│  AI Banner (single-line summary + Details / Refresh) │
├─────────────────────────────────────────────────────┤
│  KPI Strip (5 metrics, seamless unified bar)         │
├────────────────────────┬────────────────────────────┤
│                        │                            │
│    Action Queue        │    AI Insights (full)      │
│    (internal scroll)   │    (internal scroll)       │
│                        │                            │
├────────────────────────┬────────────────────────────┤
│                        │                            │
│  Cohort Distribution   │    Reviews Due             │
│  (horizontal bars)     │    (internal scroll)       │
│                        │                            │
└────────────────────────┴────────────────────────────┘
```

### Constraint

The 2×2 grid fills all remaining height after the AI banner and KPI strip. Each quadrant has identical outer dimensions — the grid container has uniform boundaries with no vertical or horizontal overflow. Content that exceeds a quadrant scrolls internally within that box.

## Components

### 1. AI Banner

- Full-width, single line, always visible at top
- Light indigo gradient background (`from-indigo-50/60 to-purple-50/40`), `border-ai-border`
- Left: `✦ AI` pill badge (solid `bg-brand-primary text-white`) + condensed insight text (one line, key metrics with bold values, alerts in `text-status-error`)
- Right: two small buttons — "Details ↓" (`bg-brand-primary-light text-brand-primary border-ai-border`) and "Refresh" (`bg-bg-primary text-text-muted border-border-default`)
- Height: fixed, does not grow. Approximately `py-2.5 px-4`.
- "Details ↓" scrolls the AI Insights quadrant into view or highlights it. "Refresh" triggers a new AI generation.

### 2. KPI Strip

- Unified seamless bar — no individual card borders. Cells separated by 1px border gaps (use `gap-[1px] bg-border-default` on parent with `bg-bg-primary` on children).
- 5 equal-width cells: Members, Risk Score, HbA1c <7%, Care Gaps, PDC ≥80%
- Each cell:
  - Label: `text-[9px] uppercase tracking-[0.06em] text-text-muted`
  - Value: `text-xl font-bold text-text-primary` (use `text-status-error` for Care Gaps when > 0)
  - Trend: `text-[9px] font-medium` with `text-status-success` (positive) / `text-status-error` (negative) / `text-status-warning`
  - Value and trend on same line: `flex items-baseline gap-1.5`
- Outer container: `rounded-xl overflow-hidden`
- Height: fixed, does not grow. Approximately `py-2.5 px-3.5` per cell.

### 3. Action Queue (top-left quadrant)

- Header: title "Action Queue" + count badge (`bg-brand-primary-light text-brand-primary rounded-full text-[9px] font-semibold`)
- Body: scrollable list of action items
- Each item:
  - Left border: 3px, color by priority (`border-status-error` high, `border-status-warning` medium, `border-border-default` low)
  - Title: `text-[11px] font-medium text-text-primary`
  - Description: `text-[9px] text-text-muted`
  - Right: "View →" chip (`bg-brand-primary-light text-brand-primary rounded-md text-[9px] font-medium px-2 py-0.5`)
  - Click "View →" navigates to patient detail page
- Items separated by `border-b border-border-subtle`
- Internal scroll on the item list, header stays pinned

### 4. AI Insights (top-right quadrant)

- Indigo gradient background matching AI treatment: `from-indigo-50/50 to-purple-50/30`, `border-ai-border`
- Header: "✦ Population Insights" in `text-brand-primary font-semibold text-[11px]` + "AI" micro badge
- Body: rendered markdown from `AIInsightsResponse.markdown`
  - Use `ReactMarkdown` with constrained prose styles
  - Section headings: `text-[11px] font-semibold text-text-primary`
  - Body text: `text-[10px] text-text-secondary leading-relaxed`
  - Bullet points for patient-specific callouts
- Internal scroll on the body, header stays pinned

### 5. Cohort Distribution (bottom-left quadrant)

- Header: "Cohort Distribution" + "All programs" label
- Body: horizontal bar chart (NOT recharts — pure CSS/HTML bars)
  - Each row: label (right-aligned, `text-[9px] text-text-muted`, fixed width) + bar + count inside bar
  - Bar background: `bg-bg-hover` (track), filled portion uses tier colors (`bg-tier-0` through `bg-tier-4`)
  - Count text inside bar: `text-[8px] font-semibold` with color matching the tier's dark variant
  - Bars: `h-3.5 rounded` with consistent gap between rows
  - 5 rows: Low, Moderate, Elevated, High, Critical
- No internal scroll needed — 5 fixed rows, vertically centered in quadrant

### 6. Reviews Due (bottom-right quadrant)

- Header: "Reviews Due" + "Next 7 days" label
- Body: scrollable list of review items
- Each item: single row with patient name (left) + days-until-due badge (right)
  - Name: `text-[10px] font-medium text-text-primary`
  - Days badge: `text-[9px] font-semibold rounded px-1.5 py-px`
    - ≤3 days: `bg-status-error-bg text-status-error`
    - 4–5 days: `bg-status-warning-bg text-status-warning`
    - 6+ days: `bg-bg-hover text-text-muted`
  - Click row navigates to patient detail page
- Items separated by `border-b border-border-subtle`
- Internal scroll on list, header stays pinned

## Page-Level Structure

```tsx
<div className="flex h-full flex-col gap-3">
  {/* AI Banner — fixed height */}
  <AIBanner />

  {/* KPI Strip — fixed height */}
  <KpiStrip />

  {/* 2×2 Grid — fills remaining height */}
  <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
    <ActionQueue />
    <AIInsightsPanel />
    <CohortDistribution />
    <ReviewsDue />
  </div>
</div>
```

The parent page must use `h-full` to fill the AppShell main area. The AppShell already applies `flex min-h-0 flex-1 flex-col overflow-y-auto`. The page should set `overflow-hidden` instead of `overflow-y-auto` to prevent page scroll — or the page component itself manages the full height.

## Data & API

No API changes needed. All data comes from existing endpoints via `useCommandCenterStore`:

- `kpis` → KPI Strip
- `actionQueue.items` → Action Queue
- `insights` → AI Banner (condensed) + AI Insights panel (full markdown)
- `programs` + `distributions` → Cohort Distribution
- `upcomingReviews.items` → Reviews Due

The AI Banner text is derived from `insights.markdown` — take the first paragraph (up to ~150 chars), truncate with ellipsis. No new API field needed.

## Loading States

Each quadrant manages its own loading state independently:
- KPI Strip: skeleton pulse on each cell
- Action Queue: 4 skeleton rows
- AI Insights: 4 skeleton text lines
- Cohort Distribution: 5 skeleton bars
- Reviews Due: 5 skeleton rows

AI Banner shows "Generating insights..." with a subtle pulse animation while `insightsLoading` is true.

## Design Tokens Used

All from the existing `globals.css` — no new tokens needed:
- Brand: `brand-primary`, `brand-primary-light`, `brand-primary-hover`
- AI: `ai-primary`, `ai-border`
- Status: `status-success`, `status-warning`, `status-error` + their `-bg` and `-border` variants
- Neutral: `text-primary`, `text-secondary`, `text-muted`, `text-placeholder`
- Background: `bg-primary`, `bg-secondary`, `bg-hover`
- Border: `border-default`, `border-subtle`
- Tier: `tier-0` through `tier-4`

## What Changes

- **Delete**: all 4 files in `src/features/command-center/components/`
- **Rewrite**: `src/app/dashboard/page.tsx`
- **Create**: new components in `src/features/command-center/components/`:
  - `ai-banner.tsx`
  - `kpi-strip.tsx`
  - `action-queue.tsx` (rewrite)
  - `ai-insights-panel.tsx` (rewrite)
  - `cohort-distribution.tsx` (rewrite — drop recharts, use CSS bars)
  - `reviews-due.tsx` (rewrite)
- **No changes** to stores, API routes, or types

## What Does NOT Change

- Sidebar, topbar, AppShell layout
- Store (`useCommandCenterStore`)
- API endpoints and response types
- Other pages (patients, pathways, cohortisation)
- Shared components (PageHeader, KpiCard, DashboardCard — note: this page will NOT use these shared components, it has its own bespoke layout)
