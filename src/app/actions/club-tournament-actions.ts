"use server";

import { getSession } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import {
  clubActionError,
  createClubTournament,
  getClubTournamentById,
  updateClubTournament,
  deleteClubTournament,
} from "@/services/club-tournament-service";
import { updateRegistrationPaymentStatus } from "@/services/registration-service";
import type { MatchStatus } from "@/types/match";
import type { ClubTournament, PrizeBreakdownItem } from "@/types/club-tournament";

// Permissions (club manager / staff / tournament scorekeeper) are enforced by
// the API on every call; these actions only translate its answers.

const errorMessage = clubActionError;

async function requireSignedIn() {
  return (await getSession()) ? null : { success: false as const, error: "You must be logged in." };
}

/** The tournament, if it belongs to this club (the API is keyed by club). */
async function clubTournament(clubSlug: string, tournamentId: string) {
  const tournament = await getClubTournamentById(tournamentId);
  if (!tournament) return undefined;
  const club = await api<{ id: string }>(`/clubs/${encodeURIComponent(clubSlug)}`, { auth: false }).catch(() => null);
  return club && club.id === tournament.clubId ? tournament : undefined;
}

export async function createClubTournamentAction(
  clubSlug: string,
  input: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    prizePool?: string;
    entryFee?: string;
    format?: string;
    bestOf?: number;
    maxPlayers?: number;
    prizeBreakdown?: PrizeBreakdownItem[];
  }
) {
  const unauthenticated = await requireSignedIn();
  if (unauthenticated) return unauthenticated;

  // The API also broadcasts the "new tournament" push to everyone.
  const result = await createClubTournament({ clubId: clubSlug, ...input });
  if ("error" in result) return { success: false as const, error: result.error };
  return { success: true as const, slug: result.tournament.slug };
}

export async function updateClubTournamentAction(
  clubSlug: string,
  tournamentId: string,
  input: {
    name?: string;
    description?: string;
    status?: ClubTournament["status"];
    startDate?: string;
    endDate?: string;
    location?: string;
    prizePool?: string;
    entryFee?: string;
    format?: string;
    bestOf?: number;
    maxPlayers?: number;
    registrationOpen?: boolean;
    prizeBreakdown?: PrizeBreakdownItem[];
    championId?: string | null;
    runnerUpId?: string | null;
  }
) {
  const unauthenticated = await requireSignedIn();
  if (unauthenticated) return unauthenticated;

  if (!(await clubTournament(clubSlug, tournamentId))) {
    return { success: false as const, error: "Tournament not found." };
  }
  if (input.championId && input.championId === input.runnerUpId) {
    return { success: false as const, error: "Winner and runner-up can't be the same player." };
  }

  const { error } = await updateClubTournament(tournamentId, input);
  if (error) return { success: false as const, error };
  return { success: true as const };
}

export async function deleteClubTournamentAction(clubSlug: string, tournamentId: string) {
  const unauthenticated = await requireSignedIn();
  if (unauthenticated) return unauthenticated;

  if (!(await clubTournament(clubSlug, tournamentId))) {
    return { success: false as const, error: "Tournament not found." };
  }

  try {
    // Also removes its payments, registrations, matches and scorekeepers.
    await deleteClubTournament(tournamentId);
  } catch (error) {
    return { success: false as const, error: errorMessage(error, "Could not delete the tournament.") };
  }
  return { success: true as const };
}

export async function saveFixturesAction(
  clubSlug: string,
  tournamentId: string,
  round: string,
  pairs: { tableNumber: number; player1Id: string; player2Id: string }[]
) {
  const unauthenticated = await requireSignedIn();
  if (unauthenticated) return unauthenticated;

  if (!round.trim()) {
    return { success: false as const, error: "Enter a round name." };
  }

  // The API checks the tournament belongs to the club, every table number and
  // that every player is registered, then replaces the round's fixtures.
  try {
    await api(`/clubs/${encodeURIComponent(clubSlug)}/matches/tournaments/${encodeURIComponent(tournamentId)}/fixtures`, {
      method: "PUT",
      body: { round: round.trim(), pairs },
    });
  } catch (error) {
    return { success: false as const, error: errorMessage(error, "Failed to save fixtures.") };
  }
  return { success: true as const };
}

export async function updateMatchStatusAction(_clubSlug: string, matchId: string, status: MatchStatus) {
  const unauthenticated = await requireSignedIn();
  if (unauthenticated) return unauthenticated;

  // Club staff or this tournament's scorekeeper. The API wakes table TVs and
  // live viewers, and notifies friends and followers when the match goes live.
  try {
    await api(`/matches/${encodeURIComponent(matchId)}/status`, { method: "PATCH", body: { status } });
  } catch (error) {
    return { success: false as const, error: errorMessage(error, "Could not update the match.") };
  }
  return { success: true as const };
}

export async function registerForClubTournamentAction(clubSlug: string, tournamentSlug: string) {
  const unauthenticated = await requireSignedIn();
  if (unauthenticated) return unauthenticated;

  // The API checks the profile is complete, registration is open, the
  // tournament hasn't started, no duplicate entry and capacity — then tells
  // the player's friends.
  try {
    const { registrationId } = await api<{ registrationId: string }>(
      `/clubs/${encodeURIComponent(clubSlug)}/tournaments/${encodeURIComponent(tournamentSlug)}/register`,
      { method: "POST" }
    );
    return { success: true as const, registrationId };
  } catch (error) {
    return { success: false as const, error: errorMessage(error, "Could not register.") };
  }
}

export async function updateRegistrationPaymentStatusAction(
  clubSlug: string,
  registrationId: string,
  paymentStatus: "paid" | "pending"
) {
  const unauthenticated = await requireSignedIn();
  if (unauthenticated) return unauthenticated;

  // Scoped to the club by the API: another club's registration is "not found".
  const { error } = await updateRegistrationPaymentStatus(clubSlug, registrationId, paymentStatus);
  if (error) return { success: false as const, error };
  return { success: true as const };
}
