# Phase 2: Patients — Registry + Detail + AI Care Summary

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the patient registry (searchable, filterable data table) and patient detail page (dense header, KPI strip, tabbed view with AI care summary, care protocols, clinical data, timeline). Seed 500 synthetic Brazilian patients with labs, medications, diagnoses, and CRS scores.

**Architecture:** Backend patient models + seed data + CRUD endpoints. Frontend patient store + registry page + detail page with 5 tabs. AI care summary calls the LLM abstraction layer (stubbed in this phase — returns mock AI content until Phase 3 wires real LLM).

**Tech Stack:** Same as Phase 1. New: backend patient models, patient seed with realistic Brazilian data.

**Spec reference:** `docs/superpowers/specs/2026-04-07-bradesco-care-admin-redesign.md` — Sections 5.2 (DB model), 5.3 (API endpoints), 4.2 (directory structure), 9.2-9.3 (screen specs)

**Critical rules (apply to every task):**
- NO emojis — Lucide icons only
- NO custom UI components — shadcn/ui only
- NO hardcoded paths/colors/labels — config only
- `cn()` for all class composition
- Follow existing patterns exactly (stores, API client, router registry, seed service)

---

## Task 1: Backend Patient Models

**Files:**
- Create: `backend/app/models/patient.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create backend/app/models/patient.py**

```python
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
)
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Patient(Base, TimestampMixin):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    empi_id: Mapped[str] = mapped_column(String(50), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cpf: Mapped[str | None] = mapped_column(String(14), nullable=True)
    address: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    insurance_plan: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pcp_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(10), default="pt")
    preferred_channel: Mapped[str] = mapped_column(String(20), default="whatsapp")
    allergies: Mapped[list | None] = mapped_column(JSON, nullable=True)
    active_medications: Mapped[list | None] = mapped_column(JSON, nullable=True)
    sdoh_flags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    tier: Mapped[int] = mapped_column(Integer, default=0)
    crs_score: Mapped[int] = mapped_column(Integer, default=0)
    crs_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    pathway_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    pathway_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    care_gaps: Mapped[list | None] = mapped_column(JSON, nullable=True)
    last_contact_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(100), nullable=True)
    review_due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    labs = relationship("PatientLab", back_populates="patient", cascade="all, delete-orphan")
    diagnoses = relationship("PatientDiagnosis", back_populates="patient", cascade="all, delete-orphan")


class PatientLab(Base):
    __tablename__ = "patient_labs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    test_type: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    source_system: Mapped[str | None] = mapped_column(String(50), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    patient = relationship("Patient", back_populates="labs")


class PatientDiagnosis(Base):
    __tablename__ = "patient_diagnoses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    icd10_code: Mapped[str] = mapped_column(String(10), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    diagnosed_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    patient = relationship("Patient", back_populates="diagnoses")
```

- [ ] **Step 2: Update backend/app/models/__init__.py**

Add Patient, PatientLab, PatientDiagnosis to the imports and __all__.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add Patient, PatientLab, PatientDiagnosis models"
```

---

## Task 2: Patient Seed Data (500 patients)

**Files:**
- Create: `backend/app/services/patient_seed.py`
- Modify: `backend/app/services/seed_service.py` (call patient seed)

Create a seed function that generates 500 synthetic Brazilian patients with:
- Realistic Brazilian names (first/last from a corpus of ~50 each)
- Cities: Sao Paulo, Rio de Janeiro, Belo Horizonte, Curitiba, Salvador, Brasilia, Porto Alegre, Fortaleza
- Phone: +55 DDD format
- CPF: realistic format (XXX.XXX.XXX-XX)
- Age distribution: 25-78 years
- Gender: 48% male, 48% female, 4% other
- Tier distribution: Tier 0 (20%), Tier 1 (26%), Tier 2 (30%), Tier 3 (16%), Tier 4 (8%)
- CRS scores correlated with tier (Tier 0: 0-15, Tier 1: 16-30, Tier 2: 31-50, Tier 3: 51-70, Tier 4: 71-100)
- ICD-10 diagnoses appropriate per tier
- 3-8 lab records per patient (HbA1c, FPG, eGFR, uACR, LDL, BP systolic, BMI) with values correlated to tier
- Active medications correlated with tier (Tier 0: none, Tier 2: Metformin, Tier 3-4: Metformin + others)
- PDC values in active_medications
- Care gaps (randomly assigned: eye exam, uACR, foot exam, dental)
- Assigned care manager names
- Pathway status and name per tier

Use Python's `random` module with a fixed seed (42) for deterministic output.

- [ ] **Step 1: Create backend/app/services/patient_seed.py**

Write the full seed function. Use the existing `DEFAULT_TENANT_ID` from seed_service.

- [ ] **Step 2: Modify seed_service.py to call patient seed**

Add `from app.services.patient_seed import seed_patients` and call it after the existing seed.

- [ ] **Step 3: Delete existing DB and restart to reseed**

```bash
rm backend/data/care-admin.db
cd backend && source .venv/bin/activate && uvicorn app.main:app --port 8000
# Should create 500 patients on startup
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: seed 500 synthetic Brazilian patients with labs and diagnoses"
```

---

## Task 3: Backend Patient API

**Files:**
- Create: `backend/app/schemas/patient.py`
- Create: `backend/app/services/patient_service.py`
- Create: `backend/app/routers/patients.py`
- Modify: `backend/app/main.py` (add patient router)

### Schemas (backend/app/schemas/patient.py)

```python
from pydantic import BaseModel


class PatientListItem(BaseModel):
    id: str
    empi_id: str
    first_name: str
    last_name: str
    date_of_birth: str
    gender: str
    phone: str | None
    tier: int
    crs_score: int
    pathway_status: str | None
    pathway_name: str | None
    care_gaps: list[str] | None
    last_contact_date: str | None
    assigned_to: str | None
    pcp_name: str | None
    insurance_plan: str | None
    active_medications: list[dict] | None


class PatientDetail(PatientListItem):
    email: str | None
    cpf: str | None
    address: dict | None
    preferred_language: str
    preferred_channel: str
    allergies: list[str] | None
    sdoh_flags: dict | None
    crs_breakdown: dict | None
    review_due_date: str | None


class PatientLabRecord(BaseModel):
    id: str
    test_type: str
    value: float
    unit: str
    source_system: str | None
    recorded_at: str


class PatientDiagnosisRecord(BaseModel):
    id: str
    icd10_code: str
    description: str
    diagnosed_at: str | None
    is_active: bool


class PatientListResponse(BaseModel):
    items: list[PatientListItem]
    total: int
    page: int
    page_size: int
    pages: int
```

### Service (backend/app/services/patient_service.py)

Implement:
- `list_patients(db, tenant_id, page, page_size, search, tier, pathway_status)` — paginated, filterable
- `get_patient(db, tenant_id, patient_id)` — single patient with full detail
- `get_patient_labs(db, tenant_id, patient_id)` — lab history ordered by recorded_at desc
- `get_patient_diagnoses(db, tenant_id, patient_id)` — active diagnoses

All queries filter by `tenant_id`.

### Router (backend/app/routers/patients.py)

Endpoints:
- `GET /` — list patients (query params: page, page_size, search, tier, pathway_status)
- `GET /{patient_id}` — patient detail
- `GET /{patient_id}/labs` — lab records
- `GET /{patient_id}/diagnoses` — diagnoses

All require `auth: AuthContext = Depends(get_auth)` and use `auth.tenant_id` for filtering.

### Modify main.py

Add to ROUTER_REGISTRY:
```python
(patients.router, "/api/patients", ["Patients"]),
```

- [ ] **Step 1: Create schemas, service, router**
- [ ] **Step 2: Add router to main.py**
- [ ] **Step 3: Test endpoints with curl**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add patient API (list, detail, labs, diagnoses)"
```

---

## Task 4: Frontend Patient Types + API Service + Store

**Files:**
- Create: `src/services/types/patient.ts`
- Create: `src/services/api/patients.ts`
- Create: `src/stores/patients-store.ts`

### Types (src/services/types/patient.ts)

Match the backend schemas exactly. Include PatientListItem, PatientDetail, PatientLabRecord, PatientDiagnosisRecord, PatientListResponse.

### API Service (src/services/api/patients.ts)

Functions using `apiRequest`:
- `fetchPatients(params)` — GET list with query params
- `fetchPatient(id)` — GET detail
- `fetchPatientLabs(id)` — GET labs
- `fetchPatientDiagnoses(id)` — GET diagnoses

### Store (src/stores/patients-store.ts)

Follow auth-store pattern:
- `patients`, `total`, `page`, `pageSize`, `pages` — list state
- `selectedPatient` — detail state
- `labs`, `diagnoses` — detail sub-state
- `loading`, `error`
- `filters` — search, tier, pathwayStatus
- Actions: `loadPatients()`, `loadPatient(id)`, `loadLabs(id)`, `loadDiagnoses(id)`, `setPage()`, `setFilters()`

- [ ] **Step 1: Create all three files**
- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add patient types, API service, and Zustand store"
```

---

## Task 5: Patient Registry Page

**Files:**
- Modify: `src/app/dashboard/patients/page.tsx`

Replace the placeholder with the full patient registry:
- Search bar (Input component, searches by name/EMPI/phone)
- Filter dropdowns (tier, pathway status) using Select component
- Data table using shadcn Table component with columns: Name, EMPI, Tier (TierBadge), CRS, Pathway, Care Gaps, Last Contact, Assigned To
- Pagination component
- Click row navigates to `/dashboard/patients/[id]` using `buildPath`
- Loads data on mount via patients store
- Shows loading spinner while fetching
- Shows EmptyState when no results

All data comes from the store. All routes from config. All icons from Icons. All classes via `cn()`.

- [ ] **Step 1: Build the registry page**
- [ ] **Step 2: Verify it renders with backend running**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add patient registry page with search, filters, and pagination"
```

---

## Task 6: Patient Detail Page

**Files:**
- Create: `src/app/dashboard/patients/[id]/page.tsx`
- Create: `src/features/patients/components/patient-header.tsx`
- Create: `src/features/patients/components/patient-kpi-strip.tsx`
- Create: `src/features/patients/components/patient-tabs.tsx`
- Create: `src/features/patients/components/care-protocols-tab.tsx`
- Create: `src/features/patients/components/clinical-data-tab.tsx`
- Create: `src/features/patients/components/timeline-tab.tsx`

### Patient Header (dense strip)
- Avatar (initials) + Name + Age/Gender + EMPI
- Condition badges (from diagnoses)
- PCP name + Active medications (abbreviated)
- Action buttons: Care Plan, Send Outreach (using Button component)

### KPI Strip
- CRS Score (with delta arrow)
- Care Gaps count (with list tooltip)
- Last Contact (days ago)
- Pathway Status
- Key PDC (from active_medications)
- Assigned To + Review Due

### Tabs (using shadcn Tabs component)
- Care Protocols (default) — AI Summary card + protocol step cards (mock data for now)
- Clinical Data — Lab history table + vitals (from labs API)
- Timeline — Activity feed (mock for now)
- Communications — placeholder
- Risk & CRS — CRS breakdown bars
- Claims — placeholder
- Documents — placeholder

### AI Care Summary Card (inside Care Protocols tab)
- Gradient background card with AI badge
- Static mock narrative text (will be replaced with real LLM in later phase)
- Action chip buttons (Schedule Ophthalmology, Order Lab, etc.)

- [ ] **Step 1: Create all component files**
- [ ] **Step 2: Create the page.tsx that composes them**
- [ ] **Step 3: Verify navigation from registry to detail works**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add patient detail page with header, KPI strip, and tabbed view"
```

---

## Phase 2 Complete Checklist

- [ ] 500 patients seeded with realistic Brazilian data
- [ ] Patient registry loads, searches, filters, paginates
- [ ] Clicking a patient row navigates to detail page
- [ ] Patient detail shows dense header strip
- [ ] KPI strip shows CRS, care gaps, last contact, pathway, PDC
- [ ] Tabs switch between Care Protocols, Clinical Data, Timeline, etc.
- [ ] AI Summary card appears in Care Protocols tab
- [ ] Clinical Data tab shows lab history table
- [ ] All components use shadcn/ui, Lucide icons, config registries
- [ ] No hardcoded colors, paths, or labels
