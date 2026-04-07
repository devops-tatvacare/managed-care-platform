import { apiRequest } from "@/services/api/client";
import { API_ENDPOINTS } from "@/config/api";
import type {
  PatientListResponse,
  PatientDetail,
  PatientLabRecord,
  PatientDiagnosisRecord,
} from "@/services/types/patient";

interface PatientListParams {
  page?: number;
  page_size?: number;
  search?: string;
  pathway_status?: string;
}

export async function fetchPatients(params: PatientListParams = {}): Promise<PatientListResponse> {
  return apiRequest<PatientListResponse>({
    method: "GET",
    path: API_ENDPOINTS.patients.list,
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function fetchPatient(id: string): Promise<PatientDetail> {
  return apiRequest<PatientDetail>({
    method: "GET",
    path: API_ENDPOINTS.patients.detail(id),
  });
}

export async function fetchPatientLabs(id: string): Promise<PatientLabRecord[]> {
  return apiRequest<PatientLabRecord[]>({
    method: "GET",
    path: API_ENDPOINTS.patients.labs(id),
  });
}

export async function fetchPatientDiagnoses(id: string): Promise<PatientDiagnosisRecord[]> {
  return apiRequest<PatientDiagnosisRecord[]>({
    method: "GET",
    path: API_ENDPOINTS.patients.detail(id) + "/diagnoses",
  });
}
