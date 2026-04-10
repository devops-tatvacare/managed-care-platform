# FHIR Reference Data Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create FHIR R4-compliant reference tables for clinical vocabularies (ICD-10, LOINC, RxNorm, HCPCS, NUCC, SDOH, Instruments) with ingestion scripts and a generic lookup API.

**Architecture:** 8 Postgres tables with trigram search indexes, SQLAlchemy models, a generic `/api/reference/{domain}/search` endpoint, and idempotent Python ingestion scripts per dataset. All tables follow FHIR Coding structure (system + code + display).

**Tech Stack:** PostgreSQL (pg_trgm), SQLAlchemy 2.0 async, FastAPI, httpx (for RxNorm API), Python stdlib (xml, csv, zipfile for file parsing)

---

## File Inventory

| File | Action | Purpose |
|---|---|---|
| `backend/app/models/reference.py` | Create | SQLAlchemy models for all 8 ref tables |
| `backend/app/models/__init__.py` | Modify | Import reference models |
| `backend/app/routers/reference.py` | Create | Generic lookup API |
| `backend/app/main.py` | Modify | Register reference router |
| `scripts/ingest/__init__.py` | Create | Package |
| `scripts/ingest/base.py` | Create | Shared DB connection + upsert helpers |
| `scripts/ingest/icd10.py` | Create | ICD-10-CM ingestion |
| `scripts/ingest/loinc.py` | Create | LOINC ingestion |
| `scripts/ingest/rxnorm.py` | Create | RxNorm ingestion via API |
| `scripts/ingest/hcpcs.py` | Create | HCPCS ingestion |
| `scripts/ingest/nucc.py` | Create | NUCC specialties ingestion |
| `scripts/ingest/sdoh.py` | Create | SDOH domains from curated JSON |
| `scripts/ingest/instruments.py` | Create | Screening instruments from curated JSON |
| `scripts/ingest/value_sets.py` | Create | Seed value sets |
| `scripts/ingest/run_all.py` | Create | Master runner |
| `scripts/ingest/data/sdoh_domains.json` | Create | Curated SDOH data |
| `scripts/ingest/data/instruments.json` | Create | Curated instrument data |
| `scripts/ingest/data/value_sets.json` | Create | Seed value set data |

---

### Task 1: pg_trgm Extension + SQLAlchemy Models

**Files:**
- Create: `backend/app/models/reference.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create reference models**

Create `backend/app/models/reference.py` with all 8 models. Each follows the same pattern — FHIR Coding fields (system, code, display) + domain-specific fields + unique constraint on (system, code).

```python
"""FHIR R4-compliant clinical reference tables."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Date, Integer, String, Text, UniqueConstraint,
    func, Index,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class RefCondition(Base):
    """ICD-10-CM diagnosis codes. Source: CDC/CMS."""
    __tablename__ = "ref_conditions"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    system: Mapped[str] = mapped_column(Text, nullable=False, default="http://hl7.org/fhir/sid/icd-10-cm")
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    display: Mapped[str] = mapped_column(Text, nullable=False)
    chapter: Mapped[str | None] = mapped_column(String(10))
    block_range: Mapped[str | None] = mapped_column(String(20))
    category_code: Mapped[str | None] = mapped_column(String(10))
    is_billable: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    __table_args__ = (
        UniqueConstraint("system", "code", name="uq_ref_conditions_system_code"),
        Index("idx_ref_conditions_code", "code"),
        Index("idx_ref_conditions_code_prefix", "code", postgresql_ops={"code": "text_pattern_ops"}),
    )


class RefLabTest(Base):
    """LOINC observation definitions. Source: loinc.org."""
    __tablename__ = "ref_lab_tests"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    system: Mapped[str] = mapped_column(Text, nullable=False, default="http://loinc.org")
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    long_name: Mapped[str] = mapped_column(Text, nullable=False)
    short_name: Mapped[str | None] = mapped_column(Text)
    display: Mapped[str] = mapped_column(Text, nullable=False)
    component: Mapped[str | None] = mapped_column(Text)
    property: Mapped[str | None] = mapped_column(String(50))
    time_aspect: Mapped[str | None] = mapped_column(String(20))
    specimen: Mapped[str | None] = mapped_column(String(50))
    scale_type: Mapped[str | None] = mapped_column(String(20))
    method_type: Mapped[str | None] = mapped_column(Text)
    class_type: Mapped[str | None] = mapped_column(String(50))
    order_obs: Mapped[str | None] = mapped_column(String(20))
    unit: Mapped[str | None] = mapped_column(String(50))
    is_common: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    __table_args__ = (
        UniqueConstraint("system", "code", name="uq_ref_lab_tests_system_code"),
        Index("idx_ref_lab_tests_code", "code"),
        Index("idx_ref_lab_tests_class", "class_type"),
        Index("idx_ref_lab_tests_common", "is_common", postgresql_where="is_common = true"),
    )


class RefMedication(Base):
    """RxNorm drug concepts. Source: NLM."""
    __tablename__ = "ref_medications"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    system: Mapped[str] = mapped_column(Text, nullable=False, default="http://www.nlm.nih.gov/research/umls/rxnorm")
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    display: Mapped[str] = mapped_column(Text, nullable=False)
    tty: Mapped[str] = mapped_column(String(10), nullable=False)
    ingredient: Mapped[str | None] = mapped_column(Text)
    drug_class: Mapped[str | None] = mapped_column(Text)
    dose_form: Mapped[str | None] = mapped_column(Text)
    route: Mapped[str | None] = mapped_column(Text)
    strength: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    __table_args__ = (
        UniqueConstraint("system", "code", name="uq_ref_medications_system_code"),
        Index("idx_ref_medications_code", "code"),
        Index("idx_ref_medications_ingredient", "ingredient"),
        Index("idx_ref_medications_tty", "tty"),
    )


class RefProcedure(Base):
    """HCPCS Level II procedure codes. Source: CMS."""
    __tablename__ = "ref_procedures"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    system: Mapped[str] = mapped_column(Text, nullable=False, default="http://terminology.hl7.org/CodeSystem/HCPCS")
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    display: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(Text)
    effective_date: Mapped[datetime | None] = mapped_column(Date)
    termination_date: Mapped[datetime | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    __table_args__ = (
        UniqueConstraint("system", "code", name="uq_ref_procedures_system_code"),
        Index("idx_ref_procedures_code", "code"),
    )


class RefSpecialty(Base):
    """NUCC provider taxonomy. Source: nucc.org."""
    __tablename__ = "ref_specialties"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    system: Mapped[str] = mapped_column(Text, nullable=False, default="http://nucc.org/provider-taxonomy")
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    display: Mapped[str] = mapped_column(Text, nullable=False)
    classification: Mapped[str | None] = mapped_column(Text)
    specialization: Mapped[str | None] = mapped_column(Text)
    grouping: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    __table_args__ = (
        UniqueConstraint("system", "code", name="uq_ref_specialties_system_code"),
        Index("idx_ref_specialties_code", "code"),
    )


class RefSdohDomain(Base):
    """SDOH domains. Source: Gravity Project."""
    __tablename__ = "ref_sdoh_domains"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    system: Mapped[str] = mapped_column(Text, nullable=False, default="http://hl7.org/fhir/us/sdoh-clinicalcare")
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    display: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    screening_context: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    __table_args__ = (
        UniqueConstraint("system", "code", name="uq_ref_sdoh_system_code"),
        Index("idx_ref_sdoh_domain", "domain"),
    )


class RefInstrument(Base):
    """Clinical screening instruments as FHIR Questionnaire refs. Source: LOINC + manual."""
    __tablename__ = "ref_instruments"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    system: Mapped[str] = mapped_column(Text, nullable=False, default="http://loinc.org")
    version: Mapped[str | None] = mapped_column(String(20))
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    display: Mapped[str] = mapped_column(Text, nullable=False)
    short_name: Mapped[str | None] = mapped_column(Text)
    publisher: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    score_min: Mapped[int | None] = mapped_column(Integer)
    score_max: Mapped[int | None] = mapped_column(Integer)
    interpretation: Mapped[dict | None] = mapped_column(JSONB)
    condition_tags: Mapped[list | None] = mapped_column(ARRAY(Text))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    __table_args__ = (
        UniqueConstraint("system", "code", name="uq_ref_instruments_system_code"),
        Index("idx_ref_instruments_code", "code"),
    )


class RefValueSet(Base):
    """FHIR ValueSet — curated code groupings for clinical contexts."""
    __tablename__ = "ref_value_sets"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    description: Mapped[str | None] = mapped_column(Text)
    compose: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
```

- [ ] **Step 2: Import reference models in __init__.py**

In `backend/app/models/__init__.py`, add:

```python
from app.models.reference import (
    RefCondition, RefLabTest, RefMedication, RefProcedure,
    RefSpecialty, RefSdohDomain, RefInstrument, RefValueSet,
)
```

This ensures `Base.metadata.create_all` picks up the new tables.

- [ ] **Step 3: Add pg_trgm extension to database startup**

In `backend/app/main.py`, in the lifespan function, add before `create_all`:

```python
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.run_sync(Base.metadata.create_all)
```

Add `from sqlalchemy import text` to the imports.

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/reference.py backend/app/models/__init__.py backend/app/main.py
git commit -m "feat: FHIR R4 reference table models — conditions, labs, medications, procedures, specialties, SDOH, instruments, value sets"
```

---

### Task 2: Generic Lookup API

**Files:**
- Create: `backend/app/routers/reference.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create reference router**

Create `backend/app/routers/reference.py`:

```python
"""Generic clinical reference lookup API."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_, func, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.models.reference import (
    RefCondition, RefLabTest, RefMedication, RefProcedure,
    RefSpecialty, RefSdohDomain, RefInstrument,
)

router = APIRouter()

# Domain → (model class, search columns, extra columns to return)
DOMAIN_MAP: dict[str, tuple[type, list[str], list[str]]] = {
    "conditions": (RefCondition, ["code", "display"], ["chapter", "category_code", "is_billable"]),
    "lab_tests": (RefLabTest, ["code", "display", "long_name", "short_name", "component"], ["class_type", "unit", "specimen", "is_common"]),
    "medications": (RefMedication, ["code", "display", "ingredient"], ["tty", "drug_class", "dose_form", "route", "strength"]),
    "procedures": (RefProcedure, ["code", "display"], ["category"]),
    "specialties": (RefSpecialty, ["code", "display", "classification", "specialization"], ["grouping"]),
    "sdoh": (RefSdohDomain, ["code", "display", "domain"], ["category", "description"]),
    "instruments": (RefInstrument, ["code", "display", "short_name"], ["publisher", "score_min", "score_max", "condition_tags"]),
}


@router.get("/{domain}/search")
async def search_reference(
    domain: str,
    q: str = Query("", min_length=0, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Search a clinical reference domain. Returns [{system, code, display, ...}]."""
    if domain not in DOMAIN_MAP:
        return []

    model, search_cols, extra_cols = DOMAIN_MAP[domain]

    query = select(model).where(model.is_active == True)

    if q.strip():
        search_term = q.strip()
        # Use ILIKE for prefix match on code, trigram similarity on display
        conditions = []
        for col_name in search_cols:
            col = getattr(model, col_name, None)
            if col is not None:
                conditions.append(col.ilike(f"%{search_term}%"))
        if conditions:
            query = query.where(or_(*conditions))

    query = query.order_by(model.code).limit(limit)

    result = await db.execute(query)
    rows = result.scalars().all()

    return [
        {
            "system": row.system,
            "code": row.code,
            "display": row.display,
            **{col: getattr(row, col, None) for col in extra_cols},
        }
        for row in rows
    ]
```

- [ ] **Step 2: Register the router in main.py**

In `backend/app/main.py`, add to `ROUTER_REGISTRY`:

```python
from app.routers import reference
# In the ROUTER_REGISTRY list:
    (reference.router, "/api/reference", ["Reference"]),
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/reference.py backend/app/main.py
git commit -m "feat: generic clinical reference lookup API — /api/reference/{domain}/search"
```

---

### Task 3: Ingestion Base + ICD-10-CM Script

**Files:**
- Create: `scripts/ingest/__init__.py`
- Create: `scripts/ingest/base.py`
- Create: `scripts/ingest/icd10.py`

- [ ] **Step 1: Create ingestion base module**

Create `scripts/ingest/__init__.py` (empty file).

Create `scripts/ingest/base.py`:

```python
"""Shared utilities for reference data ingestion scripts."""

import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

# Add backend to path so we can import models
BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/bradesco_care_admin",
)

# Convert async URL to sync for ingestion scripts
SYNC_URL = DATABASE_URL.replace("+asyncpg", "").replace("postgresql+asyncpg", "postgresql")


def get_sync_engine():
    return create_engine(SYNC_URL, echo=False)


def get_session():
    engine = get_sync_engine()
    return Session(engine)


def upsert_batch(session: Session, table_name: str, rows: list[dict], conflict_cols: list[str], update_cols: list[str], batch_size: int = 1000) -> tuple[int, int]:
    """Batch upsert rows into a table. Returns (inserted, updated)."""
    if not rows:
        return 0, 0

    cols = list(rows[0].keys())
    col_list = ", ".join(cols)
    val_placeholders = ", ".join(f":{c}" for c in cols)
    conflict_list = ", ".join(conflict_cols)
    update_set = ", ".join(f"{c} = EXCLUDED.{c}" for c in update_cols)

    sql = f"""
        INSERT INTO {table_name} ({col_list})
        VALUES ({val_placeholders})
        ON CONFLICT ({conflict_list}) DO UPDATE SET {update_set}
    """

    total = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        session.execute(text(sql), batch)
        total += len(batch)
        session.commit()

    return total, 0


def report(domain: str, total: int):
    print(f"[{domain}] Ingested {total:,} rows")
```

- [ ] **Step 2: Create ICD-10-CM ingestion script**

Create `scripts/ingest/icd10.py`:

```python
#!/usr/bin/env python3
"""Ingest ICD-10-CM codes from CDC order file.

Downloads the ICD-10-CM order file from CDC FTP and loads into ref_conditions.

Usage:
    python scripts/ingest/icd10.py
    python scripts/ingest/icd10.py --file /path/to/icd10cm_order_2026.txt
"""

import argparse
import io
import os
import sys
import uuid
import zipfile
from pathlib import Path
from urllib.request import urlopen

# Ensure base module is importable
sys.path.insert(0, str(Path(__file__).resolve().parent))
from base import get_session, upsert_batch, report

# CDC FTP URL for ICD-10-CM (update year as needed)
DEFAULT_URL = "https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2025/icd10cm_order_2025.txt"
VERSION = "2025"


def parse_order_file(lines: list[str]) -> list[dict]:
    """Parse the fixed-width ICD-10-CM order file.

    Format (fixed-width):
      Col 1-5:   Order number
      Col 7-13:  ICD-10-CM code (no dot)
      Col 15:    Header flag (0=valid code, 1=header/category)
      Col 17-77: Short description
      Col 78+:   Long description
    """
    rows = []
    for line in lines:
        if len(line) < 77:
            continue
        code_raw = line[6:13].strip()
        if not code_raw:
            continue
        header_flag = line[14:15].strip()
        short_desc = line[16:77].strip()
        long_desc = line[77:].strip() if len(line) > 77 else short_desc

        # Insert dot after 3rd character for codes > 3 chars
        if len(code_raw) > 3:
            code = code_raw[:3] + "." + code_raw[3:]
        else:
            code = code_raw

        is_billable = header_flag == "0"
        category_code = code[:3] if len(code) > 3 else None

        rows.append({
            "id": str(uuid.uuid4()),
            "system": "http://hl7.org/fhir/sid/icd-10-cm",
            "version": VERSION,
            "code": code,
            "display": long_desc or short_desc,
            "chapter": None,
            "block_range": None,
            "category_code": category_code,
            "is_billable": is_billable,
            "is_active": True,
        })
    return rows


def download_and_parse(url: str) -> list[dict]:
    """Download from URL and parse."""
    print(f"Downloading {url}...")
    resp = urlopen(url)
    data = resp.read()

    if url.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            for name in zf.namelist():
                if "order" in name.lower() and name.endswith(".txt"):
                    lines = zf.read(name).decode("utf-8", errors="replace").splitlines()
                    return parse_order_file(lines)
        raise ValueError("No order file found in ZIP")
    else:
        lines = data.decode("utf-8", errors="replace").splitlines()
        return parse_order_file(lines)


def main():
    parser = argparse.ArgumentParser(description="Ingest ICD-10-CM codes")
    parser.add_argument("--file", help="Local file path (skip download)")
    parser.add_argument("--url", default=DEFAULT_URL, help="Download URL")
    args = parser.parse_args()

    if args.file:
        with open(args.file) as f:
            rows = parse_order_file(f.readlines())
    else:
        rows = download_and_parse(args.url)

    print(f"Parsed {len(rows):,} codes")

    session = get_session()
    total, _ = upsert_batch(
        session, "ref_conditions", rows,
        conflict_cols=["system", "code"],
        update_cols=["display", "version", "category_code", "is_billable", "is_active"],
    )
    session.close()
    report("ICD-10-CM", total)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Commit**

```bash
git add scripts/ingest/
git commit -m "feat: ingestion base + ICD-10-CM ingestion script from CDC"
```

---

### Task 4: LOINC Ingestion Script

**Files:**
- Create: `scripts/ingest/loinc.py`

- [ ] **Step 1: Create LOINC ingestion script**

Create `scripts/ingest/loinc.py`:

```python
#!/usr/bin/env python3
"""Ingest LOINC lab test definitions.

Requires a downloaded LOINC CSV file (registration required at loinc.org).

Usage:
    python scripts/ingest/loinc.py --file /path/to/Loinc.csv
    python scripts/ingest/loinc.py --file /path/to/Loinc.csv --common-only
"""

import argparse
import csv
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from base import get_session, upsert_batch, report

VERSION = "2.82"

# Classes considered "common" for care management
COMMON_CLASSES = {"CHEM", "HEM/BC", "UA", "SERO", "DRUG/TOX", "PANEL.CHEM", "PANEL.HEM/BC", "PANEL.UA"}

# Additional commonly ordered LOINC codes to flag
COMMON_CODES = {
    "4548-4",   # HbA1c
    "2345-7",   # Glucose
    "2160-0",   # Creatinine
    "33914-3",  # eGFR
    "2093-3",   # Cholesterol total
    "2571-8",   # Triglycerides
    "2085-9",   # HDL
    "13457-7",  # LDL
    "6299-2",   # BUN
    "718-7",    # Hemoglobin
    "4544-3",   # Hematocrit
    "6690-2",   # WBC
    "777-3",    # Platelets
    "2823-3",   # Potassium
    "2951-2",   # Sodium
    "1742-6",   # ALT
    "1920-8",   # AST
    "1975-2",   # Bilirubin total
    "1751-7",   # Albumin
    "14749-6",  # Glucose fasting
    "9318-7",   # Albumin/Creatinine ratio (uACR)
    "44249-1",  # PHQ-9
    "69737-5",  # GAD-7
    "89247-1",  # ECOG
    "89244-8",  # Karnofsky panel
    "14804-9",  # LDH
}


def parse_loinc_csv(filepath: str, common_only: bool = False) -> list[dict]:
    rows = []
    with open(filepath, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row.get("LOINC_NUM", "").strip()
            if not code:
                continue

            status = row.get("STATUS", "").strip()
            if status == "DEPRECATED":
                continue

            class_type = row.get("CLASS", "").strip()
            is_common = class_type in COMMON_CLASSES or code in COMMON_CODES

            if common_only and not is_common:
                continue

            long_name = row.get("LONG_COMMON_NAME", "").strip()
            short_name = row.get("SHORTNAME", "").strip()
            component = row.get("COMPONENT", "").strip()

            rows.append({
                "id": str(uuid.uuid4()),
                "system": "http://loinc.org",
                "version": VERSION,
                "code": code,
                "long_name": long_name or component or code,
                "short_name": short_name or None,
                "display": short_name or long_name or component or code,
                "component": component or None,
                "property": row.get("PROPERTY", "").strip() or None,
                "time_aspect": row.get("TIME_ASPCT", "").strip() or None,
                "specimen": row.get("SYSTEM", "").strip() or None,
                "scale_type": row.get("SCALE_TYP", "").strip() or None,
                "method_type": row.get("METHOD_TYP", "").strip() or None,
                "class_type": class_type or None,
                "order_obs": row.get("ORDER_OBS", "").strip() or None,
                "unit": row.get("EXAMPLE_UCUM_UNITS", "").strip() or None,
                "is_common": is_common,
                "is_active": True,
            })
    return rows


def main():
    parser = argparse.ArgumentParser(description="Ingest LOINC lab tests")
    parser.add_argument("--file", required=True, help="Path to Loinc.csv")
    parser.add_argument("--common-only", action="store_true", help="Only ingest common lab classes")
    args = parser.parse_args()

    rows = parse_loinc_csv(args.file, args.common_only)
    print(f"Parsed {len(rows):,} LOINC codes")

    session = get_session()
    total, _ = upsert_batch(
        session, "ref_lab_tests", rows,
        conflict_cols=["system", "code"],
        update_cols=["display", "long_name", "short_name", "component", "class_type", "unit", "is_common", "is_active", "version"],
    )
    session.close()
    report("LOINC", total)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add scripts/ingest/loinc.py
git commit -m "feat: LOINC ingestion script from CSV download"
```

---

### Task 5: RxNorm Ingestion Script (via Public API)

**Files:**
- Create: `scripts/ingest/rxnorm.py`

- [ ] **Step 1: Create RxNorm ingestion script**

Create `scripts/ingest/rxnorm.py`:

```python
#!/usr/bin/env python3
"""Ingest RxNorm drug concepts via NLM public API.

No authentication required. Rate limit: 20 requests/second.

Usage:
    python scripts/ingest/rxnorm.py
    python scripts/ingest/rxnorm.py --tty IN,SCD    # Ingredients + Semantic Clinical Drugs only
"""

import argparse
import json
import sys
import time
import uuid
from pathlib import Path
from urllib.request import urlopen, Request

sys.path.insert(0, str(Path(__file__).resolve().parent))
from base import get_session, upsert_batch, report

BASE_URL = "https://rxnav.nlm.nih.gov/REST"
DEFAULT_TTYS = ["IN", "SCD", "SBD", "BN"]  # Ingredient, Semantic Clinical Drug, Branded, Brand Name


def api_get(path: str) -> dict:
    """GET from RxNav API with rate limiting."""
    url = f"{BASE_URL}{path}"
    req = Request(url, headers={"Accept": "application/json"})
    resp = urlopen(req)
    time.sleep(0.06)  # ~16 req/sec, under the 20/sec limit
    return json.loads(resp.read())


def fetch_all_concepts(tty: str) -> list[dict]:
    """Fetch all concepts of a given term type."""
    data = api_get(f"/allconcepts.json?tty={tty}")
    group = data.get("minConceptGroup", {}).get("minConcept", [])
    return group


def fetch_properties(rxcui: str) -> dict:
    """Fetch detailed properties for a single concept."""
    data = api_get(f"/rxcui/{rxcui}/allProperties.json?prop=all")
    props = {}
    for group in data.get("propConceptGroup", {}).get("propConcept", []):
        props[group.get("propName", "")] = group.get("propValue", "")
    return props


def main():
    parser = argparse.ArgumentParser(description="Ingest RxNorm via public API")
    parser.add_argument("--tty", default=",".join(DEFAULT_TTYS), help="Comma-separated term types")
    parser.add_argument("--limit", type=int, default=0, help="Max concepts per TTY (0=all)")
    args = parser.parse_args()

    ttys = args.tty.split(",")
    all_rows = []
    version = time.strftime("%Y-%m")

    for tty in ttys:
        print(f"Fetching {tty} concepts...")
        concepts = fetch_all_concepts(tty)
        if args.limit:
            concepts = concepts[:args.limit]
        print(f"  Found {len(concepts):,} {tty} concepts")

        for i, c in enumerate(concepts):
            rxcui = c.get("rxcui", "")
            name = c.get("name", "")
            if not rxcui or not name:
                continue

            all_rows.append({
                "id": str(uuid.uuid4()),
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "version": version,
                "code": rxcui,
                "display": name,
                "tty": tty,
                "ingredient": None,
                "drug_class": None,
                "dose_form": None,
                "route": None,
                "strength": None,
                "is_active": True,
            })

            if (i + 1) % 500 == 0:
                print(f"  Processed {i+1}/{len(concepts)}")

    print(f"Total: {len(all_rows):,} concepts")

    session = get_session()
    total, _ = upsert_batch(
        session, "ref_medications", all_rows,
        conflict_cols=["system", "code"],
        update_cols=["display", "tty", "version", "is_active"],
    )
    session.close()
    report("RxNorm", total)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add scripts/ingest/rxnorm.py
git commit -m "feat: RxNorm ingestion script via NLM public API"
```

---

### Task 6: HCPCS + NUCC Ingestion Scripts

**Files:**
- Create: `scripts/ingest/hcpcs.py`
- Create: `scripts/ingest/nucc.py`

- [ ] **Step 1: Create HCPCS ingestion script**

Create `scripts/ingest/hcpcs.py`:

```python
#!/usr/bin/env python3
"""Ingest HCPCS Level II codes from CMS download.

Usage:
    python scripts/ingest/hcpcs.py --file /path/to/HCPC2025_CONTR_ANWEB.csv
"""

import argparse
import csv
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from base import get_session, upsert_batch, report

VERSION = "2025"


def parse_hcpcs(filepath: str) -> list[dict]:
    rows = []
    with open(filepath, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = (row.get("HCPC", "") or row.get("HCPCS", "") or row.get("Code", "")).strip()
            desc = (row.get("LONG DESCRIPTION", "") or row.get("Long Description", "") or row.get("Description", "")).strip()
            if not code or not desc:
                continue

            rows.append({
                "id": str(uuid.uuid4()),
                "system": "http://terminology.hl7.org/CodeSystem/HCPCS",
                "version": VERSION,
                "code": code,
                "display": desc,
                "category": None,
                "effective_date": None,
                "termination_date": None,
                "is_active": True,
            })
    return rows


def main():
    parser = argparse.ArgumentParser(description="Ingest HCPCS Level II codes")
    parser.add_argument("--file", required=True, help="Path to HCPCS CSV")
    args = parser.parse_args()

    rows = parse_hcpcs(args.file)
    print(f"Parsed {len(rows):,} HCPCS codes")

    session = get_session()
    total, _ = upsert_batch(
        session, "ref_procedures", rows,
        conflict_cols=["system", "code"],
        update_cols=["display", "version", "is_active"],
    )
    session.close()
    report("HCPCS", total)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Create NUCC ingestion script**

Create `scripts/ingest/nucc.py`:

```python
#!/usr/bin/env python3
"""Ingest NUCC provider taxonomy from CSV download.

Download from: https://nucc.org (CSV download link on taxonomy page)

Usage:
    python scripts/ingest/nucc.py --file /path/to/nucc_taxonomy_260.csv
"""

import argparse
import csv
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from base import get_session, upsert_batch, report

VERSION = "26.0"


def parse_nucc(filepath: str) -> list[dict]:
    rows = []
    with open(filepath, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = (row.get("Code", "") or row.get("code", "")).strip()
            if not code:
                continue

            grouping = (row.get("Grouping", "") or row.get("grouping", "")).strip()
            classification = (row.get("Classification", "") or row.get("classification", "")).strip()
            specialization = (row.get("Specialization", "") or row.get("specialization", "")).strip()
            display = specialization or classification or grouping or code

            rows.append({
                "id": str(uuid.uuid4()),
                "system": "http://nucc.org/provider-taxonomy",
                "version": VERSION,
                "code": code,
                "display": display,
                "classification": classification or None,
                "specialization": specialization or None,
                "grouping": grouping or None,
                "is_active": True,
            })
    return rows


def main():
    parser = argparse.ArgumentParser(description="Ingest NUCC provider taxonomy")
    parser.add_argument("--file", required=True, help="Path to NUCC CSV")
    args = parser.parse_args()

    rows = parse_nucc(args.file)
    print(f"Parsed {len(rows):,} taxonomy codes")

    session = get_session()
    total, _ = upsert_batch(
        session, "ref_specialties", rows,
        conflict_cols=["system", "code"],
        update_cols=["display", "classification", "specialization", "grouping", "version", "is_active"],
    )
    session.close()
    report("NUCC", total)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Commit**

```bash
git add scripts/ingest/hcpcs.py scripts/ingest/nucc.py
git commit -m "feat: HCPCS + NUCC ingestion scripts"
```

---

### Task 7: SDOH + Instruments + Value Sets (Curated JSON)

**Files:**
- Create: `scripts/ingest/data/sdoh_domains.json`
- Create: `scripts/ingest/data/instruments.json`
- Create: `scripts/ingest/data/value_sets.json`
- Create: `scripts/ingest/sdoh.py`
- Create: `scripts/ingest/instruments.py`
- Create: `scripts/ingest/value_sets.py`

- [ ] **Step 1: Create SDOH curated data**

Create `scripts/ingest/data/sdoh_domains.json`:

```json
[
  {"code": "food-insecurity", "display": "Food Insecurity", "domain": "Food", "category": "Social Risk", "description": "Lack of consistent access to adequate food", "screening_context": "Annual screening recommended"},
  {"code": "housing-instability", "display": "Housing Instability", "domain": "Housing", "category": "Social Risk", "description": "Inadequate or unstable housing situation", "screening_context": "Annual screening recommended"},
  {"code": "homelessness", "display": "Homelessness", "domain": "Housing", "category": "Social Risk", "description": "Currently experiencing homelessness", "screening_context": "At intake and annually"},
  {"code": "transportation-insecurity", "display": "Transportation Insecurity", "domain": "Transportation", "category": "Social Risk", "description": "Inability to obtain transportation for medical visits", "screening_context": "At intake"},
  {"code": "financial-strain", "display": "Financial Strain", "domain": "Financial", "category": "Social Risk", "description": "Difficulty paying for basic needs or medical care", "screening_context": "Annual screening recommended"},
  {"code": "social-isolation", "display": "Social Isolation", "domain": "Social Connection", "category": "Social Risk", "description": "Lack of social support network or frequent loneliness", "screening_context": "Annual screening recommended"},
  {"code": "intimate-partner-violence", "display": "Intimate Partner Violence", "domain": "Safety", "category": "Social Risk", "description": "Experience of violence by an intimate partner", "screening_context": "Per clinical judgment"},
  {"code": "education-barriers", "display": "Education Barriers", "domain": "Education", "category": "Social Risk", "description": "Low literacy or limited educational attainment affecting health", "screening_context": "At intake"},
  {"code": "employment-barriers", "display": "Employment Barriers", "domain": "Employment", "category": "Social Risk", "description": "Unemployment or underemployment affecting health access", "screening_context": "Annual screening recommended"},
  {"code": "veteran-status", "display": "Veteran Status", "domain": "Demographics", "category": "Demographic Factor", "description": "Military veteran with potential service-related health needs", "screening_context": "At intake"},
  {"code": "caregiver-burden", "display": "Caregiver Burden", "domain": "Social Connection", "category": "Social Risk", "description": "Patient or caregiver experiencing significant caregiving demands", "screening_context": "Per clinical judgment"},
  {"code": "health-literacy", "display": "Limited Health Literacy", "domain": "Education", "category": "Social Risk", "description": "Difficulty understanding health information or instructions", "screening_context": "At intake"},
  {"code": "language-barrier", "display": "Language Barrier", "domain": "Education", "category": "Access Barrier", "description": "Limited English proficiency affecting care communication", "screening_context": "At intake"},
  {"code": "digital-access", "display": "Limited Digital Access", "domain": "Technology", "category": "Access Barrier", "description": "Lack of internet, smartphone, or computer access", "screening_context": "At intake"},
  {"code": "financial-toxicity", "display": "Financial Toxicity (Cancer)", "domain": "Financial", "category": "Social Risk", "description": "Financial hardship resulting from cancer treatment costs", "screening_context": "At oncology intake and ongoing"},
  {"code": "stress", "display": "Chronic Stress", "domain": "Mental Health", "category": "Social Risk", "description": "Persistent psychological stress affecting health outcomes", "screening_context": "Annual screening recommended"},
  {"code": "substance-use", "display": "Substance Use Risk", "domain": "Mental Health", "category": "Social Risk", "description": "At-risk alcohol or substance use patterns", "screening_context": "Annual screening recommended"},
  {"code": "utilities-insecurity", "display": "Utilities Insecurity", "domain": "Housing", "category": "Social Risk", "description": "Inability to pay utility bills (heat, electricity, water)", "screening_context": "Annual screening recommended"}
]
```

- [ ] **Step 2: Create instruments curated data**

Create `scripts/ingest/data/instruments.json`:

```json
[
  {"code": "44249-1", "display": "PHQ-9 Quick Depression Assessment Panel", "short_name": "PHQ-9", "publisher": "Pfizer Inc.", "description": "Patient Health Questionnaire for depression screening", "score_min": 0, "score_max": 27, "interpretation": [{"min":0,"max":4,"label":"Minimal"},{"min":5,"max":9,"label":"Mild"},{"min":10,"max":14,"label":"Moderate"},{"min":15,"max":19,"label":"Moderately Severe"},{"min":20,"max":27,"label":"Severe"}], "condition_tags": ["depression","mental_health"]},
  {"code": "69737-5", "display": "GAD-7 Generalized Anxiety Disorder Scale", "short_name": "GAD-7", "publisher": "Pfizer Inc.", "description": "7-item anxiety screening measure", "score_min": 0, "score_max": 21, "interpretation": [{"min":0,"max":4,"label":"Minimal"},{"min":5,"max":9,"label":"Mild"},{"min":10,"max":14,"label":"Moderate"},{"min":15,"max":21,"label":"Severe"}], "condition_tags": ["anxiety","mental_health"]},
  {"code": "89247-1", "display": "ECOG Performance Status", "short_name": "ECOG", "publisher": "ECOG-ACRIN", "description": "Eastern Cooperative Oncology Group functional status scale", "score_min": 0, "score_max": 5, "interpretation": [{"min":0,"max":0,"label":"Fully active"},{"min":1,"max":1,"label":"Restricted but ambulatory"},{"min":2,"max":2,"label":"Ambulatory, self-care capable"},{"min":3,"max":3,"label":"Limited self-care, confined >50%"},{"min":4,"max":4,"label":"Completely disabled"},{"min":5,"max":5,"label":"Dead"}], "condition_tags": ["oncology","functional_status"]},
  {"code": "89244-8", "display": "Karnofsky Performance Status Panel", "short_name": "Karnofsky", "publisher": "Memorial Sloan Kettering", "description": "Performance status scale for cancer patients (0-100)", "score_min": 0, "score_max": 100, "interpretation": [{"min":80,"max":100,"label":"Able to carry on normal activity"},{"min":50,"max":70,"label":"Unable to work, requires varying assistance"},{"min":10,"max":40,"label":"Unable to care for self"},{"min":0,"max":0,"label":"Dead"}], "condition_tags": ["oncology","functional_status"]},
  {"code": "NCCN-DT", "display": "NCCN Distress Thermometer", "short_name": "NCCN Distress", "publisher": "NCCN", "description": "Single-item visual analog scale for cancer-related distress screening", "score_min": 0, "score_max": 10, "interpretation": [{"min":0,"max":3,"label":"Low distress"},{"min":4,"max":6,"label":"Moderate distress"},{"min":7,"max":10,"label":"High distress"}], "condition_tags": ["oncology","distress","mental_health"]},
  {"code": "ESAS-R", "display": "Edmonton Symptom Assessment System Revised", "short_name": "ESAS-r", "publisher": "Alberta Health Services", "description": "9-symptom assessment for palliative care patients", "score_min": 0, "score_max": 90, "interpretation": [{"min":0,"max":27,"label":"Low symptom burden"},{"min":28,"max":54,"label":"Moderate symptom burden"},{"min":55,"max":90,"label":"High symptom burden"}], "condition_tags": ["oncology","palliative","symptom_management"]},
  {"code": "DDS-17", "display": "Diabetes Distress Scale", "short_name": "DDS", "publisher": "University of California", "description": "17-item scale measuring diabetes-related emotional distress", "score_min": 1, "score_max": 6, "interpretation": [{"min":1.0,"max":1.9,"label":"Little/no distress"},{"min":2.0,"max":2.9,"label":"Moderate distress"},{"min":3.0,"max":6.0,"label":"High distress"}], "condition_tags": ["diabetes","mental_health"]},
  {"code": "MMAS-8", "display": "Morisky Medication Adherence Scale", "short_name": "MMAS-8", "publisher": "Morisky DE", "description": "8-item self-reported medication adherence measure", "score_min": 0, "score_max": 8, "interpretation": [{"min":0,"max":5,"label":"Low adherence"},{"min":6,"max":7,"label":"Medium adherence"},{"min":8,"max":8,"label":"High adherence"}], "condition_tags": ["adherence","chronic_disease"]},
  {"code": "AUDIT-C", "display": "Alcohol Use Disorders Identification Test - Consumption", "short_name": "AUDIT-C", "publisher": "WHO", "description": "3-item alcohol screening", "score_min": 0, "score_max": 12, "interpretation": [{"min":0,"max":2,"label":"Low risk (women)"},{"min":0,"max":3,"label":"Low risk (men)"},{"min":3,"max":12,"label":"At risk"}], "condition_tags": ["substance_use","mental_health"]},
  {"code": "PROMIS-10", "display": "PROMIS Global Health 10", "short_name": "PROMIS-10", "publisher": "NIH", "description": "10-item global health and quality of life measure", "score_min": 10, "score_max": 50, "interpretation": [{"min":10,"max":29,"label":"Poor"},{"min":30,"max":39,"label":"Fair"},{"min":40,"max":50,"label":"Good to Excellent"}], "condition_tags": ["quality_of_life","general"]}
]
```

- [ ] **Step 3: Create value sets seed data**

Create `scripts/ingest/data/value_sets.json`:

```json
[
  {
    "url": "https://bradesco-care/ValueSet/diabetes-diagnoses",
    "name": "DiabetesDiagnoses",
    "title": "Diabetes-Related Diagnoses",
    "description": "ICD-10-CM codes for diabetes mellitus and related conditions",
    "compose": {"include": [{"system": "http://hl7.org/fhir/sid/icd-10-cm", "filter": [{"property": "code", "op": "is-a", "value": "E08"},{"property": "code", "op": "is-a", "value": "E09"},{"property": "code", "op": "is-a", "value": "E10"},{"property": "code", "op": "is-a", "value": "E11"},{"property": "code", "op": "is-a", "value": "E13"},{"property": "code", "op": "is-a", "value": "R73"}]}]}
  },
  {
    "url": "https://bradesco-care/ValueSet/oncology-diagnoses",
    "name": "OncologyDiagnoses",
    "title": "Oncology-Related Diagnoses",
    "description": "ICD-10-CM codes for malignant neoplasms and metastasis",
    "compose": {"include": [{"system": "http://hl7.org/fhir/sid/icd-10-cm", "filter": [{"property": "code", "op": "is-a", "value": "C"},{"property": "code", "op": "is-a", "value": "D0"}]}]}
  },
  {
    "url": "https://bradesco-care/ValueSet/cardiology-diagnoses",
    "name": "CardiologyDiagnoses",
    "title": "Cardiology-Related Diagnoses",
    "description": "ICD-10-CM codes for heart failure, CAD, and cardiovascular conditions",
    "compose": {"include": [{"system": "http://hl7.org/fhir/sid/icd-10-cm", "filter": [{"property": "code", "op": "is-a", "value": "I"},{"property": "code", "op": "is-a", "value": "R00"}]}]}
  },
  {
    "url": "https://bradesco-care/ValueSet/common-labs",
    "name": "CommonLabs",
    "title": "Commonly Ordered Lab Tests",
    "description": "LOINC codes for the most frequently ordered laboratory tests in care management",
    "compose": {"include": [{"system": "http://loinc.org", "concept": [{"code": "4548-4"},{"code": "2345-7"},{"code": "2160-0"},{"code": "33914-3"},{"code": "2093-3"},{"code": "2571-8"},{"code": "2085-9"},{"code": "13457-7"},{"code": "718-7"},{"code": "6690-2"},{"code": "14804-9"},{"code": "1751-7"},{"code": "9318-7"}]}]}
  },
  {
    "url": "https://bradesco-care/ValueSet/mental-health-screens",
    "name": "MentalHealthScreens",
    "title": "Mental Health Screening Instruments",
    "description": "Validated instruments for depression, anxiety, and distress screening",
    "compose": {"include": [{"system": "http://loinc.org", "concept": [{"code": "44249-1"},{"code": "69737-5"},{"code": "AUDIT-C"}]}]}
  }
]
```

- [ ] **Step 4: Create SDOH ingestion script**

Create `scripts/ingest/sdoh.py`:

```python
#!/usr/bin/env python3
"""Ingest SDOH domains from curated JSON."""

import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from base import get_session, upsert_batch, report

DATA_FILE = Path(__file__).parent / "data" / "sdoh_domains.json"
VERSION = "2025"


def main():
    with open(DATA_FILE) as f:
        domains = json.load(f)

    rows = [
        {
            "id": str(uuid.uuid4()),
            "system": "http://hl7.org/fhir/us/sdoh-clinicalcare",
            "version": VERSION,
            **d,
            "is_active": True,
        }
        for d in domains
    ]

    session = get_session()
    total, _ = upsert_batch(
        session, "ref_sdoh_domains", rows,
        conflict_cols=["system", "code"],
        update_cols=["display", "domain", "category", "description", "screening_context", "version", "is_active"],
    )
    session.close()
    report("SDOH", total)


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Create instruments ingestion script**

Create `scripts/ingest/instruments.py`:

```python
#!/usr/bin/env python3
"""Ingest screening instruments from curated JSON."""

import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from base import get_session, upsert_batch, report

DATA_FILE = Path(__file__).parent / "data" / "instruments.json"


def main():
    with open(DATA_FILE) as f:
        instruments = json.load(f)

    rows = []
    for inst in instruments:
        rows.append({
            "id": str(uuid.uuid4()),
            "system": "http://loinc.org",
            "version": None,
            "code": inst["code"],
            "display": inst["display"],
            "short_name": inst.get("short_name"),
            "publisher": inst.get("publisher"),
            "description": inst.get("description"),
            "score_min": inst.get("score_min"),
            "score_max": inst.get("score_max"),
            "interpretation": json.dumps(inst.get("interpretation", [])),
            "condition_tags": inst.get("condition_tags", []),
            "is_active": True,
        })

    session = get_session()
    total, _ = upsert_batch(
        session, "ref_instruments", rows,
        conflict_cols=["system", "code"],
        update_cols=["display", "short_name", "publisher", "description", "score_min", "score_max", "interpretation", "condition_tags", "is_active"],
    )
    session.close()
    report("Instruments", total)


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Create value sets ingestion script**

Create `scripts/ingest/value_sets.py`:

```python
#!/usr/bin/env python3
"""Ingest seed value sets from curated JSON."""

import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from base import get_session, upsert_batch, report

DATA_FILE = Path(__file__).parent / "data" / "value_sets.json"


def main():
    with open(DATA_FILE) as f:
        value_sets = json.load(f)

    rows = [
        {
            "id": str(uuid.uuid4()),
            "url": vs["url"],
            "name": vs["name"],
            "title": vs["title"],
            "status": "active",
            "description": vs.get("description"),
            "compose": json.dumps(vs["compose"]),
        }
        for vs in value_sets
    ]

    session = get_session()
    total, _ = upsert_batch(
        session, "ref_value_sets", rows,
        conflict_cols=["url"],
        update_cols=["title", "description", "compose", "status"],
    )
    session.close()
    report("Value Sets", total)


if __name__ == "__main__":
    main()
```

- [ ] **Step 7: Commit**

```bash
git add scripts/ingest/data/ scripts/ingest/sdoh.py scripts/ingest/instruments.py scripts/ingest/value_sets.py
git commit -m "feat: SDOH, instruments, and value sets ingestion with curated JSON data"
```

---

### Task 8: Master Runner Script

**Files:**
- Create: `scripts/ingest/run_all.py`

- [ ] **Step 1: Create run_all.py**

Create `scripts/ingest/run_all.py`:

```python
#!/usr/bin/env python3
"""Run all reference data ingestion scripts.

For datasets requiring local files (LOINC, HCPCS, NUCC), pass paths via args.
Datasets with public APIs or curated JSON run automatically.

Usage:
    # Minimum — curated + API datasets only
    python scripts/ingest/run_all.py

    # Full — all datasets
    python scripts/ingest/run_all.py \
        --loinc-file /path/to/Loinc.csv \
        --hcpcs-file /path/to/HCPC_CONTR_ANWEB.csv \
        --nucc-file /path/to/nucc_taxonomy.csv
"""

import argparse
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent


def run_script(name: str, args: list[str] = None):
    cmd = [sys.executable, str(SCRIPT_DIR / name)] + (args or [])
    print(f"\n{'='*60}")
    print(f"Running: {' '.join(cmd)}")
    print(f"{'='*60}")
    result = subprocess.run(cmd, cwd=str(SCRIPT_DIR.parents[1]))
    if result.returncode != 0:
        print(f"WARNING: {name} exited with code {result.returncode}")
    return result.returncode


def main():
    parser = argparse.ArgumentParser(description="Run all reference data ingestion")
    parser.add_argument("--loinc-file", help="Path to Loinc.csv")
    parser.add_argument("--hcpcs-file", help="Path to HCPCS CSV")
    parser.add_argument("--nucc-file", help="Path to NUCC CSV")
    parser.add_argument("--skip-api", action="store_true", help="Skip API-based ingestion (RxNorm, ICD-10)")
    args = parser.parse_args()

    results = {}

    # 1. Curated JSON — always run
    results["SDOH"] = run_script("sdoh.py")
    results["Instruments"] = run_script("instruments.py")
    results["Value Sets"] = run_script("value_sets.py")

    # 2. Download/API — run unless skipped
    if not args.skip_api:
        results["ICD-10-CM"] = run_script("icd10.py")
        results["RxNorm"] = run_script("rxnorm.py", ["--tty", "IN,BN", "--limit", "5000"])

    # 3. Local file — run if provided
    if args.loinc_file:
        results["LOINC"] = run_script("loinc.py", ["--file", args.loinc_file])
    else:
        print("\nSkipping LOINC (no --loinc-file provided)")

    if args.hcpcs_file:
        results["HCPCS"] = run_script("hcpcs.py", ["--file", args.hcpcs_file])
    else:
        print("\nSkipping HCPCS (no --hcpcs-file provided)")

    if args.nucc_file:
        results["NUCC"] = run_script("nucc.py", ["--file", args.nucc_file])
    else:
        print("\nSkipping NUCC (no --nucc-file provided)")

    # Summary
    print(f"\n{'='*60}")
    print("INGESTION SUMMARY")
    print(f"{'='*60}")
    for name, code in results.items():
        status = "OK" if code == 0 else f"FAILED (exit {code})"
        print(f"  {name:20s} {status}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add scripts/ingest/run_all.py
git commit -m "feat: master ingestion runner script"
```
