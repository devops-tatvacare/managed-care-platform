import { API_ENDPOINTS } from "@/config/api";
import { apiRequest } from "./client";
import type {
  ProgramListItem,
  ProgramDetail,
  ProgramCreate,
  ProgramUpdate,
  ProgramVersion,
  CohortSummary,
  CohortCreate,
  CohortUpdate,
  CriteriaNode,
  ScoringEngineSummary,
  ScoringEngineUpsert,
} from "../types/program";

// Programs
export async function fetchPrograms(): Promise<ProgramListItem[]> {
  return apiRequest<ProgramListItem[]>({ method: "GET", path: API_ENDPOINTS.programs.list });
}

export async function fetchProgram(id: string): Promise<ProgramDetail> {
  return apiRequest<ProgramDetail>({ method: "GET", path: API_ENDPOINTS.programs.detail(id) });
}

export async function createProgram(data: ProgramCreate): Promise<ProgramDetail> {
  return apiRequest<ProgramDetail>({ method: "POST", path: API_ENDPOINTS.programs.list, body: data });
}

export async function updateProgram(id: string, data: ProgramUpdate): Promise<ProgramDetail> {
  return apiRequest<ProgramDetail>({ method: "PATCH", path: API_ENDPOINTS.programs.detail(id), body: data });
}

export async function publishProgram(id: string): Promise<ProgramVersion> {
  return apiRequest<ProgramVersion>({ method: "POST", path: API_ENDPOINTS.programs.publish(id) });
}

// Cohorts
export async function fetchCohorts(programId: string): Promise<CohortSummary[]> {
  return apiRequest<CohortSummary[]>({ method: "GET", path: API_ENDPOINTS.programs.cohorts(programId) });
}

export async function createCohort(programId: string, data: CohortCreate): Promise<CohortSummary> {
  return apiRequest<CohortSummary>({ method: "POST", path: API_ENDPOINTS.programs.cohorts(programId), body: data });
}

export async function updateCohort(programId: string, cohortId: string, data: CohortUpdate): Promise<CohortSummary> {
  return apiRequest<CohortSummary>({ method: "PATCH", path: API_ENDPOINTS.programs.cohort(programId, cohortId), body: data });
}

export async function deleteCohort(programId: string, cohortId: string): Promise<void> {
  return apiRequest<void>({ method: "DELETE", path: API_ENDPOINTS.programs.cohort(programId, cohortId) });
}

export async function replaceCriteria(programId: string, cohortId: string, criteria: CriteriaNode[]): Promise<{ count: number }> {
  return apiRequest<{ count: number }>({ method: "PUT", path: API_ENDPOINTS.programs.criteria(programId, cohortId), body: criteria });
}

export async function fetchCriteria(programId: string, cohortId: string): Promise<CriteriaNode[]> {
  return apiRequest<CriteriaNode[]>({ method: "GET", path: API_ENDPOINTS.programs.criteria(programId, cohortId) });
}

// Scoring Engine
export async function fetchEngine(programId: string): Promise<ScoringEngineSummary> {
  return apiRequest<ScoringEngineSummary>({ method: "GET", path: API_ENDPOINTS.programs.engine(programId) });
}

export async function upsertEngine(programId: string, data: ScoringEngineUpsert): Promise<ScoringEngineSummary> {
  return apiRequest<ScoringEngineSummary>({ method: "PUT", path: API_ENDPOINTS.programs.engine(programId), body: data });
}

export interface GeneratedProgramConfig {
  program_name: string;
  condition: string;
  description: string;
  cohorts: Array<{
    name: string;
    color: string;
    sort_order: number;
    review_cadence_days: number;
    score_range_min: number;
    score_range_max: number;
  }>;
  scoring_engine: {
    aggregation_method: string;
    components: Array<{
      name: string;
      label: string;
      data_source: string;
      weight: number;
      cap: number;
      scoring_table: Array<{ criterion: string; points: number }>;
    }>;
  };
  override_rules: Array<{
    priority: number;
    rule: string;
    action: string;
  }>;
  ai_narrative: string;
}

export async function generateCohortProgram(prompt: string): Promise<GeneratedProgramConfig> {
  return apiRequest<GeneratedProgramConfig>({
    method: "POST",
    path: API_ENDPOINTS.ai.cohortGenerate,
    body: { prompt },
  });
}
