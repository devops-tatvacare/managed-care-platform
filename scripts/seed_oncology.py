#!/usr/bin/env python3
"""Seed a complete Oncology Care Program with 1000+ patients.

Creates:
  - Program: Oncology Risk Stratification (NCCN-referenced)
  - 5 cohorts (Surveillance → Palliative/Complex)
  - Scoring engine (5 components: tumor burden, treatment toxicity, functional status, utilisation, SDOH)
  - Pathway: Cancer Survivorship Pathway
  - 1000 patients with realistic oncology data (labs, diagnoses, medications)
  - Cohortisation events (triggers scoring via existing worker)

Usage:
    python scripts/seed_oncology.py
    python scripts/seed_oncology.py --patients 500
    python scripts/seed_oncology.py --base-url http://localhost:8000
"""

import argparse
import json
import random
import sys
import uuid
from datetime import date, datetime, timedelta, timezone

import requests

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
TENANT_ID = "10000000-0000-0000-0000-000000000001"
USER_ID = "20000000-0000-0000-0000-000000000001"

# ---------------------------------------------------------------------------
# Cohort definitions — NCCN-referenced risk stratification
# ---------------------------------------------------------------------------
COHORTS = [
    {
        "name": "Tier 0 — Surveillance / Remission",
        "slug": "onc-tier-0",
        "description": "Cancer survivors in remission or under routine surveillance. Minimal active treatment, focus on screening and long-term follow-up per NCCN survivorship guidelines.",
        "color": "#86efac",
        "sort_order": 0,
        "review_cadence_days": 90,
        "score_range_min": 0,
        "score_range_max": 15,
    },
    {
        "name": "Tier 1 — Early-Stage Active Treatment",
        "slug": "onc-tier-1",
        "description": "Newly diagnosed or early-stage cancer undergoing curative-intent treatment. Standard protocol adherence, manageable toxicity profile.",
        "color": "#93c5fd",
        "sort_order": 1,
        "review_cadence_days": 30,
        "score_range_min": 16,
        "score_range_max": 35,
    },
    {
        "name": "Tier 2 — Moderate Complexity",
        "slug": "onc-tier-2",
        "description": "Multi-modal treatment with moderate side effect burden. May include concurrent chemo-radiation, dose modifications, or emerging comorbidities requiring care coordination.",
        "color": "#fcd34d",
        "sort_order": 2,
        "review_cadence_days": 14,
        "score_range_min": 36,
        "score_range_max": 55,
    },
    {
        "name": "Tier 3 — High Complexity",
        "slug": "onc-tier-3",
        "description": "Advanced-stage cancer with significant treatment toxicity, multiple comorbidities, or recurrence. Requires intensive symptom management and frequent clinical touchpoints.",
        "color": "#fdba74",
        "sort_order": 3,
        "review_cadence_days": 7,
        "score_range_min": 56,
        "score_range_max": 75,
    },
    {
        "name": "Tier 4 — Palliative / Complex Care",
        "slug": "onc-tier-4",
        "description": "Metastatic disease, high symptom burden, or end-of-life care trajectory. Focus on quality of life, pain management, goals-of-care conversations, and caregiver support per NCCN palliative care guidelines.",
        "color": "#fca5a5",
        "sort_order": 4,
        "review_cadence_days": 3,
        "score_range_min": 76,
        "score_range_max": 100,
    },
]

# ---------------------------------------------------------------------------
# Scoring engine — 5 components, NCCN-aligned
# ---------------------------------------------------------------------------
SCORING_ENGINE = {
    "aggregation_method": "weighted_sum",
    "components": [
        {
            "name": "tumor_burden",
            "label": "Tumor Burden & Staging",
            "data_source": "lab_range",
            "weight": 30,
            "cap": 100,
            "field": "ldh",
            "proxy_field": "cea",
            "proxy_map": [
                {"min": 10, "max": None, "mapped_value": 400},
                {"min": 5, "max": 10, "mapped_value": 280},
                {"min": None, "max": 5, "mapped_value": 180},
            ],
            "scoring_table": [
                {"criterion": "LDH normal (<250 U/L)", "min": None, "max": 250, "points": 0},
                {"criterion": "LDH mildly elevated (250-400)", "min": 250, "max": 400, "points": 25},
                {"criterion": "LDH moderately elevated (400-600)", "min": 400, "max": 600, "points": 50},
                {"criterion": "LDH highly elevated (600-1000)", "min": 600, "max": 1000, "points": 75},
                {"criterion": "LDH severely elevated (>1000)", "min": 1000, "max": None, "points": 95},
            ],
            "bonus_table": [
                {"criterion": "Albumin < 3.0 (cachexia risk)", "field": "albumin", "min": None, "max": 3.0, "points": 10},
                {"criterion": "Hemoglobin < 10 (anemia)", "field": "hemoglobin", "min": None, "max": 10, "points": 8},
            ],
        },
        {
            "name": "comorbidity_burden",
            "label": "Comorbidity & Complication Burden",
            "data_source": "diagnosis_match",
            "weight": 25,
            "cap": 100,
            "scoring_table": [
                {"criterion": "No significant comorbidities", "type": "default", "points": 0},
                {"criterion": "Neutropenia (ANC < 1500)", "type": "lab", "field": "anc", "min": None, "max": 1500, "points": 30},
                {"criterion": "Severe anemia (Hgb < 8)", "type": "lab", "field": "hemoglobin", "min": None, "max": 8, "points": 25},
                {"criterion": "Renal impairment (eGFR < 60)", "type": "lab", "field": "egfr", "min": None, "max": 60, "points": 20},
                {"criterion": "Liver metastasis", "type": "diagnosis", "icd10_prefix": ["C78.7"], "points": 35},
                {"criterion": "Brain metastasis", "type": "diagnosis", "icd10_prefix": ["C79.3"], "points": 40},
                {"criterion": "Bone metastasis", "type": "diagnosis", "icd10_prefix": ["C79.5"], "points": 30},
                {"criterion": "Lung metastasis", "type": "diagnosis", "icd10_prefix": ["C78.0"], "points": 30},
                {"criterion": "DVT/PE", "type": "diagnosis", "icd10_prefix": ["I26", "I82.4"], "points": 25},
                {"criterion": "Heart failure", "type": "diagnosis", "icd10_prefix": ["I50"], "points": 20},
                {"criterion": "Diabetes comorbidity", "type": "diagnosis", "icd10_prefix": ["E11", "E10"], "points": 10},
            ],
        },
        {
            "name": "treatment_adherence",
            "label": "Treatment & Medication Adherence",
            "data_source": "pharmacy_adherence",
            "weight": 20,
            "cap": 100,
            "scoring_table": [
                {"criterion": "PDC >= 80%", "type": "pdc", "min": 80, "max": None, "points": 0},
                {"criterion": "PDC 60-79%", "type": "pdc", "min": 60, "max": 80, "points": 25},
                {"criterion": "PDC 40-59%", "type": "pdc", "min": 40, "max": 60, "points": 55},
                {"criterion": "PDC < 40%", "type": "pdc", "min": None, "max": 40, "points": 80},
            ],
            "bonus_table": [
                {"criterion": "Pain score > 6 (uncontrolled)", "field": "pain_score", "min": 6, "max": None, "points": 15},
                {"criterion": "PHQ-9 >= 10 (depression)", "field": "phq9", "min": 10, "max": None, "points": 15},
            ],
        },
        {
            "name": "utilisation",
            "label": "Healthcare Utilisation",
            "data_source": "utilisation",
            "weight": 15,
            "cap": 100,
            "scoring_table": [
                {"criterion": "No ER/hospitalisations", "er_visits": 0, "hospitalisations": 0, "dka": False, "points": 0},
                {"criterion": "1 ER visit", "er_visits": 1, "hospitalisations": None, "dka": False, "points": 25},
                {"criterion": "2+ ER visits", "er_visits": 2, "hospitalisations": None, "dka": False, "points": 50},
                {"criterion": "1 hospitalisation", "er_visits": None, "hospitalisations": 1, "dka": False, "points": 45},
                {"criterion": "2+ hospitalisations", "er_visits": None, "hospitalisations": 2, "dka": False, "points": 75},
                {"criterion": "ICU admission", "er_visits": None, "hospitalisations": None, "dka": True, "points": 90},
            ],
        },
        {
            "name": "sdoh_burden",
            "label": "Social Determinants of Health",
            "data_source": "sdoh",
            "weight": 10,
            "cap": 100,
            "scoring_table": [
                {"criterion": "0 high-risk domains", "domain_count": 0, "points": 0},
                {"criterion": "1 high-risk domain", "domain_count": 1, "points": 33},
                {"criterion": "2 high-risk domains", "domain_count": 2, "points": 66},
                {"criterion": "3+ high-risk domains", "domain_count": 3, "points": 100},
            ],
        },
    ],
    "tiebreaker_rules": [
        {
            "priority": 1,
            "rule": "Brain metastasis → minimum Tier 3",
            "action": "min_cohort",
            "min_sort_order": 3,
            "condition": {"type": "has_diagnosis_prefix", "prefixes": ["C79.3"]},
        },
        {
            "priority": 2,
            "rule": "Multiple metastatic sites → Tier 4",
            "action": "min_cohort_or_escalate",
            "min_sort_order": 3,
            "escalate_if_score_gte": 60,
            "escalate_sort_order": 4,
            "condition": {"type": "has_diagnosis_prefix", "prefixes": ["C78", "C79"]},
        },
        {
            "priority": 3,
            "rule": "Tier 0 but LDH elevated → escalate to Tier 1",
            "action": "escalate_cohort",
            "from_sort_order": 0,
            "to_sort_order": 1,
            "condition": {"type": "lab_gte", "field": "ldh", "value": 250},
        },
    ],
}

# ---------------------------------------------------------------------------
# Patient data pools — oncology-specific
# ---------------------------------------------------------------------------
FIRST_M = ["João", "Pedro", "Carlos", "Lucas", "Rafael", "Bruno", "Felipe", "Gabriel", "Diego", "André",
           "Marcos", "Ricardo", "Fernando", "Gustavo", "Thiago", "Leonardo", "Daniel", "Eduardo"]
FIRST_F = ["Maria", "Ana", "Juliana", "Camila", "Fernanda", "Patrícia", "Beatriz", "Larissa",
           "Carolina", "Mariana", "Isabela", "Letícia", "Amanda", "Gabriela", "Renata"]
LAST = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida", "Pereira",
        "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Araújo", "Barbosa"]
CITIES = ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Salvador", "Brasília"]
PLANS = ["Bradesco Saúde Top", "Bradesco Saúde Nacional", "Bradesco Saúde Flex"]

# Cancer types with ICD-10 codes and tier weights
CANCER_TYPES = [
    # (primary_icd10, description, tier_weight_distribution)
    ("C50.9", "Breast cancer, unspecified", [0.25, 0.30, 0.25, 0.15, 0.05]),
    ("C34.9", "Lung cancer, unspecified", [0.10, 0.15, 0.25, 0.25, 0.25]),
    ("C18.9", "Colon cancer, unspecified", [0.20, 0.25, 0.25, 0.20, 0.10]),
    ("C61", "Prostate cancer", [0.30, 0.30, 0.20, 0.15, 0.05]),
    ("C56.9", "Ovarian cancer", [0.10, 0.15, 0.25, 0.25, 0.25]),
    ("C16.9", "Gastric cancer", [0.10, 0.15, 0.20, 0.30, 0.25]),
    ("C25.9", "Pancreatic cancer", [0.05, 0.10, 0.15, 0.30, 0.40]),
    ("C73", "Thyroid cancer", [0.40, 0.30, 0.20, 0.08, 0.02]),
    ("C43.9", "Melanoma, unspecified", [0.25, 0.25, 0.20, 0.20, 0.10]),
    ("C67.9", "Bladder cancer", [0.20, 0.25, 0.25, 0.20, 0.10]),
]

METASTASIS_CODES = [
    ("C78.7", "Liver metastasis"),
    ("C79.3", "Brain metastasis"),
    ("C79.5", "Bone metastasis"),
    ("C78.0", "Lung metastasis"),
]

COMORBIDITY_CODES = [
    ("I50.9", "Heart failure"),
    ("E11.65", "Type 2 diabetes"),
    ("I26.99", "Pulmonary embolism"),
    ("I82.40", "DVT, unspecified"),
    ("N18.3", "CKD stage 3"),
]

# Medications by tier
TIER_MEDS = {
    0: [("Tamoxifen", "20mg", "QD"), ("Anastrozole", "1mg", "QD")],
    1: [("Capecitabine", "1500mg", "BID"), ("Ondansetron", "8mg", "PRN"), ("Dexamethasone", "4mg", "QD")],
    2: [("Paclitaxel", "175mg/m²", "Q3W"), ("Carboplatin", "AUC 5", "Q3W"), ("Ondansetron", "8mg", "PRN"),
        ("Filgrastim", "300mcg", "QD"), ("Dexamethasone", "8mg", "QD")],
    3: [("Pembrolizumab", "200mg", "Q3W"), ("Oxycodone", "10mg", "Q6H"), ("Gabapentin", "300mg", "TID"),
        ("Ondansetron", "8mg", "TID"), ("Dexamethasone", "12mg", "QD")],
    4: [("Morphine SR", "30mg", "BID"), ("Morphine IR", "15mg", "Q4H PRN"), ("Dexamethasone", "16mg", "QD"),
        ("Haloperidol", "1mg", "PRN"), ("Lorazepam", "1mg", "PRN"), ("Ondansetron", "8mg", "TID")],
}

CARE_GAPS_POOL = [
    "Oncology follow-up", "Imaging review", "Palliative care referral",
    "Pain management assessment", "Psychosocial screening", "Genetic counselling",
    "Nutritional assessment", "Survivorship care plan", "Dental clearance",
]


def _rand_dt(days_back: int) -> str:
    d = datetime.now(timezone.utc) - timedelta(days=random.randint(0, days_back))
    return d.isoformat()


def _rand_date(days_back: int) -> str:
    d = datetime.now(timezone.utc) - timedelta(days=random.randint(0, days_back))
    return d.strftime("%Y-%m-%d")


def _make_patient(index: int) -> dict:
    # Pick cancer type and tier
    cancer = random.choice(CANCER_TYPES)
    icd10, cancer_desc, tier_weights = cancer
    tier = random.choices([0, 1, 2, 3, 4], weights=tier_weights, k=1)[0]

    gender = random.choice(["M", "F"])
    # Adjust gender for gender-specific cancers
    if icd10 in ("C61",):
        gender = "M"
    elif icd10 in ("C56.9",):
        gender = "F"
    if icd10 == "C50.9" and random.random() < 0.99:
        gender = "F"

    first = random.choice(FIRST_M if gender == "M" else FIRST_F)
    last = random.choice(LAST)
    age = random.randint(40 + tier * 3, 65 + tier * 5)
    dob = (datetime.now(timezone.utc) - timedelta(days=age * 365)).strftime("%Y-%m-%d")

    # Labs — tier-dependent ranges
    ldh_ranges = {0: (120, 240), 1: (180, 350), 2: (250, 500), 3: (400, 800), 4: (600, 1500)}
    hgb_ranges = {0: (12, 16), 1: (10.5, 14), 2: (9, 12), 3: (7.5, 11), 4: (6, 9.5)}
    alb_ranges = {0: (3.8, 4.8), 1: (3.4, 4.4), 2: (2.8, 3.8), 3: (2.2, 3.2), 4: (1.8, 2.8)}
    wbc_ranges = {0: (4.5, 10), 1: (3.5, 9), 2: (2, 8), 3: (1, 6), 4: (0.5, 4)}
    egfr_ranges = {0: (75, 120), 1: (65, 110), 2: (50, 90), 3: (30, 70), 4: (15, 50)}

    ldh = round(random.uniform(*ldh_ranges[tier]), 0)
    hgb = round(random.uniform(*hgb_ranges[tier]), 1)
    albumin = round(random.uniform(*alb_ranges[tier]), 1)
    wbc = round(random.uniform(*wbc_ranges[tier]), 1)
    egfr = round(random.uniform(*egfr_ranges[tier]), 0)

    labs = [
        {"test_type": "LDH", "value": ldh, "unit": "U/L", "recorded_at": _rand_dt(60)},
        {"test_type": "Hemoglobin", "value": hgb, "unit": "g/dL", "recorded_at": _rand_dt(30)},
        {"test_type": "Albumin", "value": albumin, "unit": "g/dL", "recorded_at": _rand_dt(45)},
        {"test_type": "WBC", "value": wbc, "unit": "K/uL", "recorded_at": _rand_dt(30)},
        {"test_type": "eGFR", "value": egfr, "unit": "mL/min/1.73m²", "recorded_at": _rand_dt(60)},
    ]

    # Tumor markers based on cancer type
    if icd10.startswith("C50"):
        labs.append({"test_type": "CA 15-3", "value": round(random.uniform(5 + tier * 15, 30 + tier * 40), 1), "unit": "U/mL", "recorded_at": _rand_dt(30)})
    elif icd10.startswith("C18") or icd10.startswith("C16"):
        labs.append({"test_type": "CEA", "value": round(random.uniform(1 + tier * 3, 5 + tier * 15), 1), "unit": "ng/mL", "recorded_at": _rand_dt(30)})
    elif icd10 == "C61":
        labs.append({"test_type": "PSA", "value": round(random.uniform(0.5 + tier * 5, 4 + tier * 20), 1), "unit": "ng/mL", "recorded_at": _rand_dt(30)})
    elif icd10.startswith("C56"):
        labs.append({"test_type": "CA-125", "value": round(random.uniform(10 + tier * 30, 35 + tier * 80), 0), "unit": "U/mL", "recorded_at": _rand_dt(30)})

    # ANC (derived from WBC)
    anc = round(wbc * random.uniform(0.4, 0.7) * 1000, 0)
    labs.append({"test_type": "ANC", "value": anc, "unit": "/uL", "recorded_at": _rand_dt(30)})

    # Diagnoses
    diagnoses = [
        {"icd10_code": icd10, "description": cancer_desc, "diagnosed_at": _rand_date(365 * 3), "is_active": True},
    ]

    # Metastasis for higher tiers
    if tier >= 3:
        n_mets = random.randint(1, min(tier, 3))
        for met_code, met_desc in random.sample(METASTASIS_CODES, n_mets):
            diagnoses.append({"icd10_code": met_code, "description": met_desc, "diagnosed_at": _rand_date(180), "is_active": True})

    # Comorbidities
    if tier >= 2 and random.random() < 0.3 + tier * 0.1:
        for c_code, c_desc in random.sample(COMORBIDITY_CODES, random.randint(1, min(tier, 3))):
            diagnoses.append({"icd10_code": c_code, "description": c_desc, "diagnosed_at": _rand_date(365 * 5), "is_active": True})

    # Medications
    meds = []
    for name, dose, freq in TIER_MEDS.get(tier, []):
        pdc = round(random.uniform(max(0.3, 0.9 - tier * 0.1), min(1.0, 1.0 - tier * 0.03)), 2)
        meds.append({"name": name, "dose": dose, "frequency": freq, "pdc_90day": pdc})

    # SDOH
    sdoh = {
        "food_insecurity": random.random() < 0.08 + tier * 0.04,
        "transportation_barrier": random.random() < 0.10 + tier * 0.05,
        "low_health_literacy": random.random() < 0.06 + tier * 0.03,
        "caregiver_burden": random.random() < 0.05 + tier * 0.08,
        "financial_toxicity": random.random() < 0.10 + tier * 0.10,
    }

    # Care gaps
    n_gaps = random.randint(0, min(tier + 1, 4))
    care_gaps = random.sample(CARE_GAPS_POOL, n_gaps)

    return {
        "empi_id": f"ONC-{70000 + index}",
        "first_name": first,
        "last_name": last,
        "date_of_birth": dob,
        "gender": gender,
        "email": f"{first.lower()}.{last.lower()}.onc{index}@email.com",
        "phone": f"+55 11 9{random.randint(1000,9999)}-{random.randint(1000,9999)}",
        "insurance_plan": random.choice(PLANS),
        "active_medications": meds,
        "sdoh_flags": sdoh,
        "care_gaps": care_gaps,
        "labs": labs,
        "diagnoses": diagnoses,
        "pathway_name": "Cancer Survivorship",
        "pathway_status": "active",
    }


def main():
    parser = argparse.ArgumentParser(description="Seed Oncology Care Program with patients")
    parser.add_argument("--patients", type=int, default=1000, help="Number of patients (default: 1000)")
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--email", default="admin@tatvacare.in")
    parser.add_argument("--password", default="admin123")
    args = parser.parse_args()

    # 1. Login
    print(f"Logging in to {args.base_url}...")
    resp = requests.post(f"{args.base_url}/api/auth/login", json={"email": args.email, "password": args.password})
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} {resp.text}")
        sys.exit(1)
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print("Logged in.")

    # 2. Check if program already exists
    resp = requests.get(f"{args.base_url}/api/programs", headers=headers)
    programs = resp.json()
    if any(p["name"] == "Oncology Risk Stratification" for p in programs):
        print("Oncology program already exists — skipping program creation.")
        program_id = next(p["id"] for p in programs if p["name"] == "Oncology Risk Stratification")
    else:
        # 3. Create program via API
        print("Creating Oncology Risk Stratification program...")
        resp = requests.post(f"{args.base_url}/api/programs", headers=headers, json={
            "name": "Oncology Risk Stratification",
            "condition": "Cancer — Multi-Tumor",
            "description": "NCCN-referenced 5-tier risk stratification for oncology patients. Scores across tumor burden, comorbidity, treatment adherence, utilisation, and social determinants.",
        })
        if resp.status_code not in (200, 201):
            print(f"Create program failed: {resp.status_code} {resp.text}")
            sys.exit(1)
        program_id = resp.json()["id"]
        print(f"Program created: {program_id}")

        # 4. Create cohorts
        print("Creating cohorts...")
        for cohort in COHORTS:
            resp = requests.post(
                f"{args.base_url}/api/programs/{program_id}/cohorts",
                headers=headers,
                json=cohort,
            )
            if resp.status_code not in (200, 201):
                print(f"  Cohort '{cohort['name']}' failed: {resp.status_code} {resp.text}")
            else:
                print(f"  Created: {cohort['name']}")

        # 5. Create scoring engine
        print("Configuring scoring engine...")
        resp = requests.put(
            f"{args.base_url}/api/programs/{program_id}/engine",
            headers=headers,
            json=SCORING_ENGINE,
        )
        if resp.status_code != 200:
            print(f"Scoring engine failed: {resp.status_code} {resp.text}")
        else:
            print("Scoring engine configured.")

        # 6. Publish program (set status to active)
        print("Publishing program...")
        resp = requests.post(f"{args.base_url}/api/programs/{program_id}/publish", headers=headers)
        if resp.status_code != 200:
            print(f"Publish failed: {resp.status_code} {resp.text}")
        else:
            print("Program published and active.")

    # 7. Generate and import patients in batches
    print(f"\nGenerating {args.patients} oncology patients...")
    batch_size = 200
    total_created = 0

    for batch_start in range(0, args.patients, batch_size):
        batch_end = min(batch_start + batch_size, args.patients)
        batch = [_make_patient(i) for i in range(batch_start, batch_end)]

        print(f"  Importing patients {batch_start+1}-{batch_end}...")
        resp = requests.post(
            f"{args.base_url}/api/patients/bulk-import",
            headers=headers,
            data=json.dumps(batch),
        )
        if resp.status_code != 200:
            print(f"  Batch failed: {resp.status_code} {resp.text[:200]}")
        else:
            result = resp.json()
            total_created += result["patients_created"]
            print(f"  Created {result['patients_created']} patients, queued {result['events_created']} scoring events")

    print(f"\nDone! {total_created} oncology patients created and queued for scoring.")
    print("The cohortisation worker will score them in the background (50 per batch, every 5 seconds).")
    print(f"Open the Cohortisation page to watch scoring in real-time.")


if __name__ == "__main__":
    main()
