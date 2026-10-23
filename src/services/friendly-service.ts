import { api } from "@/lib/api/server";
import { fromApi, type ApiMatch } from "@/services/match-service";
import type { DrawMatch } from "@/types/match";

export const FRIENDLY_BEST_OF = [1, 3, 5, 7] as const;

export interface FriendlyStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  framesWon: number;
  framesLost: number;
  highestBreak: number;
  recentForm: ("W" | "L")[];
}

export interface PlayerSearchResult {
  id: string;
  name: string;
  memberId: string;
  city: string;
  photoUrl: string;
}

const EMPTY_STATS: FriendlyStats = {
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  framesWon: 0,
  framesLost: 0,
  highestBreak: 0,
  recentForm: [],
};

const enc = encodeURIComponent;

/** Registered players matching a name, member ID or exact mobile number. The
 * API already leaves out the signed-in player; `excludeProfileId` is honoured too. */
export async function searchPlayers(query: string, excludeProfileId: string): Promise<PlayerSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const rows = await api<PlayerSearchResult[]>("/friendlies/players/search", { query: { q } }).catch(() => []);
  return rows.filter((r) => r.id !== excludeProfileId);
}

/** Sends a challenge. The API checks the opponent, venue and best-of, and pushes the invite. */
export async function createFriendly(input: {
  opponentId: string;
  bestOf: number;
  venueClubId: string | null;
  tableNumber: number;
}): Promise<DrawMatch> {
  return fromApi(await api<ApiMatch>("/friendlies", { method: "POST", body: input }));
}

/** Every friendly this player is in, newest first. */
export async function listFriendliesForPlayer(profileId: string): Promise<DrawMatch[]> {
  const rows = await api<ApiMatch[]>(`/friendlies/players/${enc(profileId)}`, { auth: false }).catch(() => []);
  return rows.map(fromApi);
}

export type FriendlyStep = "respond" | "cancel" | "start" | "confirm" | "dispute";

/** Moves a friendly along (accept/decline, cancel, start, confirm, dispute).
 * The API checks it's the caller's match and that the step is allowed now. */
export async function advanceFriendly(matchId: string, step: FriendlyStep, body?: unknown): Promise<DrawMatch> {
  return fromApi(await api<ApiMatch>(`/friendlies/${enc(matchId)}/${step}`, { method: "POST", body }));
}

export async function getFriendlyStats(profileId: string): Promise<FriendlyStats> {
  const stats = await api<FriendlyStats | null>(`/friendlies/players/${enc(profileId)}/stats`, { auth: false }).catch(
    () => null
  );
  return stats ? { ...EMPTY_STATS, ...stats } : EMPTY_STATS;
}

/** Confirmed friendlies between two players: who's ahead. */
export async function getFriendlyHeadToHead(
  player1Id: string,
  player2Id: string
): Promise<{ player1Wins: number; player2Wins: number }> {
  return api<{ player1Wins: number; player2Wins: number }>("/friendlies/head-to-head", {
    query: { player1Id, player2Id },
    auth: false,
  }).catch(() => ({ player1Wins: 0, player2Wins: 0 }));
}
