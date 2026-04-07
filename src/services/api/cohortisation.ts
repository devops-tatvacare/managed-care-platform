import { API_ENDPOINTS } from "@/config/api";
import { apiRequest } from "./client";
import type {
  AssignmentListResponse,
  CohortDistribution,
  DashboardStats,
  RecalculateResponse,
} from "../types/cohort";

export async function fetchDashboard(): Promise<DashboardStats> {
  return apiRequest<DashboardStats>({ method: "GET", path: API_ENDPOINTS.cohortisation.dashboard });
}

export async function recalculateAll(patientIds?: string[]): Promise<RecalculateResponse> {
  return apiRequest<RecalculateResponse>({
    method: "POST",
    path: API_ENDPOINTS.cohortisation.recalculate,
    body: patientIds ? { patient_ids: patientIds } : {},
  });
}

export async function fetchAssignments(params?: {
  page?: number;
  page_size?: number;
  program_id?: string;
  cohort_id?: string;
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
