import { apiRequest } from "@/services/api/client";
import { API_ENDPOINTS } from "@/config/api";
import type {
  PathwayListResponse,
  PathwayDetail,
  PathwayCreate,
  PathwayUpdate,
  PathwayBlockSchema,
  PathwayEdgeSchema,
  BlockCreate,
  BlockUpdate,
  PathwayGenerateRequest,
  PathwayGenerateResponse,
  AISessionListItem,
  AISessionDetail,
  AISessionCreate,
  AISessionUpdate,
} from "@/services/types/pathway";

export async function fetchPathways(): Promise<PathwayListResponse> {
  return apiRequest<PathwayListResponse>({
    method: "GET",
    path: API_ENDPOINTS.pathways.list,
  });
}

export async function fetchPathway(id: string): Promise<PathwayDetail> {
  return apiRequest<PathwayDetail>({
    method: "GET",
    path: API_ENDPOINTS.pathways.detail(id),
  });
}

export async function createPathway(data: PathwayCreate): Promise<PathwayDetail> {
  return apiRequest<PathwayDetail>({
    method: "POST",
    path: API_ENDPOINTS.pathways.list,
    body: data,
  });
}

export async function updatePathway(id: string, data: PathwayUpdate): Promise<PathwayDetail> {
  return apiRequest<PathwayDetail>({
    method: "PATCH",
    path: API_ENDPOINTS.pathways.detail(id),
    body: data,
  });
}

export async function publishPathway(id: string): Promise<PathwayDetail> {
  return apiRequest<PathwayDetail>({
    method: "POST",
    path: API_ENDPOINTS.pathways.publish(id),
  });
}

export async function addBlock(pathwayId: string, data: BlockCreate): Promise<PathwayBlockSchema> {
  return apiRequest<PathwayBlockSchema>({
    method: "POST",
    path: API_ENDPOINTS.pathways.blocks(pathwayId),
    body: data,
  });
}

export async function updateBlock(pathwayId: string, blockId: string, data: BlockUpdate): Promise<PathwayBlockSchema> {
  return apiRequest<PathwayBlockSchema>({
    method: "PATCH",
    path: API_ENDPOINTS.pathways.block(pathwayId, blockId),
    body: data,
  });
}

export async function deleteBlock(pathwayId: string, blockId: string): Promise<void> {
  return apiRequest<void>({
    method: "DELETE",
    path: API_ENDPOINTS.pathways.block(pathwayId, blockId),
  });
}

export async function saveEdges(pathwayId: string, edges: PathwayEdgeSchema[]): Promise<PathwayEdgeSchema[]> {
  return apiRequest<PathwayEdgeSchema[]>({
    method: "PUT",
    path: API_ENDPOINTS.pathways.edges(pathwayId),
    body: edges,
  });
}

export async function generatePathway(data: PathwayGenerateRequest): Promise<PathwayGenerateResponse> {
  return apiRequest<PathwayGenerateResponse>({
    method: "POST",
    path: API_ENDPOINTS.ai.pathwayGenerate,
    body: data,
  });
}

// ── AI Sessions ─────────────────────────────────────────────────────────

export async function fetchSessions(): Promise<AISessionListItem[]> {
  return apiRequest<AISessionListItem[]>({
    method: "GET",
    path: API_ENDPOINTS.ai.sessions,
  });
}

export async function fetchSession(id: string): Promise<AISessionDetail> {
  return apiRequest<AISessionDetail>({
    method: "GET",
    path: API_ENDPOINTS.ai.session(id),
  });
}

export async function createSession(data?: AISessionCreate): Promise<AISessionDetail> {
  return apiRequest<AISessionDetail>({
    method: "POST",
    path: API_ENDPOINTS.ai.sessions,
    body: data ?? {},
  });
}

export async function updateSession(id: string, data: AISessionUpdate): Promise<AISessionDetail> {
  return apiRequest<AISessionDetail>({
    method: "PATCH",
    path: API_ENDPOINTS.ai.session(id),
    body: data,
  });
}

export async function deleteSession(id: string): Promise<void> {
  return apiRequest<void>({
    method: "DELETE",
    path: API_ENDPOINTS.ai.session(id),
  });
}
