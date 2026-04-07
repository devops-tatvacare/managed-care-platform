import { API_ENDPOINTS } from "@/config/api";
import { apiRequest } from "./client";
import type {
  ThreadListResponse,
  ThreadDetail,
  MessageTemplateListResponse,
  OrchestrationResponse,
  CommsDraftRequest,
  CommsDraftResponse,
  CommsRewriteRequest,
  CommsRewriteResponse,
  SendActionRequest,
} from "../types/communications";

// Threads
export async function fetchThreads(params: {
  page?: number;
  page_size?: number;
  channel?: string;
} = {}): Promise<ThreadListResponse> {
  return apiRequest<ThreadListResponse>({
    method: "GET",
    path: API_ENDPOINTS.communications.threads,
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function fetchThread(patientId: string): Promise<ThreadDetail> {
  return apiRequest<ThreadDetail>({
    method: "GET",
    path: API_ENDPOINTS.communications.thread(patientId),
  });
}

// Manual send
export async function sendAction(data: SendActionRequest): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>({
    method: "POST",
    path: API_ENDPOINTS.communications.send,
    body: data,
  });
}

// Orchestration
export async function fetchOrchestration(params: {
  page?: number;
  page_size?: number;
  program_id?: string;
  cohort_id?: string;
  channel?: string;
  status?: string;
} = {}): Promise<OrchestrationResponse> {
  return apiRequest<OrchestrationResponse>({
    method: "GET",
    path: API_ENDPOINTS.communications.orchestration,
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

// Templates
export async function fetchTemplates(params: {
  category?: string;
  channel?: string;
  language?: string;
} = {}): Promise<MessageTemplateListResponse> {
  return apiRequest<MessageTemplateListResponse>({
    method: "GET",
    path: API_ENDPOINTS.communications.templates,
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

// AI comms
export async function draftMessage(data: CommsDraftRequest): Promise<CommsDraftResponse> {
  return apiRequest<CommsDraftResponse>({
    method: "POST",
    path: API_ENDPOINTS.ai.commsDraft,
    body: data,
  });
}

export async function rewriteMessage(data: CommsRewriteRequest): Promise<CommsRewriteResponse> {
  return apiRequest<CommsRewriteResponse>({
    method: "POST",
    path: API_ENDPOINTS.ai.commsRewrite,
    body: data,
  });
}
