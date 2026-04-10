# Spotlight Search — DB-Wired Global Search

**Date:** 2026-04-10
**Status:** Approved

## Problem

The spotlight (`Cmd+K`) is currently static — hardcoded page links and two quick actions. No database search, no dynamic results. Users cannot find patients, pathways, programs, cohorts, communications, or actions from the spotlight.

## Solution

Wire the spotlight to a unified `GET /api/search?q=...` endpoint backed by a denormalized `search_index` table with PostgreSQL full-text search (tsvector) and trigram fuzzy matching (pg_trgm). Set up Alembic for production-grade migrations.

## Scope

### 1. Kill SQLite Support

- Remove `aiosqlite` from `requirements.txt`
- Remove SQLite conditional in `backend/app/database.py` (`connect_args`, `if "sqlite"` branch)
- Replace `from sqlalchemy.dialects.sqlite import JSON` with `from sqlalchemy.dialects.postgresql import JSONB` across all models (8 files)
- All JSON columns become JSONB (PostgreSQL-native, indexable)

### 2. Set Up Alembic (Production-Grade)

**Why:** The app currently uses `Base.metadata.create_all` on startup — no migration history, no rollback capability, no schema versioning. For multi-cloud, multi-region, multi-version deployments, Alembic is non-negotiable.

**Structure:**
```
backend/
  alembic.ini              # Alembic config (points to migrations/)
  migrations/
    env.py                 # Async engine setup, imports all models via Base.metadata
    script.py.mako         # Migration template
    versions/
      0001_baseline.py     # Stamp current schema as baseline (no-op migration)
      0002_search_index.py # search_index table + pg_trgm extension + GIN indexes
```

**Key decisions:**
- `env.py` uses async engine (`run_async_migrations`) with the same `DATABASE_URL` from `app.config.settings`
- Migration IDs use sequential numbering (`0001_`, `0002_`) not Alembic's random hex — readable in multi-region deploy logs
- `Base.metadata.create_all` stays in lifespan **for now** (existing tables), but new tables go through Alembic only. Future cleanup: remove `create_all` once all existing tables have baseline migrations.
- Alembic commands run via `pnpm migrate` / `pnpm migrate:create` scripts in `package.json`

**Package.json scripts:**
```json
"migrate": "cd backend && alembic upgrade head",
"migrate:rollback": "cd backend && alembic downgrade -1",
"migrate:create": "cd backend && alembic revision --autogenerate -m"
```

### 3. Search Index Table

**Migration `0002_search_index`:**

```sql
-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create search_index table
CREATE TABLE search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    metadata JSONB DEFAULT '{}',
    search_vector TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(subtitle, '')), 'B')
    ) STORED,
    search_text TEXT GENERATED ALWAYS AS (
        coalesce(title, '') || ' ' || coalesce(subtitle, '')
    ) STORED,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_search_entity UNIQUE (entity_type, entity_id)
);

-- Indexes
CREATE INDEX ix_search_idx_tenant ON search_index(tenant_id);
CREATE INDEX ix_search_idx_vector ON search_index USING gin(search_vector);
CREATE INDEX ix_search_idx_trgm ON search_index USING gin(search_text gin_trgm_ops);
CREATE INDEX ix_search_idx_type ON search_index(entity_type);
```

**Entity type mapping — what gets indexed:**

| Entity | title | subtitle | metadata |
|--------|-------|----------|----------|
| Patient | `{first_name} {last_name}` | `EMPI: {empi_id}` | `{risk_score, pathway_status, is_active}` |
| Pathway | `{name}` | `{condition}` | `{status}` |
| Program | `{name}` | `{condition}` | `{status}` |
| Cohort | `{name}` | `{description}` | `{is_active, program_id, program_name}` |
| MessageTemplate | `{name}` | `{channel} · {category}` | `{language, channel}` |
| PatientAction | `{title}` | `{assigned_to}` | `{priority, status}` |

### 4. Search Index Model

**File:** `backend/app/models/search_index.py`

SQLAlchemy model for `search_index` table. Computed columns (`search_vector`, `search_text`) are `Computed(persisted=True)`. No relationships — this is a flat denormalized table.

### 5. Search Service

**File:** `backend/app/services/search_service.py`

**`search(db, tenant_id, query, limit=25, per_type_limit=5) -> dict`:**

1. Parse query: split on whitespace, build tsquery `term1:* & term2:*` using `simple` config
2. Primary query: `WHERE tenant_id = :tid AND search_vector @@ tsquery` ordered by `ts_rank` desc, limit per entity type
3. If total results < 5: fallback to pg_trgm `similarity(search_text, query) > 0.3`, deduplicate against primary hits
4. Group results by `entity_type`, return

**`sync_entity(db, entity_type, entity_id, tenant_id, title, subtitle, metadata) -> None`:**

Upsert (INSERT ... ON CONFLICT DO UPDATE) a single entity into search_index. Called by event listeners.

**`delete_entity(db, entity_type, entity_id) -> None`:**

Delete from search_index. Called by event listeners on entity deletion.

**`rebuild_index(db, tenant_id=None) -> int`:**

Truncate (or filter by tenant_id) and re-populate from all 6 source tables. Returns count. Called after seeding and available as a management command.

### 6. SQLAlchemy Event Listeners

**File:** `backend/app/services/search_sync.py`

Register `after_flush` listeners for all 6 entity models. On new/dirty instances in the session, call `sync_entity`. On deleted instances, call `delete_entity`.

Registered once at app startup in `main.py`.

**Why `after_flush` not `after_insert`/`after_update`:** `after_flush` runs inside the same transaction, sees all changes in a single pass, and handles bulk operations better than per-instance events.

### 7. Search Router

**File:** `backend/app/routers/search.py`

```
GET /api/search?q={query}
```

- Requires auth (tenant_id from JWT)
- Minimum query length: 2 characters (returns 400 if shorter)
- Returns grouped results with total count
- Response schema in `backend/app/schemas/search.py`

**Response shape:**
```json
{
  "results": {
    "patient": [
      {"entity_id": "...", "entity_type": "patient", "title": "...", "subtitle": "...", "metadata": {}}
    ]
  },
  "query": "joh",
  "total": 12
}
```

### 8. Frontend — API Client + Types

**`src/services/types/search.ts`:**
```typescript
interface SearchResultItem {
  entity_id: string;
  entity_type: 'patient' | 'pathway' | 'program' | 'cohort' | 'communication' | 'action';
  title: string;
  subtitle: string | null;
  metadata: Record<string, unknown>;
}

interface SearchResponse {
  results: Partial<Record<SearchResultItem['entity_type'], SearchResultItem[]>>;
  query: string;
  total: number;
}
```

**`src/services/api/search.ts`:**
Single function `searchGlobal(query: string): Promise<SearchResponse>` using `apiRequest`.

### 9. Frontend — Debounced Search Hook

**`src/hooks/use-debounced-search.ts`:**
- Takes query string, returns `{ results, isLoading, error }`
- 300ms debounce via `setTimeout`/`clearTimeout`
- Skips API call if query < 2 chars (resets results to null)
- Cancels in-flight requests on new input via `AbortController`

### 10. Frontend — Spotlight Rewrite

**`src/components/shared/spotlight-search.tsx`:**

Sections in order:
1. **Pages** (static, client-side filtered by query) — always shown
2. **Quick Actions** (static, client-side filtered) — always shown
3. **Dynamic results** (from DB) — shown when query >= 2 chars

For dynamic results:
- Loading state: skeleton shimmer rows (3 rows)
- Results grouped by entity type with section headings and icons
- Each result: entity icon + title + subtitle + metadata badges (inline, muted)
- Click navigates to entity detail page
- Empty state: "No results found" only when DB returns empty AND static items don't match

**Navigation targets on click:**

| Entity | Route |
|--------|-------|
| Patient | `/dashboard/patients/{entity_id}` |
| Pathway | `/dashboard/pathways/{entity_id}` |
| Program | `/dashboard/cohortisation/builder/{entity_id}` |
| Cohort | `/dashboard/cohortisation/builder/{metadata.program_id}` |
| Communication | `/dashboard/communications` |
| Action | `/dashboard` |

## Files Changed / Created

**New files:**
- `backend/alembic.ini`
- `backend/migrations/env.py`
- `backend/migrations/script.py.mako`
- `backend/migrations/versions/0001_baseline.py`
- `backend/migrations/versions/0002_search_index.py`
- `backend/app/models/search_index.py`
- `backend/app/services/search_service.py`
- `backend/app/services/search_sync.py`
- `backend/app/routers/search.py`
- `backend/app/schemas/search.py`
- `src/services/api/search.ts`
- `src/services/types/search.ts`
- `src/hooks/use-debounced-search.ts`

**Modified files:**
- `backend/requirements.txt` — remove `aiosqlite`, add `alembic`
- `backend/app/database.py` — remove SQLite conditional
- `backend/app/models/patient.py` — `sqlite.JSON` -> `postgresql.JSONB`
- `backend/app/models/pathway.py` — same
- `backend/app/models/program.py` — same
- `backend/app/models/communication.py` — same
- `backend/app/models/ai_session.py` — same
- `backend/app/models/cohort.py` — same
- `backend/app/models/role.py` — same
- `backend/app/models/tenant.py` — same
- `backend/app/models/__init__.py` — add `SearchIndex` export
- `backend/app/main.py` — register search router, register sync listeners, call rebuild_search_index after seed_all
- `backend/app/routers/__init__.py` — add search import
- `package.json` — add migrate scripts
- `src/components/shared/spotlight-search.tsx` — full rewrite with DB search
