import { API_ENDPOINTS } from "@/config/api";
import { apiRequest } from "./client";
import type {
  AssignmentListResponse,
  CohortDistribution,
  DashboardStats,
  RecalculateResponse,
  SSEEvent,
} from "../types/cohort";

export async function fetchDashboard(): Promise<DashboardStats> {
  return apiRequest<DashboardStats>({ method: "GET", path: API_ENDPOINTS.cohortisation.dashboard });
}

export async function recalculateAll(
  patientIds?: string[],
  scope: "all" | "unassigned" = "unassigned",
): Promise<RecalculateResponse> {
  return apiRequest<RecalculateResponse>({
    method: "POST",
    path: API_ENDPOINTS.cohortisation.recalculate,
    body: patientIds ? { patient_ids: patientIds, scope } : { scope },
  });
}

export async function fetchAssignments(params?: {
  page?: number;
  page_size?: number;
  program_id?: string;
  cohort_id?: string;
  min_score?: number;
}): Promise<AssignmentListResponse> {
  return apiRequest<AssignmentListResponse>({
    method: "GET",
    path: API_ENDPOINTS.cohortisation.assignments,
    params,
  });
}

export async function fetchDistribution(programId: string): Promise<CohortDistribution[]> {
  return apiRequest<CohortDistribution[]>({
    method: "GET",
    path: API_ENDPOINTS.cohortisation.distribution(programId),
  });
}

export function streamScoring(
  onEvent: (event: SSEEvent) => void,
  onError?: (error: string) => void,
): () => void {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let cancelled = false;

  (async () => {
    try {
      const resp = await fetch(`${API_ENDPOINTS.cohortisation.stream}`, {
        method: "GET",
        headers,
      });

      if (!resp.ok) {
        onError?.(`Stream failed: ${resp.status}`);
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
            const event = JSON.parse(line.slice(6)) as SSEEvent;
            onEvent(event);
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err) {
      if (!cancelled) onError?.(String(err));
    }
  })();

  return () => { cancelled = true; };
}
