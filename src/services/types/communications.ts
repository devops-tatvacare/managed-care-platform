// ---------------------------------------------------------------------------
// Concierge actions
// ---------------------------------------------------------------------------

export interface ConciergeActionRead {
  id: string;
  patient_id: string;
  pathway_block_id: string | null;
  triggered_by: string;
  channel: string;
  action_type: string;
  status: string;
  template_id: string | null;
  payload: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

export interface ThreadSummary {
  patient_id: string;
  patient_name: string;
  channel: string;
  last_action_type: string;
  last_action_status: string;
  last_action_at: string;
  unread_count: number;
  total_actions: number;
}

export interface ThreadListResponse {
  items: ThreadSummary[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ThreadDetail {
  patient_id: string;
  patient_name: string;
  actions: ConciergeActionRead[];
}

// ---------------------------------------------------------------------------
// Message templates
// ---------------------------------------------------------------------------

export interface MessageTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  channel: string;
  language: string;
  content: string;
  variable_map: Record<string, string> | null;
  cohort_applicability: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplateListResponse {
  items: MessageTemplate[];
  total: number;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface OrchestrationRow {
  action_id: string;
  patient_id: string;
  patient_name: string;
  cohort_name: string | null;
  program_name: string | null;
  pathway_block_label: string | null;
  channel: string;
  action_type: string;
  status: string;
  triggered_by: string;
  template_name: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface OrchestrationStats {
  total_sequences: number;
  active: number;
  completed: number;
  failed: number;
}

export interface OrchestrationResponse {
  items: OrchestrationRow[];
  stats: OrchestrationStats;
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ---------------------------------------------------------------------------
// AI comms
// ---------------------------------------------------------------------------

export interface CommsDraftRequest {
  patient_id: string;
  template_id?: string;
  context?: string;
}

export interface CommsDraftResponse {
  draft: string;
  variables_used: string[];
  suggested_channel: string;
}

export interface CommsRewriteRequest {
  text: string;
  instruction: string;
}

export interface CommsRewriteResponse {
  rewritten: string;
}

// ---------------------------------------------------------------------------
// Manual send
// ---------------------------------------------------------------------------

export interface SendActionRequest {
  patient_id: string;
  channel: string;
  action_type: string;
  template_id?: string;
  payload?: Record<string, unknown>;
}
