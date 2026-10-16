"use client";

import * as React from "react";
import type { FrameScore } from "@/types/match";
import type { TableBoard, TableMatch } from "@/features/table-display/types";
import { useLiveSignal } from "@/lib/use-live-signal";
import { liveTableChannel } from "@/lib/live-channels";

// Realtime signals make updates instant; this regular check is only a fallback.
const POLL_MS = 5000;
const FRAME_BANNER_MS = 8000;
const RESULT_MS = 10 * 60 * 1000;
const INTRO_MS = 12000;

export type TableScreen =
  | { kind: "live"; match: TableMatch }
  | { kind: "result"; match: TableMatch }
  | { kind: "next"; match: TableMatch }
  | { kind: "idle" };

export interface FrameBanner {
  frame: FrameScore;
  winner: 1 | 2;
  match: TableMatch;
}

/** Polls the table's live state and works out what the screen should show:
 * the live frame, a short "frame won" banner, the result for a while after
 * the match ends, the next match on the table, or nothing. */
export function useTableBoard(initial: TableBoard, clubSlug: string, table: number) {
  const [board, setBoard] = React.useState(initial);
  const [banner, setBanner] = React.useState<FrameBanner | null>(null);
  const [introUntil, setIntroUntil] = React.useState(0);
  const [now, setNow] = React.useState(() => Date.now());
  /** Match whose result is on screen; cleared once RESULT_MS has passed. */
  const [resultId, setResultId] = React.useState<string | null>(null);
  const followRef = React.useRef<string | null>(initial.live?.id ?? null);
  const framesSeen = React.useRef<{ id: string; count: number } | null>(
    initial.live ? { id: initial.live.id, count: initial.live.frames.length } : null
  );
  const completedAt = React.useRef<{ id: string; at: number } | null>(null);

  const wakeRef = React.useRef<() => void>(() => {});
  // The server signals this table the moment the referee records a shot.
  useLiveSignal(liveTableChannel(initial.club.id, table), () => wakeRef.current(), 250);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let inFlight = false;
    let again = false;

    /** Fetch now (realtime signal), or right after the current fetch if one is running. */
    wakeRef.current = () => {
      if (inFlight) {
        again = true;
        return;
      }
      clearTimeout(timer);
      tick();
    };

    async function tick() {
      inFlight = true;
      try {
        const follow = followRef.current ? `?follow=${encodeURIComponent(followRef.current)}` : "";
        const res = await fetch(`/api/table-board/${clubSlug}/${table}${follow}`, { cache: "no-store" });
        if (res.ok && !cancelled) {
          const next = (await res.json()) as TableBoard;
          const live = next.live;

          if (live) {
            const seen = framesSeen.current;
            if (!seen || seen.id !== live.id) {
              // A new match just went live on this table.
              if (followRef.current !== live.id) setIntroUntil(Date.now() + INTRO_MS);
              framesSeen.current = { id: live.id, count: live.frames.length };
            } else if (live.frames.length > seen.count) {
              const frame = live.frames[live.frames.length - 1];
              if (frame.player1Score !== frame.player2Score) {
                setBanner({ frame, winner: frame.player1Score > frame.player2Score ? 1 : 2, match: live });
                setTimeout(() => !cancelled && setBanner(null), FRAME_BANNER_MS);
              }
              framesSeen.current = { id: live.id, count: live.frames.length };
            }
            followRef.current = live.id;
            completedAt.current = null;
            setResultId(null);
          } else if (next.followed?.status === "completed") {
            if (completedAt.current?.id !== next.followed.id) {
              completedAt.current = { id: next.followed.id, at: Date.now() };
              setResultId(next.followed.id);
            } else if (Date.now() - completedAt.current.at > RESULT_MS) {
              followRef.current = null;
              setResultId(null);
            }
          }

          setBoard(next);
          setNow(Date.now());
        }
      } catch {
        // Network blip — keep showing the last state and try again.
      }
      inFlight = false;
      if (cancelled) return;
      if (again) {
        again = false;
        tick();
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    }

    timer = setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [clubSlug, table]);

  let screen: TableScreen;
  if (board.live) screen = { kind: "live", match: board.live };
  else if (board.followed?.status === "completed" && resultId === board.followed.id)
    screen = { kind: "result", match: board.followed };
  else if (board.next) screen = { kind: "next", match: board.next };
  else screen = { kind: "idle" };

  return { board, screen, banner, showIntro: screen.kind === "live" && now < introUntil };
}
