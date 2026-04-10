# FHIR Reference Data Layer

**Date**: 2026-04-10
**Status**: Approved

## Problem

The system has no canonical source of truth for clinical vocabularies. Block configs, scoring components, and AI builder outputs reference ICD-10 codes, lab types, drug names, and specialties as free text — no validation, no standardisation, no interoperability. This makes config dropdowns impossible, AI validation impossible, and future FHIR API interop impossible.

## Solution

FHIR R4-compliant reference tables storing canonical clinical vocabularies from authoritative public sources. Every clinical reference in the system — pathway blocks, scoring engine configs, AI builder outputs, patient data — validates against and links to these tables.

---

## Database Schema

All tables follow the FHIR `Coding` structure: `system` (URI identifying the code system) + `code` + `display`. Every table includes `version` for annual updates and `is_active` for soft deprecation.

### 1. ref_conditions

ICD-10-CM diagnosis codes. Source: CDC/CMS.

```sql
CREATE TABLE ref_conditions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system          TEXT NOT NULL DEFAULT 'http://hl7.org/fhir/sid/icd-10-cm',
    version         TEXT NOT NULL,                    -- e.g. '2026'
    code            TEXT NOT NULL,                    -- e.g. 'E11.65'
    display         TEXT NOT NULL,                    -- e.g. 'Type 2 diabetes mellitus without complications'
    chapter         TEXT,                             -- e.g. 'IV' (Endocrine)
    block_range     TEXT,                             -- e.g. 'E08-E13'
    category_code   TEXT,                             -- e.g. 'E11' (parent)
    is_billable     BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ref_conditions_system_code UNIQUE (system, code)
);

CREATE INDEX idx_ref_conditions_code ON ref_conditions (code);
CREATE INDEX idx_ref_conditions_code_prefix ON ref_conditions (code text_pattern_ops);
CREATE INDEX idx_ref_conditions_display_trgm ON ref_conditions USING gin (display gin_trgm_ops);
```

**Rows:** ~72,000
**Trigram index** on `display` enables fast fuzzy search for autocomplete.

### 2. ref_lab_tests

LOINC observation definitions. Source: loinc.org.

```sql
CREATE TABLE ref_lab_tests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system          TEXT NOT NULL DEFAULT 'http://loinc.org',
    version         TEXT NOT NULL,                    -- e.g. '2.82'
    code            TEXT NOT NULL,                    -- LOINC code e.g. '4548-4'
    long_name       TEXT NOT NULL,                    -- e.g. 'Hemoglobin A1c/Hemoglobin.total in Blood'
    short_name      TEXT,                             -- e.g. 'HbA1c Bld-mCnc'
    display         TEXT NOT NULL,                    -- consumer-friendly name
    component       TEXT,                             -- e.g. 'Hemoglobin A1c'
    property        TEXT,                             -- e.g. 'MFr' (mass fraction)
    time_aspect     TEXT,                             -- e.g. 'Pt' (point in time)
    specimen        TEXT,                             -- e.g. 'Bld' (blood)
    scale_type      TEXT,                             -- e.g. 'Qn' (quantitative)
    method_type     TEXT,
    class_type      TEXT,                             -- e.g. 'CHEM', 'HEM/BC', 'UA'
    order_obs       TEXT,                             -- 'Order', 'Observation', 'Both'
    unit            TEXT,                             -- common unit e.g. '%', 'mg/dL'
    is_common       BOOLEAN NOT NULL DEFAULT false,   -- top ~2000 commonly ordered
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ref_lab_tests_system_code UNIQUE (system, code)
);

CREATE INDEX idx_ref_lab_tests_code ON ref_lab_tests (code);
CREATE INDEX idx_ref_lab_tests_class ON ref_lab_tests (class_type);
CREATE INDEX idx_ref_lab_tests_common ON ref_lab_tests (is_common) WHERE is_common = true;
CREATE INDEX idx_ref_lab_tests_display_trgm ON ref_lab_tests USING gin (display gin_trgm_ops);
```

**Rows:** ~90,000 (full LOINC), ~2,000 flagged `is_common = true`

### 3. ref_medications

RxNorm drug concepts. Source: NLM RxNorm API.

```sql
CREATE TABLE ref_medications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system          TEXT NOT NULL DEFAULT 'http://www.nlm.nih.gov/research/umls/rxnorm',
    version         TEXT NOT NULL,                    -- e.g. '2026-04'
    code            TEXT NOT NULL,                    -- RxCUI e.g. '860975'
    display         TEXT NOT NULL,                    -- e.g. 'Metformin 500 MG Oral Tablet'
    tty             TEXT NOT NULL,                    -- term type: IN, SCD, SBD, SCDC, BN
    ingredient      TEXT,                             -- base ingredient e.g. 'Metformin'
    drug_class      TEXT,                             -- therapeutic class
    dose_form       TEXT,                             -- e.g. 'Oral Tablet'
    route           TEXT,                             -- e.g. 'Oral'
    strength        TEXT,                             -- e.g. '500 MG'
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ref_medications_system_code UNIQUE (system, code)
);

CREATE INDEX idx_ref_medications_code ON ref_medications (code);
CREATE INDEX idx_ref_medications_ingredient ON ref_medications (ingredient);
CREATE INDEX idx_ref_medications_tty ON ref_medications (tty);
CREATE INDEX idx_ref_medications_display_trgm ON ref_medications USING gin (display gin_trgm_ops);
```

**Rows:** ~20,000 (SCD + SBD + IN concepts)

### 4. ref_procedures

HCPCS Level II procedure/service codes. Source: CMS. (CPT Level I omitted — AMA proprietary license required.)

```sql
CREATE TABLE ref_procedures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system          TEXT NOT NULL DEFAULT 'http://terminology.hl7.org/CodeSystem/HCPCS',
    version         TEXT NOT NULL,
    code            TEXT NOT NULL,                    -- e.g. 'G0108'
    display         TEXT NOT NULL,                    -- e.g. 'Diabetes outpatient self-management training'
    category        TEXT,                             -- section/category
    effective_date  DATE,
    termination_date DATE,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ref_procedures_system_code UNIQUE (system, code)
);

CREATE INDEX idx_ref_procedures_code ON ref_procedures (code);
CREATE INDEX idx_ref_procedures_display_trgm ON ref_procedures USING gin (display gin_trgm_ops);
```

**Rows:** ~6,000

### 5. ref_specialties

NUCC provider taxonomy. Source: nucc.org.

```sql
CREATE TABLE ref_specialties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system          TEXT NOT NULL DEFAULT 'http://nucc.org/provider-taxonomy',
    version         TEXT NOT NULL,                    -- e.g. '26.0'
    code            TEXT NOT NULL,                    -- taxonomy code e.g. '207R00000X'
    display         TEXT NOT NULL,                    -- e.g. 'Internal Medicine'
    classification  TEXT,                             -- e.g. 'Allopathic & Osteopathic Physicians'
    specialization  TEXT,                             -- e.g. 'Internal Medicine'
    grouping        TEXT,                             -- top-level grouping
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ref_specialties_system_code UNIQUE (system, code)
);

CREATE INDEX idx_ref_specialties_code ON ref_specialties (code);
CREATE INDEX idx_ref_specialties_display_trgm ON ref_specialties USING gin (display gin_trgm_ops);
```

**Rows:** ~800

### 6. ref_sdoh_domains

Social determinants of health domains. Source: Gravity Project (VSAC).

```sql
CREATE TABLE ref_sdoh_domains (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system          TEXT NOT NULL DEFAULT 'http://hl7.org/fhir/us/sdoh-clinicalcare',
    version         TEXT NOT NULL,
    code            TEXT NOT NULL,                    -- e.g. 'food-insecurity'
    display         TEXT NOT NULL,                    -- e.g. 'Food Insecurity'
    domain          TEXT NOT NULL,                    -- top-level domain grouping
    category        TEXT,                             -- sub-category
    description     TEXT,
    screening_context TEXT,                           -- when to screen
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ref_sdoh_system_code UNIQUE (system, code)
);

CREATE INDEX idx_ref_sdoh_domain ON ref_sdoh_domains (domain);
```

**Rows:** ~200

### 7. ref_instruments

Clinical screening instruments as FHIR Questionnaire references. Source: LOINC panels + manual curation.

```sql
CREATE TABLE ref_instruments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system          TEXT NOT NULL DEFAULT 'http://loinc.org',
    version         TEXT,
    code            TEXT NOT NULL,                    -- LOINC panel code e.g. '44249-1' (PHQ-9)
    display         TEXT NOT NULL,                    -- e.g. 'PHQ-9 Quick Depression Assessment Panel'
    short_name      TEXT,                             -- e.g. 'PHQ-9'
    publisher       TEXT,                             -- e.g. 'Pfizer Inc.'
    description     TEXT,
    score_min       INTEGER,                          -- e.g. 0
    score_max       INTEGER,                          -- e.g. 27
    interpretation  JSONB,                            -- e.g. [{"min":0,"max":4,"label":"Minimal"},{"min":5,"max":9,"label":"Mild"}]
    condition_tags  TEXT[],                           -- e.g. ['depression','mental_health']
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ref_instruments_system_code UNIQUE (system, code)
);

CREATE INDEX idx_ref_instruments_code ON ref_instruments (code);
CREATE INDEX idx_ref_instruments_tags ON ref_instruments USING gin (condition_tags);
```

**Rows:** ~100

### 8. ref_value_sets

FHIR ValueSet — curated groupings of codes from any reference table for specific clinical contexts. Enables "show me all diabetes-related diagnoses" or "labs relevant to oncology".

```sql
CREATE TABLE ref_value_sets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url             TEXT NOT NULL UNIQUE,              -- e.g. 'https://bradesco-care/ValueSet/diabetes-diagnoses'
    name            TEXT NOT NULL,                     -- e.g. 'DiabetesDiagnoses'
    title           TEXT NOT NULL,                     -- e.g. 'Diabetes-Related Diagnoses'
    status          TEXT NOT NULL DEFAULT 'active',    -- draft | active | retired
    description     TEXT,
    compose         JSONB NOT NULL,                    -- FHIR ValueSet.compose structure
    -- compose format: {"include": [{"system": "http://hl7.org/fhir/sid/icd-10-cm", "filter": [{"property": "code", "op": "is-a", "value": "E11"}]}]}
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Rows:** Dynamic — created as programs are built. Seed with common groupings (diabetes diagnoses, oncology diagnoses, common labs, etc.).

---

## Trigram Extension

The fuzzy search indexes require the `pg_trgm` extension:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

This must be run once on the database before creating the tables.

---

## Backend: SQLAlchemy Models

All reference tables share a common pattern. Models go in `backend/app/models/reference.py`.

Each model:
- Inherits from `Base`
- Uses `__tablename__` matching the SQL above
- Has `system`, `code`, `display` as core fields
- Has a unique constraint on `(system, code)`
- Has `is_active` for soft deprecation

---

## Backend: Lookup API

A single generic lookup router at `backend/app/routers/reference.py`:

```
GET /api/reference/{domain}/search?q=metformin&limit=20
```

Where `domain` is one of: `conditions`, `lab_tests`, `medications`, `procedures`, `specialties`, `sdoh`, `instruments`.

Returns: `[{system, code, display, ...domain-specific fields}]`

Used by:
- Config drawer dropdowns (frontend)
- AI builder tool: `get_canonical_options(domain, search_query)` → validates and discovers codes
- Scoring engine config validation

---

## Ingestion Scripts

Each script is in `scripts/ingest/` and is idempotent (UPSERT on `system + code`). Each connects directly to the database, no FastAPI dependency.

| Script | Source | Method | Auth Required |
|---|---|---|---|
| `scripts/ingest/icd10.py` | CDC FTP: `ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/` | Download ZIP → parse fixed-width `icd10cm_tabular.xml` or `icd10cm_order.txt` | None |
| `scripts/ingest/loinc.py` | `loinc.org/downloads/` | Download ZIP → parse `LoincTable/Loinc.csv` | LOINC credentials (free registration) |
| `scripts/ingest/rxnorm.py` | NLM RxNav API: `rxnav.nlm.nih.gov/REST/` | Paginated API calls (`/allconcepts`, `/rxclass`) | None (public API, 20 req/sec) |
| `scripts/ingest/hcpcs.py` | CMS download page | Download ZIP → parse CSV | None |
| `scripts/ingest/nucc.py` | `nucc.org` CSV download | Download CSV → parse | None |
| `scripts/ingest/sdoh.py` | Curated JSON file (`scripts/ingest/data/sdoh_domains.json`) | Load JSON → INSERT | None |
| `scripts/ingest/instruments.py` | Curated JSON file (`scripts/ingest/data/instruments.json`) | Load JSON → INSERT | None |
| `scripts/ingest/value_sets.py` | Curated JSON file (`scripts/ingest/data/value_sets.json`) | Load JSON → INSERT | None |

### Ingestion runner

```bash
# Run all ingestion scripts
python scripts/ingest/run_all.py

# Run individual
python scripts/ingest/icd10.py
python scripts/ingest/loinc.py --credentials user:pass
python scripts/ingest/rxnorm.py
```

Each script:
1. Downloads/fetches the source data
2. Parses into rows
3. Connects to Postgres via `DATABASE_URL` from env
4. Uses `INSERT ... ON CONFLICT (system, code) DO UPDATE` for idempotency
5. Reports: rows inserted, rows updated, rows total
6. Sets `is_active = false` for codes that no longer appear in the source (annual deprecation)

### Data files for manual curation

Small datasets that don't have a bulk download source:

- `scripts/ingest/data/sdoh_domains.json` — ~200 Gravity Project domains, manually curated from VSAC
- `scripts/ingest/data/instruments.json` — ~100 screening instruments (PHQ-9, GAD-7, ECOG, Karnofsky, NCCN Distress, ESAS, etc.) with score ranges and interpretation bands
- `scripts/ingest/data/value_sets.json` — seed value sets for common clinical contexts (diabetes diagnoses, oncology diagnoses, common labs, diabetes labs, oncology labs, etc.)

---

## AI Builder Integration

The AI builder's tool registry gains a new tool:

```python
FunctionDeclaration(
    name="lookup_canonical",
    description="Search canonical clinical reference data. Use this to find valid ICD-10 codes, LOINC lab tests, RxNorm medications, specialties, or SDOH domains.",
    parameters=Schema(
        type="OBJECT",
        properties={
            "domain": Schema(type="STRING", description="One of: conditions, lab_tests, medications, procedures, specialties, sdoh, instruments"),
            "query": Schema(type="STRING", description="Search term"),
            "limit": Schema(type="INTEGER", description="Max results, default 10"),
        },
        required=["domain", "query"],
    ),
)
```

The `submit_config` tool validates all clinical codes against the reference tables before accepting. Invalid codes are rejected with suggestions from the canonical set.

---

## What This Does NOT Include

- Migration of existing patient data to reference canonical codes (separate effort)
- FHIR REST API for external interop (future — the data model supports it)
- SNOMED CT (license complexity — ICD-10-CM covers diagnosis coding needs)
- CPT Level I (AMA proprietary — HCPCS Level II covers procedure coding needs)

---

## File Inventory

| File | Action | Purpose |
|---|---|---|
| `backend/app/models/reference.py` | Create | SQLAlchemy models for all 8 ref tables |
| `backend/app/routers/reference.py` | Create | Generic lookup API (`/api/reference/{domain}/search`) |
| `backend/app/models/__init__.py` | Modify | Import reference models so Alembic sees them |
| `scripts/ingest/__init__.py` | Create | Package |
| `scripts/ingest/run_all.py` | Create | Master runner |
| `scripts/ingest/icd10.py` | Create | ICD-10-CM ingestion from CDC |
| `scripts/ingest/loinc.py` | Create | LOINC ingestion |
| `scripts/ingest/rxnorm.py` | Create | RxNorm ingestion via API |
| `scripts/ingest/hcpcs.py` | Create | HCPCS ingestion from CMS |
| `scripts/ingest/nucc.py` | Create | NUCC specialties ingestion |
| `scripts/ingest/sdoh.py` | Create | SDOH domains from curated JSON |
| `scripts/ingest/instruments.py` | Create | Screening instruments from curated JSON |
| `scripts/ingest/value_sets.py` | Create | Seed value sets from curated JSON |
| `scripts/ingest/data/sdoh_domains.json` | Create | Curated SDOH domain data |
| `scripts/ingest/data/instruments.json` | Create | Curated instrument definitions |
| `scripts/ingest/data/value_sets.json` | Create | Seed value set definitions |
