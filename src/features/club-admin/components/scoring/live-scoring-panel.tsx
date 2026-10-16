"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { BallTracker } from "@/features/club-admin/components/scoring/ball-tracker";
import { ScoreButtons } from "@/features/club-admin/components/scoring/score-buttons";
import { MatchActions } from "@/features/club-admin/components/scoring/match-actions";
import {
  FrameHistoryTable,
  type FrameEntry,
} from "@/features/club-admin/components/scoring/frame-history-table";
import { BallIcon, BALL_VALUES } from "@/features/live-match/components/ball-icon";
import type { BallColor } from "@/features/live-match/components/ball-icon";
import {
  finishMatchAction,
  saveMatchProgressAction,
  updateLiveProgressAction,
} from "@/app/actions/match-scoring-actions";
import { cn } from "@/lib/utils";
import type { DrawMatch } from "@/types/match";

const TOTAL_REDS = 15;

type LiveProgress = Parameters<typeof updateLiveProgressAction>[1];
const COLORS: BallColor[] = ["yellow", "green", "brown", "blue", "pink", "black"];

interface LiveState {
  currentPlayer: 1 | 2;
  currentBreak: number;
  breakBalls: BallColor[];
  redsRemaining: number;
  /** Colors already potted for good — only tracked once all reds are gone. */
  coloredPotted: BallColor[];
  frameScoreP1: number;
  frameScoreP2: number;
  frameHistory: FrameEntry[];
  matchHighestBreak: number;
  matchHighestBreakPlayer: 1 | 2 | null;
  /** Between End Frame and the next frame starting — table screens play ads. */
  frameBreak: boolean;
}

interface Board {
  current: LiveState;
  history: LiveState[];
}

function initialState(): LiveState {
  return {
    currentPlayer: 1,
    currentBreak: 0,
    breakBalls: [],
    redsRemaining: TOTAL_REDS,
    coloredPotted: [],
    frameScoreP1: 0,
    frameScoreP2: 0,
    frameHistory: [],
    matchHighestBreak: 0,
    matchHighestBreakPlayer: null,
    frameBreak: false,
  };
}

/** Picks up from what was last saved, so a reload or a locked phone doesn't
 * wipe the frame in progress. If the player on strike wasn't saved, it
 * defaults to player 1 and the referee can tap to correct it. */
function stateFromMatch(match: DrawMatch): LiveState {
  return {
    ...initialState(),
    currentPlayer: match.currentPlayer ?? 1,
    frameBreak: match.inFrameBreak ?? false,
    currentBreak: match.currentBreak ?? 0,
    breakBalls: match.currentBreakBalls ?? [],
    redsRemaining: match.redsRemaining ?? TOTAL_REDS,
    frameScoreP1: match.currentFrameScorePlayer1 ?? 0,
    frameScoreP2: match.currentFrameScorePlayer2 ?? 0,
    frameHistory: (match.frameScores ?? []).map((f, i) => ({
      frame: f.frame ?? i + 1,
      player1Score: f.player1Score,
      player2Score: f.player2Score,
    })),
    matchHighestBreak: match.highestBreak ?? 0,
    matchHighestBreakPlayer:
      match.highestBreakPlayerId === match.player1Id ? 1 : match.highestBreakPlayerId === match.player2Id ? 2 : null,
  };
}

function hasProgress(s: LiveState) {
  return s.frameScoreP1 > 0 || s.frameScoreP2 > 0 || s.frameHistory.length > 0;
}

/** Which balls are "on": red then colour while reds remain, any colour after
 * the last red, then the colours in order. */
function tableRules(s: LiveState) {
  const onColour = s.breakBalls[s.breakBalls.length - 1] === "red";
  const colorsLeft = COLORS.filter((c) => !s.coloredPotted.includes(c));

  if (s.redsRemaining > 0) {
    return {
      canPotRed: !onColour,
      colors: onColour ? COLORS : [],
      colorsOnTable: COLORS,
      pointsRemaining: s.redsRemaining * 8 + 27 + (onColour ? 7 : 0),
      hint: onColour ? "Next: any colour" : "Next: a red",
    };
  }
  if (onColour) {
    return {
      canPotRed: false,
      colors: COLORS,
      colorsOnTable: COLORS,
      pointsRemaining: 27 + 7,
      hint: "Next: any colour",
    };
  }
  return {
    canPotRed: false,
    colors: colorsLeft.slice(0, 1),
    colorsOnTable: colorsLeft,
    pointsRemaining: colorsLeft.reduce((sum, c) => sum + BALL_VALUES[c], 0),
    hint: colorsLeft.length ? `Next: ${colorsLeft[0]}` : "All balls potted",
  };
}

/** Whoever was on strike for `prev.currentBreak` gets credited if it's now
 * the biggest break of the match — called right before a break resets. */
function carryHighestBreak(prev: LiveState): Pick<LiveState, "matchHighestBreak" | "matchHighestBreakPlayer"> {
  if (prev.currentBreak > prev.matchHighestBreak) {
    return { matchHighestBreak: prev.currentBreak, matchHighestBreakPlayer: prev.currentPlayer };
  }
  return { matchHighestBreak: prev.matchHighestBreak, matchHighestBreakPlayer: prev.matchHighestBreakPlayer };
}

function framesWon(frames: FrameEntry[]) {
  return {
    p1: frames.filter((f) => f.player1Score > f.player2Score).length,
    p2: frames.filter((f) => f.player2Score > f.player1Score).length,
  };
}

function PlayerPanel({
  name,
  score,
  frames,
  onStrike,
  canSwitch,
  side,
  onSelect,
}: {
  name: string;
  score: number;
  frames: number;
  onStrike: boolean;
  canSwitch: boolean;
  side: 1 | 2;
  onSelect: () => void;
}) {
  const accent = side === 1 ? "text-primary" : "text-info";
  return (
    <button
      type="button"
      aria-pressed={onStrike}
      aria-label={`${name}, ${score} points${onStrike ? ", on strike" : ""}`}
      disabled={onStrike || !canSwitch}
      onClick={onSelect}
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-2xl border-2 bg-card p-3 transition disabled:cursor-default",
        side === 2 && "items-end text-right",
        onStrike ? (side === 1 ? "border-primary" : "border-info") : "border-border"
      )}
    >
      <span className="flex w-full min-w-0 items-center gap-1.5 text-[13px] font-bold text-foreground">
        {side === 2 ? <span className="shrink-0 font-normal text-muted-foreground">{frames} ·</span> : null}
        <span className={cn("min-w-0 flex-1 truncate", side === 2 && "text-right")}>{name}</span>
        {side === 1 ? <span className="shrink-0 font-normal text-muted-foreground">· {frames}</span> : null}
      </span>
      <span className={cn("font-tabular text-4xl font-bold leading-none", accent)}>{score}</span>
      <span
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          onStrike ? accent : "text-muted-foreground/70"
        )}
      >
        {onStrike ? "On strike" : canSwitch ? "Tap if at table" : "Waiting"}
      </span>
    </button>
  );
}

export function LiveScoringPanel({
  match,
}: {
  match: DrawMatch;
  player1PhotoUrl?: string | null;
  player2PhotoUrl?: string | null;
}) {
  const router = useRouter();
  const [board, setBoard] = React.useState<Board>(() => ({ current: stateFromMatch(match), history: [] }));
  const [resumed] = React.useState(() => hasProgress(stateFromMatch(match)));
  const [isFinishing, setIsFinishing] = React.useState(false);
  /** After a foul: reds on the table before it, and how many the referee says went down. */
  const [foulReds, setFoulReds] = React.useState<{ before: number; chosen: number } | null>(null);
  const state = board.current;
  const rules = tableRules(state);
  const won = framesWon(state.frameHistory);

  /** Always derives the next state from the freshest previous state, so
   * rapid repeated clicks (e.g. potting several reds in a row) never lose
   * an update to a stale closure. */
  function commit(updater: (prev: LiveState) => LiveState, keepFrameBreak = false) {
    setFoulReds(null);
    setBoard((b) => {
      const next = updater(b.current);
      if (next === b.current) return b;
      // Recording any shot means the next frame has started, so the break (and its ads) ends.
      const current = keepFrameBreak || !next.frameBreak ? next : { ...next, frameBreak: false };
      return { current, history: [...b.history, b.current] };
    });
  }

  function startFrame() {
    commit((prev) => (prev.frameBreak ? { ...prev, frameBreak: false } : prev));
  }

  function undo() {
    setFoulReds(null);
    setBoard((b) => {
      if (b.history.length === 0) return b;
      return { current: b.history[b.history.length - 1], history: b.history.slice(0, -1) };
    });
  }

  function potBall(color: BallColor) {
    commit((prev) => {
      const r = tableRules(prev);
      const isRed = color === "red";
      if (isRed ? !r.canPotRed : !r.colors.includes(color)) return prev;

      const points = BALL_VALUES[color];
      const scoreKey = prev.currentPlayer === 1 ? "frameScoreP1" : "frameScoreP2";
      // With no reds left, a colour is gone for good — except the one taken
      // straight after the last red, which is re-spotted.
      const onColour = prev.breakBalls[prev.breakBalls.length - 1] === "red";
      const colourIsFinal = !isRed && prev.redsRemaining === 0 && !onColour;

      return {
        ...prev,
        redsRemaining: isRed ? prev.redsRemaining - 1 : prev.redsRemaining,
        coloredPotted: colourIsFinal ? [...prev.coloredPotted, color] : prev.coloredPotted,
        currentBreak: prev.currentBreak + points,
        breakBalls: [...prev.breakBalls, color],
        [scoreKey]: prev[scoreKey] + points,
      };
    });
  }

  function switchTurn(prev: LiveState): LiveState {
    return {
      ...prev,
      ...carryHighestBreak(prev),
      currentBreak: 0,
      breakBalls: [],
      currentPlayer: prev.currentPlayer === 1 ? 2 : 1,
    };
  }

  function foul(points: number) {
    const redsBefore = state.redsRemaining;
    commit((prev) => {
      const opponentKey = prev.currentPlayer === 1 ? "frameScoreP2" : "frameScoreP1";
      return { ...switchTurn(prev), [opponentKey]: prev[opponentKey] + points };
    });
    if (redsBefore > 0) setFoulReds({ before: redsBefore, chosen: 0 });
  }

  /** Reds potted on a foul don't score but stay off the table (e.g. red + in-off).
   * Amends the foul just recorded, so a single Undo still reverses the whole foul. */
  function setRedsPottedOnFoul(count: number) {
    if (!foulReds) return;
    const redsRemaining = Math.max(0, foulReds.before - count);
    setBoard((b) => ({ ...b, current: { ...b.current, redsRemaining } }));
    setFoulReds({ ...foulReds, chosen: count });
  }

  function miss() {
    commit(switchTurn);
  }

  /** A nominated free ball scores as the ball on: 1 while reds remain (then a
   * colour is on), otherwise the value of the lowest colour left. */
  function freeBall() {
    commit((prev) => {
      if (prev.breakBalls.length > 0) return prev;
      const scoreKey = prev.currentPlayer === 1 ? "frameScoreP1" : "frameScoreP2";
      if (prev.redsRemaining > 0) {
        return {
          ...prev,
          currentBreak: prev.currentBreak + 1,
          breakBalls: [...prev.breakBalls, "red"],
          [scoreKey]: prev[scoreKey] + 1,
        };
      }
      const lowest = COLORS.find((c) => !prev.coloredPotted.includes(c));
      if (!lowest) return prev;
      const value = BALL_VALUES[lowest];
      return {
        ...prev,
        currentBreak: prev.currentBreak + value,
        breakBalls: [...prev.breakBalls, lowest],
        [scoreKey]: prev[scoreKey] + value,
      };
    });
  }

  function setStriker(player: 1 | 2) {
    // Choosing who breaks off during the frame break doesn't end the break.
    commit(
      (prev) => (prev.currentBreak > 0 || prev.currentPlayer === player ? prev : { ...prev, currentPlayer: player }),
      true
    );
  }

  function endFrame() {
    if (state.frameScoreP1 === 0 && state.frameScoreP2 === 0) {
      toast.error("No points scored in this frame yet.");
      return;
    }
    if (state.frameScoreP1 === state.frameScoreP2) {
      toast.error("Scores are level — re-spot the black and play on.");
      return;
    }

    const newFrameHistory = [
      ...state.frameHistory,
      { frame: state.frameHistory.length + 1, player1Score: state.frameScoreP1, player2Score: state.frameScoreP2 },
    ];
    const totals = framesWon(newFrameHistory);
    saveMatchProgressAction(match.id, {
      framesWonPlayer1: totals.p1,
      framesWonPlayer2: totals.p2,
      frameScores: newFrameHistory,
    }).catch(() => {});

    commit(
      (prev) => ({
        ...initialState(),
        frameHistory: newFrameHistory,
        ...carryHighestBreak(prev),
        // Players alternate breaking off: player 1 breaks odd frames.
        currentPlayer: newFrameHistory.length % 2 === 0 ? 1 : 2,
        frameBreak: true,
      }),
      true
    );
  }

  async function finish() {
    let frames = state.frameHistory;
    const { matchHighestBreak, matchHighestBreakPlayer } = carryHighestBreak(state);
    if (state.frameScoreP1 !== 0 || state.frameScoreP2 !== 0) {
      frames = [
        ...frames,
        { frame: frames.length + 1, player1Score: state.frameScoreP1, player2Score: state.frameScoreP2 },
      ];
    }

    const totals = framesWon(frames);
    if (totals.p1 === totals.p2) {
      toast.error("Frames are tied — play or end at least one more frame first.");
      return;
    }
    if (
      !window.confirm(
        `Finish the match ${totals.p1}–${totals.p2}? This saves the result and updates both players' stats.`
      )
    ) {
      return;
    }

    const highestBreakPlayerId =
      matchHighestBreakPlayer === 1
        ? match.player1Id
        : matchHighestBreakPlayer === 2
          ? match.player2Id
          : undefined;

    setIsFinishing(true);
    const result = await finishMatchAction(match.id, {
      framesWonPlayer1: totals.p1,
      framesWonPlayer2: totals.p2,
      highestBreak: matchHighestBreak,
      highestBreakPlayerId,
      frameScores: frames,
    });
    setIsFinishing(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(match.kind === "friendly" ? "Result sent — your opponent confirms it." : "Match finished — player stats updated.");
    router.refresh();
  }

  // Saves never queue up behind each other: while one is on its way, only the
  // newest state is kept and sent next, so viewers are never behind by a backlog.
  const sender = React.useRef<{ inFlight: boolean; pending: LiveProgress | null; first: boolean }>({
    inFlight: false,
    pending: null,
    first: true,
  });
  const sendProgress = React.useCallback(
    (payload: LiveProgress) => {
      const s = sender.current;
      if (s.inFlight) {
        s.pending = payload;
        return;
      }
      s.inFlight = true;
      const run = (p: LiveProgress) => {
        updateLiveProgressAction(match.id, p)
          .catch(() => {})
          .finally(() => {
            const next = s.pending;
            s.pending = null;
            if (next) run(next);
            else s.inFlight = false;
          });
      };
      run(payload);
    },
    [match.id]
  );

  // Push the in-progress frame score + current break to the DB after every
  // change; the server then signals the live page, TV and overlay to refresh.
  React.useEffect(() => {
    // The first render is what's already saved — nothing to send.
    if (sender.current.first) {
      sender.current.first = false;
      return;
    }
    const { matchHighestBreak, matchHighestBreakPlayer } = carryHighestBreak(state);
    const highestBreakSoFarPlayerId =
      matchHighestBreakPlayer === 1 ? match.player1Id : matchHighestBreakPlayer === 2 ? match.player2Id : null;

    sendProgress({
      currentFrameScorePlayer1: state.frameScoreP1,
      currentFrameScorePlayer2: state.frameScoreP2,
      currentBreak: state.currentBreak,
      currentBreakBalls: state.breakBalls,
      redsRemaining: state.redsRemaining,
      highestBreakSoFar: matchHighestBreak,
      highestBreakSoFarPlayerId,
      currentPlayer: state.currentPlayer,
      inFrameBreak: state.frameBreak,
    });
  }, [
    sendProgress,
    match.player1Id,
    match.player2Id,
    state.frameScoreP1,
    state.frameScoreP2,
    state.currentBreak,
    state.breakBalls,
    state.redsRemaining,
    state.matchHighestBreak,
    state.matchHighestBreakPlayer,
    state.currentPlayer,
    state.frameBreak,
  ]);

  const currentPlayerName = state.currentPlayer === 1 ? match.player1Name : match.player2Name;
  const canSwitch = state.currentBreak === 0;

  return (
    <div className="space-y-4 sm:rounded-xl sm:bg-card sm:p-6 sm:ring-1 sm:ring-foreground/10">
      {resumed && board.history.length === 0 ? (
        <p className="rounded-xl bg-info-soft px-3.5 py-2.5 text-xs text-info">
          Picked up where scoring left off.
          {match.currentPlayer ? "" : " If the wrong player is on strike, tap the player at the table."}
        </p>
      ) : null}

      {state.frameBreak ? (
        <div className="space-y-3 rounded-2xl border border-primary/40 bg-primary-soft p-4">
          <div>
            <p className="font-heading text-base font-bold text-foreground">
              Frame {state.frameHistory.length} done · frame break
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              The table TV and stream show the club&apos;s ads until you start the next frame. Tap the player
              breaking off if it isn&apos;t {currentPlayerName}.
            </p>
          </div>
          <Button className="h-12 w-full text-base" onClick={startFrame}>
            <Play className="size-4" /> Start Frame {state.frameHistory.length + 1}
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        <PlayerPanel
          side={1}
          name={match.player1Name}
          score={state.frameScoreP1}
          frames={won.p1}
          onStrike={state.currentPlayer === 1}
          canSwitch={canSwitch}
          onSelect={() => setStriker(1)}
        />
        <div className="flex flex-col items-center justify-center px-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Break</span>
          <span className="font-tabular text-3xl font-bold leading-none text-foreground">{state.currentBreak}</span>
          <span className="mt-1 text-[10px] text-muted-foreground">Frame {state.frameHistory.length + 1}</span>
        </div>
        <PlayerPanel
          side={2}
          name={match.player2Name}
          score={state.frameScoreP2}
          frames={won.p2}
          onStrike={state.currentPlayer === 2}
          canSwitch={canSwitch}
          onSelect={() => setStriker(2)}
        />
      </div>

      <div className="flex min-h-6 flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">{currentPlayerName}&apos;s break</span>
        {state.breakBalls.map((ball, i) => (
          <BallIcon key={i} color={ball} size="sm" />
        ))}
      </div>

      <BallTracker
        redsRemaining={state.redsRemaining}
        colorsOnTable={rules.colorsOnTable}
        pointsRemaining={rules.pointsRemaining}
      />

      <ScoreButtons
        redsRemaining={state.redsRemaining}
        canPotRed={rules.canPotRed}
        availableColors={rules.colors}
        canFreeBall={state.breakBalls.length === 0 && rules.pointsRemaining > 0}
        hint={rules.hint}
        onPot={potBall}
        onFoul={foul}
        onMiss={miss}
        onFreeBall={freeBall}
      />

      {foulReds ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive-soft p-3.5">
          <p className="text-sm font-semibold text-foreground">Any reds potted on that foul?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">They don&apos;t score, but they stay off the table.</p>
          <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Reds potted on the foul">
            {[0, 1, 2, 3].map((count) => (
              <button
                key={count}
                type="button"
                role="radio"
                aria-checked={foulReds.chosen === count}
                disabled={count > foulReds.before}
                onClick={() => setRedsPottedOnFoul(count)}
                className={cn(
                  "h-11 rounded-xl border text-base font-bold transition disabled:opacity-30",
                  foulReds.chosen === count
                    ? "border-foreground bg-foreground text-background"
                    : "border-border-strong bg-card text-foreground"
                )}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <MatchActions
        onUndo={undo}
        onEndFrame={endFrame}
        onFinish={finish}
        canUndo={board.history.length > 0}
        canEndFrame={state.frameScoreP1 !== 0 || state.frameScoreP2 !== 0}
        isFinishing={isFinishing}
      />

      <p className="text-center text-xs text-muted-foreground">
        Every shot is saved and shown on the club&apos;s live page.
      </p>

      {state.frameHistory.length > 0 ? (
        <FrameHistoryTable
          frames={state.frameHistory}
          player1Name={match.player1Name}
          player2Name={match.player2Name}
        />
      ) : null}
    </div>
  );
}
