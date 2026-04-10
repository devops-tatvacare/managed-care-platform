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

export async function streamInsights(
  onChunk: (text: string) => void,
  onDone: (generatedAt: string) => void,
): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(`${API_ENDPOINTS.commandCenter.insightsStream}`, {
    method: "POST",
    headers,
  });

  if (!resp.ok) throw new Error(`Stream failed: ${resp.status}`);
  if (!resp.body) throw new Error("No response body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = JSON.parse(line.slice(6));
      if (data.done) {
        onDone(data.generated_at);
        return;
      }
      if (data.text) onChunk(data.text);
    }
  }
}

export async function fetchUpcomingReviews(limit?: number): Promise<UpcomingReviewsResponse> {
  return apiRequest<UpcomingReviewsResponse>({
    method: "GET",
    path: API_ENDPOINTS.commandCenter.upcomingReviews,
    params: limit ? { limit } : undefined,
  });
}
