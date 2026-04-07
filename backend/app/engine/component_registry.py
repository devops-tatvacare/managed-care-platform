"""Registry of scoring component types. Maps data_source strings to component classes."""

from app.engine.base import ScoringComponent
from app.engine.components.lab_range import LabRangeComponent
from app.engine.components.diagnosis_match import DiagnosisMatchComponent
from app.engine.components.pharmacy_adherence import PharmacyAdherenceComponent
from app.engine.components.utilisation import UtilisationComponent
from app.engine.components.sdoh import SDOHComponent

COMPONENT_REGISTRY: dict[str, type[ScoringComponent]] = {
    "lab_range": LabRangeComponent,
    "diagnosis_match": DiagnosisMatchComponent,
    "pharmacy_adherence": PharmacyAdherenceComponent,
    "utilisation": UtilisationComponent,
    "sdoh": SDOHComponent,
}


def get_component(data_source: str) -> ScoringComponent:
    """Instantiate a scoring component by its data_source key."""
    cls = COMPONENT_REGISTRY.get(data_source)
    if cls is None:
        raise ValueError(f"Unknown scoring component data_source: {data_source}")
    return cls()
