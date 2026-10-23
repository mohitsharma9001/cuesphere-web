import { servePlayerPhoto } from "@/app/api/player-photo/serve";

/** Unversioned photo address (short cache) — kept for links made before versions existed. */
export async function GET(_request: Request, ctx: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await ctx.params;
  return servePlayerPhoto(playerId);
}
