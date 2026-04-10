import { SERVER_API_BASE } from "@/config/api";
import { NextRequest } from "next/server";

export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = req.headers.get("authorization") ?? "";

  const resp = await fetch(
    `${SERVER_API_BASE}/api/patients/${id}/ai-summary`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
    },
  );

  return new Response(resp.body, {
    status: resp.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
