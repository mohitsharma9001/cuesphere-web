import { api } from "@/lib/api/server";
import type { Achievement, PlayerStatistics } from "@/types/player-stats";

// Match results (stats, tournament results, achievements) are recorded by the
// API inside the scoring endpoints — see match-scoring-actions.

export async function getStatsForPlayer(playerId: string, clubId: string): Promise<PlayerStatistics | undefined> {
  const stats = await api<PlayerStatistics | null>(`/stats/players/${encodeURIComponent(playerId)}`, {
    query: { clubId },
    auth: false,
  }).catch(() => null);
  return stats ?? undefined;
}

/** Every per-club stats row for this player, for a platform-wide public profile. */
export async function getStatsForPlayerAllClubs(playerId: string): Promise<PlayerStatistics[]> {
  return api<PlayerStatistics[]>(`/stats/players/${encodeURIComponent(playerId)}`, { auth: false }).catch(() => []);
}

export async function getAchievementsForPlayer(playerId: string, clubId: string): Promise<Achievement[]> {
  return api<Achievement[]>(`/stats/players/${encodeURIComponent(playerId)}/achievements`, {
    query: { clubId },
    auth: false,
  }).catch(() => []);
}
