# Plan 1: FHIR Reference Data Layer — Execution Prompt

## Context

You are implementing the FHIR Reference Data Layer for a healthcare care-management platform called Bradesco Care Admin. This is a **production system** running PostgreSQL 16, FastAPI (async), SQLAlchemy 2.0 (async), React/Next.js 15, deployed via Docker Compose.

## What You Are Building

8 FHIR R4-compliant reference tables storing canonical clinical vocabularies (ICD-10-CM, LOINC, RxNorm, HCPCS, NUCC, SDOH, Screening Instruments, Value Sets). A generic lookup API. Idempotent ingestion scripts per dataset.

## Plan Location

Read the full implementation plan at: `docs/superpowers/plans/2026-04-10-fhir-reference-data-layer.md`

Read the design spec at: `docs/superpowers/specs/2026-04-10-fhir-reference-data-layer.md`

## Critical Implementation Standards

### Database

- **No shortcuts.** These are production tables that will hold 100K+ rows. Every table needs proper indexes — unique constraints on `(system, code)`, trigram indexes on `display` for fuzzy search, btree indexes on foreign keys and filter columns.
- **Enable `pg_trgm` extension** in the database startup (main.py lifespan) before `create_all`. This is required for the fuzzy search indexes.
- **Use `INSERT ... ON CONFLICT DO UPDATE`** (upsert) in all ingestion scripts. Scripts must be idempotent — running them twice produces the same result. No duplicates, no errors on re-run.
- **Use connection pooling correctly.** Ingestion scripts use **synchronous** SQLAlchemy (not async) since they are standalone CLI scripts, not part of the FastAPI app. Use `create_engine` (not `create_async_engine`). Convert the `DATABASE_URL` from `postgresql+asyncpg://` to `postgresql://` for sync access.
- **Batch inserts.** Ingestion scripts insert in batches of 1000 rows. Do not try to insert 70K rows in a single statement.
- **Soft deprecation.** All tables have `is_active` boolean. When re-ingesting, codes that no longer appear in the source should be marked `is_active = false`, not deleted.
- **FHIR Coding structure.** Every table has `system` (URI string identifying the code system, e.g. `http://hl7.org/fhir/sid/icd-10-cm`), `code`, `display`, and `version`. This is the FHIR standard — do not deviate.

### API

- **Generic lookup endpoint**: `GET /api/reference/{domain}/search?q=metformin&limit=20` where domain is one of: `conditions`, `lab_tests`, `medications`, `procedures`, `specialties`, `sdoh`, `instruments`.
- **Auth-gated** — use the existing `Depends(get_auth)` pattern from other routers.
- **Return FHIR Coding fields** plus domain-specific extras: `[{system, code, display, ...extras}]`.
- **Search uses `ILIKE`** on multiple columns (code, display, and domain-specific text fields). The trigram index makes this fast even on 70K+ rows.
- **Register the router** in `main.py` ROUTER_REGISTRY as `(reference.router, "/api/reference", ["Reference"])`.

### Ingestion Scripts

- **Each script is a standalone CLI** in `scripts/ingest/`. It imports a shared base module for DB connection and upsert helpers.
- **No FastAPI dependency.** Scripts connect directly to Postgres. They read `DATABASE_URL` from environment and convert to sync driver.
- **ICD-10-CM** (`scripts/ingest/icd10.py`): Downloads from CDC FTP, parses the fixed-width order file. ~72K codes. The order file format is documented in the plan — columns are positional, not delimited.
- **LOINC** (`scripts/ingest/loinc.py`): Requires a pre-downloaded `Loinc.csv` file (LOINC requires free registration at loinc.org). Accepts `--file` argument. Flag ~2000 commonly ordered tests as `is_common = true`.
- **RxNorm** (`scripts/ingest/rxnorm.py`): Uses the **public NLM API** (no auth required). Rate limit: 20 req/sec. Fetches concepts by term type (IN=ingredient, SCD=clinical drug, SBD=branded drug, BN=brand name). Default limit 5000 per type for reasonable ingestion time.
- **HCPCS** (`scripts/ingest/hcpcs.py`): Requires pre-downloaded CSV from CMS. Accepts `--file` argument. ~6K codes.
- **NUCC** (`scripts/ingest/nucc.py`): Requires pre-downloaded CSV from nucc.org. Accepts `--file` argument. ~800 codes.
- **SDOH, Instruments, Value Sets**: Load from curated JSON files in `scripts/ingest/data/`. These are small datasets (~20-100 rows) manually curated with clinically accurate data.
- **Master runner** (`scripts/ingest/run_all.py`): Runs all scripts in sequence. Curated JSON scripts run unconditionally. API scripts run unless `--skip-api`. File-based scripts run only if `--file` arguments are provided.

### Code Organization

- **Models**: All 8 models in `backend/app/models/reference.py`. Import them in `backend/app/models/__init__.py` so `Base.metadata.create_all` picks them up.
- **Router**: `backend/app/routers/reference.py`. Single file, generic implementation using a domain→model mapping dict.
- **Ingestion scripts**: `scripts/ingest/` directory with `base.py` (shared helpers), one script per dataset, `data/` subdirectory for curated JSON.

### What NOT To Do

- Do not hardcode lab test names, ICD-10 codes, drug names, or specialties anywhere in the application code. That is exactly what these reference tables replace.
- Do not create Alembic migrations — the app uses `create_all` at startup. The new tables will be created automatically.
- Do not add any frontend changes in this plan. The lookup API is consumed by Plans 2-4.
- Do not guess clinical data. The curated JSON files (SDOH domains, instruments, value sets) contain real clinical vocabulary with accurate codes, score ranges, and interpretation bands. If you are unsure about a clinical value, flag it — do not fabricate.
- Do not use `asyncio` in ingestion scripts. They are synchronous CLI tools.
