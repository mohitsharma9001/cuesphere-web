import type { BallColor } from "@/features/live-match/components/ball-icon";

export type MatchStatus = "awaiting_draw" | "scheduled" | "live" | "completed";

export interface FrameScore {
  frame: number;
  player1Score: number;
  player2Score: number;
}

export type MatchKind = "tournament" | "friendly";

/** A friendly's life: challenge sent → accepted → scored → the other player confirms. */
export type FriendlyState =
  | "invited"
  | "declined"
  | "cancelled"
  | "accepted"
  | "pending_confirmation"
  | "confirmed"
  | "disputed";

export interface DrawMatch {
  id: string;
  kind: MatchKind;
  /** Empty for friendlies — they belong to no club (see venueClubId). */
  clubId: string;
  /** Empty for friendlies. */
  tournamentId: string;
  round: string;
  tableNumber: number;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  reportingTime: string;
  matchStartTime: string;
  status: MatchStatus;
  winnerId: string | null;
  score: string | null;
  framesWonPlayer1: number;
  framesWonPlayer2: number;
  highestBreak: number;
  highestBreakPlayerId: string | null;
  currentFrameScorePlayer1: number;
  currentFrameScorePlayer2: number;
  currentBreak: number;
  currentBreakBalls: BallColor[];
  redsRemaining: number;
  frameScores: FrameScore[];
  /** Player at the table during live scoring; null if unknown. */
  currentPlayer: 1 | 2 | null;
  /** Between frames: the referee has ended a frame and not started the next. */
  inFrameBreak: boolean;
  /** Friendlies only: where it was played, if at a CueSphere club. */
  venueClubId: string | null;
  /** Friendlies only (tournaments use the tournament's best-of). */
  bestOf: number | null;
  /** Friendlies only: auth user who sent the challenge. */
  createdBy: string | null;
  friendlyState: FriendlyState | null;
  /** Friendlies only: player profile id that submitted the final score. */
  resultSubmittedBy: string | null;
  createdAt: string;
}
