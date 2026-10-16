import type { NextRequest } from "next/server";

import { checkInTvScreen } from "@/services/tv-screen-service";
import { getClubById } from "@/services/club-service";

/** Polled by a TV: which table it's paired with, or the code to keep showing. */
export async function GET(request: NextRequest) {
  const token = request.headers.get("x-tv-token");
  if (!token) return Response.json({ error: "Missing TV token" }, { status: 400 });

  const screen = await checkInTvScreen(token);
  if (!screen) return Response.json({ error: "Unknown TV" }, { status: 404 });

  const headers = { "Cache-Control": "no-store" };
  // Table 0 means "all tables, rotating".
  if (screen.clubId && screen.tableNumber !== null) {
    const club = await getClubById(screen.clubId);
    if (club && club.status === "approved") {
      return Response.json({ paired: true, clubSlug: club.slug, table: screen.tableNumber }, { headers });
    }
  }
  return Response.json({ paired: false, code: screen.pairCode, expiresAt: screen.codeExpiresAt }, { headers });
}
