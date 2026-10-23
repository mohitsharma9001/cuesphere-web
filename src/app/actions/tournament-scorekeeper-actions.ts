"use server";

import { getSession } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { clubActionError } from "@/services/club-tournament-service";
import { removeTournamentScorekeeper } from "@/services/tournament-scorekeeper-service";

// Club managers only — the API checks the role and that the tournament
// belongs to this club on every call.

const errorMessage = clubActionError;

/** Creates a login scoped to scoring exactly one tournament. Access stops
 * working on its own once the tournament is marked completed — nothing to
 * revoke, no club-wide role granted. */
export async function createTournamentScorekeeperAction(
  clubSlug: string,
  tournamentId: string,
  input: { fullName: string; email: string; password: string }
) {
  if (!(await getSession())) return { success: false as const, error: "You must be logged in." };

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!fullName) return { success: false as const, error: "Enter a name." };
  if (!email) return { success: false as const, error: "Enter an email." };
  if (input.password.length < 8) {
    return { success: false as const, error: "Password must be at least 8 characters." };
  }

  try {
    await api(`/clubs/${encodeURIComponent(clubSlug)}/tournaments/${encodeURIComponent(tournamentId)}/scorekeepers`, {
      method: "POST",
      body: { fullName, email, password: input.password },
    });
  } catch (error) {
    return {
      success: false as const,
      error: errorMessage(error, "Could not create the account. The email may already be in use."),
    };
  }
  return { success: true as const, email, password: input.password };
}

export async function removeTournamentScorekeeperAction(clubSlug: string, tournamentId: string, assignmentId: string) {
  if (!(await getSession())) return { success: false as const, error: "You must be logged in." };

  const { error } = await removeTournamentScorekeeper(clubSlug, tournamentId, assignmentId);
  if (error) return { success: false as const, error };
  return { success: true as const };
}
