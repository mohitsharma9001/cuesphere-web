import { ApiRequestError } from "@/lib/api/server";
import { getClubBoard } from "@/features/table-display/table-board";

/** Live state of every table, polled by a TV set to "All tables (rotate)".
 * A thin proxy to the API so the TV keeps polling this same URL. */
export async function GET(_request: Request, ctx: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await ctx.params;
  try {
    const board = await getClubBoard({ slug: clubSlug });
    return Response.json(board, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 502;
    return Response.json({ error: error instanceof Error ? error.message : "Unavailable" }, { status });
  }
}
