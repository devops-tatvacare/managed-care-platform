export interface PathwayBlockSchema {
  id: string;
  block_type: string;
  category: string;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number } | null;
  order_index: number;
}

export interface PathwayEdgeSchema {
  id: string;
  source_block_id: string;
  target_block_id: string;
  edge_type: string;
  label: string | null;
}

export interface PathwayListItem {
  id: string;
  name: string;
  description: string | null;
  condition: string | null;
  target_tiers: number[];
  status: string;
  version: number;
  block_count: number;
  created_at: string;
  updated_at: string;
}

export interface PathwayDetail extends PathwayListItem {
  created_by: string;
  published_at: string | null;
  published_by: string | null;
  blocks: PathwayBlockSchema[];
  edges: PathwayEdgeSchema[];
}

export interface PathwayCreate {
  name: string;
  description?: string;
  condition?: string;
  target_tiers?: number[];
}

export interface PathwayUpdate {
  name?: string;
  description?: string;
  condition?: string;
  target_tiers?: number[];
  status?: string;
}

export interface BlockCreate {
  block_type: string;
  category: string;
  label: string;
  config?: Record<string, unknown>;
  position?: { x: number; y: number };
  order_index?: number;
}

export interface BlockUpdate {
  label?: string;
  config?: Record<string, unknown>;
  position?: { x: number; y: number };
  order_index?: number;
}

export interface PathwayListResponse {
  items: PathwayListItem[];
  total: number;
}

export interface PathwayGenerateRequest {
  prompt: string;
  pathway_id?: string;
}

export interface AIGeneratedBlock {
  block_type: string;
  category: string;
  label: string;
  config: Record<string, unknown>;
  order_index: number;
}

export interface AIGeneratedEdge {
  source_index: number;
  target_index: number;
  edge_type: string;
  label?: string;
}

export interface AIGeneratedPathway {
  name: string;
  description: string;
  condition: string;
  target_tiers: number[];
  blocks: AIGeneratedBlock[];
  edges: AIGeneratedEdge[];
}

export interface PathwayGenerateResponse {
  message: string;
  is_complete: boolean;
  pathway: AIGeneratedPathway;
}

// ── AI Sessions ─────────────────────────────────────────────────────────

export interface AISessionListItem {
  id: string;
  title: string;
  pathway_id: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface AISessionDetail extends AISessionListItem {
  messages: Array<{ role: string; content: string }>;
  generated_pathway: AIGeneratedPathway | null;
}

export interface AISessionCreate {
  title?: string;
}

export interface AISessionUpdate {
  title?: string;
  messages?: Array<{ role: string; content: string }>;
  generated_pathway?: AIGeneratedPathway | null;
  pathway_id?: string;
}
