# FHIR R4 Data Model Redesign — Design Spec (NEXT)

> **Status:** Planned — not started. To be implemented after Risk Engine + Action System is stable.

## Overview

Redesign the Bradesco Care Admin data model to be FHIR R4 compliant. This enables interoperability with insurer systems (claims feeds, lab results, provider directories), regulatory compliance, and positions the platform for HL7 FHIR API certification.

## Why FHIR

- **Insurers speak FHIR** — claims, eligibility, lab results arrive as FHIR resources. Without compliance, every data feed requires a custom translation layer.
- **Regulatory trajectory** — CMS Interoperability rules (21st Century Cures Act) require FHIR APIs for payer data exchange.
- **Vocabulary standardization** — LOINC for labs, SNOMED-CT for conditions, RxNorm for drugs, CPT/HCPCS for procedures. Without coded vocabularies, scoring engine rules are fragile text matching.

## Current State → Target State

### Patient
| Current | FHIR R4 Target |
|---|---|
| `first_name`, `last_name` | `HumanName[]` with `use`, `given[]`, `family` |
| `phone`, `email` | `ContactPoint[]` with `system` (phone/email), `use` (home/work), `value` |
| `address` (JSON blob) | `Address[]` with `line[]`, `city`, `state`, `postalCode`, `country` |
| `empi_id` (single string) | `Identifier[]` with `system` (MRN/SSN/plan), `value`, `type` |
| `cpf` (Brazil tax ID) | Additional `Identifier` with `system: "urn:oid:2.16.76.1.4.1"` |
| `gender` (free text) | `AdministrativeGender` enum: male, female, other, unknown |
| `preferred_language` | `communication[].language` (BCP-47 coded) |

### Observations (Labs + Vitals)
| Current | FHIR R4 Target |
|---|---|
| `patient_labs.test_type` (free text "HbA1c") | `Observation.code` → `CodeableConcept` with LOINC system + code (4548-4) |
| `patient_labs.value` (float) | `Observation.valueQuantity` with `value`, `unit`, `system` (UCUM), `code` |
| `patient_labs.unit` (free text) | UCUM coded unit (`%` → `%`, `mg/dL` → `mg/dL`) |
| `patient_labs.source_system` | `Observation.performer[]` reference |
| No vital signs | `Observation` with vital-signs category (BP, BMI, weight, HR) |

### Conditions (Diagnoses)
| Current | FHIR R4 Target |
|---|---|
| `patient_diagnoses.icd10_code` (text) | `Condition.code` → `CodeableConcept` with `system: "http://hl7.org/fhir/sid/icd-10-cm"`, `code`, `display` |
| `patient_diagnoses.description` (free text) | `Condition.code.text` (human-readable) |
| `patient_diagnoses.is_active` (bool) | `Condition.clinicalStatus` → `CodeableConcept` (active/recurrence/remission/resolved) |
| No verification | `Condition.verificationStatus` (confirmed/provisional/differential) |
| No severity | `Condition.severity` (mild/moderate/severe) |
| No onset | `Condition.onsetDateTime` |

### Medications
| Current | FHIR R4 Target |
|---|---|
| `patients.active_medications` (JSON blob) | `MedicationStatement` table |
| `{name, dose, frequency, pdc_90day}` | `medication` (CodeableConcept with RxNorm), `dosage[]`, `status` |
| PDC in same blob | Separate `MedicationAdherence` or extension on MedicationStatement |

### New FHIR Resources Needed
| Resource | Purpose |
|---|---|
| `Encounter` | ER visits, hospitalizations, office visits — currently missing, needed for utilisation scoring |
| `CarePlan` | Maps to our pathway enrollment — patient's active care plan |
| `CareTeam` | Care manager, PCP, specialists — currently just `assigned_to` string |
| `Goal` | Clinical targets (HbA1c < 7%, weight loss 5%) — ties to outcomes |
| `ServiceRequest` | Lab orders, referrals — ties to action resolution |
| `Communication` | Maps to our ConciergeAction — structured comms tracking |
| `RiskAssessment` | FHIR resource for our CRS — prediction with method, basis, outcome |

## Migration Strategy

### Phase A: Vocabulary Layer (low risk, high value)
Add coded vocabulary columns alongside existing free-text columns. No breaking changes.

```sql
-- Labs: add LOINC coding
ALTER TABLE patient_labs ADD COLUMN loinc_code VARCHAR(20);
ALTER TABLE patient_labs ADD COLUMN loinc_display VARCHAR(200);

-- Diagnoses: add coding system reference
ALTER TABLE patient_diagnoses ADD COLUMN code_system VARCHAR(200) DEFAULT 'http://hl7.org/fhir/sid/icd-10-cm';

-- Medications: break out of JSON into proper table
CREATE TABLE patient_medications (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    rxnorm_code VARCHAR(20),
    drug_name VARCHAR(200),
    dose VARCHAR(100),
    frequency VARCHAR(100),
    route VARCHAR(50),
    status VARCHAR(20),  -- active | completed | stopped
    pdc_90day REAL,
    prescribed_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);
```

### Phase B: Resource Tables (medium risk, structural change)
Replace custom tables with FHIR-aligned structures.

```sql
-- Encounters (net new)
CREATE TABLE encounters (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    encounter_class VARCHAR(20),  -- ambulatory | emergency | inpatient
    type_code VARCHAR(20),        -- CPT/SNOMED
    type_display VARCHAR(200),
    status VARCHAR(20),           -- planned | arrived | in-progress | finished
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    reason_code VARCHAR(20),      -- ICD-10
    facility_name VARCHAR(200),
    cost REAL
);

-- RiskAssessment (maps our CRS)
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    program_id UUID REFERENCES programs(id),
    method VARCHAR(100),          -- "Composite Risk Score v1"
    score REAL,
    basis JSONB,                  -- references to Observations/Conditions used
    prediction JSONB,             -- [{outcome, probabilityDecimal, whenRange}]
    mitigation TEXT,              -- recommended action
    assessed_at TIMESTAMPTZ
);
```

### Phase C: Patient Resource Restructure (high risk, breaking change)
Refactor Patient model to FHIR structure. This requires frontend changes.

### Phase D: FHIR API Facade (optional, for external interop)
REST API that speaks FHIR Bundle/searchset format for external system integration.

## Vocabulary Mapping Reference

### Lab Tests (LOINC)
| Current test_type | LOINC Code | LOINC Display |
|---|---|---|
| HbA1c | 4548-4 | Hemoglobin A1c/Hemoglobin.total in Blood |
| eGFR | 48642-3 | Glomerular filtration rate/1.73 sq M.predicted |
| FPG | 1558-6 | Fasting glucose [Mass/volume] in Serum or Plasma |
| uACR | 9318-7 | Albumin/Creatinine [Mass Ratio] in Urine |
| LDL | 13457-7 | Cholesterol in LDL [Mass/volume] in Serum or Plasma |
| BMI | 39156-5 | Body mass index (BMI) [Ratio] |
| BP_systolic | 8480-6 | Systolic blood pressure |
| BP_diastolic | 8462-4 | Diastolic blood pressure |

### Diagnosis Systems
| System | URI |
|---|---|
| ICD-10-CM | `http://hl7.org/fhir/sid/icd-10-cm` |
| SNOMED CT | `http://snomed.info/sct` |

### Medication Systems
| System | URI |
|---|---|
| RxNorm | `http://www.nlm.nih.gov/research/umls/rxnorm` |
| NDC | `http://hl7.org/fhir/sid/ndc` |

## Timeline Estimate

- Phase A (Vocabulary): 1-2 days — additive, no breaking changes
- Phase B (Resource Tables): 2-3 days — new tables, migrate data
- Phase C (Patient Restructure): 3-5 days — breaking, frontend changes
- Phase D (FHIR API): 3-5 days — new API layer

Total: ~2 weeks of focused work.

## Dependencies

- Requires PostgreSQL (JSONB support essential)
- Scoring engine must be updated to use LOINC codes for lab matching
- Action templates must reference coded conditions
- LOINC/SNOMED/RxNorm lookup tables (or API integration) for vocabulary validation
