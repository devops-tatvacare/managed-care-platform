import { SERVER_API_BASE } from "@/config/api";
import { NextRequest } from "next/server";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const auth = req.headers.get("authorization") ?? "";

  const resp = await fetch(`${SERVER_API_BASE}/api/ai/builder/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body,
  });

  const data = await resp.text();
  return new Response(data, {
    status: resp.status,
    headers: { "Content-Type": "application/json" },
  });
}
