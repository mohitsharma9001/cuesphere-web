import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileById } from "@/services/profile-service";
import type { DrawMatch, FrameScore, FriendlyState, MatchKind } from "@/types/match";
import type { BallColor } from "@/features/live-match/components/ball-icon";

export interface MatchRow {
  id: string;
  kind?: MatchKind | null;
  club_id: string | null;
  tournament_id: string | null;
  round: string;
  table_number: number;
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  reporting_time: string;
  match_start_time: string;
  status: DrawMatch["status"];
  winner_id: string | null;
  score: string | null;
  frames_won_player1: number;
  frames_won_player2: number;
  highest_break: number;
  highest_break_player_id: string | null;
  current_frame_score_player1: number;
  current_frame_score_player2: number;
  current_break: number;
  current_break_balls: BallColor[] | null;
  reds_remaining: number | null;
  frame_scores: FrameScore[] | null;
  current_player?: number | null;
  in_frame_break?: boolean | null;
  venue_club_id?: string | null;
  best_of?: number | null;
  created_by?: string | null;
  friendly_state?: FriendlyState | null;
  result_submitted_by?: string | null;
  created_at: string;
}

export function fromRow(row: MatchRow): DrawMatch {
  return {
    id: row.id,
    kind: row.kind === "friendly" ? "friendly" : "tournament",
    clubId: row.club_id ?? "",
    tournamentId: row.tournament_id ?? "",
    round: row.round,
    tableNumber: row.table_number,
    player1Id: row.player1_id,
    player1Name: row.player1_name,
    player2Id: row.player2_id,
    player2Name: row.player2_name,
    reportingTime: row.reporting_time,
    matchStartTime: row.match_start_time,
    status: row.status,
    winnerId: row.winner_id,
    score: row.score,
    framesWonPlayer1: row.frames_won_player1,
    framesWonPlayer2: row.frames_won_player2,
    highestBreak: row.highest_break,
    highestBreakPlayerId: row.highest_break_player_id,
    currentFrameScorePlayer1: row.current_frame_score_player1 ?? 0,
    currentFrameScorePlayer2: row.current_frame_score_player2 ?? 0,
    currentBreak: row.current_break ?? 0,
    currentBreakBalls: row.current_break_balls ?? [],
    redsRemaining: row.reds_remaining ?? 15,
    frameScores: row.frame_scores ?? [],
    currentPlayer: row.current_player === 1 || row.current_player === 2 ? row.current_player : null,
    inFrameBreak: row.in_frame_break === true,
    venueClubId: row.venue_club_id ?? null,
    bestOf: row.best_of ?? null,
    createdBy: row.created_by ?? null,
    friendlyState: row.friendly_state ?? null,
    resultSubmittedBy: row.result_submitted_by ?? null,
    createdAt: row.created_at,
  };
}

const MOCK_OPPONENTS = [
  "Karan Mehta",
  "Nikhil Rao",
  "Suresh Pillai",
  "Deepak Yadav",
  "Pawan Singh",
  "Rohit Jaiswal",
];

export async function isDrawReleased(tournamentId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { count } = await admin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);
  return (count ?? 0) > 0;
}

export async function getMatchById(matchId: string): Promise<DrawMatch | undefined> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("matches").select("*").eq("id", matchId).maybeSingle();
  return data ? fromRow(data as MatchRow) : undefined;
}

export async function deleteMatchesForRound(tournamentId: string, round: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("matches").delete().eq("tournament_id", tournamentId).eq("round", round);
}

/** Saves fixtures for a single round only — other rounds' matches are left
 * untouched. Refuses to redraw a round that already has completed matches,
 * since deleting them would silently double-count player stats when the
 * round is replayed. */
export async function saveFixturesForClubTournament(
  clubId: string,
  tournamentId: string,
  round: string,
  pairs: { tableNumber: number; player1Id: string; player2Id: string }[]
): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("matches")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("round", round)
    .eq("status", "completed")
    .limit(1);
  if (existing && existing.length > 0) {
    throw new Error(
      `"${round}" already has completed results and can't be redrawn. Delete those results first if you need to redo this round.`
    );
  }

  const profiles = await Promise.all(
    pairs.map((pair) => Promise.all([getProfileById(pair.player1Id), getProfileById(pair.player2Id)]))
  );

  await deleteMatchesForRound(tournamentId, round);

  if (pairs.length === 0) return;

  const rows = pairs.map((pair, i) => ({
    club_id: clubId,
    tournament_id: tournamentId,
    round,
    table_number: pair.tableNumber,
    player1_id: pair.player1Id,
    player1_name: profiles[i][0]?.fullName || "Player",
    player2_id: pair.player2Id,
    player2_name: profiles[i][1]?.fullName || "Player",
    reporting_time: "4:00 PM",
    match_start_time: "4:30 PM",
    status: "scheduled" as const,
  }));

  const { error } = await admin.from("matches").insert(rows);
  if (error) throw new Error(error.message);
}

export async function updateMatchStatus(matchId: string, status: DrawMatch["status"]): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("matches").update({ status }).eq("id", matchId);
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
  const admin = createSupabaseAdminClient();
  const update = {
    current_frame_score_player1: input.currentFrameScorePlayer1,
    current_frame_score_player2: input.currentFrameScorePlayer2,
    current_break: input.currentBreak,
    ...(input.currentBreakBalls !== undefined ? { current_break_balls: input.currentBreakBalls } : {}),
    ...(input.redsRemaining !== undefined ? { reds_remaining: input.redsRemaining } : {}),
    ...(input.highestBreakSoFar !== undefined ? { highest_break: input.highestBreakSoFar } : {}),
    ...(input.highestBreakSoFarPlayerId !== undefined
      ? { highest_break_player_id: input.highestBreakSoFarPlayerId }
      : {}),
  };
  const withNewer = {
    ...update,
    ...(input.currentPlayer !== undefined ? { current_player: input.currentPlayer } : {}),
    ...(input.inFrameBreak !== undefined ? { in_frame_break: input.inFrameBreak } : {}),
  };
  let { error } = await admin.from("matches").update(withNewer).eq("id", matchId);
  // Databases without migrations 0022 / 0024 lack these columns yet — save the rest.
  if (error && /current_player|in_frame_break/.test(error.message)) {
    ({ error } = await admin.from("matches").update(update).eq("id", matchId));
  }
  return { error: error?.message };
}

export async function deleteMatchesForTournament(tournamentId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("matches").delete().eq("tournament_id", tournamentId);
}

export async function getLiveMatchForClub(clubId: string): Promise<DrawMatch | undefined> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("matches")
    .select("*")
    .eq("club_id", clubId)
    .eq("status", "live")
    .order("match_start_time", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? fromRow(data as MatchRow) : undefined;
}

/** Live and scheduled matches, across every club, involving any of these players. */
export async function getOpenMatchesForPlayers(playerIds: string[]): Promise<DrawMatch[]> {
  if (playerIds.length === 0) return [];
  const admin = createSupabaseAdminClient();
  const ids = playerIds.join(",");
  const { data } = await admin
    .from("matches")
    .select("*")
    .in("status", ["scheduled", "live"])
    .or(`player1_id.in.(${ids}),player2_id.in.(${ids})`)
    // Friendlies only once accepted — not open challenges or called-off ones.
    .or("kind.eq.tournament,friendly_state.eq.accepted")
    .order("created_at", { ascending: true })
    .limit(50);
  return (data as MatchRow[] | null)?.map(fromRow) ?? [];
}

/** All not-yet-completed matches across every tournament in a club — the
 * scorekeeper's worklist (start a scheduled match, or resume a live one). */
export async function getScorableMatchesForClub(clubId: string): Promise<DrawMatch[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("matches")
    .select("*")
    .eq("club_id", clubId)
    .in("status", ["scheduled", "live"])
    .order("created_at", { ascending: true });
  const matches = (data as MatchRow[] | null)?.map(fromRow) ?? [];
  return matches.sort((a, b) => (a.status === b.status ? 0 : a.status === "live" ? -1 : 1));
}

export async function getMatchesForTournament(tournamentId: string): Promise<DrawMatch[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });
  return (data as MatchRow[] | null)?.map(fromRow) ?? [];
}

export async function getPlayerCurrentMatch(
  tournamentId: string,
  playerId: string
): Promise<DrawMatch | undefined> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .neq("status", "completed")
    .maybeSingle();
  return data ? fromRow(data as MatchRow) : undefined;
}

export async function getPlayerMatchHistory(playerId: string): Promise<DrawMatch[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("matches")
    .select("*")
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .eq("status", "completed");
  return (data as MatchRow[] | null)?.map(fromRow) ?? [];
}

export async function getPlayerMatchHistoryForClub(
  playerId: string,
  clubId: string
): Promise<DrawMatch[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("matches")
    .select("*")
    .eq("club_id", clubId)
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .eq("status", "completed")
    .order("created_at", { ascending: false });
  return (data as MatchRow[] | null)?.map(fromRow) ?? [];
}

/** Completed head-to-head record between two players at this club. */
export async function getHeadToHead(
  clubId: string,
  player1Id: string,
  player2Id: string
): Promise<{ player1Wins: number; player2Wins: number }> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("matches")
    .select("winner_id")
    .eq("club_id", clubId)
    .eq("status", "completed")
    .or(
      `and(player1_id.eq.${player1Id},player2_id.eq.${player2Id}),and(player1_id.eq.${player2Id},player2_id.eq.${player1Id})`
    );

  const rows = (data as { winner_id: string | null }[] | null) ?? [];
  return {
    player1Wins: rows.filter((r) => r.winner_id === player1Id).length,
    player2Wins: rows.filter((r) => r.winner_id === player2Id).length,
  };
}

/** Every match where this player made the recorded highest break, biggest
 * break first — the record behind the single "Highest Break" stat number. */
export async function getHighestBreaksForPlayer(
  playerId: string,
  clubId: string
): Promise<DrawMatch[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("matches")
    .select("*")
    .eq("club_id", clubId)
    .eq("highest_break_player_id", playerId)
    .eq("status", "completed")
    .gt("highest_break", 0)
    .order("highest_break", { ascending: false });
  return (data as MatchRow[] | null)?.map(fromRow) ?? [];
}

/**
 * Stand-in for the future admin "publish draw" action. Pairs every registered
 * player against a mock opponent so the dashboard has a real match to show.
 */
export async function publishDraw(
  clubId: string,
  tournamentId: string,
  registeredPlayerIds: string[]
): Promise<DrawMatch[]> {
  const admin = createSupabaseAdminClient();

  const rows = await Promise.all(
    registeredPlayerIds.map(async (playerId, i) => {
      const profile = await getProfileById(playerId);
      return {
        club_id: clubId,
        tournament_id: tournamentId,
        round: "Round of 64",
        table_number: i + 1,
        player1_id: playerId,
        player1_name: profile?.fullName || "Player",
        player2_id: `mock-opponent-${i}`,
        player2_name: MOCK_OPPONENTS[i % MOCK_OPPONENTS.length],
        reporting_time: "4:00 PM",
        match_start_time: "4:30 PM",
        status: "scheduled" as const,
      };
    })
  );

  const { data, error } = await admin.from("matches").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return (data as MatchRow[] | null)?.map(fromRow) ?? [];
}
