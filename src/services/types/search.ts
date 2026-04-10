export type SearchEntityType =
  | "patient"
  | "pathway"
  | "program"
  | "cohort"
  | "communication"
  | "action";

export interface SearchResultItem {
  entity_id: string;
  entity_type: SearchEntityType;
  title: string;
  subtitle: string | null;
  metadata: Record<string, unknown>;
}

export interface SearchResponse {
  results: Partial<Record<SearchEntityType, SearchResultItem[]>>;
  query: string;
  total: number;
}
