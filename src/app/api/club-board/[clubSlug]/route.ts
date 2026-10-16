import { getClubBySlug } from "@/services/club-service";
import { getClubBoard } from "@/features/table-display/table-board";
import { remember } from "@/lib/memo";

/** Live state of every table, polled by a TV set to "All tables (rotate)". */
export async function GET(_request: Request, ctx: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await ctx.params;
  const club = await remember(`club:${clubSlug}`, 30_000, () => getClubBySlug(clubSlug));
  if (!club || club.status !== "approved") {
    return Response.json({ error: "Unknown club" }, { status: 404 });
  }
  const board = await getClubBoard(club);
  return Response.json(board, { headers: { "Cache-Control": "no-store" } });
}
