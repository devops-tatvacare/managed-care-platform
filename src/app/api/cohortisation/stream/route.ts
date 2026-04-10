import { SERVER_API_BASE } from "@/config/api";
import { NextRequest } from "next/server";

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";

  const resp = await fetch(`${SERVER_API_BASE}/api/cohortisation/stream`, {
    method: "GET",
    headers: { Authorization: auth },
  });

  return new Response(resp.body, {
    status: resp.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
