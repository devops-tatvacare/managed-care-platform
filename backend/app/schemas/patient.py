from pydantic import BaseModel


class PatientListItem(BaseModel):
    id: str
    empi_id: str
    first_name: str
    last_name: str
    date_of_birth: str
    gender: str
    phone: str | None = None
    pathway_status: str | None = None
    pathway_name: str | None = None
    care_gaps: list[str] | None = None
    last_contact_date: str | None = None
    assigned_to: str | None = None
    pcp_name: str | None = None
    insurance_plan: str | None = None
    active_medications: list[dict] | None = None


class PatientDetail(PatientListItem):
    email: str | None = None
    cpf: str | None = None
    address: dict | None = None
    preferred_language: str = "pt"
    preferred_channel: str = "whatsapp"
    allergies: list[str] | None = None
    sdoh_flags: dict | None = None
    review_due_date: str | None = None


class PatientLabRecord(BaseModel):
    id: str
    test_type: str
    value: float
    unit: str
    source_system: str | None = None
    recorded_at: str


class PatientDiagnosisRecord(BaseModel):
    id: str
    icd10_code: str
    description: str
    diagnosed_at: str | None = None
    is_active: bool


class PatientListResponse(BaseModel):
    items: list[PatientListItem]
    total: int
    page: int
    page_size: int
    pages: int
