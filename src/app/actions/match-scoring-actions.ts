"use server";

import { after } from "next/server";

import { getSession } from "@/lib/auth/session";
import { remember } from "@/lib/memo";
import { signalMatchChanged } from "@/lib/live-signal";
import { getClubById, getMembership } from "@/services/club-service";
import { isStaffRole } from "@/types/club";
import { isTournamentScorekeeper } from "@/services/tournament-scorekeeper-service";
import { getMatchById, updateLiveProgress } from "@/services/match-service";
import { recordMatchResult } from "@/services/stats-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileByUserId } from "@/services/profile-service";
import { submitFriendlyResult } from "@/services/friendly-service";
import { notifyFriendlyResultToConfirm } from "@/services/push-notification-service";
import type { DrawMatch, FrameScore } from "@/types/match";
import type { BallColor } from "@/features/live-match/components/ball-icon";

async function requireMatchStaff(matchId: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "You must be logged in." };

  const match = await getMatchById(matchId);
  if (!match) return { ok: false as const, error: "Match not found." };

  // Friendlies have no club or referee: either of the two players scores.
  if (match.kind === "friendly") {
    const profile = await getProfileByUserId(session.id);
    if (!profile || (profile.id !== match.player1Id && profile.id !== match.player2Id)) {
      return { ok: false as const, error: "Only the two players can score this friendly." };
    }
    if (match.friendlyState !== "accepted") {
      return { ok: false as const, error: "This friendly isn't open for scoring." };
    }
    return { ok: true as const, match, scorerProfileId: profile.id as string | null };
  }

  const club = await getClubById(match.clubId);
  if (!club) return { ok: false as const, error: "Club not found." };

  const membership = await getMembership(club.id, session.id);
  if (!isStaffRole(membership?.role)) {
    const isScopedScorekeeper = await isTournamentScorekeeper(session.id, match.tournamentId);
    if (!isScopedScorekeeper) {
      return { ok: false as const, error: "You don't have permission to score this match." };
    }
  }

  return { ok: true as const, match, scorerProfileId: null as string | null };
}

/** Friendlies: the score goes to the other player to confirm instead of straight into stats. */
async function submitFriendly(
  check: { match: DrawMatch; scorerProfileId: string | null },
  input: Parameters<typeof submitFriendlyResult>[2]
) {
  if (!check.scorerProfileId) return { success: false as const, error: "Only the two players can score this friendly." };
  try {
    await submitFriendlyResult(check.match, check.scorerProfileId, input);
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Failed to save result." };
  }
  const match = check.match;
  const opponentId = check.scorerProfileId === match.player1Id ? match.player2Id : match.player1Id;
  const submitterName = check.scorerProfileId === match.player1Id ? match.player1Name : match.player2Name;
  after(() => notifyFriendlyResultToConfirm({ matchId: match.id, opponentProfileId: opponentId, submitterName }).catch(() => {}));
  signalAfterResponse(match);
  return { success: true as const };
}

/** Lighter check for the per-shot saves: the full permission check above runs
 * once per minute per referee and match, not on every ball. */
async function requireMatchScorer(matchId: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "You must be logged in." };
  return remember(`scorer:${session.id}:${matchId}`, 60_000, async () => {
    const check = await requireMatchStaff(matchId);
    if (!check.ok) return check;
    const { id, clubId, tableNumber } = check.match;
    return { ok: true as const, match: { id, clubId, tableNumber } };
  });
}

/** Wakes up the live page, table TV and overlay without delaying the referee. */
function signalAfterResponse(match: { id: string; clubId: string; tableNumber: number }) {
  after(() => signalMatchChanged(match).catch(() => {}));
}

/** Result Only mode: enter the final winner + score and complete the match in one step. */
export async function saveMatchResultAction(
  matchId: string,
  input: {
    winnerId: string;
    framesWonPlayer1: number;
    framesWonPlayer2: number;
    highestBreak: number;
    highestBreakPlayerId?: string;
  }
) {
  const check = await requireMatchStaff(matchId);
  if (!check.ok) return { success: false as const, error: check.error };

  if (input.winnerId !== check.match.player1Id && input.winnerId !== check.match.player2Id) {
    return { success: false as const, error: "Winner must be one of the two players." };
  }
  if (
    input.highestBreakPlayerId &&
    input.highestBreakPlayerId !== check.match.player1Id &&
    input.highestBreakPlayerId !== check.match.player2Id
  ) {
    return { success: false as const, error: "Highest break must belong to one of the two players." };
  }

  if (check.match.kind === "friendly") return submitFriendly(check, input);

  try {
    await recordMatchResult(check.match, input);
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Failed to save result." };
  }
  signalAfterResponse(check.match);
  return { success: true as const };
}

/** Frame-by-Frame mode: save the running frame tally without completing the match yet. */
export async function saveMatchProgressAction(
  matchId: string,
  input: { framesWonPlayer1: number; framesWonPlayer2: number; frameScores?: FrameScore[] }
) {
  const check = await requireMatchScorer(matchId);
  if (!check.ok) return { success: false as const, error: check.error };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("matches")
    .update({
      frames_won_player1: input.framesWonPlayer1,
      frames_won_player2: input.framesWonPlayer2,
      score: `${input.framesWonPlayer1} – ${input.framesWonPlayer2}`,
      ...(input.frameScores ? { frame_scores: input.frameScores } : {}),
    })
    .eq("id", matchId);

  if (error) return { success: false as const, error: error.message };
  signalAfterResponse(check.match);
  return { success: true as const };
}

/** Live Score mode: persist the in-progress frame score + current break after every ball. */
export async function updateLiveProgressAction(
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
) {
  const check = await requireMatchScorer(matchId);
  if (!check.ok) return { success: false as const, error: check.error };

  const { error } = await updateLiveProgress(matchId, input);
  if (error) return { success: false as const, error };
  signalAfterResponse(check.match);
  return { success: true as const };
}

/** Frame-by-Frame / Live Score modes: finish the match from the current frame tally. */
export async function finishMatchAction(
  matchId: string,
  input: {
    framesWonPlayer1: number;
    framesWonPlayer2: number;
    highestBreak: number;
    highestBreakPlayerId?: string;
    frameScores?: FrameScore[];
  }
) {
  const check = await requireMatchStaff(matchId);
  if (!check.ok) return { success: false as const, error: check.error };

  if (input.framesWonPlayer1 === input.framesWonPlayer2) {
    return { success: false as const, error: "Frames can't be tied — someone must have more frames won." };
  }
  if (
    input.highestBreakPlayerId &&
    input.highestBreakPlayerId !== check.match.player1Id &&
    input.highestBreakPlayerId !== check.match.player2Id
  ) {
    return { success: false as const, error: "Highest break must belong to one of the two players." };
  }

  const winnerId =
    input.framesWonPlayer1 > input.framesWonPlayer2 ? check.match.player1Id : check.match.player2Id;

  if (check.match.kind === "friendly") return submitFriendly(check, { winnerId, ...input });

  try {
    await recordMatchResult(check.match, { winnerId, ...input });
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Failed to finish match." };
  }
  signalAfterResponse(check.match);
  return { success: true as const };
}
