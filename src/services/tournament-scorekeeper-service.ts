import { cache } from "react";
import { api } from "@/lib/api/server";
import { clubActionResult } from "@/services/club-tournament-service";

export interface ScorekeeperAssignment {
  tournamentId: string;
  tournamentSlug: string;
  tournamentName: string;
  clubId: string;
  clubSlug: string;
}

/** The signed-in user's active tournament-scorekeeper assignment, or null if
 * they don't have one or the tournament has been marked completed — at which
 * point their access simply stops working, nothing needs to be revoked.
 * `userId` must be the signed-in user (the API answers for the caller). */
export const getActiveScorekeeperAssignment = cache(
  async (_userId: string): Promise<ScorekeeperAssignment | null> => {
    try {
      return await api<ScorekeeperAssignment | null>("/scorekeepers/me");
    } catch {
      return null;
    }
  }
);

/** Is the signed-in user (`userId`) the scorekeeper assigned to this tournament? */
export const isTournamentScorekeeper = cache(async (_userId: string, tournamentId: string): Promise<boolean> => {
  if (!tournamentId) return false;
  try {
    const { isScorekeeper } = await api<{ isScorekeeper: boolean }>(
      `/scorekeepers/me/tournaments/${encodeURIComponent(tournamentId)}`
    );
    return isScorekeeper;
  } catch {
    return false;
  }
});

/** Club managers only. Also carries each scorekeeper's email and name. */
export async function listScorekeepersForTournament(
  tournamentId: string
): Promise<{ id: string; userId: string; createdAt: string; email: string; fullName: string }[]> {
  try {
    return await api(`/tournaments/${encodeURIComponent(tournamentId)}/scorekeepers`);
  } catch {
    return [];
  }
}

export async function removeTournamentScorekeeper(
  clubId: string,
  tournamentId: string,
  id: string
): Promise<{ error?: string }> {
  const { error } = await clubActionResult(
    () =>
      api(
        `/clubs/${encodeURIComponent(clubId)}/tournaments/${encodeURIComponent(tournamentId)}/scorekeepers/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      ),
    "Could not remove the scorekeeper."
  );
  return { error };
}
