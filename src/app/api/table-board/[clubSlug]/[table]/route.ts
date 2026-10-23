import type { NextRequest } from "next/server";

import { ApiRequestError } from "@/lib/api/server";
import { getTableBoard } from "@/features/table-display/table-board";

/** Live state for one table, polled by the table TV and the stream overlay.
 * A thin proxy to the API so screens keep polling this same URL. */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ clubSlug: string; table: string }> }
) {
  const { clubSlug, table } = await ctx.params;
  const tableNumber = Number(table);
  if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 99) {
    return Response.json({ error: "Unknown table" }, { status: 404 });
  }

  const follow = request.nextUrl.searchParams.get("follow") ?? undefined;
  try {
    const board = await getTableBoard({ slug: clubSlug }, tableNumber, follow);
    return Response.json(board, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 502;
    return Response.json({ error: error instanceof Error ? error.message : "Unavailable" }, { status });
  }
}
