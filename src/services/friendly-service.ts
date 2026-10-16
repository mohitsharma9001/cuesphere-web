import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { playerPhotoUrl } from "@/lib/player-photo";
import { fromRow, type MatchRow } from "@/services/match-service";
import type { DrawMatch, FrameScore } from "@/types/match";
import type { PlayerProfile } from "@/types/player-profile";

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

/** Registered players matching a name, member ID or exact mobile number. */
export async function searchPlayers(query: string, excludeProfileId: string): Promise<PlayerSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const admin = createSupabaseAdminClient();
  // Strip characters that would break PostgREST's or() syntax.
  const safe = q.replace(/[,()*%\\]/g, " ").trim();
  const digits = q.replace(/\D/g, "");
  const filters = [`full_name.ilike.%${safe}%`, `member_id.ilike.%${safe}%`];
  if (digits.length >= 10) filters.push(`mobile.ilike.%${digits.slice(-10)}%`);

  const { data } = await admin
    .from("player_profiles")
    .select("id, full_name, member_id, city, profile_photo_url")
    .or(filters.join(","))
    .neq("id", excludeProfileId)
    .neq("full_name", "")
    .order("full_name")
    .limit(10);
  return ((data as { id: string; full_name: string; member_id: string; city: string; profile_photo_url: string | null }[] | null) ?? []).map(
    (r) => ({ id: r.id, name: r.full_name, memberId: r.member_id, city: r.city, photoUrl: playerPhotoUrl(r.id, r.profile_photo_url) })
  );
}

export async function createFriendly(input: {
  creatorUserId: string;
  creator: PlayerProfile;
  opponent: PlayerProfile;
  bestOf: number;
  venueClubId: string | null;
  tableNumber: number;
}): Promise<DrawMatch> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .insert({
      kind: "friendly",
      club_id: null,
      tournament_id: null,
      venue_club_id: input.venueClubId,
      best_of: input.bestOf,
      created_by: input.creatorUserId,
      friendly_state: "invited",
      round: "Friendly",
      table_number: input.tableNumber,
      player1_id: input.creator.id,
      player1_name: input.creator.fullName || "Player",
      player2_id: input.opponent.id,
      player2_name: input.opponent.fullName || "Player",
      reporting_time: "",
      match_start_time: "",
      status: "scheduled",
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create the match.");
  return fromRow(data as MatchRow);
}

/** Every friendly this player is in, newest first. */
export async function listFriendliesForPlayer(profileId: string): Promise<DrawMatch[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("matches")
    .select("*")
    .eq("kind", "friendly")
    .or(`player1_id.eq.${profileId},player2_id.eq.${profileId}`)
    .order("created_at", { ascending: false })
    .limit(60);
  return ((data as MatchRow[] | null) ?? []).map(fromRow);
}

export async function setFriendlyState(
  matchId: string,
  update: Partial<{
    friendly_state: DrawMatch["friendlyState"];
    status: DrawMatch["status"];
    result_submitted_by: string | null;
    match_start_time: string;
  }>
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("matches").update(update).eq("id", matchId).eq("kind", "friendly");
  if (error) throw new Error(error.message);
}

/** A player sends the final score. Nothing counts until the opponent confirms. */
export async function submitFriendlyResult(
  match: DrawMatch,
  submitterProfileId: string,
  input: {
    winnerId: string;
    framesWonPlayer1: number;
    framesWonPlayer2: number;
    highestBreak: number;
    highestBreakPlayerId?: string;
    frameScores?: FrameScore[];
  }
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("matches")
    .update({
      status: "completed",
      winner_id: input.winnerId,
      frames_won_player1: input.framesWonPlayer1,
      frames_won_player2: input.framesWonPlayer2,
      score: `${input.framesWonPlayer1} – ${input.framesWonPlayer2}`,
      highest_break: input.highestBreak,
      highest_break_player_id: input.highestBreak > 0 ? (input.highestBreakPlayerId ?? input.winnerId) : null,
      ...(input.frameScores ? { frame_scores: input.frameScores } : {}),
      friendly_state: "pending_confirmation",
      result_submitted_by: submitterProfileId,
    })
    .eq("id", match.id)
    .eq("kind", "friendly");
  if (error) throw new Error(error.message);
}

/** The opponent agrees with the score: lock it in and update both players' friendly stats. */
export async function confirmFriendlyResult(match: DrawMatch): Promise<void> {
  const admin = createSupabaseAdminClient();
  // Only flips once, even if both phones tap Confirm at the same moment.
  const { data, error } = await admin
    .from("matches")
    .update({ friendly_state: "confirmed" })
    .eq("id", match.id)
    .eq("friendly_state", "pending_confirmation")
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return;

  const sides = [
    { id: match.player1Id, won: match.winnerId === match.player1Id, framesWon: match.framesWonPlayer1, framesLost: match.framesWonPlayer2 },
    { id: match.player2Id, won: match.winnerId === match.player2Id, framesWon: match.framesWonPlayer2, framesLost: match.framesWonPlayer1 },
  ];
  for (const side of sides) {
    const current = await getFriendlyStats(side.id);
    const breakHere = match.highestBreakPlayerId === side.id ? match.highestBreak : 0;
    await admin.from("player_friendly_stats").upsert({
      player_id: side.id,
      matches_played: current.matchesPlayed + 1,
      wins: current.wins + (side.won ? 1 : 0),
      losses: current.losses + (side.won ? 0 : 1),
      frames_won: current.framesWon + side.framesWon,
      frames_lost: current.framesLost + side.framesLost,
      highest_break: Math.max(current.highestBreak, breakHere),
      recent_form: [...current.recentForm, side.won ? "W" : "L"].slice(-10),
      updated_at: new Date().toISOString(),
    });
  }
}

export async function getFriendlyStats(profileId: string): Promise<FriendlyStats> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("player_friendly_stats").select("*").eq("player_id", profileId).maybeSingle();
  if (!data) return EMPTY_STATS;
  const row = data as {
    matches_played: number;
    wins: number;
    losses: number;
    frames_won: number;
    frames_lost: number;
    highest_break: number;
    recent_form: string[] | null;
  };
  return {
    matchesPlayed: row.matches_played,
    wins: row.wins,
    losses: row.losses,
    framesWon: row.frames_won,
    framesLost: row.frames_lost,
    highestBreak: row.highest_break,
    recentForm: (row.recent_form ?? []) as ("W" | "L")[],
  };
}

/** Confirmed friendlies between two players: who's ahead. */
export async function getFriendlyHeadToHead(
  player1Id: string,
  player2Id: string
): Promise<{ player1Wins: number; player2Wins: number }> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("matches")
    .select("winner_id")
    .eq("kind", "friendly")
    .eq("friendly_state", "confirmed")
    .or(
      `and(player1_id.eq.${player1Id},player2_id.eq.${player2Id}),and(player1_id.eq.${player2Id},player2_id.eq.${player1Id})`
    );
  const rows = (data as { winner_id: string | null }[] | null) ?? [];
  return {
    player1Wins: rows.filter((r) => r.winner_id === player1Id).length,
    player2Wins: rows.filter((r) => r.winner_id === player2Id).length,
  };
}
