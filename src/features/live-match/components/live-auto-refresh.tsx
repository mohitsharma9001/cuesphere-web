"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useLiveSignal } from "@/lib/use-live-signal";
import { liveMatchChannel } from "@/lib/live-channels";

/** Keeps the live match page current: it refreshes the moment the referee
 * records a shot (realtime signal), with a slow regular refresh as a fallback
 * in case the realtime connection drops. */
export function LiveAutoRefresh({ matchId, intervalMs = 15000 }: { matchId?: string; intervalMs?: number }) {
  const router = useRouter();

  useLiveSignal(matchId ? liveMatchChannel(matchId) : null, () => router.refresh());

  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), matchId ? intervalMs : 4000);
    return () => clearInterval(id);
  }, [router, intervalMs, matchId]);

  return null;
}
