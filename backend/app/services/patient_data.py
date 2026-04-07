"""Normalises ORM patient models into the PatientData bundle consumed by the engine."""

from __future__ import annotations

from app.engine.base import PatientData
from app.models.patient import Patient, PatientDiagnosis, PatientLab


def build_patient_data(
    patient: Patient,
    labs: list[PatientLab],
    diagnoses: list[PatientDiagnosis],
) -> PatientData:
    """Build a PatientData bundle from ORM models."""
    # Latest lab per test type
    latest_labs: dict[str, tuple[float, float]] = {}  # key → (timestamp, value)
    for lab in labs:
        key = lab.test_type.lower()
        ts = lab.recorded_at.timestamp() if lab.recorded_at else 0
        if key not in latest_labs or ts > latest_labs[key][0]:
            latest_labs[key] = (ts, lab.value)

    # Active diagnosis codes
    active_codes = [d.icd10_code for d in diagnoses if d.is_active]

    # Medications
    medications = patient.active_medications or []

    # SDOH flags
    sdoh_flags = patient.sdoh_flags or {}

    # Utilisation (from legacy crs_breakdown or empty)
    util: dict = {}
    # For now, utilisation data isn't in a dedicated model — it may come from
    # claims or be stored elsewhere. Default to empty.

    return PatientData(
        latest_labs={k: v[1] for k, v in latest_labs.items()},
        active_diagnosis_codes=active_codes,
        medications=medications,
        sdoh_flags=sdoh_flags,
        utilisation=util,
    )
