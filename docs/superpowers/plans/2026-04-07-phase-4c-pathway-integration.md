# Phase 4C: Pathway Integration + Patient Cohort View

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the cohort system to the pathway builder. Eligibility blocks gain a "Configure | Select from Cohort" toggle. Patient detail shows cohort membership across programs. Remove the deprecated tiers.ts config.

**Architecture:** The pathway eligibility block's config form gains a toggle. When "Select from Cohort" is chosen, it stores a `cohort_reference` in the block config. A new patient cohort tab replaces the old Risk & CRS tab. The deprecated `tiers.ts` stub is fully removed.

**Tech Stack:** Same as Phases 4A/4B. No new dependencies.

**Spec reference:** `docs/superpowers/specs/2026-04-07-cohort-system-redesign.md` — Section 4.5 (Pathway Integration)

**Depends on:** Phase 4A (backend) and Phase 4B (frontend) must be complete.

**Critical rules:** Same as Phase 4B.

---

## Task 1: Eligibility Block — Cohort Reference Toggle

**Files:**
- Create: `src/features/pathway-builder/components/cohort-picker.tsx`
- Modify: `src/features/pathway-builder/components/block-config-form.tsx`

- [ ] **Step 1: Create `src/features/pathway-builder/components/cohort-picker.tsx`**

A component that lets the user pick a cohort from a program. Layout:

1. Select for Program (fetches programs list from API)
2. Select for Cohort within selected program (fetches cohorts for that program)
3. Read-only criteria summary below the selection (show the cohort's criteria as text)
4. Version info display (shows current published version)

The component stores `cohort_reference: { cohort_id, program_version }` as its output.

Props:
```typescript
interface CohortPickerProps {
  value: { cohort_id: string; program_version: number } | null;
  onChange: (ref: { cohort_id: string; program_version: number } | null) => void;
}
```

Uses `fetchPrograms()` and `fetchCohorts(programId)` from the programs API.

- [ ] **Step 2: Modify `src/features/pathway-builder/components/block-config-form.tsx`**

Read the existing file first. For eligibility block types (category === "eligibility"), add a toggle at the top of the config form:

```tsx
<Tabs defaultValue="config">
  <TabsList variant="line" className="...">
    <TabsTrigger value="config">Configure Manually</TabsTrigger>
    <TabsTrigger value="cohort">Select from Cohort</TabsTrigger>
  </TabsList>
  <TabsContent value="config">
    {/* Existing config form */}
  </TabsContent>
  <TabsContent value="cohort">
    <CohortPicker
      value={block.config.cohort_reference ?? null}
      onChange={(ref) => updateBlockConfig({ ...block.config, cohort_reference: ref })}
    />
  </TabsContent>
</Tabs>
```

Only show this toggle for eligibility blocks. Non-eligibility blocks keep their existing config form unchanged.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(pathway): eligibility block cohort reference toggle with picker"
```

---

## Task 2: Patient Detail — Cohort Membership Tab

**Files:**
- Create: `src/features/patients/components/cohort-membership-tab.tsx`
- Modify: `src/features/patients/components/patient-tabs.tsx`
- Create: `src/services/api/patient-cohorts.ts` (or add to existing patients API)

- [ ] **Step 1: Add patient cohort endpoint to API service**

Add to `src/services/api/patients.ts` (or create a new file):

```typescript
export const fetchPatientCohorts = (patientId: string) =>
  apiRequest<AssignmentRecord[]>({
    method: "GET",
    path: `${API_ENDPOINTS.patients.detail(patientId)}/cohort-assignments`,
  });
```

This calls `GET /api/patients/:id/cohort-assignments` which needs to exist in the backend (add it if Phase 4A didn't include it). If the endpoint doesn't exist yet, create it in `backend/app/routers/patients.py`:

```python
@router.get("/{patient_id}/cohort-assignments")
async def patient_cohort_assignments(patient_id: uuid.UUID, ...):
    # Query CohortAssignment where patient_id and is_current=True
    # Return with cohort name, color, program name, score, etc.
```

- [ ] **Step 2: Create `src/features/patients/components/cohort-membership-tab.tsx`**

Shows the patient's current cohort membership across all programs. For each program:
- Card with program name, cohort name (colored badge), score (if scored), score breakdown (horizontal bars like the old Risk & CRS tab), assignment date, review due date.

If the patient has a score breakdown, show horizontal Progress bars for each scoring component (same as the old risk-crs-tab.tsx but now reading from the assignment record, not the patient model).

- [ ] **Step 3: Update `src/features/patients/components/patient-tabs.tsx`**

Replace the old Risk & CRS tab import with the new cohort membership tab:

```tsx
import { CohortMembershipTab } from "./cohort-membership-tab";

// In the tabs array:
{ value: "cohort", label: "Cohort Membership" },

// In TabsContent:
<TabsContent value="cohort">
  <CohortMembershipTab />
</TabsContent>
```

Remove the old `risk-crs-tab.tsx` import and delete the file if it still exists.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(patient): cohort membership tab showing program assignments + score breakdown"
```

---

## Task 3: Clean Up Deprecated Code

**Files:**
- Remove: `src/config/tiers.ts` (if still a stub)
- Modify: Any files still importing from tiers.ts
- Remove: `src/features/patients/components/risk-crs-tab.tsx` (if still exists)
- Remove: `src/features/cohortisation/components/crs-config-panel.tsx` (if still exists)
- Remove: `src/features/cohortisation/components/tier-threshold-panel.tsx` (if still exists)
- Remove: `src/features/cohortisation/components/tier-distribution-chart.tsx` (if still exists)
- Remove: `src/features/cohortisation/components/assignment-log.tsx` (if still exists)

- [ ] **Step 1: Find all imports of tiers.ts**

```bash
grep -r "from.*config/tiers" src/ --include="*.ts" --include="*.tsx"
```

For each file that imports from tiers.ts:
- If it uses `getTier()` for display purposes, replace with data from the cohort API (the cohort record has name and color)
- If it's a component we've already replaced, just delete it

- [ ] **Step 2: Delete tiers.ts and all deprecated files**

Remove any files listed above that still exist after Phase 4B cleanup.

- [ ] **Step 3: Verify no broken imports**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: remove deprecated tiers.ts and old cohortisation components"
```

---

## Task 4: End-to-End Verification

- [ ] **Step 1: Start backend + frontend**

```bash
cd backend && source .venv/bin/activate && python -m uvicorn app.main:app --port 8000 &
sleep 15  # worker processes initial events
pnpm dev
```

- [ ] **Step 2: Verify full flow**

1. Population Dashboard: KPIs show, Diabetes Care program card shows 5 cohorts with distribution bar
2. Click program → Builder loads with AI Builder and Configuration tabs
3. Cohorts tab: 5 cohort cards, click Edit → drawer with criteria editor
4. Scoring Engine tab: 5 component cards
5. Navigate to Pathway Builder → open a pathway → add eligibility block → see "Configure | Select from Cohort" toggle
6. Select "Select from Cohort" → pick Diabetes Care → pick a cohort → criteria summary shows
7. Navigate to a patient → "Cohort Membership" tab shows program + cohort + score breakdown
8. Back to Population Dashboard → click "Recalculate All" → events_created count shows → after worker processes, refresh shows updated assignments

- [ ] **Step 3: TypeScript + build check**

```bash
npx tsc --noEmit && npx next build 2>&1 | tail -15
```

- [ ] **Step 4: Fix any issues**

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "feat(phase-4c): complete — pathway cohort integration, patient cohort view, deprecated code removed"
```
