export interface CommandCenterKPIs {
  total_members: number;
  avg_risk_score: number | null;
  hba1c_control_rate: number | null;
  open_care_gaps: number;
  pdc_above_80_rate: number | null;
}

export interface ActionChip {
  label: string;
  action_type: "navigate" | "outreach";
  target: string;
}

export interface ActionQueueItem {
  id: string;
  patient_id: string;
  patient_name: string;
  alert_type: "care_gap" | "overdue_review" | "cohort_change" | "missed_touchpoint";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  cohort_name: string;
  cohort_color: string;
  actions: ActionChip[];
}

export interface ActionQueueResponse {
  items: ActionQueueItem[];
  total: number;
}

export interface AIInsightsResponse {
  markdown: string;
  generated_at: string;
  is_cached: boolean;
}

export interface UpcomingReviewItem {
  patient_id: string;
  patient_name: string;
  program_id: string;
  program_name: string;
  cohort_name: string;
  cohort_color: string;
  review_due_at: string;
  days_until_due: number;
}

export interface UpcomingReviewsResponse {
  items: UpcomingReviewItem[];
  total: number;
}
