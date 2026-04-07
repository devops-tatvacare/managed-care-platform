"""Abstract base classes for scoring engine components and aggregators."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class PatientData:
    """Normalised patient data bundle passed to scoring components."""
    latest_labs: dict[str, float]          # test_type (lowercase) → most recent value
    active_diagnosis_codes: list[str]      # ICD-10 codes of active diagnoses
    medications: list[dict[str, Any]]      # [{name, dose, frequency, pdc_90day}, ...]
    sdoh_flags: dict[str, bool]            # {food_insecurity: True, ...}
    utilisation: dict[str, Any]            # {er_visits_12mo, hospitalisations_12mo, dka_12mo}


@dataclass
class ComponentResult:
    """Result from a single scoring component."""
    name: str
    raw: int
    weighted: float


class ScoringComponent(ABC):
    """Base class for all scoring components.

    Subclasses implement `score()` which reads the component config (from JSON)
    and patient data, returning a raw score (0 to cap).
    """

    @abstractmethod
    def score(self, patient_data: PatientData, config: dict[str, Any]) -> int:
        """Evaluate patient data against this component's config.
        Returns raw score (0 to cap). Capping is done by the caller."""
        ...


class Aggregator(ABC):
    """Combines component scores into a final composite score."""

    @abstractmethod
    def aggregate(
        self,
        component_results: list[ComponentResult],
        config: dict[str, Any],
    ) -> int:
        """Returns final composite score (0-100)."""
        ...
