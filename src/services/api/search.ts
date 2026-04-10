import type { SearchResponse } from "@/services/types/search";

export async function searchGlobal(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const base =
    typeof window === "undefined"
      ? "http://localhost:8000"
      : window.location.origin;
  const url = new URL("/api/search", base);
  url.searchParams.set("q", query);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), { headers, signal });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail ?? `Search failed: ${response.status}`);
  }

  return response.json() as Promise<SearchResponse>;
}
