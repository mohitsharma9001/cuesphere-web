"use client";

import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { LIVE_SIGNAL_EVENT } from "@/lib/live-channels";

let client: SupabaseClient | null = null;
function getClient() {
  client ??= createSupabaseBrowserClient();
  return client;
}

/** Calls onSignal whenever the server says this channel's match changed.
 * Bursts (a fast break) are collapsed so the screen refreshes at most every
 * `minGapMs`, always ending on the latest state. */
export function useLiveSignal(channelName: string | null, onSignal: () => void, minGapMs = 400) {
  const callback = React.useRef(onSignal);
  React.useEffect(() => {
    callback.current = onSignal;
  });

  React.useEffect(() => {
    if (!channelName) return;
    const supabase = getClient();
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function fire() {
      const wait = minGapMs - (Date.now() - last);
      if (wait <= 0) {
        last = Date.now();
        callback.current();
      } else if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          last = Date.now();
          callback.current();
        }, wait);
      }
    }

    const channel = supabase.channel(channelName).on("broadcast", { event: LIVE_SIGNAL_EVENT }, fire).subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [channelName, minGapMs]);
}
