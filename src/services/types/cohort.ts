export interface DashboardStats {
  total_patients: number;
  assigned: number;
  unassigned: number;
  pending_rescore: number;
  active_programs: number;
}

export interface CohortDistribution {
  cohort_id: string;
  cohort_name: string;
  cohort_color: string;
  count: number;
}

export interface AssignmentRecord {
  id: string;
  patient_id: string;
  patient_name: string;
  program_id: string;
  program_name: string | null;
  cohort_id: string;
  cohort_name: string;
  cohort_color: string;
  score: number | null;
  score_breakdown: Record<string, { raw: number; weighted: number }> | null;
  assignment_type: string;
  reason: string | null;
  previous_cohort_id: string | null;
  assigned_at: string;
  review_due_at: string | null;
}

export interface AssignmentListResponse {
  items: AssignmentRecord[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface RecalculateResponse {
  events_created: number;
}
