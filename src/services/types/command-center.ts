export interface CommandCenterKPIs {
  total_members: number;
  avg_risk_score: number | null;
  hba1c_control_rate: number | null;
  open_care_gaps: number;
  pdc_above_80_rate: number | null;
}

export interface ActionQueueItem {
  id: string;
  patient_id: string;
  patient_name: string;
  template_id: string;
  program_id: string;
  cohort_id: string | null;
  cohort_name: string | null;
  priority: number;
  title: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  resolution_options: Array<{
    label: string;
    action_type: string;
    icon?: string;
    channel?: string;
    template_slug?: string;
    navigate_to?: string;
    navigate_tab?: string;
    requires_reason?: boolean;
  }>;
  trigger_data: Record<string, unknown> | null;
  created_at: string;
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
