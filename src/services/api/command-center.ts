import { API_ENDPOINTS } from "@/config/api";
import { apiRequest } from "./client";
import type {
  ActionQueueResponse,
  AIInsightsResponse,
  CommandCenterKPIs,
  UpcomingReviewsResponse,
} from "../types/command-center";

export async function fetchKPIs(): Promise<CommandCenterKPIs> {
  return apiRequest<CommandCenterKPIs>({ method: "GET", path: API_ENDPOINTS.commandCenter.kpis });
}

export async function fetchActionQueue(limit?: number): Promise<ActionQueueResponse> {
  return apiRequest<ActionQueueResponse>({
    method: "GET",
    path: API_ENDPOINTS.commandCenter.actionQueue,
    params: limit ? { limit } : undefined,
  });
}

export async function fetchInsights(): Promise<AIInsightsResponse> {
  return apiRequest<AIInsightsResponse>({ method: "POST", path: API_ENDPOINTS.commandCenter.insights });
}

export async function fetchUpcomingReviews(limit?: number): Promise<UpcomingReviewsResponse> {
  return apiRequest<UpcomingReviewsResponse>({
    method: "GET",
    path: API_ENDPOINTS.commandCenter.upcomingReviews,
    params: limit ? { limit } : undefined,
  });
}
