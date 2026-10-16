import { servePlayerPhoto } from "@/app/api/player-photo/serve";

/** Versioned photo address from playerPhotoUrl(): cached long-term. */
export async function GET(_request: Request, ctx: { params: Promise<{ playerId: string; version: string }> }) {
  const { playerId } = await ctx.params;
  return servePlayerPhoto(playerId, true);
}
