import type { NextRequest } from "next/server";

import { getClubBySlug } from "@/services/club-service";
import { getTableBoard } from "@/features/table-display/table-board";
import { remember } from "@/lib/memo";

/** Live state for one table, polled by the table TV and the stream overlay. */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ clubSlug: string; table: string }> }
) {
  const { clubSlug, table } = await ctx.params;
  const tableNumber = Number(table);
  if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 99) {
    return Response.json({ error: "Unknown table" }, { status: 404 });
  }

  // The club rarely changes; don't re-read it on every 2-second poll.
  const club = await remember(`club:${clubSlug}`, 30_000, () => getClubBySlug(clubSlug));
  if (!club || club.status !== "approved") {
    return Response.json({ error: "Unknown club" }, { status: 404 });
  }

  const follow = request.nextUrl.searchParams.get("follow") ?? undefined;
  const board = await getTableBoard(club, tableNumber, follow);
  return Response.json(board, { headers: { "Cache-Control": "no-store" } });
}
