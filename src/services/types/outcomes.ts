export interface MetricValue {
  metric_key: string;
  category: string;
  label: string;
  value: number | null;
  unit: string;
  data_available: boolean;
  baseline_value: number | null;
  target_value: number | null;
}

export interface MetricCategoryResponse {
  metrics: MetricValue[];
  program_id: string;
  cohort_id: string | null;
  period_start: string | null;
  period_end: string | null;
}

export interface MigrationFlow {
  from_cohort_id: string;
  from_cohort_name: string;
  to_cohort_id: string;
  to_cohort_name: string;
  count: number;
}

export interface MigrationSummaryResponse {
  flows: MigrationFlow[];
  total_migrations: number;
}

export interface MigrationHistoryItem {
  assignment_id: string;
  patient_id: string;
  patient_name: string;
  from_cohort_name: string;
  from_cohort_color: string;
  to_cohort_name: string;
  to_cohort_color: string;
  score_before: number | null;
  score_after: number | null;
  assignment_type: string;
  reason: string | null;
  assigned_at: string;
}

export interface MigrationHistoryResponse {
  items: MigrationHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface PendingOverrideItem {
  assignment_id: string;
  patient_id: string;
  patient_name: string;
  from_cohort_name: string;
  from_cohort_color: string;
  to_cohort_name: string;
  to_cohort_color: string;
  score: number | null;
  reason: string | null;
  assigned_by_name: string | null;
  assigned_at: string;
}

export interface PendingOverridesResponse {
  items: PendingOverrideItem[];
  total: number;
}

export interface OverrideActionResponse {
  status: string;
  assignment_id: string;
}

export interface KeyImprovement {
  metric: string;
  change: string;
  interpretation: string;
}

export interface Concern {
  metric: string;
  issue: string;
  recommendation: string;
}

export interface QuarterlyInsightResponse {
  narrative_markdown: string;
  key_improvements: KeyImprovement[];
  concerns: Concern[];
  strategic_recommendations: string[];
  generated_at: string;
  is_fallback: boolean;
}
