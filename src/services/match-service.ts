import { cache } from "react";
import { api, apiMaybe } from "@/lib/api/server";
import type { TournamentResults } from "@/lib/tournament-results";
import type { DrawMatch, FrameScore } from "@/types/match";
import type { BallColor } from "@/features/live-match/components/ball-icon";

/** A match as the API sends it — DrawMatch, but with nullable club/tournament ids. */
export type ApiMatch = Omit<DrawMatch, "clubId" | "tournamentId"> & {
  clubId: string | null;
  tournamentId: string | null;
};

export function fromApi(m: ApiMatch): DrawMatch {
  return {
    ...m,
    kind: m.kind === "friendly" ? "friendly" : "tournament",
    clubId: m.clubId ?? "",
    tournamentId: m.tournamentId ?? "",
    winnerId: m.winnerId ?? null,
    score: m.score ?? null,
    highestBreakPlayerId: m.highestBreakPlayerId ?? null,
    currentFrameScorePlayer1: m.currentFrameScorePlayer1 ?? 0,
    currentFrameScorePlayer2: m.currentFrameScorePlayer2 ?? 0,
    currentBreak: m.currentBreak ?? 0,
    currentBreakBalls: (m.currentBreakBalls ?? []) as BallColor[],
    redsRemaining: m.redsRemaining ?? 15,
    frameScores: m.frameScores ?? [],
    currentPlayer: m.currentPlayer === 1 || m.currentPlayer === 2 ? m.currentPlayer : null,
    inFrameBreak: m.inFrameBreak === true,
    venueClubId: m.venueClubId ?? null,
    bestOf: m.bestOf ?? null,
    createdBy: m.createdBy ?? null,
    friendlyState: m.friendlyState ?? null,
    resultSubmittedBy: m.resultSubmittedBy ?? null,
  };
}

const many = (rows: ApiMatch[] | null | undefined) => (rows ?? []).map(fromApi);
const one = (row: ApiMatch | null | undefined) => (row ? fromApi(row) : undefined);
const enc = encodeURIComponent;

interface TournamentMatches {
  drawReleased: boolean;
  matches: ApiMatch[];
}

/** Memoized per request: the draw check and the fixtures list share one call. */
const fetchTournamentMatches = cache((tournamentId: string) =>
  api<TournamentMatches>(`/matches/tournaments/${enc(tournamentId)}`, { auth: false })
);

export async function isDrawReleased(tournamentId: string): Promise<boolean> {
  const data = await fetchTournamentMatches(tournamentId);
  return data.drawReleased;
}

export async function getMatchById(matchId: string): Promise<DrawMatch | undefined> {
  return one(await apiMaybe<ApiMatch>(`/matches/${enc(matchId)}`, { auth: false }));
}

/** Saves fixtures for a single round only — other rounds' matches are left
 * untouched. The API refuses to redraw a round that already has completed
 * matches, since replaying it would double-count player stats. */
export async function saveFixturesForClubTournament(
  clubId: string,
  tournamentId: string,
  round: string,
  pairs: { tableNumber: number; player1Id: string; player2Id: string }[]
): Promise<void> {
  await api(`/clubs/${enc(clubId)}/matches/tournaments/${enc(tournamentId)}/fixtures`, {
    method: "PUT",
    body: { round, pairs },
  });
}

/** Start / end a tournament match. The API signals live screens and, when a
 * match goes live, notifies the players' friends and followers. */
export async function updateMatchStatus(matchId: string, status: DrawMatch["status"]): Promise<void> {
  await api(`/matches/${enc(matchId)}/status`, { method: "PATCH", body: { status } });
}

export async function updateLiveProgress(
  matchId: string,
  input: {
    currentFrameScorePlayer1: number;
    currentFrameScorePlayer2: number;
    currentBreak: number;
    currentBreakBalls?: BallColor[];
    redsRemaining?: number;
    highestBreakSoFar?: number;
    highestBreakSoFarPlayerId?: string | null;
    currentPlayer?: 1 | 2;
    inFrameBreak?: boolean;
  }
): Promise<{ error?: string }> {
  try {
    await api(`/matches/${enc(matchId)}/live`, { method: "PATCH", body: input });
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the score." };
  }
}

export async function getLiveMatchForClub(clubId: string): Promise<DrawMatch | undefined> {
  return one(await apiMaybe<ApiMatch | null>(`/clubs/${enc(clubId)}/matches/live`, { auth: false }));
}

/** Live and scheduled matches, across every club, involving any of these players. */
export async function getOpenMatchesForPlayers(playerIds: string[]): Promise<DrawMatch[]> {
  if (playerIds.length === 0) return [];
  return many(await api<ApiMatch[]>("/matches/open", { query: { playerIds }, auth: false }));
}

/** All not-yet-completed matches in a club — the scorekeeper's worklist, live
 * first. Club staff see every tournament; a tournament scorekeeper only theirs. */
export async function getScorableMatchesForClub(clubId: string): Promise<DrawMatch[]> {
  const rows = await apiMaybe<ApiMatch[]>(`/clubs/${enc(clubId)}/matches/scorable`).catch(() => []);
  return many(rows);
}

export async function getMatchesForTournament(tournamentId: string): Promise<DrawMatch[]> {
  const data = await fetchTournamentMatches(tournamentId);
  return many(data.matches);
}

/** Champion / runner-up / semifinalists of many tournaments in one request, keyed by tournament id. */
export async function getTournamentResultsForIds(tournamentIds: string[]): Promise<Record<string, TournamentResults>> {
  const ids = [...new Set(tournamentIds.filter(Boolean))];
  if (ids.length === 0) return {};
  return api<Record<string, TournamentResults>>("/matches/tournaments/results", { query: { ids: ids.join(",") }, auth: false });
}

export async function getPlayerCurrentMatch(tournamentId: string, playerId: string): Promise<DrawMatch | undefined> {
  return one(
    await apiMaybe<ApiMatch | null>(`/matches/tournaments/${enc(tournamentId)}/players/${enc(playerId)}/current`, {
      auth: false,
    })
  );
}

export async function getPlayerMatchHistory(playerId: string): Promise<DrawMatch[]> {
  return many(await api<ApiMatch[]>(`/matches/players/${enc(playerId)}/history`, { auth: false }));
}

export async function getPlayerMatchHistoryForClub(playerId: string, clubId: string): Promise<DrawMatch[]> {
  return many(await api<ApiMatch[]>(`/matches/players/${enc(playerId)}/history`, { query: { clubId }, auth: false }));
}

/** Completed head-to-head record between two players at this club. */
export async function getHeadToHead(
  clubId: string,
  player1Id: string,
  player2Id: string
): Promise<{ player1Wins: number; player2Wins: number }> {
  const history = await getPlayerMatchHistoryForClub(player1Id, clubId);
  const between = history.filter(
    (m) =>
      (m.player1Id === player1Id && m.player2Id === player2Id) ||
      (m.player1Id === player2Id && m.player2Id === player1Id)
  );
  return {
    player1Wins: between.filter((m) => m.winnerId === player1Id).length,
    player2Wins: between.filter((m) => m.winnerId === player2Id).length,
  };
}

/** Every match where this player made the recorded highest break, biggest
 * break first — the record behind the single "Highest Break" stat number. */
export async function getHighestBreaksForPlayer(playerId: string, clubId: string): Promise<DrawMatch[]> {
  return many(
    await api<ApiMatch[]>(`/matches/players/${enc(playerId)}/highest-breaks`, { query: { clubId }, auth: false })
  );
}

/** Demo-only stand-in for the future admin "publish draw" action: pairs every
 * registered player against a mock opponent. */
export async function publishDraw(clubId: string, tournamentId: string): Promise<DrawMatch[]> {
  const data = await api<{ matches: ApiMatch[] }>(
    `/clubs/${enc(clubId)}/matches/tournaments/${enc(tournamentId)}/demo-draw`,
    { method: "POST" }
  );
  return many(data.matches);
}

/** Result-entry input shared by the scoring endpoints. */
export interface MatchResultInput {
  winnerId: string;
  framesWonPlayer1: number;
  framesWonPlayer2: number;
  highestBreak: number;
  highestBreakPlayerId?: string;
  frameScores?: FrameScore[];
}
