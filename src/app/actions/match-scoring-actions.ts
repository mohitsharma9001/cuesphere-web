"use server";

import { getSession } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { updateLiveProgress, type MatchResultInput } from "@/services/match-service";
import type { FrameScore } from "@/types/match";
import type { BallColor } from "@/features/live-match/components/ball-icon";

// One API call per scoring action. The API checks the scorer (club staff, the
// tournament's scorekeeper, or — for friendlies — one of the two players),
// records stats/results/achievements, sends friendly results to the opponent
// to confirm, and wakes the live page, table TV and overlay.

async function send(path: string, method: "PATCH" | "POST", body: unknown, fallback: string) {
  if (!(await getSession())) return { success: false as const, error: "You must be logged in." };
  try {
    await api(path, { method, body });
    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : fallback };
  }
}

const matchPath = (matchId: string, action: string) => `/matches/${encodeURIComponent(matchId)}/${action}`;

/** Result Only mode: enter the final winner + score and complete the match in one step. */
export async function saveMatchResultAction(matchId: string, input: Omit<MatchResultInput, "frameScores">) {
  return send(matchPath(matchId, "result"), "POST", input, "Failed to save result.");
}

/** Frame-by-Frame mode: save the running frame tally without completing the match yet. */
export async function saveMatchProgressAction(
  matchId: string,
  input: { framesWonPlayer1: number; framesWonPlayer2: number; frameScores?: FrameScore[] }
) {
  return send(matchPath(matchId, "progress"), "PATCH", input, "Failed to save progress.");
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
  if (!(await getSession())) return { success: false as const, error: "You must be logged in." };
  const { error } = await updateLiveProgress(matchId, input);
  return error ? { success: false as const, error } : { success: true as const };
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
  return send(matchPath(matchId, "finish"), "POST", input, "Failed to finish match.");
}
