import type { NextRequest } from "next/server";

import { api, ApiRequestError } from "@/lib/api/server";

type TvStatus =
  | { paired: true; clubSlug: string; table: number }
  | { paired: false; code: string | null; expiresAt: string | null };

/** Polled by a TV: which table it's paired with, or the code to keep showing. */
export async function GET(request: NextRequest) {
  const token = request.headers.get("x-tv-token");
  if (!token) return Response.json({ error: "Missing TV token" }, { status: 400 });

  try {
    const status = await api<TvStatus>("/tv/status", { auth: false, headers: { "x-tv-token": token } });
    return Response.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 502;
    return Response.json({ error: error instanceof Error ? error.message : "Unavailable" }, { status });
  }
}
