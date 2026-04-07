# Command Center Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Command Center page with a fixed-viewport, no-scroll dashboard using bespoke components — AI banner, unified KPI strip, and a 2×2 grid of panels.

**Architecture:** Delete all 4 existing command-center components and the page. Build 6 new focused components + a rewritten page. No store/API/type changes. The page opts out of shared components (PageHeader, KpiCard, DashboardCard) in favor of bespoke layout that fills `h-full` with no page scroll.

**Tech Stack:** Next.js 15, React 19, Tailwind v4, Zustand, ReactMarkdown, lucide-react. No recharts (replaced with CSS bars).

**Design spec:** `docs/superpowers/specs/2026-04-07-command-center-redesign.md`

**Design system:** `docs/design-system.md` — tokens, typography, spacing reference.

---

### Task 1: Delete old components

**Files:**
- Delete: `src/features/command-center/components/action-queue.tsx`
- Delete: `src/features/command-center/components/ai-insights-panel.tsx`
- Delete: `src/features/command-center/components/cohort-distribution-chart.tsx`
- Delete: `src/features/command-center/components/upcoming-reviews.tsx`

- [ ] **Step 1: Delete all 4 files**

```bash
rm src/features/command-center/components/action-queue.tsx \
   src/features/command-center/components/ai-insights-panel.tsx \
   src/features/command-center/components/cohort-distribution-chart.tsx \
   src/features/command-center/components/upcoming-reviews.tsx
```

Run from: `/Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin`

- [ ] **Step 2: Commit**

```bash
git add -A src/features/command-center/
git commit -m "chore: delete old command center components"
```

---

### Task 2: KPI Strip component

**Files:**
- Create: `src/features/command-center/components/kpi-strip.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import type { CommandCenterKPIs } from "@/services/types/command-center";

interface KpiStripProps {
  kpis: CommandCenterKPIs | null;
  loading: boolean;
}

interface KpiCell {
  label: string;
  key: keyof CommandCenterKPIs;
  format?: (v: number) => string;
  colorWhen?: (v: number) => string;
}

const CELLS: KpiCell[] = [
  { label: "Members", key: "total_members", format: (v) => v.toLocaleString() },
  { label: "Risk Score", key: "avg_risk_score", format: (v) => v.toFixed(1) },
  { label: "HbA1c <7%", key: "hba1c_control_rate", format: (v) => `${v}%` },
  {
    label: "Care Gaps",
    key: "open_care_gaps",
    format: (v) => v.toLocaleString(),
    colorWhen: (v) => (v > 0 ? "text-status-error" : "text-text-primary"),
  },
  { label: "PDC ≥80%", key: "pdc_above_80_rate", format: (v) => `${v}%` },
];

export function KpiStrip({ kpis, loading }: KpiStripProps) {
  return (
    <div className="flex shrink-0 gap-px overflow-hidden rounded-xl bg-border-default">
      {CELLS.map((cell) => {
        const raw = kpis?.[cell.key] ?? null;
        const value = typeof raw === "number" ? (cell.format?.(raw) ?? String(raw)) : "—";
        const valueColor = typeof raw === "number" && cell.colorWhen ? cell.colorWhen(raw) : "text-text-primary";

        return (
          <div key={cell.key} className="flex-1 bg-bg-primary px-3.5 py-2.5">
            {loading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-5 w-16" />
              </div>
            ) : (
              <>
                <div className="text-[9px] font-medium uppercase tracking-[0.06em] text-text-muted">
                  {cell.label}
                </div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className={cn("text-xl font-bold", valueColor)}>{value}</span>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No errors in `kpi-strip.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/features/command-center/components/kpi-strip.tsx
git commit -m "feat(command-center): add KpiStrip component"
```

---

### Task 3: AI Banner component

**Files:**
- Create: `src/features/command-center/components/ai-banner.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/config/icons";
import { Skeleton } from "@/components/ui/skeleton";

interface AIBannerProps {
  markdown: string | null;
  loading: boolean;
  onRefresh: () => void;
  onDetails: () => void;
}

function extractSummary(markdown: string): string {
  const firstLine = markdown.split("\n").find((l) => l.trim().length > 0 && !l.startsWith("#"));
  if (!firstLine) return markdown.slice(0, 150);
  return firstLine.length > 150 ? firstLine.slice(0, 147) + "…" : firstLine;
}

export function AIBanner({ markdown, loading, onRefresh, onDetails }: AIBannerProps) {
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-xl border border-ai-border bg-gradient-to-br from-indigo-50/60 to-purple-50/40 px-4 py-2.5">
      <span className="shrink-0 rounded-md bg-brand-primary px-2 py-0.5 text-[9px] font-bold text-white">
        ✦ AI
      </span>

      <div className="min-w-0 flex-1 truncate text-[11px] text-text-secondary">
        {loading ? (
          <Skeleton className="h-3 w-3/4" />
        ) : markdown ? (
          <span dangerouslySetInnerHTML={{ __html: formatSummary(extractSummary(markdown)) }} />
        ) : (
          <span className="text-text-placeholder">No insights available</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="outline"
          size="xs"
          className="border-ai-border bg-brand-primary-light text-brand-primary"
          onClick={onDetails}
        >
          Details ↓
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={onRefresh}
          disabled={loading}
        >
          <Icons.recurring className="size-3" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

/** Bold numbers and highlight error phrases */
function formatSummary(text: string): string {
  return text
    .replace(/(\d+\.?\d*%?)/g, '<b class="text-text-primary">$1</b>')
    .replace(/(decline|declining|drop|dropped|alert)/gi, '<span class="text-status-error">$&</span>');
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No errors in `ai-banner.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/features/command-center/components/ai-banner.tsx
git commit -m "feat(command-center): add AIBanner component"
```

---

### Task 4: Action Queue component

**Files:**
- Create: `src/features/command-center/components/action-queue.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { buildPath } from "@/config/routes";
import type { ActionQueueItem } from "@/services/types/command-center";

const PRIORITY_BORDER: Record<string, string> = {
  high: "border-l-status-error",
  medium: "border-l-status-warning",
  low: "border-l-border-default",
};

interface ActionQueueProps {
  items: ActionQueueItem[];
  loading: boolean;
}

export function ActionQueue({ items, loading }: ActionQueueProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-primary">
      {/* Header — pinned */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-3.5 py-2.5">
        <span className="text-[11px] font-semibold text-text-primary">Action Queue</span>
        {!loading && (
          <span className="rounded-full bg-brand-primary-light px-1.5 py-px text-[9px] font-semibold text-brand-primary">
            {items.length}
          </span>
        )}
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 px-3.5 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-3.5 py-6 text-center text-[11px] text-text-muted">No pending actions</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between border-b border-border-subtle border-l-[3px] px-3.5 py-2",
                PRIORITY_BORDER[item.priority],
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium text-text-primary">{item.title}</div>
                <div className="mt-px text-[9px] text-text-muted">{item.description}</div>
              </div>
              <button
                type="button"
                className="ml-2 shrink-0 rounded-md bg-brand-primary-light px-2 py-0.5 text-[9px] font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
                onClick={() => router.push(buildPath("patientDetail", { id: item.patient_id }))}
              >
                View →
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/features/command-center/components/action-queue.tsx
git commit -m "feat(command-center): add ActionQueue component"
```

---

### Task 5: AI Insights Panel component

**Files:**
- Create: `src/features/command-center/components/ai-insights-panel.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { forwardRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import type { AIInsightsResponse } from "@/services/types/command-center";

interface AIInsightsPanelProps {
  insights: AIInsightsResponse | null;
  loading: boolean;
}

export const AIInsightsPanel = forwardRef<HTMLDivElement, AIInsightsPanelProps>(
  function AIInsightsPanel({ insights, loading }, ref) {
    return (
      <div
        ref={ref}
        className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-ai-border bg-gradient-to-br from-indigo-50/50 to-purple-50/30"
      >
        {/* Header — pinned */}
        <div className="flex shrink-0 items-center gap-1.5 border-b border-ai-border px-3.5 py-2.5">
          <span className="text-[11px] font-semibold text-brand-primary">✦ Population Insights</span>
          <span className="rounded bg-ai-border px-1 py-px text-[8px] font-semibold text-brand-primary">AI</span>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          ) : insights ? (
            <div className="prose prose-sm max-w-none text-[10px] leading-relaxed text-text-secondary [&_h2]:mb-1 [&_h2]:mt-2.5 [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:text-text-primary [&_li]:my-0 [&_li]:text-[10px] [&_p]:my-1 [&_p]:text-[10px] [&_strong]:text-text-primary [&_ul]:my-1 [&_ul]:pl-3.5">
              <ReactMarkdown>{insights.markdown}</ReactMarkdown>
            </div>
          ) : (
            <p className="py-4 text-center text-[11px] text-text-muted">No insights available</p>
          )}
        </div>
      </div>
    );
  },
);
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/features/command-center/components/ai-insights-panel.tsx
git commit -m "feat(command-center): add AIInsightsPanel component"
```

---

### Task 6: Cohort Distribution component

**Files:**
- Create: `src/features/command-center/components/cohort-distribution.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { CohortDistribution as CohortDistData } from "@/services/types/cohort";
import type { ProgramListItem } from "@/services/types/program";

interface CohortDistributionProps {
  programs: ProgramListItem[];
  distributions: Record<string, CohortDistData[]>;
  loading: boolean;
}

const TIER_COLORS = [
  { bg: "bg-tier-0", text: "text-green-800" },
  { bg: "bg-tier-1", text: "text-blue-800" },
  { bg: "bg-tier-2", text: "text-yellow-800" },
  { bg: "bg-tier-3", text: "text-orange-800" },
  { bg: "bg-tier-4", text: "text-red-800" },
];

export function CohortDistribution({ programs, distributions, loading }: CohortDistributionProps) {
  // Flatten all cohorts across programs
  const bars: { name: string; count: number; colorIdx: number }[] = [];
  let maxCount = 0;
  for (const program of programs) {
    const dist = distributions[program.id] ?? [];
    dist.forEach((cohort, i) => {
      bars.push({ name: cohort.cohort_name, count: cohort.count, colorIdx: i % TIER_COLORS.length });
      if (cohort.count > maxCount) maxCount = cohort.count;
    });
  }

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-primary">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-3.5 py-2.5">
        <span className="text-[11px] font-semibold text-text-primary">Cohort Distribution</span>
        <span className="text-[9px] text-text-muted">All programs</span>
      </div>

      {/* Body — vertically centered */}
      <div className="flex flex-1 flex-col justify-center px-3.5 py-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-full rounded" />
            ))}
          </div>
        ) : bars.length === 0 ? (
          <p className="text-center text-[11px] text-text-muted">No data</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bars.map((bar) => {
              const pct = maxCount > 0 ? (bar.count / maxCount) * 100 : 0;
              const colors = TIER_COLORS[bar.colorIdx];
              return (
                <div key={bar.name} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-right text-[9px] text-text-muted">{bar.name}</span>
                  <div className="relative h-3.5 flex-1 overflow-hidden rounded bg-bg-hover">
                    <div
                      className={`absolute inset-y-0 left-0 flex items-center justify-end rounded pr-1.5 ${colors.bg}`}
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    >
                      <span className={`text-[8px] font-semibold ${colors.text}`}>
                        {bar.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/features/command-center/components/cohort-distribution.tsx
git commit -m "feat(command-center): add CohortDistribution component (CSS bars)"
```

---

### Task 7: Reviews Due component

**Files:**
- Create: `src/features/command-center/components/reviews-due.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { buildPath } from "@/config/routes";
import type { UpcomingReviewItem } from "@/services/types/command-center";

interface ReviewsDueProps {
  items: UpcomingReviewItem[];
  loading: boolean;
}

function daysBadgeClasses(days: number): string {
  if (days <= 3) return "bg-status-error-bg text-status-error";
  if (days <= 5) return "bg-status-warning-bg text-status-warning";
  return "bg-bg-hover text-text-muted";
}

export function ReviewsDue({ items, loading }: ReviewsDueProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-primary">
      {/* Header — pinned */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-3.5 py-2.5">
        <span className="text-[11px] font-semibold text-text-primary">Reviews Due</span>
        <span className="text-[9px] text-text-muted">Next 7 days</span>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 px-3.5 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-3.5 py-6 text-center text-[11px] text-text-muted">No upcoming reviews</p>
        ) : (
          items.map((item) => (
            <button
              key={`${item.patient_id}-${item.program_id}`}
              type="button"
              className="flex w-full items-center justify-between border-b border-border-subtle px-3.5 py-2 text-left transition-colors hover:bg-bg-hover"
              onClick={() => router.push(buildPath("patientDetail", { id: item.patient_id }))}
            >
              <span className="text-[10px] font-medium text-text-primary">{item.patient_name}</span>
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-px text-[9px] font-semibold",
                  daysBadgeClasses(item.days_until_due),
                )}
              >
                {item.days_until_due}d
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/features/command-center/components/reviews-due.tsx
git commit -m "feat(command-center): add ReviewsDue component"
```

---

### Task 8: Rewrite the Command Center page

**Files:**
- Rewrite: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Rewrite the page**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useCommandCenterStore } from "@/stores/command-center-store";
import { AIBanner } from "@/features/command-center/components/ai-banner";
import { KpiStrip } from "@/features/command-center/components/kpi-strip";
import { ActionQueue } from "@/features/command-center/components/action-queue";
import { AIInsightsPanel } from "@/features/command-center/components/ai-insights-panel";
import { CohortDistribution } from "@/features/command-center/components/cohort-distribution";
import { ReviewsDue } from "@/features/command-center/components/reviews-due";

export default function CommandCenterPage() {
  const {
    kpis, kpisLoading,
    actionQueue, actionQueueLoading,
    insights, insightsLoading,
    upcomingReviews, reviewsLoading,
    programs, distributions, distributionsLoading,
    loadAll, loadInsights,
  } = useCommandCenterStore();

  const insightsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {/* AI Banner — fixed height */}
      <AIBanner
        markdown={insights?.markdown ?? null}
        loading={insightsLoading}
        onRefresh={loadInsights}
        onDetails={() => insightsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })}
      />

      {/* KPI Strip — fixed height */}
      <KpiStrip kpis={kpis} loading={kpisLoading} />

      {/* 2×2 Grid — fills remaining height */}
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
        <ActionQueue items={actionQueue?.items ?? []} loading={actionQueueLoading} />
        <AIInsightsPanel ref={insightsRef} insights={insights} loading={insightsLoading} />
        <CohortDistribution programs={programs} distributions={distributions} loading={distributionsLoading} />
        <ReviewsDue items={upcomingReviews?.items ?? []} loading={reviewsLoading} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: Clean build, no errors.

- [ ] **Step 3: Verify the dev server renders**

Run: `cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && pnpm dev`

Open `http://localhost:5173/dashboard` (or the port shown). Verify:
- AI banner visible at top with indigo gradient
- KPI strip below with 5 cells
- 2×2 grid fills remaining viewport
- No page-level scrollbar
- Each quadrant scrolls internally if content overflows

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(command-center): rewrite page with fixed-viewport layout"
```

---

### Task 9: Fix AppShell overflow for this page

The AppShell main area currently has `overflow-y-auto`. The Command Center page needs `overflow-hidden` to prevent page scroll, but other pages still need `overflow-y-auto`. The page itself handles this by setting `overflow-hidden` on its root div and using `h-full` to fill the available space.

**Files:**
- Verify: `src/components/layout/app-shell.tsx` (line 23)

- [ ] **Step 1: Verify AppShell is compatible**

The AppShell main area is:
```
<main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg-secondary p-4 lg:p-6">
```

The Command Center page root div uses `h-full overflow-hidden`, which fills the main area. Since the page content is exactly viewport-sized (no overflow), `overflow-y-auto` on main won't produce a scrollbar. **No changes needed to AppShell.**

If during testing a scrollbar appears on the main area, the fix is to check that no element inside the page exceeds `h-full`. The `gap-3` between elements + the padding on main (`p-4 lg:p-6`) must be accounted for. The `flex-1 min-h-0` on the grid handles this.

- [ ] **Step 2: Visual verification**

Open the page at various viewport heights (resize browser). Confirm:
- The 2×2 grid shrinks/grows with viewport
- Internal scroll appears when content overflows a quadrant
- No page-level scrollbar ever appears

- [ ] **Step 3: Commit (only if changes were needed)**

If AppShell needed changes:
```bash
git add src/components/layout/app-shell.tsx
git commit -m "fix: adjust AppShell overflow for fixed-viewport pages"
```

Otherwise, skip this commit.

---

### Task 10: Final cleanup and verify

- [ ] **Step 1: Verify no unused imports or dead code**

Run: `cd /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin && npx tsc --noEmit --pretty`

Expected: Clean build.

- [ ] **Step 2: Verify recharts is no longer imported in command-center**

Run: `grep -r "recharts" src/features/command-center/`

Expected: No matches. (recharts may still be used elsewhere — that's fine.)

- [ ] **Step 3: Final visual check**

Open `http://localhost:5173/dashboard`. Confirm the full layout matches the spec:
- AI banner: indigo gradient, ✦ AI pill, summary text, Details ↓ and Refresh buttons
- KPI strip: 5 seamless cells, no individual borders, values with inline trends
- Top-left: Action Queue with priority left borders, "View →" chips
- Top-right: AI Insights with indigo gradient, markdown rendered
- Bottom-left: Cohort Distribution with horizontal CSS bars
- Bottom-right: Reviews Due with colored day badges
- No page scroll, internal scroll per quadrant

- [ ] **Step 4: Commit any remaining tweaks**

```bash
git add -A
git commit -m "feat(command-center): complete redesign — fixed viewport dashboard"
```
