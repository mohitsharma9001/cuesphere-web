import type { BallColor } from "@/features/live-match/components/ball-icon";
import type { FrameScore, MatchStatus } from "@/types/match";
import type { AdSettings, OverlayToggles } from "@/types/stream";

export interface TableSide {
  name: string;
  initials: string;
  photoUrl: string | null;
  /** Points in the current frame. */
  score: number;
  frames: number;
}

/** Everything a table TV or stream overlay shows about one match. */
export interface TableMatch {
  id: string;
  status: MatchStatus;
  round: string;
  tournamentName: string;
  bestOf: number | null;
  tableNumber: number;
  reportingTime: string;
  startTime: string;
  p1: TableSide;
  p2: TableSide;
  currentBreak: number;
  breakBalls: BallColor[];
  redsRemaining: number;
  /** Null once the reds are gone (which colours remain isn't stored). */
  pointsRemaining: number | null;
  onStrike: 1 | 2 | null;
  /** The referee has ended a frame and not started the next one yet. */
  inFrameBreak: boolean;
  frames: FrameScore[];
  highestBreak: number;
  highestBreakBy: 1 | 2 | null;
  winner: 1 | 2 | null;
}

export interface TickerItem {
  table: number;
  live: boolean;
  text: string;
}

export interface TableStream {
  youtubeUrl: string | null;
  sponsorLogos: string[];
  accent: string;
  show: OverlayToggles;
  ads: AdSettings;
}

export interface TableBoard {
  club: { id: string; name: string; logoUrl: string };
  stream: TableStream;
  table: number;
  live: TableMatch | null;
  next: TableMatch | null;
  /** The match the screen was last showing, so it can show the result once it ends. */
  followed: TableMatch | null;
  ticker: TickerItem[];
}

/** The whole club's live state, for a TV that rotates through every live table. */
export interface ClubBoard {
  club: { id: string; name: string; logoUrl: string };
  stream: TableStream;
  /** One live match per table, in table order. */
  live: TableMatch[];
  /** Upcoming matches on tables with nothing live, in table order. */
  next: TableMatch[];
}
