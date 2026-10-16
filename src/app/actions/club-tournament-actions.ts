"use server";

import { after } from "next/server";

import { signalMatchChanged } from "@/lib/live-signal";
import { getSession } from "@/lib/auth/session";
import { getClubBySlug, getMembership } from "@/services/club-service";
import { isStaffRole, isScorekeeperOnly } from "@/types/club";
import { isTournamentScorekeeper } from "@/services/tournament-scorekeeper-service";
import {
  createClubTournament,
  getClubTournamentBySlug,
  getClubTournamentById,
  updateClubTournament,
  deleteClubTournament,
  countRegisteredForClubTournament,
} from "@/services/club-tournament-service";
import {
  createRegistration,
  getRegistrationForPlayer,
  getRegistrationById,
  updateRegistrationPaymentStatus,
} from "@/services/registration-service";
import {
  saveFixturesForClubTournament,
  getMatchById,
  updateMatchStatus,
} from "@/services/match-service";
import { getRegisteredPlayerIds } from "@/services/registration-service";
import type { MatchStatus } from "@/types/match";
import { getProfileById, getProfileByUserId } from "@/services/profile-service";
import { getProfileCompletion } from "@/types/player-profile";
import { notifyNewTournament, notifyFriendRegistered, notifyMatchStarted } from "@/services/push-notification-service";
import { listFriendUserIds } from "@/services/friendship-service";
import type { ClubTournament, PrizeBreakdownItem } from "@/types/club-tournament";

/** Excludes scorekeeper-only accounts — used for anything beyond
 * starting/scoring matches (creating tournaments, fixtures, etc.). */
async function requireClubManager(clubSlug: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "You must be logged in." };

  const club = await getClubBySlug(clubSlug);
  if (!club) return { ok: false as const, error: "Club not found." };

  const membership = await getMembership(club.id, session.id);
  if (!isStaffRole(membership?.role) || isScorekeeperOnly(membership?.role)) {
    return { ok: false as const, error: "You don't have permission to manage this club." };
  }

  return { ok: true as const, club };
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
  const check = await requireClubManager(clubSlug);
  if (!check.ok) return { success: false as const, error: check.error };

  const result = await createClubTournament({ clubId: check.club.id, ...input });
  if ("error" in result) return { success: false as const, error: result.error };

  await notifyNewTournament(check.club.name, check.club.slug, result.tournament.name, result.tournament.slug).catch(
    () => {}
  );

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
  const check = await requireClubManager(clubSlug);
  if (!check.ok) return { success: false as const, error: check.error };

  const tournament = await getClubTournamentById(tournamentId);
  if (!tournament || tournament.clubId !== check.club.id) {
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
  const check = await requireClubManager(clubSlug);
  if (!check.ok) return { success: false as const, error: check.error };

  const tournament = await getClubTournamentById(tournamentId);
  if (!tournament || tournament.clubId !== check.club.id) {
    return { success: false as const, error: "Tournament not found." };
  }

  await deleteClubTournament(tournamentId);
  return { success: true as const };
}

export async function saveFixturesAction(
  clubSlug: string,
  tournamentId: string,
  round: string,
  pairs: { tableNumber: number; player1Id: string; player2Id: string }[]
) {
  const check = await requireClubManager(clubSlug);
  if (!check.ok) return { success: false as const, error: check.error };

  if (!round.trim()) {
    return { success: false as const, error: "Enter a round name." };
  }

  const tournament = await getClubTournamentById(tournamentId);
  if (!tournament || tournament.clubId !== check.club.id) {
    return { success: false as const, error: "Tournament not found." };
  }

  const registeredIds = new Set(await getRegisteredPlayerIds(tournamentId));
  for (const pair of pairs) {
    if (!pair.tableNumber || pair.tableNumber < 1) {
      return { success: false as const, error: "Every match needs a valid table number." };
    }
    if (!registeredIds.has(pair.player1Id) || !registeredIds.has(pair.player2Id)) {
      return { success: false as const, error: "One or more players aren't registered for this tournament." };
    }
  }

  try {
    await saveFixturesForClubTournament(check.club.id, tournamentId, round.trim(), pairs);
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Failed to save fixtures." };
  }
  return { success: true as const };
}

export async function updateMatchStatusAction(
  clubSlug: string,
  matchId: string,
  status: MatchStatus
) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "You must be logged in." };

  const club = await getClubBySlug(clubSlug);
  if (!club) return { success: false as const, error: "Club not found." };

  const match = await getMatchById(matchId);
  if (!match || match.clubId !== club.id) {
    return { success: false as const, error: "Match not found." };
  }

  const membership = await getMembership(club.id, session.id);
  if (!isStaffRole(membership?.role)) {
    const isScopedScorekeeper = await isTournamentScorekeeper(session.id, match.tournamentId);
    if (!isScopedScorekeeper) {
      return { success: false as const, error: "You don't have permission to manage this club." };
    }
  }

  await updateMatchStatus(matchId, status);
  // Start/End Match: table TVs and live viewers switch screens straight away.
  after(() => signalMatchChanged(match).catch(() => {}));

  if (status === "live" && match.status !== "live") {
    // Don't hold up the referee: friends and followers are notified after the response.
    after(async () => {
      const [p1, p2] = await Promise.all([getProfileById(match.player1Id), getProfileById(match.player2Id)]);
      await notifyMatchStarted({
        player1UserId: p1?.userId ?? null,
        player2UserId: p2?.userId ?? null,
        player1ProfileId: match.player1Id,
        player2ProfileId: match.player2Id,
        player1Name: match.player1Name,
        player2Name: match.player2Name,
        tableNumber: match.tableNumber,
        clubName: club.name,
        clubSlug: club.slug,
        matchId: match.id,
      }).catch(() => {});
    });
  }

  return { success: true as const };
}

export async function registerForClubTournamentAction(clubSlug: string, tournamentSlug: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "You must be logged in." };

  const club = await getClubBySlug(clubSlug);
  if (!club) return { success: false as const, error: "Club not found." };

  const tournament = await getClubTournamentBySlug(club.id, tournamentSlug);
  if (!tournament) return { success: false as const, error: "Tournament not found." };

  const profile = await getProfileByUserId(session.id);
  const { isComplete } = getProfileCompletion(profile);
  if (!profile || !isComplete) {
    return { success: false as const, error: "Complete your profile before registering." };
  }

  if (!tournament.registrationOpen) {
    return { success: false as const, error: "Registration for this tournament is closed." };
  }

  if (tournament.startDate && new Date(tournament.startDate) <= new Date()) {
    return { success: false as const, error: "This tournament has already started." };
  }

  const existing = await getRegistrationForPlayer(tournament.id, profile.id);
  if (existing) {
    return { success: false as const, error: "You are already registered for this tournament." };
  }

  const registeredCount = await countRegisteredForClubTournament(tournament.id);
  if (registeredCount >= tournament.maxPlayers) {
    return { success: false as const, error: "This tournament has reached its maximum player capacity." };
  }

  const registration = await createRegistration({
    clubId: club.id,
    tournamentId: tournament.id,
    playerId: profile.id,
    emergencyContact: profile.emergencyContact,
    preferredCue: profile.preferredCue ?? "",
    notes: "",
    agreedToRules: true,
    status: "confirmed",
  });

  const friendUserIds = await listFriendUserIds(session.id);
  if (friendUserIds.length > 0) {
    await notifyFriendRegistered(
      friendUserIds,
      profile.fullName || "A friend",
      club.slug,
      tournament.name,
      tournament.slug
    ).catch(() => {});
  }

  return { success: true as const, registrationId: registration.id };
}

export async function updateRegistrationPaymentStatusAction(
  clubSlug: string,
  registrationId: string,
  paymentStatus: "paid" | "pending"
) {
  const check = await requireClubManager(clubSlug);
  if (!check.ok) return { success: false as const, error: check.error };

  const registration = await getRegistrationById(registrationId);
  if (!registration || registration.clubId !== check.club.id) {
    return { success: false as const, error: "Registration not found." };
  }

  const { error } = await updateRegistrationPaymentStatus(registrationId, paymentStatus);
  if (error) return { success: false as const, error };

  return { success: true as const };
}
