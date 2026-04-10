# AI Builder Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the AI Builder tab in the cohort builder to Gemini, generating complete program configs (cohorts, scoring engine, override rules) from natural language prompts, with a preview panel and "Apply to Program" action.

**Architecture:** Single-shot generation via a new `cohort_generate` prompt template. Backend receives the user prompt, calls Gemini with a structured JSON schema enforcing the config shape, returns the full config. Frontend sends via a new API endpoint, renders the returned config in the preview panel, and offers an "Apply" button that writes cohorts + scoring engine + overrides to the program via existing store actions.

**Tech Stack:** Gemini 2.0 Flash (existing client), FastAPI, Zustand, React, Sonner toasts

---

## File Map

### Backend (Create/Modify)
- `backend/app/llm/prompts.py` — Add `cohort_generate` prompt template to PROMPT_REGISTRY
- `backend/app/routers/ai.py` — Add `POST /api/ai/cohort-generate` endpoint
- `backend/app/schemas/ai.py` — Create request/response Pydantic schemas

### Frontend (Modify)
- `src/config/api.ts` — Add `cohortGenerate` endpoint path
- `src/services/api/programs.ts` — Add `generateCohortProgram()` API call
- `src/stores/cohort-builder-store.ts` — Replace stub `sendChatMessage` with real API call, add `generatedConfig` state, add `applyGeneratedConfig` action
- `src/features/cohort-builder/components/ai-builder.tsx` — Wire preview panel to render generated config, add "Apply to Program" button

---

## Task 1: Backend — Cohort Generate Prompt Template

**Files:**
- Modify: `backend/app/llm/prompts.py`

- [ ] **Step 1: Add cohort_generate template to PROMPT_REGISTRY**

Add this template at the end of the `_register(...)` call in `backend/app/llm/prompts.py`, before the closing `)`:

```python
    PromptTemplate(
        slug="cohort_generate",
        system=(
            "You are a clinical program design AI for a healthcare care-management platform. "
            "Given a natural language description, generate a complete cohortisation program configuration. "
            "The configuration must include: cohort tier definitions, a composite risk scoring engine with weighted components, "
            "and tiebreaker/override rules. "
            "Each cohort needs: name, color (hex), sort_order, review_cadence_days, score_range_min, score_range_max. "
            "Each scoring component needs: name, label, data_source (one of: lab_range, diagnosis_match, pharmacy_adherence, utilisation, sdoh), "
            "weight (integer 0-100, all weights must sum to 100), cap (integer, usually 100), "
            "scoring_table (array of {criterion, points}), and optional bonus_table. "
            "Each override rule needs: priority (integer), rule (descriptive name), action (one of: override_cohort, boost_score, cap_score, flag_review). "
            "Use clinically appropriate thresholds based on published guidelines (ADA, KDIGO, AHA). "
            "Return ONLY valid JSON matching the schema. Do not fabricate patient data."
        ),
        user=(
            "Program description:\n{user_prompt}\n\n"
            "Generate the complete program configuration as JSON with these exact keys:\n"
            '- "program_name": string\n'
            '- "condition": string\n'
            '- "description": string (1-2 sentences)\n'
            '- "cohorts": array of objects with {name, color, sort_order, review_cadence_days, score_range_min, score_range_max}\n'
            '- "scoring_engine": object with {aggregation_method: "weighted_sum", components: array of {name, label, data_source, weight, cap, scoring_table: [{criterion, points}]}}\n'
            '- "override_rules": array of {priority, rule, action}\n'
        ),
    ),
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/llm/prompts.py
git commit -m "feat(ai): add cohort_generate prompt template for program generation"
```

---

## Task 2: Backend — Cohort Generate Endpoint

**Files:**
- Create: `backend/app/schemas/ai.py`
- Modify: `backend/app/routers/ai.py`

- [ ] **Step 1: Create Pydantic schemas**

Create `backend/app/schemas/ai.py`:

```python
"""Pydantic schemas for AI generation endpoints."""

from pydantic import BaseModel


class CohortGenerateRequest(BaseModel):
    prompt: str


class GeneratedCohort(BaseModel):
    name: str
    color: str = "#6b7280"
    sort_order: int = 0
    review_cadence_days: int = 30
    score_range_min: int = 0
    score_range_max: int = 100


class GeneratedScoringRule(BaseModel):
    criterion: str
    points: int


class GeneratedScoringComponent(BaseModel):
    name: str
    label: str = ""
    data_source: str = "lab_range"
    weight: int = 0
    cap: int = 100
    scoring_table: list[GeneratedScoringRule] = []


class GeneratedOverrideRule(BaseModel):
    priority: int
    rule: str
    action: str = "override_cohort"


class GeneratedScoringEngine(BaseModel):
    aggregation_method: str = "weighted_sum"
    components: list[GeneratedScoringComponent] = []


class CohortGenerateResponse(BaseModel):
    program_name: str
    condition: str
    description: str
    cohorts: list[GeneratedCohort]
    scoring_engine: GeneratedScoringEngine
    override_rules: list[GeneratedOverrideRule]
    ai_narrative: str = ""
```

- [ ] **Step 2: Add endpoint to ai.py**

Add to `backend/app/routers/ai.py`:

```python
from app.schemas.ai import CohortGenerateRequest, CohortGenerateResponse
from app.llm.registry import get_provider
from app.llm.prompts import PROMPT_REGISTRY
```

Then add the endpoint:

```python
@router.post("/cohort-generate", response_model=CohortGenerateResponse)
async def cohort_generate(
    request: CohortGenerateRequest,
    auth: AuthContext = Depends(get_auth),
):
    """Generate a complete cohortisation program config from a natural language prompt."""
    provider = get_provider()
    template = PROMPT_REGISTRY["cohort_generate"]
    system_prompt, user_prompt = template.render(user_prompt=request.prompt)

    result = await provider.generate(
        user_prompt,
        system=system_prompt,
        max_tokens=4096,
        parse_json=True,
    )

    # Normalize: ensure result is a dict
    if not isinstance(result, dict):
        result = {}

    # Build narrative summary for the chat
    cohorts = result.get("cohorts", [])
    components = result.get("scoring_engine", {}).get("components", [])
    overrides = result.get("override_rules", [])
    narrative = (
        f"Generated **{result.get('program_name', 'Program')}** for {result.get('condition', 'the specified condition')}.\n\n"
        f"- **{len(cohorts)} cohort tiers** defined\n"
        f"- **{len(components)} scoring components** (weights: {', '.join(f'{c.get(\"label\", c.get(\"name\", \"\"))} {c.get(\"weight\", 0)}%' for c in components)})\n"
        f"- **{len(overrides)} override rules**\n\n"
        f"{result.get('description', '')}"
    )

    return CohortGenerateResponse(
        program_name=result.get("program_name", "Generated Program"),
        condition=result.get("condition", ""),
        description=result.get("description", ""),
        cohorts=[GeneratedCohort(**c) for c in cohorts] if cohorts else [],
        scoring_engine=GeneratedScoringEngine(**result.get("scoring_engine", {})) if result.get("scoring_engine") else GeneratedScoringEngine(),
        override_rules=[GeneratedOverrideRule(**r) for r in overrides] if overrides else [],
        ai_narrative=narrative,
    )
```

Add the missing import at top:
```python
from app.schemas.ai import CohortGenerateRequest, CohortGenerateResponse, GeneratedCohort, GeneratedScoringEngine, GeneratedOverrideRule
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/ai.py backend/app/routers/ai.py
git commit -m "feat(ai): add POST /api/ai/cohort-generate endpoint with Gemini integration"
```

---

## Task 3: Frontend — API + Store Wiring

**Files:**
- Modify: `src/config/api.ts`
- Modify: `src/services/api/programs.ts`
- Modify: `src/stores/cohort-builder-store.ts`

- [ ] **Step 1: Add endpoint to api.ts**

In `src/config/api.ts`, add to the `ai` section:
```typescript
    cohortGenerate: "/api/ai/cohort-generate",
```

- [ ] **Step 2: Add API function**

In `src/services/api/programs.ts`, add at the bottom:

```typescript
export interface GeneratedProgramConfig {
  program_name: string;
  condition: string;
  description: string;
  cohorts: Array<{
    name: string;
    color: string;
    sort_order: number;
    review_cadence_days: number;
    score_range_min: number;
    score_range_max: number;
  }>;
  scoring_engine: {
    aggregation_method: string;
    components: Array<{
      name: string;
      label: string;
      data_source: string;
      weight: number;
      cap: number;
      scoring_table: Array<{ criterion: string; points: number }>;
    }>;
  };
  override_rules: Array<{
    priority: number;
    rule: string;
    action: string;
  }>;
  ai_narrative: string;
}

export async function generateCohortProgram(prompt: string): Promise<GeneratedProgramConfig> {
  return apiRequest<GeneratedProgramConfig>({
    method: "POST",
    path: API_ENDPOINTS.ai.cohortGenerate,
    body: { prompt },
  });
}
```

- [ ] **Step 3: Update the store — replace stub, add state**

In `src/stores/cohort-builder-store.ts`:

Add import at top:
```typescript
import { generateCohortProgram, type GeneratedProgramConfig } from "@/services/api/programs";
import { toast } from "sonner";
```

Add to the state interface (inside `CohortBuilderStore`):
```typescript
  generatedConfig: GeneratedProgramConfig | null;
  applyGeneratedConfig: () => Promise<void>;
```

Add to the initial state (in `create<CohortBuilderStore>(...)`:
```typescript
  generatedConfig: null,
```

Replace the `sendChatMessage` stub with:
```typescript
  sendChatMessage: async (text) => {
    set((s) => ({
      chatMessages: [...s.chatMessages, { role: "user", content: text }],
      chatLoading: true,
      generatedConfig: null,
    }));
    try {
      const config = await generateCohortProgram(text);
      set((s) => ({
        chatMessages: [...s.chatMessages, { role: "ai", content: config.ai_narrative }],
        chatLoading: false,
        generatedConfig: config,
      }));
    } catch (err) {
      set((s) => ({
        chatMessages: [...s.chatMessages, { role: "ai", content: "Failed to generate program. Please try again or use the Configuration tab." }],
        chatLoading: false,
      }));
      toast.error("AI generation failed");
    }
  },
```

Add the `applyGeneratedConfig` action:
```typescript
  applyGeneratedConfig: async () => {
    const { program, generatedConfig } = get();
    if (!program || !generatedConfig) return;

    try {
      // 1. Update program metadata
      await programsApi.updateProgram(program.id, {
        name: generatedConfig.program_name,
        condition: generatedConfig.condition,
        description: generatedConfig.description,
      });

      // 2. Create cohorts
      for (const cohort of generatedConfig.cohorts) {
        await programsApi.createCohort(program.id, cohort);
      }

      // 3. Upsert scoring engine
      await programsApi.upsertEngine(program.id, {
        components: generatedConfig.scoring_engine.components.map((c) => ({
          ...c,
          scoring_table: c.scoring_table,
        })),
        tiebreaker_rules: generatedConfig.override_rules.map((r) => ({
          ...r,
          condition: {},
        })),
        aggregation_method: generatedConfig.scoring_engine.aggregation_method,
      });

      // 4. Reload program to reflect changes
      await get().loadProgram(program.id);

      set({ generatedConfig: null, builderMode: "config" });
      toast.success("Program configuration applied");
    } catch {
      toast.error("Failed to apply configuration");
    }
  },
```

Also update `clearChat` to clear generatedConfig:
```typescript
  clearChat: () => set({
    chatMessages: [INITIAL_MESSAGE],
    chatLoading: false,
    generatedConfig: null,
  }),
```

And update `reset` to include `generatedConfig: null`.

- [ ] **Step 4: Commit**

```bash
git add src/config/api.ts src/services/api/programs.ts src/stores/cohort-builder-store.ts
git commit -m "feat(ai): wire cohort generation API to store with apply action"
```

---

## Task 4: Frontend — AI Builder Preview Panel + Apply Button

**Files:**
- Modify: `src/features/cohort-builder/components/ai-builder.tsx`

- [ ] **Step 1: Rewrite the preview panel section**

The current right panel (lines 159-168) shows a static placeholder. Replace it with a dynamic preview that renders the generated config when available, and an "Apply to Program" button.

Replace the entire right panel `<div className="flex w-[45%] ...">...</div>` with:

```tsx
{/* ── Right: Preview ──────────────────────────────────────────── */}
<div className="flex w-[45%] shrink-0 flex-col overflow-hidden border-l border-border-default">
  {/* Preview header */}
  <div className="flex items-center justify-between border-b border-border-default px-4 py-2">
    <div className="flex items-center gap-2">
      <Icons.preview className="h-3.5 w-3.5 text-text-muted" />
      <span className="text-[12px] font-semibold text-text-primary">Preview</span>
    </div>
    {generatedConfig && (
      <Button
        size="sm"
        onClick={() => applyGeneratedConfig()}
        className="gap-1.5"
      >
        <Icons.completed className="h-3.5 w-3.5" />
        Apply to Program
      </Button>
    )}
  </div>

  {/* Preview body */}
  <div className="flex-1 overflow-y-auto p-4">
    {!generatedConfig ? (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-text-muted">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
          <Icons.ai className="h-6 w-6 text-indigo-400" />
        </div>
        <p className="text-sm">AI-generated program will appear here</p>
        <p className="text-xs text-text-placeholder">
          Describe your program or pick a template to start
        </p>
      </div>
    ) : (
      <div className="space-y-5">
        {/* Program header */}
        <div>
          <h3 className="text-sm font-bold text-text-primary">{generatedConfig.program_name}</h3>
          {generatedConfig.condition && (
            <p className="mt-0.5 text-xs text-text-muted">{generatedConfig.condition}</p>
          )}
          {generatedConfig.description && (
            <p className="mt-1 text-xs text-text-secondary">{generatedConfig.description}</p>
          )}
        </div>

        {/* Cohorts */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.18em]">
            Cohorts ({generatedConfig.cohorts.length})
          </h4>
          <div className="space-y-1.5">
            {generatedConfig.cohorts.map((c, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-border-default px-3 py-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-xs font-medium text-text-primary flex-1">{c.name}</span>
                <span className="text-[10px] tabular-nums text-text-muted">{c.score_range_min}–{c.score_range_max}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.18em]">
            Scoring Components ({generatedConfig.scoring_engine.components.length})
          </h4>
          <div className="space-y-1.5">
            {generatedConfig.scoring_engine.components.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border-default px-3 py-2">
                <div>
                  <span className="text-xs font-medium text-text-primary">{c.label || c.name}</span>
                  <span className="ml-2 text-[10px] text-text-muted capitalize">{c.data_source.replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tabular-nums font-medium text-brand-primary">{c.weight}%</span>
                  <span className="text-[10px] tabular-nums text-text-muted">{c.scoring_table.length} rules</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Override Rules */}
        {generatedConfig.override_rules.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.18em]">
              Override Rules ({generatedConfig.override_rules.length})
            </h4>
            <div className="space-y-1.5">
              {generatedConfig.override_rules.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border-default px-3 py-2">
                  <span className="text-xs text-text-primary">{r.rule}</span>
                  <span className="text-[10px] capitalize text-text-muted">{r.action.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
</div>
```

Also add to the store destructure at the top of the component:
```typescript
const {
  chatMessages,
  chatLoading,
  generatedConfig,
  sendChatMessage,
  clearChat,
  applyGeneratedConfig,
} = useCohortBuilderStore();
```

- [ ] **Step 2: Remove the border-r from the left chat panel**

The left panel currently has `border-r border-border-default`. Remove it — the right panel now has `border-l` which handles the divider.

- [ ] **Step 3: Commit**

```bash
git add src/features/cohort-builder/components/ai-builder.tsx
git commit -m "feat(ai): wire preview panel with generated config rendering and apply button"
```

---

## Verification Checklist

After all tasks:

- [ ] Click "Diabetes 5-Tier Program" template button → chat shows user prompt → loading spinner → AI response with narrative summary
- [ ] Preview panel populates with cohorts (color dots, score ranges), scoring components (weights, rule counts), and override rules
- [ ] "Apply to Program" button appears in preview header
- [ ] Clicking "Apply" creates cohorts, scoring engine, and overrides on the program → toast "Program configuration applied" → switches to Config tab → tables show the generated data
- [ ] "New Chat" clears both chat and preview
- [ ] Error from Gemini shows error message in chat + error toast
- [ ] Template prompts only visible on initial chat state (≤1 message)
- [ ] Build passes clean
