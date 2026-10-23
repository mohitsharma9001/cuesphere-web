"use server";

import { getSession } from "@/lib/auth/session";
import { advanceFriendly, createFriendly, searchPlayers, type FriendlyStep } from "@/services/friendly-service";
import { getProfileByUserId } from "@/services/profile-service";

// The API enforces who may do what (only the challenged player answers, the
// submitter can't confirm their own score, …), sends the push notifications
// and wakes live screens — these actions just forward the request.

function failure(err: unknown, fallback: string) {
  return { success: false as const, error: err instanceof Error ? err.message : fallback };
}

async function step(matchId: string, name: FriendlyStep, fallback: string, body?: unknown) {
  if (!(await getSession())) return { success: false as const, error: "Log in to continue." };
  try {
    await advanceFriendly(matchId, name, body);
    return { success: true as const };
  } catch (err) {
    return failure(err, fallback);
  }
}

export async function searchPlayersAction(query: string) {
  const session = await getSession();
  if (!session) return [];
  const profile = await getProfileByUserId(session.id);
  return searchPlayers(query, profile?.id ?? "");
}

export async function createFriendlyAction(input: {
  opponentId: string;
  bestOf: number;
  venueClubId?: string | null;
  tableNumber?: number;
}) {
  if (!(await getSession())) return { success: false as const, error: "Log in to challenge a player." };
  try {
    const match = await createFriendly({
      opponentId: input.opponentId,
      bestOf: input.bestOf,
      venueClubId: input.venueClubId || null,
      tableNumber: Math.max(0, Math.min(99, Math.round(input.tableNumber ?? 0))),
    });
    return { success: true as const, matchId: match.id };
  } catch (err) {
    return failure(err, "Could not create the match.");
  }
}

/** The challenged player accepts or declines. */
export async function respondToFriendlyAction(matchId: string, accept: boolean) {
  return step(matchId, "respond", "Could not answer the challenge.", { accept });
}

/** Either player can call it off before it starts. */
export async function cancelFriendlyAction(matchId: string) {
  return step(matchId, "cancel", "This match can't be cancelled now.");
}

/** Goes live: friends and followers get a "watch now" alert. */
export async function startFriendlyAction(matchId: string) {
  return step(matchId, "start", "Could not start the match.");
}

/** The player who didn't enter the score agrees with it — stats update now. */
export async function confirmFriendlyAction(matchId: string) {
  return step(matchId, "confirm", "Could not confirm the score.");
}

/** The other player disagrees: the match reopens so the score can be corrected and sent again. */
export async function disputeFriendlyAction(matchId: string) {
  return step(matchId, "dispute", "Could not reject the score.");
}
