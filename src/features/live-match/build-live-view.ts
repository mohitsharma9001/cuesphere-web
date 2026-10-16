import type { LiveMatchView, FrameResult } from "@/features/live-match/types";
import type { BallColor } from "@/features/live-match/components/ball-icon";
import type { DrawMatch } from "@/types/match";

/** Season numbers shown beside each player on the match centre. */
export interface SeasonStats {
  matchesPlayed: number;
  wins: number;
  highestBreak: number;
}

const SAMPLE_BALLS: BallColor[] = ["red", "yellow", "green", "brown", "blue", "pink", "black"];


function buildFrameHistory(match: DrawMatch, bestOf: number): FrameResult[] {
  const played: FrameResult[] = match.frameScores.map((frame) => ({
    frame: frame.frame,
    player1: frame.player1Score,
    player2: frame.player2Score,
    winner: frame.player1Score === frame.player2Score ? null : frame.player1Score > frame.player2Score ? "player1" : "player2",
  }));

  const padded = [...played];
  for (let frame = played.length + 1; frame <= bestOf; frame++) {
    padded.push({ frame, player1: null, player2: null, winner: null });
  }
  return padded;
}

function winRate(stats: SeasonStats | undefined): number {
  if (!stats || stats.matchesPlayed === 0) return 0;
  return Math.round((stats.wins / stats.matchesPlayed) * 100);
}

export function buildLiveMatchView(
  match: DrawMatch,
  /** Tournament name and best-of, or the friendly's. */
  context: { title: string; bestOf: number } | undefined,
  photos: { player1?: string; player2?: string },
  headToHead: { player1Wins: number; player2Wins: number },
  playerStats: { player1?: SeasonStats; player2?: SeasonStats }
): LiveMatchView {
  const bestOf = context?.bestOf ?? 7;
  const framesToWin = Math.ceil(bestOf / 2);
  const framesPlayed = match.framesWonPlayer1 + match.framesWonPlayer2;
  const isPlayer1Break = match.highestBreakPlayerId === match.player1Id;

  return {
    tournamentName: context?.title ?? "Tournament",
    round: match.round,
    tableLabel: match.tableNumber > 0 ? `Table ${match.tableNumber}` : match.round,
    isLive: match.status === "live" || match.status === "scheduled",
    bestOf,
    referee: "",
    startedAt: match.matchStartTime,
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: match.matchStartTime,
    player1: {
      name: match.player1Name,
      country: "IN",
      framesWon: match.framesWonPlayer1,
      points: match.currentFrameScorePlayer1,
      photoUrl: photos.player1,
    },
    player2: {
      name: match.player2Name,
      country: "IN",
      framesWon: match.framesWonPlayer2,
      points: match.currentFrameScorePlayer2,
      photoUrl: photos.player2,
    },
    currentFrameNumber: Math.min(framesPlayed + 1, bestOf),
    currentBreak: {
      points: match.currentBreak,
      owner: match.currentFrameScorePlayer1 >= match.currentFrameScorePlayer2 ? "player1" : "player2",
      balls: match.currentBreakBalls,
    },
    frameHistory: buildFrameHistory(match, bestOf),
    ballsOnTable: SAMPLE_BALLS,
    redsRemaining: match.redsRemaining,
    matchStatus: match.status === "completed" ? "Completed" : "In Progress",
    nextFrameCountdownSeconds: null,
    remainingFrames: Math.max(0, framesToWin - Math.max(match.framesWonPlayer1, match.framesWonPlayer2)),
    commentary: [],
    headToHead,
    seasonStats: {
      player1: {
        matches: playerStats.player1?.matchesPlayed ?? 0,
        wins: playerStats.player1?.wins ?? 0,
        winRate: winRate(playerStats.player1),
        highestBreak: playerStats.player1?.highestBreak ?? 0,
      },
      player2: {
        matches: playerStats.player2?.matchesPlayed ?? 0,
        wins: playerStats.player2?.wins ?? 0,
        winRate: winRate(playerStats.player2),
        highestBreak: playerStats.player2?.highestBreak ?? 0,
      },
    },
    highestBreakInMatch: {
      points: match.highestBreak || 0,
      by: isPlayer1Break ? "player1" : "player2",
      frame: 1,
    },
    nextMatch: null,
  };
}
