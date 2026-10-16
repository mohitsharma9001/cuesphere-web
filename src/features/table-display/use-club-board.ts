"use client";

import * as React from "react";
import type { ClubBoard } from "@/features/table-display/types";
import { useLiveSignal } from "@/lib/use-live-signal";
import { liveClubChannel } from "@/lib/live-channels";

// Realtime signals make updates instant; this regular check is only a fallback.
const POLL_MS = 5000;
/** How long each live table stays on screen before the next one. */
export const ROTATE_MS = 10_000;

/** Pick the table to show: the current one while it's still live, otherwise the next live table along. */
function resolveTable(liveTables: number[], wanted: number | null): number | null {
  if (liveTables.length === 0) return null;
  if (wanted !== null && liveTables.includes(wanted)) return wanted;
  return liveTables.find((t) => wanted === null || t > wanted) ?? liveTables[0];
}

/** Keeps every table's live state fresh and steps through the live tables
 * every ROTATE_MS. Finished matches drop out of the loop on the next update. */
export function useClubBoard(initial: ClubBoard, clubSlug: string) {
  const [board, setBoard] = React.useState(initial);
  const [rotation, setRotation] = React.useState<{ table: number | null; since: number }>(() => ({
    table: initial.live[0]?.tableNumber ?? null,
    since: Date.now(),
  }));
  const [now, setNow] = React.useState(() => Date.now());
  const liveTablesRef = React.useRef<number[]>(initial.live.map((m) => m.tableNumber));
  const wakeRef = React.useRef<() => void>(() => {});

  // The server signals the club the moment any referee records a shot.
  useLiveSignal(liveClubChannel(initial.club.id), () => wakeRef.current(), 400);

  React.useEffect(() => {
    liveTablesRef.current = board.live.map((m) => m.tableNumber);
  }, [board]);

  // Polling, with an immediate fetch on every realtime signal.
  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let inFlight = false;
    let again = false;

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
        const res = await fetch(`/api/club-board/${clubSlug}`, { cache: "no-store" });
        if (res.ok && !cancelled) setBoard((await res.json()) as ClubBoard);
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
  }, [clubSlug]);

  // The rotation clock.
  React.useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setRotation((r) => {
        const tables = liveTablesRef.current;
        const shown = resolveTable(tables, r.table);
        // The table on screen just finished: move on straight away.
        if (shown !== r.table) return { table: shown, since: t };
        if (shown === null || t - r.since < ROTATE_MS) return r;
        const i = tables.indexOf(shown);
        return { table: tables[(i + 1) % tables.length], since: t };
      });
    }, 500);
    return () => clearInterval(id);
  }, []);

  const liveTables = board.live.map((m) => m.tableNumber);
  const shownTable = resolveTable(liveTables, rotation.table);
  const current = board.live.find((m) => m.tableNumber === shownTable) ?? null;
  const progress = shownTable === rotation.table ? Math.min(1, (now - rotation.since) / ROTATE_MS) : 0;
  const upNext = shownTable === null ? [] : [...liveTables.filter((t) => t > shownTable), ...liveTables.filter((t) => t < shownTable)];

  return { board, current, liveTables, upNext, progress };
}
