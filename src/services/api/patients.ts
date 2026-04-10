import { apiRequest } from "@/services/api/client";
import { API_ENDPOINTS } from "@/config/api";
import type {
  PatientListResponse,
  PatientDetail,
  PatientLabRecord,
  PatientDiagnosisRecord,
  PatientFilterOptions,
} from "@/services/types/patient";
import type { AssignmentRecord } from "@/services/types/cohort";

interface PatientListParams {
  page?: number;
  page_size?: number;
  search?: string;
  pathway_status?: string;
  pathway_name?: string;
  assigned_to?: string;
  program_id?: string;
  cohort_id?: string;
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

export async function fetchPatientFilterOptions(): Promise<PatientFilterOptions> {
  return apiRequest<PatientFilterOptions>({
    method: "GET",
    path: API_ENDPOINTS.patients.filterOptions,
  });
}

export async function fetchPatientCohorts(id: string): Promise<AssignmentRecord[]> {
  return apiRequest<AssignmentRecord[]>({
    method: "GET",
    path: API_ENDPOINTS.patients.cohortAssignments(id),
  });
}

export function streamAISummary(
  patientId: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError?: (error: string) => void,
): () => void {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let cancelled = false;

  (async () => {
    try {
      const resp = await fetch(`${API_ENDPOINTS.patients.aiSummary(patientId)}`, {
        method: "POST",
        headers,
      });

      if (!resp.ok) {
        onError?.(`Failed: ${resp.status}`);
        return;
      }
      if (!resp.body) {
        onError?.("No response body");
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) { onDone(); return; }
            if (data.error) { onError?.(data.error); return; }
            if (data.text) onChunk(data.text);
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if (!cancelled) onError?.(String(err));
    }
  })();

  return () => { cancelled = true; };
}
