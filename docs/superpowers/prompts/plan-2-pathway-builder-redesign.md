# Plan 2: Pathway Builder Redesign — Execution Prompt

## Context

You are redesigning the pathway builder for a healthcare care-management platform. The current system has 25 hardcoded block types specific to diabetes. You are replacing them with 18 generic block types that work for any clinical condition — diabetes, oncology, cardiology, or anything else.

The FHIR Reference Data Layer (Plan 1) is already in place. Reference tables (`ref_conditions`, `ref_lab_tests`, `ref_medications`, `ref_specialties`, `ref_sdoh_domains`, `ref_instruments`) exist and are populated. The lookup API at `GET /api/reference/{domain}/search` is operational.

## What You Are Building

1. Rewritten `block-types.ts` with 18 generic block types across 6 categories
2. Backend schema registry for the pathway AI builder surface
3. `lookup_canonical` tool for the AI builder to validate clinical codes
4. Updated sidebar, block node rendering, and config drawer
5. Template library with per-condition shortcuts

## Plan Location

Read the full plan at: `docs/superpowers/plans/2026-04-10-pathway-builder-redesign.md`

Read the spec at: `docs/superpowers/specs/2026-04-10-pathway-builder-redesign.md`

## Critical Implementation Standards

### Block Type Philosophy

- **No condition-specific language in block types.** "Diagnosis Gate" not "Diabetes Diagnosis Check". "Lab Gate" not "HbA1c Threshold".
- **Labels are generic.** Condition-specific text goes in the block instance's `label` and `config` — set by the user or AI builder, not by the registry.
- **Descriptions are functional.** "Gate patients by lab result threshold" not "Filter patients by HbA1c level".
- **Config fields use the `"reference"` type** for any field that should query the canonical reference tables. This type renders a searchable autocomplete, not a free text input. The `referenceDomain` property specifies which table to search.

### Config Field Types

The `ConfigFieldDefinition` interface gains a new type `"reference"` with two new properties:
- `referenceDomain: string` — one of: conditions, lab_tests, medications, procedures, specialties, sdoh, instruments
- `referenceMultiple: boolean` — allow multiple selections (e.g. multiple ICD-10 codes)

The config drawer renders this as a debounced searchable combobox that calls `GET /api/reference/{referenceDomain}/search?q={query}&limit=15`. Each selected item stores both `code` and `display` in the block config.

### Visual Canvas — DO NOT CHANGE THE LAYOUT

The React Flow canvas, three-pane layout (sidebar | canvas | drawer), drag-and-drop, node connections — all stay exactly as-is. You are changing:
- What blocks appear in the sidebar (generic types from rewritten registry)
- What the block node shows (block's own label + category colour, not hardcoded description)
- What the config drawer renders (dynamic forms with reference autocomplete)

Do NOT touch: `visual-canvas.tsx` layout, React Flow configuration, edge rendering, zoom/pan, node positioning logic.

### AI Builder Surface

Follow the **exact same pattern** as the existing cohort builder surface in `backend/app/ai_builder/surfaces.py`. Read that file first — understand how `_register_cohort_program_surface()` works, then create `_register_pathway_surface()` following the identical structure:

1. Register block config schemas (one per block type) using `SchemaRegistry.register_schema()`
2. Register the pathway output schema
3. Register available options (block categories, edge types, etc.)
4. Set the system prompt in `SURFACE_PROMPTS["pathway"]`
5. Call from `register_all_surfaces()`

The `lookup_canonical` tool goes in `tool_registry.py`. It adds a new `FunctionDeclaration` and handler. The handler should ideally do a synchronous DB query, but for the initial implementation it can return guidance for the LLM to use valid codes.

### Template Library

Templates are **not a new block type**. They are pre-filled config objects for existing generic block types. A template for "HbA1c Eligibility Gate" is just an `eligibility_lab` block with `{test_code: "4548-4", operator: "gte", value: 6.5}` pre-filled.

Templates are stored as JSON in `scripts/ingest/data/pathway_templates.json` and loaded client-side. The template picker is a modal/sheet that groups templates by `condition_tag` (diabetes, oncology, general). Selecting a template calls `addBlock()` with the template's config.

### Existing Code To Study First

Before writing any code, read these files to understand the patterns:
- `src/config/block-types.ts` — current block type registry (you're rewriting this)
- `src/features/pathway-builder/components/component-library.tsx` — sidebar (renders from registry)
- `src/features/pathway-builder/components/pathway-block-node.tsx` — block rendering on canvas
- `src/features/pathway-builder/components/block-config-form.tsx` — config drawer form
- `src/features/pathway-builder/components/config-drawer.tsx` — drawer wrapper
- `backend/app/ai_builder/surfaces.py` — cohort builder surface (your template for pathway surface)
- `backend/app/ai_builder/tool_registry.py` — existing tools
- `backend/app/ai_builder/schema_registry.py` — schema storage

### What NOT To Do

- Do not hardcode any clinical vocabulary (ICD-10 codes, lab names, drug names) in the frontend. All clinical references come from the reference API.
- Do not add condition-specific logic in block rendering. The block node shows `data.label` and `data.category` — it does not know if it's a diabetes block or oncology block.
- Do not change the React Flow canvas layout, node positioning algorithm, edge rendering, or connection logic.
- Do not create new database tables for templates — they are static JSON loaded client-side.
- Do not duplicate the cohort AI builder code — follow the same service, session, and tool patterns.
