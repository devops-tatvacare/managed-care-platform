# Spotlight Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the spotlight (Cmd+K) to a unified backend search endpoint backed by a denormalized `search_index` table with PostgreSQL full-text + trigram search.

**Architecture:** Single `search_index` table with tsvector GIN index (prefix match) and pg_trgm GIN index (fuzzy fallback). SQLAlchemy `after_flush` event listeners sync entities into the index. Frontend calls `GET /api/search?q=...` with 300ms debounce.

**Tech Stack:** PostgreSQL 16 (tsvector, pg_trgm), SQLAlchemy 2.0 async, Alembic, FastAPI, Next.js 15, cmdk

**Spec:** `docs/superpowers/specs/2026-04-10-spotlight-search-design.md`

---

## File Map

**New files:**
| File | Responsibility |
|------|---------------|
| `backend/alembic.ini` | Alembic config, points to migrations dir |
| `backend/migrations/env.py` | Async migration runner, loads all models |
| `backend/migrations/script.py.mako` | Migration file template |
| `backend/migrations/versions/0001_baseline.py` | Stamps current schema as baseline |
| `backend/migrations/versions/0002_search_index.py` | search_index table + pg_trgm + GIN indexes |
| `backend/app/models/search_index.py` | SearchIndex SQLAlchemy model |
| `backend/app/schemas/search.py` | Pydantic request/response schemas |
| `backend/app/services/search_service.py` | Search query logic + rebuild utility |
| `backend/app/services/search_sync.py` | after_flush event listeners for index sync |
| `backend/app/routers/search.py` | GET /api/search endpoint |
| `src/services/types/search.ts` | TypeScript types for search response |
| `src/services/api/search.ts` | API client for /api/search |
| `src/hooks/use-debounced-search.ts` | Debounced search hook with AbortController |

**Modified files:**
| File | Change |
|------|--------|
| `backend/requirements.txt` | Remove `aiosqlite`, add `alembic` |
| `backend/app/database.py` | Remove SQLite conditional |
| `backend/app/models/patient.py` | `sqlite.JSON` → `postgresql.JSONB` |
| `backend/app/models/pathway.py` | `sqlite.JSON` → `postgresql.JSONB` |
| `backend/app/models/program.py` | `sqlite.JSON` → `postgresql.JSONB` |
| `backend/app/models/communication.py` | `sqlite.JSON` → `postgresql.JSONB` |
| `backend/app/models/ai_session.py` | `sqlite.JSON` → `postgresql.JSONB` |
| `backend/app/models/cohort.py` | `sqlite.JSON` → `postgresql.JSONB` |
| `backend/app/models/role.py` | `sqlite.JSON` → `postgresql.JSONB` |
| `backend/app/models/tenant.py` | `sqlite.JSON` → `postgresql.JSONB` |
| `backend/app/models/action.py` | Remove SQLite variant, use JSONB directly |
| `backend/app/models/__init__.py` | Add SearchIndex export |
| `backend/app/main.py` | Register search router, init sync listeners, rebuild index after seed |
| `package.json` | Add migrate/rollback/create scripts |
| `src/components/shared/spotlight-search.tsx` | Full rewrite with DB search |

---

### Task 1: Kill SQLite — Database & Models

**Files:**
- Modify: `backend/app/database.py` (lines 1-20)
- Modify: `backend/requirements.txt` (line 1)
- Modify: `backend/app/models/patient.py` (line 5)
- Modify: `backend/app/models/pathway.py` (line 5)
- Modify: `backend/app/models/program.py` (line 5)
- Modify: `backend/app/models/communication.py` (line 7)
- Modify: `backend/app/models/ai_session.py` (line 5)
- Modify: `backend/app/models/cohort.py` (line 5)
- Modify: `backend/app/models/role.py` (line 4)
- Modify: `backend/app/models/tenant.py` (line 4)
- Modify: `backend/app/models/action.py` (lines 8-15)

- [ ] **Step 1: Clean up database.py**

Replace the entire file with PostgreSQL-only version:

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        yield session
```

- [ ] **Step 2: Replace sqlite JSON imports across all models**

In each of these 8 files, replace:
```python
from sqlalchemy.dialects.sqlite import JSON
```
with:
```python
from sqlalchemy.dialects.postgresql import JSONB
```

And replace all column usages of `JSON` with `JSONB` in the mapped_column calls.

Files and their import lines:
- `backend/app/models/patient.py` line 5
- `backend/app/models/pathway.py` line 5
- `backend/app/models/program.py` line 5
- `backend/app/models/communication.py` line 7
- `backend/app/models/ai_session.py` line 5
- `backend/app/models/cohort.py` line 5
- `backend/app/models/role.py` line 4
- `backend/app/models/tenant.py` line 4

- [ ] **Step 3: Clean up action.py SQLite variant**

In `backend/app/models/action.py`, replace lines 8-15:

```python
from sqlalchemy import ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

# Use JSONB on PostgreSQL, JSON on SQLite
JSONB_TYPE = PG_JSONB().with_variant(JSON(), "sqlite")
```

with:

```python
from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
```

Then replace all occurrences of `JSONB_TYPE` with `JSONB` in the file (lines 27, 29, 36, 63, 64).

- [ ] **Step 4: Remove aiosqlite from requirements.txt**

Delete line 1 (`aiosqlite==0.22.1`) from `backend/requirements.txt`.

- [ ] **Step 5: Verify the backend starts**

Run: `cd backend && python -c "from app.models import Base; print('Models loaded:', len(Base.metadata.tables), 'tables')"`

Expected: Models loaded with table count, no import errors.

- [ ] **Step 6: Commit**

```bash
git add backend/app/database.py backend/app/models/ backend/requirements.txt
git commit -m "refactor: remove SQLite support, use PostgreSQL JSONB exclusively"
```

---

### Task 2: Set Up Alembic

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/migrations/env.py`
- Create: `backend/migrations/script.py.mako`
- Create: `backend/migrations/versions/0001_baseline.py`
- Modify: `backend/requirements.txt`
- Modify: `package.json`

- [ ] **Step 1: Add alembic to requirements.txt**

Add this line to `backend/requirements.txt` (alphabetical, after `aiofiles` entries or at the top):

```
alembic==1.15.2
```

- [ ] **Step 2: Install alembic**

Run: `cd backend && pip install alembic==1.15.2`

- [ ] **Step 3: Create alembic.ini**

Create `backend/alembic.ini`:

```ini
[alembic]
script_location = migrations
prepend_sys_path = .

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

Note: No `sqlalchemy.url` here — we read it from `app.config.settings` in `env.py`.

- [ ] **Step 4: Create migrations/env.py**

Create `backend/migrations/env.py`:

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config import settings
from app.models import Base  # noqa: F401 — ensures all models are registered

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — generates SQL script without DB connection."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode — connects to DB asynchronously."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 5: Create migrations/script.py.mako**

Create `backend/migrations/script.py.mako`:

```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

- [ ] **Step 6: Create baseline migration**

Create `backend/migrations/versions/0001_baseline.py`:

```python
"""Baseline — stamp existing schema. No-op migration.

Revision ID: 0001
Revises: None
Create Date: 2026-04-10
"""
from typing import Sequence, Union

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Existing tables are created by Base.metadata.create_all.
    This migration exists to establish a baseline for Alembic history.
    Future migrations build on this revision."""
    pass


def downgrade() -> None:
    pass
```

- [ ] **Step 7: Add migrate scripts to package.json**

Add these to the `"scripts"` section in `package.json`:

```json
"migrate": "cd backend && alembic upgrade head",
"migrate:rollback": "cd backend && alembic downgrade -1",
"migrate:create": "cd backend && alembic revision --autogenerate -m"
```

- [ ] **Step 8: Stamp the database with baseline**

Run: `cd backend && alembic stamp 0001`

Expected: Output showing the stamp applied. This tells Alembic "the DB already has everything up to revision 0001".

- [ ] **Step 9: Verify Alembic works**

Run: `cd backend && alembic current`

Expected: `0001 (head)`

- [ ] **Step 10: Commit**

```bash
git add backend/alembic.ini backend/migrations/ backend/requirements.txt package.json
git commit -m "feat: set up Alembic for async PostgreSQL migrations"
```

---

### Task 3: Search Index Migration

**Files:**
- Create: `backend/migrations/versions/0002_search_index.py`

- [ ] **Step 1: Create the search_index migration**

Create `backend/migrations/versions/0002_search_index.py`:

```python
"""Add search_index table with full-text and trigram indexes.

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "search_index",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", sa.UUID(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_type", sa.String(30), nullable=False),
        sa.Column("entity_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("subtitle", sa.Text(), nullable=True),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Add computed tsvector column via raw SQL (Alembic doesn't support GENERATED ALWAYS AS for tsvector)
    op.execute("""
        ALTER TABLE search_index ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('simple', coalesce(subtitle, '')), 'B')
        ) STORED
    """)

    op.execute("""
        ALTER TABLE search_index ADD COLUMN search_text text
        GENERATED ALWAYS AS (
            coalesce(title, '') || ' ' || coalesce(subtitle, '')
        ) STORED
    """)

    # Indexes
    op.create_index("ix_search_idx_tenant", "search_index", ["tenant_id"])
    op.create_index("ix_search_idx_type", "search_index", ["entity_type"])
    op.create_unique_constraint("uq_search_entity", "search_index", ["entity_type", "entity_id"])

    # GIN indexes via raw SQL (Alembic index API doesn't support postgresql_using for computed columns cleanly)
    op.execute("CREATE INDEX ix_search_idx_vector ON search_index USING gin(search_vector)")
    op.execute("CREATE INDEX ix_search_idx_trgm ON search_index USING gin(search_text gin_trgm_ops)")


def downgrade() -> None:
    op.drop_table("search_index")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
```

- [ ] **Step 2: Run the migration**

Run: `cd backend && alembic upgrade head`

Expected: Migration applies cleanly, output shows `0001 -> 0002`.

- [ ] **Step 3: Verify the table exists**

Run: `cd backend && python -c "
import asyncio
from app.database import engine
from sqlalchemy import text
async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'search_index' ORDER BY ordinal_position\"))
        for row in result:
            print(row)
asyncio.run(check())
"`

Expected: All columns listed including `search_vector` (tsvector) and `search_text` (text).

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/versions/0002_search_index.py
git commit -m "feat: add search_index table with tsvector and pg_trgm indexes"
```

---

### Task 4: SearchIndex Model + Schema

**Files:**
- Create: `backend/app/models/search_index.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/app/schemas/search.py`

- [ ] **Step 1: Create the SearchIndex model**

Create `backend/app/models/search_index.py`:

```python
"""Denormalized search index — one row per searchable entity across all types."""

import uuid
from datetime import datetime

from sqlalchemy import Computed, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SearchIndex(Base):
    __tablename__ = "search_index"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entity_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    subtitle: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata: Mapped[dict] = mapped_column(JSONB, server_default="'{}'::jsonb", nullable=False)

    search_vector: Mapped[str | None] = mapped_column(
        TSVECTOR,
        Computed(
            "setweight(to_tsvector('simple', coalesce(title, '')), 'A') || "
            "setweight(to_tsvector('simple', coalesce(subtitle, '')), 'B')",
            persisted=True,
        ),
    )
    search_text: Mapped[str | None] = mapped_column(
        Text,
        Computed("coalesce(title, '') || ' ' || coalesce(subtitle, '')", persisted=True),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        # Unique constraint is created in migration, declare here for ORM awareness
        {"extend_existing": True},
    )
```

- [ ] **Step 2: Add SearchIndex to models/__init__.py**

In `backend/app/models/__init__.py`, add the import and export:

Add after line 15 (`from app.models.action import ActionTemplate, PatientAction`):
```python
from app.models.search_index import SearchIndex
```

Add `"SearchIndex"` to the `__all__` list.

- [ ] **Step 3: Create search schemas**

Create `backend/app/schemas/search.py`:

```python
"""Pydantic schemas for the unified search endpoint."""

from __future__ import annotations

import uuid

from pydantic import BaseModel


class SearchResultItem(BaseModel):
    entity_id: uuid.UUID
    entity_type: str
    title: str
    subtitle: str | None = None
    metadata: dict = {}


class SearchResponse(BaseModel):
    results: dict[str, list[SearchResultItem]]
    query: str
    total: int
```

- [ ] **Step 4: Verify models load**

Run: `cd backend && python -c "from app.models import SearchIndex; print('SearchIndex OK')"`

Expected: `SearchIndex OK`

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/search_index.py backend/app/models/__init__.py backend/app/schemas/search.py
git commit -m "feat: add SearchIndex model and search Pydantic schemas"
```

---

### Task 5: Search Service

**Files:**
- Create: `backend/app/services/search_service.py`

- [ ] **Step 1: Create search_service.py**

Create `backend/app/services/search_service.py`:

```python
"""Unified search across all entity types via the search_index table."""

from __future__ import annotations

import re
from collections import defaultdict

from sqlalchemy import delete, func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.search_index import SearchIndex


# ── Query ────────────────────────────────────────────────────────────────────

async def search(
    db: AsyncSession,
    tenant_id,
    query: str,
    limit: int = 25,
    per_type_limit: int = 5,
) -> dict:
    """Search across all entity types. Returns grouped results with total count."""
    sanitized = _sanitize_query(query)
    if not sanitized:
        return {"results": {}, "query": query, "total": 0}

    # Primary: tsvector prefix match
    tsquery_str = " & ".join(f"{term}:*" for term in sanitized.split())
    tsquery = func.to_tsquery("simple", tsquery_str)

    rank = func.ts_rank(SearchIndex.search_vector, tsquery).label("rank")

    stmt = (
        select(SearchIndex, rank)
        .where(
            SearchIndex.tenant_id == tenant_id,
            SearchIndex.search_vector.op("@@")(tsquery),
        )
        .order_by(rank.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    grouped = defaultdict(list)
    seen_ids = set()
    for row, _rank in rows:
        if len(grouped[row.entity_type]) >= per_type_limit:
            continue
        grouped[row.entity_type].append(_row_to_dict(row))
        seen_ids.add(row.entity_id)

    total = sum(len(items) for items in grouped.values())

    # Fallback: pg_trgm similarity if primary returned few results
    if total < per_type_limit:
        trgm_stmt = (
            select(SearchIndex)
            .where(
                SearchIndex.tenant_id == tenant_id,
                func.similarity(SearchIndex.search_text, query) > 0.3,
                SearchIndex.entity_id.notin_(seen_ids) if seen_ids else True,
            )
            .order_by(func.similarity(SearchIndex.search_text, query).desc())
            .limit(limit - total)
        )
        trgm_result = await db.execute(trgm_stmt)
        for row in trgm_result.scalars():
            if len(grouped[row.entity_type]) >= per_type_limit:
                continue
            grouped[row.entity_type].append(_row_to_dict(row))

    total = sum(len(items) for items in grouped.values())
    return {"results": dict(grouped), "query": query, "total": total}


def _row_to_dict(row: SearchIndex) -> dict:
    return {
        "entity_id": str(row.entity_id),
        "entity_type": row.entity_type,
        "title": row.title,
        "subtitle": row.subtitle,
        "metadata": row.metadata or {},
    }


def _sanitize_query(query: str) -> str:
    """Strip special tsquery characters, collapse whitespace."""
    cleaned = re.sub(r"[^\w\s]", "", query.strip())
    return " ".join(cleaned.split())


# ── Sync helpers ─────────────────────────────────────────────────────────────

async def upsert_entity(
    db: AsyncSession,
    *,
    tenant_id,
    entity_type: str,
    entity_id,
    title: str,
    subtitle: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Insert or update a single entity in the search index."""
    stmt = pg_insert(SearchIndex).values(
        tenant_id=tenant_id,
        entity_type=entity_type,
        entity_id=entity_id,
        title=title,
        subtitle=subtitle,
        metadata=metadata or {},
    )
    stmt = stmt.on_conflict_do_update(
        constraint="uq_search_entity",
        set_={
            "title": stmt.excluded.title,
            "subtitle": stmt.excluded.subtitle,
            "metadata": stmt.excluded.metadata,
            "updated_at": func.now(),
        },
    )
    await db.execute(stmt)


async def delete_entity(db: AsyncSession, entity_type: str, entity_id) -> None:
    """Remove an entity from the search index."""
    await db.execute(
        delete(SearchIndex).where(
            SearchIndex.entity_type == entity_type,
            SearchIndex.entity_id == entity_id,
        )
    )


# ── Bulk rebuild ─────────────────────────────────────────────────────────────

async def rebuild_index(db: AsyncSession, tenant_id=None) -> int:
    """Rebuild search index from source tables. Returns total rows inserted."""
    from app.models.action import PatientAction
    from app.models.cohort import Cohort
    from app.models.communication import MessageTemplate
    from app.models.pathway import Pathway
    from app.models.patient import Patient
    from app.models.program import Program

    # Clear existing entries
    del_stmt = delete(SearchIndex)
    if tenant_id:
        del_stmt = del_stmt.where(SearchIndex.tenant_id == tenant_id)
    await db.execute(del_stmt)

    count = 0

    # Patients
    tenant_filter = Patient.tenant_id == tenant_id if tenant_id else True
    patients = await db.execute(select(Patient).where(tenant_filter))
    for p in patients.scalars():
        await upsert_entity(
            db,
            tenant_id=p.tenant_id,
            entity_type="patient",
            entity_id=p.id,
            title=f"{p.first_name} {p.last_name}",
            subtitle=f"EMPI: {p.empi_id}",
            metadata={
                "risk_score": p.risk_score,
                "pathway_status": p.pathway_status,
                "is_active": p.is_active,
            },
        )
        count += 1

    # Pathways
    tenant_filter = Pathway.tenant_id == tenant_id if tenant_id else True
    pathways = await db.execute(select(Pathway).where(tenant_filter))
    for pw in pathways.scalars():
        await upsert_entity(
            db,
            tenant_id=pw.tenant_id,
            entity_type="pathway",
            entity_id=pw.id,
            title=pw.name,
            subtitle=pw.condition,
            metadata={"status": pw.status},
        )
        count += 1

    # Programs
    tenant_filter = Program.tenant_id == tenant_id if tenant_id else True
    programs = await db.execute(select(Program).where(tenant_filter))
    for pr in programs.scalars():
        await upsert_entity(
            db,
            tenant_id=pr.tenant_id,
            entity_type="program",
            entity_id=pr.id,
            title=pr.name,
            subtitle=pr.condition,
            metadata={"status": pr.status},
        )
        count += 1

    # Cohorts
    tenant_filter = Cohort.tenant_id == tenant_id if tenant_id else True
    cohorts = await db.execute(select(Cohort).where(tenant_filter))
    for c in cohorts.scalars():
        await upsert_entity(
            db,
            tenant_id=c.tenant_id,
            entity_type="cohort",
            entity_id=c.id,
            title=c.name,
            subtitle=c.description,
            metadata={
                "is_active": c.is_active,
                "program_id": str(c.program_id),
            },
        )
        count += 1

    # MessageTemplates
    tenant_filter = MessageTemplate.tenant_id == tenant_id if tenant_id else True
    templates = await db.execute(select(MessageTemplate).where(tenant_filter))
    for t in templates.scalars():
        await upsert_entity(
            db,
            tenant_id=t.tenant_id,
            entity_type="communication",
            entity_id=t.id,
            title=t.name,
            subtitle=f"{t.channel} · {t.category}",
            metadata={"language": t.language, "channel": t.channel},
        )
        count += 1

    # PatientActions
    tenant_filter = PatientAction.tenant_id == tenant_id if tenant_id else True
    actions = await db.execute(select(PatientAction).where(tenant_filter))
    for a in actions.scalars():
        await upsert_entity(
            db,
            tenant_id=a.tenant_id,
            entity_type="action",
            entity_id=a.id,
            title=a.title,
            subtitle=a.assigned_to,
            metadata={"priority": a.priority, "status": a.status},
        )
        count += 1

    await db.flush()
    return count
```

- [ ] **Step 2: Verify module imports**

Run: `cd backend && python -c "from app.services.search_service import search, upsert_entity, rebuild_index; print('search_service OK')"`

Expected: `search_service OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/search_service.py
git commit -m "feat: search service — query, upsert, rebuild for search_index"
```

---

### Task 6: Search Sync Event Listeners

**Files:**
- Create: `backend/app/services/search_sync.py`

- [ ] **Step 1: Create search_sync.py**

Create `backend/app/services/search_sync.py`:

```python
"""SQLAlchemy event listeners that keep search_index in sync with source entities.

Call `register_search_sync()` once at app startup. After that, every flush
that touches a tracked model will upsert or delete the corresponding
search_index row inside the same transaction.
"""

from __future__ import annotations

from sqlalchemy import event
from sqlalchemy.orm import Session

from app.models.action import PatientAction
from app.models.cohort import Cohort
from app.models.communication import MessageTemplate
from app.models.pathway import Pathway
from app.models.patient import Patient
from app.models.program import Program
from app.services.search_service import delete_entity, upsert_entity


# ── Entity → search_index field mapping ──────────────────────────────────────

def _patient_fields(p: Patient) -> dict:
    return dict(
        tenant_id=p.tenant_id,
        entity_type="patient",
        entity_id=p.id,
        title=f"{p.first_name} {p.last_name}",
        subtitle=f"EMPI: {p.empi_id}",
        metadata={
            "risk_score": p.risk_score,
            "pathway_status": p.pathway_status,
            "is_active": p.is_active,
        },
    )


def _pathway_fields(pw: Pathway) -> dict:
    return dict(
        tenant_id=pw.tenant_id,
        entity_type="pathway",
        entity_id=pw.id,
        title=pw.name,
        subtitle=pw.condition,
        metadata={"status": pw.status},
    )


def _program_fields(pr: Program) -> dict:
    return dict(
        tenant_id=pr.tenant_id,
        entity_type="program",
        entity_id=pr.id,
        title=pr.name,
        subtitle=pr.condition,
        metadata={"status": pr.status},
    )


def _cohort_fields(c: Cohort) -> dict:
    return dict(
        tenant_id=c.tenant_id,
        entity_type="cohort",
        entity_id=c.id,
        title=c.name,
        subtitle=c.description,
        metadata={
            "is_active": c.is_active,
            "program_id": str(c.program_id),
        },
    )


def _template_fields(t: MessageTemplate) -> dict:
    return dict(
        tenant_id=t.tenant_id,
        entity_type="communication",
        entity_id=t.id,
        title=t.name,
        subtitle=f"{t.channel} · {t.category}",
        metadata={"language": t.language, "channel": t.channel},
    )


def _action_fields(a: PatientAction) -> dict:
    return dict(
        tenant_id=a.tenant_id,
        entity_type="action",
        entity_id=a.id,
        title=a.title,
        subtitle=a.assigned_to,
        metadata={"priority": a.priority, "status": a.status},
    )


_MODEL_MAP: dict[type, tuple[str, callable]] = {
    Patient: ("patient", _patient_fields),
    Pathway: ("pathway", _pathway_fields),
    Program: ("program", _program_fields),
    Cohort: ("cohort", _cohort_fields),
    MessageTemplate: ("communication", _template_fields),
    PatientAction: ("action", _action_fields),
}


# ── Listener ─────────────────────────────────────────────────────────────────

def _after_flush(session: Session, flush_context) -> None:
    """Sync new/dirty/deleted instances to search_index within the same transaction."""
    # Collect sync operations — we need to use the sync connection from after_flush
    conn = session.connection()

    for instance in session.new | session.dirty:
        model_cls = type(instance)
        if model_cls not in _MODEL_MAP:
            continue
        _entity_type, fields_fn = _MODEL_MAP[model_cls]
        fields = fields_fn(instance)

        from sqlalchemy.dialects.postgresql import insert as pg_insert
        from sqlalchemy import func as sa_func
        from app.models.search_index import SearchIndex

        stmt = pg_insert(SearchIndex).values(**fields)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_search_entity",
            set_={
                "title": stmt.excluded.title,
                "subtitle": stmt.excluded.subtitle,
                "metadata": stmt.excluded.metadata,
                "updated_at": sa_func.now(),
            },
        )
        conn.execute(stmt)

    for instance in session.deleted:
        model_cls = type(instance)
        if model_cls not in _MODEL_MAP:
            continue
        entity_type, _ = _MODEL_MAP[model_cls]

        from sqlalchemy import delete as sa_delete
        from app.models.search_index import SearchIndex

        conn.execute(
            sa_delete(SearchIndex).where(
                SearchIndex.entity_type == entity_type,
                SearchIndex.entity_id == instance.id,
            )
        )


def register_search_sync() -> None:
    """Register the after_flush listener. Call once at app startup."""
    event.listen(Session, "after_flush", _after_flush)
```

- [ ] **Step 2: Verify module imports**

Run: `cd backend && python -c "from app.services.search_sync import register_search_sync; print('search_sync OK')"`

Expected: `search_sync OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/search_sync.py
git commit -m "feat: search_sync — after_flush event listeners for search index"
```

---

### Task 7: Search Router + Wire Into App

**Files:**
- Create: `backend/app/routers/search.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the search router**

Create `backend/app/routers/search.py`:

```python
"""Unified search endpoint — queries the search_index table."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.search import SearchResponse
from app.services.search_service import search

router = APIRouter()


@router.get("", response_model=SearchResponse)
async def unified_search(
    q: str = Query(..., min_length=2, max_length=200, description="Search query"),
    auth=Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    return await search(db, auth.tenant_id, q)
```

- [ ] **Step 2: Update main.py — register router, sync listeners, rebuild after seed**

In `backend/app/main.py`, make these changes:

**Add import** after line 14 (`from app.workers import cohortisation_worker`):
```python
from app.routers import search
from app.services.search_sync import register_search_sync
```

**Add sync registration** after line 21 (`register_all_surfaces()`):
```python
    register_search_sync()
```

**Add rebuild_search_index call** after `await seed_all(db)` (line 25). Replace:
```python
    async with async_session() as db:
        await seed_all(db)
```
with:
```python
    async with async_session() as db:
        await seed_all(db)

    # Rebuild search index after seeding (idempotent — skips if index already populated)
    from app.services.search_service import rebuild_index
    async with async_session() as db:
        count = await rebuild_index(db)
        if count > 0:
            await db.commit()
```

**Add search router to ROUTER_REGISTRY** — add this entry after the actions entry:
```python
    (search.router, "/api/search", ["Search"]),
```

- [ ] **Step 3: Verify the app starts**

Run: `cd backend && timeout 10 python -m uvicorn app.main:app --host 0.0.0.0 --port 8111 2>&1 | head -20`

Expected: App starts without errors. Search index rebuild log may appear.

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/search.py backend/app/main.py
git commit -m "feat: wire search router and sync listeners into FastAPI app"
```

---

### Task 8: Frontend — API Client + Types + Hook

**Files:**
- Create: `src/services/types/search.ts`
- Create: `src/services/api/search.ts`
- Create: `src/hooks/use-debounced-search.ts`

- [ ] **Step 1: Create search types**

Create `src/services/types/search.ts`:

```typescript
export type SearchEntityType =
  | "patient"
  | "pathway"
  | "program"
  | "cohort"
  | "communication"
  | "action";

export interface SearchResultItem {
  entity_id: string;
  entity_type: SearchEntityType;
  title: string;
  subtitle: string | null;
  metadata: Record<string, unknown>;
}

export interface SearchResponse {
  results: Partial<Record<SearchEntityType, SearchResultItem[]>>;
  query: string;
  total: number;
}
```

- [ ] **Step 2: Create search API client**

Create `src/services/api/search.ts`:

```typescript
import { apiRequest } from "@/services/api/client";
import type { SearchResponse } from "@/services/types/search";

export async function searchGlobal(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const base =
    typeof window === "undefined"
      ? "http://localhost:8000"
      : window.location.origin;
  const url = new URL("/api/search", base);
  url.searchParams.set("q", query);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), { headers, signal });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail ?? `Search failed: ${response.status}`);
  }

  return response.json() as Promise<SearchResponse>;
}
```

Note: We use raw `fetch` here instead of `apiRequest` because we need `AbortSignal` support for cancelling in-flight requests on new keystrokes. `apiRequest` does not support signals.

- [ ] **Step 3: Create debounced search hook**

Create `src/hooks/use-debounced-search.ts`:

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchGlobal } from "@/services/api/search";
import type { SearchResponse } from "@/services/types/search";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function useDebouncedSearch(query: string) {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Reset if query too short
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      // Cancel previous in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await searchGlobal(query.trim(), controller.signal);
        if (!controller.signal.aborted) {
          setData(result);
          setIsLoading(false);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Search failed");
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query]);

  return { data, isLoading, error };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/services/types/search.ts src/services/api/search.ts src/hooks/use-debounced-search.ts
git commit -m "feat: frontend search API client, types, and debounced search hook"
```

---

### Task 9: Rewrite Spotlight Component

**Files:**
- Modify: `src/components/shared/spotlight-search.tsx`

- [ ] **Step 1: Rewrite spotlight-search.tsx**

Replace the entire contents of `src/components/shared/spotlight-search.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/config/icons";
import { ROUTES, buildPath } from "@/config/routes";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import type { SearchEntityType, SearchResultItem } from "@/services/types/search";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

/* ── Static data ──────────────────────────────────────────────────────────── */

const NAV_ITEMS = [
  { label: "Command Center", icon: Icons.commandCenter, path: ROUTES.commandCenter.path },
  { label: "Patients", icon: Icons.patients, path: ROUTES.patients.path },
  { label: "Communications", icon: Icons.communications, path: ROUTES.communications.path },
  { label: "Outcomes", icon: Icons.outcomes, path: ROUTES.outcomes.path },
  { label: "Cohortisation", icon: Icons.cohortisation, path: ROUTES.cohortisation.path },
  { label: "Pathway Builder", icon: Icons.pathwayBuilder, path: ROUTES.pathways.path },
];

const QUICK_ACTIONS = [
  { label: "Search Patients", icon: Icons.search, path: ROUTES.patients.path, shortcut: "Go" },
  { label: "Create Pathway", icon: Icons.plus, path: ROUTES.pathways.path, shortcut: "New" },
];

const ENTITY_CONFIG: Record<SearchEntityType, { label: string; icon: typeof Icons.patients; getPath: (item: SearchResultItem) => string }> = {
  patient: {
    label: "Patients",
    icon: Icons.patients,
    getPath: (item) => buildPath("patientDetail", { id: item.entity_id }),
  },
  pathway: {
    label: "Pathways",
    icon: Icons.pathwayBuilder,
    getPath: (item) => buildPath("pathwayEditor", { id: item.entity_id }),
  },
  program: {
    label: "Programs",
    icon: Icons.cohortisation,
    getPath: (item) => buildPath("cohortBuilderEditor", { id: item.entity_id }),
  },
  cohort: {
    label: "Cohorts",
    icon: Icons.cohortisation,
    getPath: (item) => {
      const programId = item.metadata?.program_id as string | undefined;
      return programId
        ? buildPath("cohortBuilderEditor", { id: programId })
        : ROUTES.cohortisation.path;
    },
  },
  communication: {
    label: "Communications",
    icon: Icons.communications,
    getPath: () => ROUTES.communications.path,
  },
  action: {
    label: "Actions",
    icon: Icons.commandCenter,
    getPath: () => ROUTES.commandCenter.path,
  },
};

/* ── Display order for entity type groups ─────────────────────────────────── */
const ENTITY_ORDER: SearchEntityType[] = [
  "patient", "pathway", "program", "cohort", "communication", "action",
];

/* ── Component ────────────────────────────────────────────────────────────── */

export function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { data, isLoading } = useDebouncedSearch(query);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const handleSelect = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const hasDbResults = data && data.total > 0;
  const showEmptyState = query.trim().length >= 2 && !isLoading && !hasDbResults;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Search across patients, pathways, programs, and more"
      className="sm:max-w-xl"
    >
      <CommandInput
        placeholder="Search patients, pathways, actions..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[400px]">
        {showEmptyState && <CommandEmpty>No results found.</CommandEmpty>}

        {/* Static pages — always visible, cmdk filters client-side */}
        <CommandGroup heading="Pages">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => handleSelect(item.path)}
              value={`page ${item.label}`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Static quick actions */}
        <CommandGroup heading="Quick Actions">
          {QUICK_ACTIONS.map((action) => (
            <CommandItem
              key={action.label}
              onSelect={() => handleSelect(action.path)}
              value={`action ${action.label}`}
            >
              <action.icon className="h-4 w-4" />
              <span>{action.label}</span>
              <CommandShortcut>{action.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Loading skeleton */}
        {isLoading && query.trim().length >= 2 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Searching...">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-3">
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="ml-auto h-3 w-20 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Dynamic DB results */}
        {hasDbResults && !isLoading && (
          <>
            <CommandSeparator />
            {ENTITY_ORDER.map((entityType) => {
              const items = data.results[entityType];
              if (!items?.length) return null;
              const config = ENTITY_CONFIG[entityType];
              const Icon = config.icon;

              return (
                <CommandGroup key={entityType} heading={config.label}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.entity_id}
                      onSelect={() => handleSelect(config.getPath(item))}
                      value={`${entityType} ${item.title} ${item.subtitle ?? ""}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="ml-2 truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                      {item.metadata?.status && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {String(item.metadata.status)}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
```

- [ ] **Step 2: Verify frontend compiles**

Run: `pnpm build 2>&1 | tail -20`

Expected: Build succeeds (or only pre-existing errors remain — no new errors from spotlight changes).

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/spotlight-search.tsx
git commit -m "feat: rewrite spotlight with DB-driven search results"
```

---

### Task 10: End-to-End Verification

- [ ] **Step 1: Start the full stack**

Run: `docker-compose up --build -d`

Or locally: `pnpm dev:all` (with PostgreSQL running)

- [ ] **Step 2: Run the migration**

Run: `pnpm migrate`

Expected: `0001 -> 0002` (or already at head if Docker ran it).

- [ ] **Step 3: Verify search index was populated after seeding**

Run: `cd backend && python -c "
import asyncio
from app.database import async_session
from sqlalchemy import text
async def check():
    async with async_session() as db:
        result = await db.execute(text('SELECT entity_type, count(*) FROM search_index GROUP BY entity_type ORDER BY entity_type'))
        for row in result:
            print(row)
asyncio.run(check())
"`

Expected: Counts for each entity type (patient, pathway, program, cohort, communication, action).

- [ ] **Step 4: Test the search endpoint directly**

Run: `curl -s -H "Authorization: Bearer $(curl -s -X POST http://localhost:8000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@tatvacare.in","password":"admin123"}' | python -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')" "http://localhost:8000/api/search?q=dia" | python -m json.tool`

Expected: JSON response with results grouped by entity type, matching "dia" (e.g., diabetes pathway, diabetes program).

- [ ] **Step 5: Test in browser**

Open `http://localhost:3000`, log in, press `Cmd+K`, type a patient name or "diabetes". Verify:
- Static pages and quick actions appear
- After 300ms, DB results appear grouped by entity type
- Clicking a result navigates to the correct page
- Typing new characters cancels the old request and fires a new one

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: end-to-end spotlight search adjustments"
```
