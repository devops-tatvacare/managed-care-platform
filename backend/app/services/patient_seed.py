import random
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.patient import Patient, PatientDiagnosis, PatientLab
from app.services.seed_service import DEFAULT_TENANT_ID

FIRST_NAMES_M = ["João", "Pedro", "Carlos", "Lucas", "Rafael", "Bruno", "Felipe", "Gabriel", "Diego", "André", "Marcos", "Ricardo", "Fernando", "Gustavo", "Thiago", "Leonardo", "Daniel", "Eduardo", "Roberto", "Alexandre"]
FIRST_NAMES_F = ["Maria", "Ana", "Juliana", "Camila", "Fernanda", "Patrícia", "Beatriz", "Larissa", "Carolina", "Mariana", "Isabela", "Letícia", "Amanda", "Gabriela", "Renata", "Tatiana", "Vanessa", "Priscila", "Luciana", "Daniela"]
LAST_NAMES = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Araújo", "Melo", "Barbosa", "Rocha", "Nascimento", "Moreira"]
CITIES = ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Salvador", "Brasília", "Porto Alegre", "Fortaleza"]
INSURANCE_PLANS = ["Bradesco Saúde Top", "Bradesco Saúde Nacional", "Bradesco Saúde Flex", "Bradesco Saúde Básico"]
PCP_FIRST = ["Dr. João", "Dra. Ana", "Dr. Carlos", "Dra. Fernanda", "Dr. Ricardo", "Dra. Beatriz", "Dr. Marcos"]
PCP_LAST = ["Almeida", "Costa", "Ferreira", "Lima", "Rodrigues", "Santos", "Oliveira"]
CARE_MANAGERS = ["Ana Santos, RN", "Carlos Mendes, RN", "Fernanda Lima, RN", "Ricardo Costa, PharmD", "Beatriz Oliveira, CDCES"]

TIER_WEIGHTS = [0.20, 0.26, 0.30, 0.16, 0.08]

ICD10_MAP = {
    0: [
        ("R73.09", "Impaired glucose tolerance"),
        ("Z83.3", "Family history of diabetes mellitus"),
    ],
    1: [
        ("R73.01", "Impaired fasting glucose"),
        ("R73.09", "Impaired glucose tolerance"),
    ],
    2: [
        ("E11.65", "Type 2 diabetes mellitus without complications"),
    ],
    3: [
        ("E11.65", "Type 2 diabetes mellitus without complications"),
    ],
    4: [
        ("E11.65", "Type 2 diabetes mellitus without complications"),
    ],
}

TIER3_COMPLICATIONS = [
    ("E11.40", "Type 2 DM with diabetic neuropathy, unspecified"),
    ("E11.311", "Type 2 DM with unspecified diabetic retinopathy with macular edema"),
    ("N18.3", "Chronic kidney disease, stage 3"),
]

TIER4_SECONDARY = [
    ("E11.10", "Type 2 DM with ketoacidosis without coma"),
    ("E10.65", "Type 1 DM without complications"),
    ("E11.40", "Type 2 DM with diabetic neuropathy, unspecified"),
    ("E11.311", "Type 2 DM with unspecified diabetic retinopathy with macular edema"),
    ("N18.4", "Chronic kidney disease, stage 4"),
    ("I50.9", "Heart failure, unspecified"),
]

PATHWAY_MAP = {
    0: ("Prevention Program", "active"),
    1: ("Pre-Diabetes Reversal", "active"),
    2: ("Diabetes Wellness", "active"),
    3: ("Advanced Diabetes Care", "active"),
    4: ("Comprehensive Diabetes Support", "active"),
}

ALL_CARE_GAPS = ["Eye exam", "uACR screening", "Foot exam", "Dental referral", "HbA1c lab"]


def _random_date_within_days(days: int) -> date:
    delta = random.randint(0, days)
    return (datetime.now(timezone.utc) - timedelta(days=delta)).date()


def _random_dob(tier: int) -> date:
    # Higher tiers tend to be older
    base_age = 35 + tier * 5
    age = random.randint(base_age, base_age + 25)
    dob = date.today().replace(year=date.today().year - age)
    return dob


def _build_medications(tier: int) -> list[dict]:
    meds = []

    def med(name, dose, freq):
        return {"name": name, "dose": dose, "frequency": freq, "pdc_90day": round(random.uniform(max(0.5, 0.95 - tier * 0.08), 1.0), 2)}

    if tier == 0:
        return []
    if tier == 1:
        if random.random() < 0.30:
            meds.append(med("Metformin", "500mg", "BID"))
        return meds
    if tier == 2:
        meds.append(med("Metformin", "1000mg", "BID"))
        if random.random() < 0.50:
            meds.append(med("Atorvastatin", "20mg", "QD"))
        return meds
    if tier == 3:
        meds.append(med("Metformin", "1000mg", "BID"))
        if random.random() < 0.60:
            meds.append(med("Semaglutide", "0.5mg", "QW"))
        else:
            meds.append(med("Empagliflozin", "10mg", "QD"))
        meds.append(med("Atorvastatin", "40mg", "QD"))
        meds.append(med("Enalapril", "10mg", "QD"))
        return meds
    # tier 4
    meds.append(med("Metformin", "1000mg", "BID"))
    meds.append(med("Insulin Glargine", "20 units", "QHS"))
    meds.append(med("Atorvastatin", "80mg", "QD"))
    meds.append(med("Losartan", "50mg", "QD"))
    if random.random() < 0.50:
        meds.append(med("Empagliflozin", "10mg", "QD"))
    if random.random() < 0.40:
        meds.append(med("Aspirin", "100mg", "QD"))
    return meds


def _build_labs(tier: int, patient_id: uuid.UUID, tenant_id: uuid.UUID) -> list[PatientLab]:
    labs = []
    count = random.randint(3, 8)
    now = datetime.now(timezone.utc)

    hba1c_ranges = {0: (5.0, 5.6), 1: (5.7, 6.4), 2: (6.5, 7.9), 3: (8.0, 10.0), 4: (9.0, 13.0)}
    egfr_ranges = {0: (60, 120), 1: (60, 120), 2: (60, 120), 3: (30, 60), 4: (15, 45)}
    bp_ranges = {0: (110, 130), 1: (110, 130), 2: (120, 140), 3: (130, 160), 4: (130, 160)}

    lab_types = [
        ("HbA1c", hba1c_ranges[tier], "%"),
        ("eGFR", egfr_ranges[tier], "mL/min/1.73m²"),
        ("BMI", (22 + tier * 2, 30 + tier * 2), "kg/m²"),
        ("BP Systolic", bp_ranges[tier], "mmHg"),
        ("LDL", (70, 160), "mg/dL"),
    ]

    # Always include HbA1c, then pick randomly from others
    selected = [lab_types[0]] + random.sample(lab_types[1:], min(count - 1, len(lab_types) - 1))

    for test_type, (low, high), unit in selected:
        days_ago = random.randint(0, 365)
        recorded_at = now - timedelta(days=days_ago)
        val = round(random.uniform(low, high), 1)
        labs.append(PatientLab(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            patient_id=patient_id,
            test_type=test_type,
            value=val,
            unit=unit,
            source_system="LabSys",
            recorded_at=recorded_at,
        ))

    return labs


def _build_diagnoses(tier: int, patient_id: uuid.UUID, tenant_id: uuid.UUID) -> list[PatientDiagnosis]:
    diagnoses = []
    base_diag = random.choice(ICD10_MAP[tier])
    base_date = _random_date_within_days(365 * 5)

    diagnoses.append(PatientDiagnosis(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        patient_id=patient_id,
        icd10_code=base_diag[0],
        description=base_diag[1],
        diagnosed_at=base_date,
        is_active=True,
    ))

    if tier == 3:
        complication = random.choice(TIER3_COMPLICATIONS)
        diagnoses.append(PatientDiagnosis(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            patient_id=patient_id,
            icd10_code=complication[0],
            description=complication[1],
            diagnosed_at=_random_date_within_days(365 * 3),
            is_active=True,
        ))

    if tier == 4:
        complications = random.sample(TIER4_SECONDARY, random.randint(2, 4))
        for c in complications:
            diagnoses.append(PatientDiagnosis(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                patient_id=patient_id,
                icd10_code=c[0],
                description=c[1],
                diagnosed_at=_random_date_within_days(365 * 3),
                is_active=True,
            ))

    return diagnoses


def _build_care_gaps(tier: int) -> list[str]:
    if tier <= 1:
        n = random.randint(0, 1)
    elif tier == 2:
        n = random.randint(0, 2)
    else:
        n = random.randint(1, len(ALL_CARE_GAPS))
    return random.sample(ALL_CARE_GAPS, min(n, len(ALL_CARE_GAPS)))


async def seed_patients(db: AsyncSession) -> None:
    result = await db.execute(select(func.count()).select_from(Patient).where(Patient.tenant_id == DEFAULT_TENANT_ID))
    count = result.scalar_one()
    if count > 0:
        return

    random.seed(42)

    tiers = random.choices([0, 1, 2, 3, 4], weights=TIER_WEIGHTS, k=500)
    batch_patients = []
    batch_labs = []
    batch_diagnoses = []
    BATCH_SIZE = 50

    for i, tier in enumerate(tiers):
        empi_id = f"EMPI-{10000 + i}"
        gender = random.choice(["M", "F"])
        first_name = random.choice(FIRST_NAMES_M if gender == "M" else FIRST_NAMES_F)
        last_name = random.choice(LAST_NAMES)
        dob = _random_dob(tier)
        city = random.choice(CITIES)
        pathway_name, pathway_status = PATHWAY_MAP[tier]
        patient_id = uuid.uuid4()

        patient = Patient(
            id=patient_id,
            tenant_id=DEFAULT_TENANT_ID,
            empi_id=empi_id,
            first_name=first_name,
            last_name=last_name,
            date_of_birth=dob,
            gender=gender,
            email=f"{first_name.lower().replace(' ', '')}.{last_name.lower()}@email.com",
            phone=f"+55 11 9{random.randint(1000, 9999)}-{random.randint(1000, 9999)}",
            cpf=f"{random.randint(100,999)}.{random.randint(100,999)}.{random.randint(100,999)}-{random.randint(10,99)}",
            address={"street": f"Rua {random.choice(LAST_NAMES)}, {random.randint(1,999)}", "city": city, "state": "SP", "zip": f"{random.randint(10000,99999)}-{random.randint(100,999)}"},
            insurance_plan=random.choice(INSURANCE_PLANS),
            pcp_name=f"{random.choice(PCP_FIRST)} {random.choice(PCP_LAST)}",
            preferred_language="pt",
            preferred_channel=random.choice(["whatsapp", "sms", "email"]),
            allergies=random.sample(["Penicillin", "Sulfa", "NSAIDs", "Latex"], k=random.randint(0, 2)),
            active_medications=_build_medications(tier),
            sdoh_flags={
                "food_insecurity": random.random() < 0.1 + tier * 0.05,
                "transportation_barrier": random.random() < 0.08 + tier * 0.04,
                "low_health_literacy": random.random() < 0.12 + tier * 0.04,
            },
            pathway_status=pathway_status,
            pathway_name=pathway_name,
            care_gaps=_build_care_gaps(tier),
            last_contact_date=_random_date_within_days(90) if random.random() < 0.7 else None,
            assigned_to=random.choice(CARE_MANAGERS),
            review_due_date=_random_date_within_days(30),
            is_active=True,
        )
        batch_patients.append(patient)
        batch_labs.extend(_build_labs(tier, patient_id, DEFAULT_TENANT_ID))
        batch_diagnoses.extend(_build_diagnoses(tier, patient_id, DEFAULT_TENANT_ID))

        if len(batch_patients) >= BATCH_SIZE:
            db.add_all(batch_patients)
            db.add_all(batch_labs)
            db.add_all(batch_diagnoses)
            await db.commit()
            batch_patients = []
            batch_labs = []
            batch_diagnoses = []

    if batch_patients:
        db.add_all(batch_patients)
        db.add_all(batch_labs)
        db.add_all(batch_diagnoses)
        await db.commit()
