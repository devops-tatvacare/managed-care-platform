#!/usr/bin/env python3
"""Bulk import 500 random patients and trigger real-time scoring.

Usage:
    python scripts/bulk_import.py                  # 500 patients, localhost:8000
    python scripts/bulk_import.py --count 100      # 100 patients
    python scripts/bulk_import.py --base-url http://host:8000
"""

import argparse
import json
import random
import sys
from datetime import datetime, timedelta, timezone

import requests

# ---------------------------------------------------------------------------
# Data pools (Brazilian names, matching the existing seed)
# ---------------------------------------------------------------------------
FIRST_M = ["João", "Pedro", "Carlos", "Lucas", "Rafael", "Bruno", "Felipe", "Gabriel", "Diego", "André"]
FIRST_F = ["Maria", "Ana", "Juliana", "Camila", "Fernanda", "Patrícia", "Beatriz", "Larissa", "Carolina", "Mariana"]
LAST = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida", "Pereira", "Lima", "Gomes"]
CITIES = ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Salvador"]
PLANS = ["Bradesco Saúde Top", "Bradesco Saúde Nacional", "Bradesco Saúde Flex"]

HBA1C_RANGES = {0: (5.0, 5.6), 1: (5.7, 6.4), 2: (6.5, 7.9), 3: (8.0, 10.0), 4: (9.0, 13.0)}
EGFR_RANGES = {0: (60, 120), 1: (60, 120), 2: (60, 120), 3: (30, 60), 4: (15, 45)}

ICD10_MAP = {
    0: [("R73.09", "Impaired glucose tolerance")],
    1: [("R73.01", "Impaired fasting glucose")],
    2: [("E11.65", "T2DM without complications")],
    3: [("E11.65", "T2DM without complications"), ("E11.40", "T2DM with neuropathy"), ("N18.3", "CKD stage 3")],
    4: [("E11.65", "T2DM without complications"), ("E11.10", "T2DM with ketoacidosis"), ("I50.9", "Heart failure"), ("N18.4", "CKD stage 4")],
}

TIER_WEIGHTS = [0.20, 0.26, 0.30, 0.16, 0.08]


def _rand_datetime(days_back: int) -> str:
    """ISO datetime string for timestamp fields (recorded_at)."""
    d = datetime.now(timezone.utc) - timedelta(days=random.randint(0, days_back))
    return d.isoformat()


def _rand_date(days_back: int) -> str:
    """ISO date string for date fields (diagnosed_at, date_of_birth)."""
    d = datetime.now(timezone.utc) - timedelta(days=random.randint(0, days_back))
    return d.strftime("%Y-%m-%d")


def _make_patient(index: int) -> dict:
    tier = random.choices([0, 1, 2, 3, 4], weights=TIER_WEIGHTS, k=1)[0]
    gender = random.choice(["M", "F"])
    first = random.choice(FIRST_M if gender == "M" else FIRST_F)
    last = random.choice(LAST)
    age = random.randint(35 + tier * 5, 60 + tier * 5)
    dob = (datetime.now(timezone.utc) - timedelta(days=age * 365)).strftime("%Y-%m-%d")

    # Labs — always HbA1c, sometimes eGFR
    hba1c = round(random.uniform(*HBA1C_RANGES[tier]), 1)
    labs = [{"test_type": "HbA1c", "value": hba1c, "unit": "%", "recorded_at": _rand_datetime(90)}]
    if random.random() < 0.7:
        egfr = round(random.uniform(*EGFR_RANGES[tier]), 1)
        labs.append({"test_type": "eGFR", "value": egfr, "unit": "mL/min/1.73m²", "recorded_at": _rand_datetime(90)})

    # Diagnoses
    codes = ICD10_MAP[tier]
    if tier <= 2:
        selected = [random.choice(codes)]
    else:
        selected = random.sample(codes, min(random.randint(2, len(codes)), len(codes)))
    diagnoses = [
        {"icd10_code": c, "description": d, "diagnosed_at": _rand_date(365 * 3), "is_active": True}
        for c, d in selected
    ]

    # Medications (affects pharmacy_adherence component)
    meds = []
    if tier >= 2:
        pdc = round(random.uniform(max(0.5, 0.95 - tier * 0.08), 1.0), 2)
        meds.append({"name": "Metformin", "dose": "1000mg", "frequency": "BID", "pdc_90day": pdc})
    if tier >= 3:
        pdc2 = round(random.uniform(0.5, 0.9), 2)
        meds.append({"name": "Insulin Glargine", "dose": "20 units", "frequency": "QHS", "pdc_90day": pdc2})

    # SDOH
    sdoh = {
        "food_insecurity": random.random() < 0.1 + tier * 0.05,
        "transportation_barrier": random.random() < 0.08 + tier * 0.04,
        "low_health_literacy": random.random() < 0.12 + tier * 0.04,
    }

    return {
        "empi_id": f"IMP-{50000 + index}",
        "first_name": first,
        "last_name": last,
        "date_of_birth": dob,
        "gender": gender,
        "email": f"{first.lower()}.{last.lower()}.{index}@email.com",
        "phone": f"+55 11 9{random.randint(1000,9999)}-{random.randint(1000,9999)}",
        "insurance_plan": random.choice(PLANS),
        "active_medications": meds,
        "sdoh_flags": sdoh,
        "labs": labs,
        "diagnoses": diagnoses,
    }


def main():
    parser = argparse.ArgumentParser(description="Bulk import patients for real-time scoring demo")
    parser.add_argument("--count", type=int, default=500, help="Number of patients (default: 500)")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend base URL")
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

    # 2. Generate patients
    print(f"Generating {args.count} patients...")
    patients = [_make_patient(i) for i in range(args.count)]

    # 3. Bulk import
    print(f"Sending bulk import to {args.base_url}/api/patients/bulk-import ...")
    resp = requests.post(
        f"{args.base_url}/api/patients/bulk-import",
        headers=headers,
        data=json.dumps(patients),
    )
    if resp.status_code != 200:
        print(f"Import failed: {resp.status_code} {resp.text}")
        sys.exit(1)

    result = resp.json()
    print(f"Done! Created {result['patients_created']} patients, queued {result['events_created']} scoring events.")
    print("Open the Cohortisation page to watch scoring in real-time.")


if __name__ == "__main__":
    main()
