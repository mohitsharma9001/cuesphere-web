"use server";

import { getSession } from "@/lib/auth/session";
import { api } from "@/lib/api/server";

/**
 * Demo-only trigger standing in for the future admin "record result" action.
 * Reports a result for the current player's own match; the API records stats,
 * results and achievements.
 */
export async function simulateMatchResultAction(matchId: string, playerWon: boolean) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "You must be logged in." };
  }

  try {
    await api(`/matches/${encodeURIComponent(matchId)}/simulate-result`, { method: "POST", body: { playerWon } });
    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Could not record the result." };
  }
}
