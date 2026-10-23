"use server";

import { getSession } from "@/lib/auth/session";
import { publishDraw } from "@/services/match-service";

/**
 * Demo-only trigger standing in for the future admin "publish draw" action.
 * Pairs every current registrant for the tournament against a mock opponent.
 */
export async function publishDrawAction(clubId: string, tournamentId: string) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "You must be logged in." };
  }

  try {
    const matches = await publishDraw(clubId, tournamentId);
    return { success: true as const, matchCount: matches.length };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Could not publish the draw." };
  }
}
