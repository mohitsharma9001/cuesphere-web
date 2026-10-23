import { TOURNAMENTS } from "@/lib/mock/tournaments";
import { getTournamentDetail } from "@/lib/mock/tournament-detail";
import { getRegisteredCount, getRegistrationForPlayer } from "@/services/registration-service";
import type { Tournament } from "@/types/tournament";

export function listOpenForRegistration(): Tournament[] {
  return TOURNAMENTS.filter((t) => t.registrationOpen);
}

export function getTournamentBySlug(slug: string) {
  return getTournamentDetail(slug);
}

/**
 * Combines the tournament's seeded baseline (for demo visual richness) with
 * real registrations stored in the CueSphere API.
 */
export async function getLiveRegisteredCount(tournamentId: string): Promise<number> {
  const base = TOURNAMENTS.find((t) => t.id === tournamentId);
  const realCount = await getRegisteredCount(tournamentId);
  return (base?.registeredCount ?? 0) + realCount;
}

export type RegistrationEligibility =
  | { ok: true }
  | { ok: false; reason: "closed" | "full" | "already_registered" };

export async function checkRegistrationEligibility(
  tournamentId: string,
  playerId: string
): Promise<RegistrationEligibility> {
  const tournament = TOURNAMENTS.find((t) => t.id === tournamentId);
  if (!tournament) return { ok: false, reason: "closed" };
  if (!tournament.registrationOpen) return { ok: false, reason: "closed" };

  const existing = await getRegistrationForPlayer(tournamentId, playerId);
  if (existing) return { ok: false, reason: "already_registered" };

  const registeredCount = await getLiveRegisteredCount(tournamentId);
  if (registeredCount >= tournament.players) return { ok: false, reason: "full" };

  return { ok: true };
}
