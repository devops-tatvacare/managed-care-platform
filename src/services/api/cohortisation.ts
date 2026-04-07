import { API_ENDPOINTS } from "@/config/api";
import { apiRequest } from "./client";
import type {
  AssignmentListResponse,
  CRSConfigResponse,
  CRSConfigUpdate,
  RecalculateResponse,
  TierDistributionResponse,
} from "../types/cohort";

export async function fetchCRSConfig(): Promise<CRSConfigResponse> {
  return apiRequest<CRSConfigResponse>({
    method: "GET",
    path: API_ENDPOINTS.cohortisation.crsConfig,
  });
}

export async function updateCRSConfig(
  data: CRSConfigUpdate
): Promise<CRSConfigResponse> {
  return apiRequest<CRSConfigResponse>({
    method: "PUT",
    path: API_ENDPOINTS.cohortisation.crsConfig,
    body: data,
  });
}

export async function recalculateAll(
  patientIds?: string[]
): Promise<RecalculateResponse> {
  return apiRequest<RecalculateResponse>({
    method: "POST",
    path: API_ENDPOINTS.cohortisation.recalculate,
    body: patientIds ? { patient_ids: patientIds } : {},
  });
}

export async function fetchAssignments(params?: {
  page?: number;
  page_size?: number;
}): Promise<AssignmentListResponse> {
  return apiRequest<AssignmentListResponse>({
    method: "GET",
    path: API_ENDPOINTS.cohortisation.assignments,
    params,
  });
}

export async function fetchTierDistribution(): Promise<TierDistributionResponse> {
  return apiRequest<TierDistributionResponse>({
    method: "GET",
    path: API_ENDPOINTS.cohortisation.distribution,
  });
}
