export interface PatientListItem {
  id: string;
  empi_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string | null;
  pathway_status: string | null;
  pathway_name: string | null;
  care_gaps: string[] | null;
  last_contact_date: string | null;
  assigned_to: string | null;
  pcp_name: string | null;
  insurance_plan: string | null;
  active_medications: Array<{
    name: string;
    dose: string;
    frequency: string;
    pdc_90day: number;
  }> | null;
}

export interface PatientDetail extends PatientListItem {
  email: string | null;
  cpf: string | null;
  address: Record<string, string> | null;
  preferred_language: string;
  preferred_channel: string;
  allergies: string[] | null;
  sdoh_flags: Record<string, boolean | number> | null;
  review_due_date: string | null;
}

export interface PatientLabRecord {
  id: string;
  test_type: string;
  value: number;
  unit: string;
  source_system: string | null;
  recorded_at: string;
}

export interface PatientDiagnosisRecord {
  id: string;
  icd10_code: string;
  description: string;
  diagnosed_at: string | null;
  is_active: boolean;
}

export interface PatientListResponse {
  items: PatientListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}
