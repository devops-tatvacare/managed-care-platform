import { API_ENDPOINTS } from "@/config/api";
import { apiRequest } from "./client";
import type {
  MetricCategoryResponse,
  MigrationHistoryResponse,
  MigrationSummaryResponse,
  OverrideActionResponse,
  PendingOverridesResponse,
  QuarterlyInsightResponse,
} from "../types/outcomes";

interface MetricParams {
  program_id: string;
  cohort_id?: string;
  period_start?: string;
  period_end?: string;
}

function buildParams(p: MetricParams): Record<string, string> {
  const params: Record<string, string> = { program_id: p.program_id };
  if (p.cohort_id) params.cohort_id = p.cohort_id;
  if (p.period_start) params.period_start = p.period_start;
  if (p.period_end) params.period_end = p.period_end;
  return params;
}

export async function fetchClinicalMetrics(p: MetricParams): Promise<MetricCategoryResponse> {
  return apiRequest<MetricCategoryResponse>({ method: "GET", path: API_ENDPOINTS.outcomes.clinical, params: buildParams(p) });
}

export async function fetchHedisMetrics(p: MetricParams): Promise<MetricCategoryResponse> {
  return apiRequest<MetricCategoryResponse>({ method: "GET", path: API_ENDPOINTS.outcomes.hedis, params: buildParams(p) });
}

export async function fetchEngagementMetrics(p: MetricParams): Promise<MetricCategoryResponse> {
  return apiRequest<MetricCategoryResponse>({ method: "GET", path: API_ENDPOINTS.outcomes.engagement, params: buildParams(p) });
}

export async function fetchFinancialMetrics(p: MetricParams): Promise<MetricCategoryResponse> {
  return apiRequest<MetricCategoryResponse>({ method: "GET", path: API_ENDPOINTS.outcomes.financial, params: buildParams(p) });
}

export async function fetchMigrationSummary(programId: string): Promise<MigrationSummaryResponse> {
  return apiRequest<MigrationSummaryResponse>({ method: "GET", path: API_ENDPOINTS.outcomes.migrationSummary, params: { program_id: programId } });
}

export async function fetchMigrationHistory(programId: string, page?: number, pageSize?: number): Promise<MigrationHistoryResponse> {
  return apiRequest<MigrationHistoryResponse>({
    method: "GET",
    path: API_ENDPOINTS.outcomes.migrationHistory,
    params: { program_id: programId, page: page ?? 1, page_size: pageSize ?? 20 },
  });
}

export async function fetchPendingOverrides(programId: string): Promise<PendingOverridesResponse> {
  return apiRequest<PendingOverridesResponse>({ method: "GET", path: API_ENDPOINTS.outcomes.recohortisation, params: { program_id: programId } });
}

export async function approveOverride(assignmentId: string): Promise<OverrideActionResponse> {
  return apiRequest<OverrideActionResponse>({ method: "POST", path: `${API_ENDPOINTS.outcomes.recohortisation}/${assignmentId}/approve` });
}

export async function rejectOverride(assignmentId: string): Promise<OverrideActionResponse> {
  return apiRequest<OverrideActionResponse>({ method: "POST", path: `${API_ENDPOINTS.outcomes.recohortisation}/${assignmentId}/reject` });
}

export async function fetchQuarterlyInsight(programId: string): Promise<QuarterlyInsightResponse> {
  return apiRequest<QuarterlyInsightResponse>({ method: "POST", path: API_ENDPOINTS.outcomes.quarterlyInsight, params: { program_id: programId } });
}
