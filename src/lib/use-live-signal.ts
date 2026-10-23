"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";

import { API_URL } from "@/lib/api/config";
import { LIVE_SIGNAL_EVENT } from "@/lib/live-channels";

let socket: Socket | null = null;
/** Rooms this page listens to, counted so two hooks on one room share a subscription. */
const roomRefs = new Map<string, number>();

function getSocket() {
  if (!socket) {
    socket = io(API_URL, { transports: ["websocket", "polling"], withCredentials: true });
    // Rejoin every room after a reconnect.
    socket.on("connect", () => roomRefs.forEach((_n, room) => socket?.emit("subscribe", room)));
  }
  return socket;
}

function join(room: string) {
  const n = roomRefs.get(room) ?? 0;
  roomRefs.set(room, n + 1);
  if (n === 0) getSocket().emit("subscribe", room);
}

function leave(room: string) {
  const n = (roomRefs.get(room) ?? 1) - 1;
  if (n > 0) return void roomRefs.set(room, n);
  roomRefs.delete(room);
  getSocket().emit("unsubscribe", room);
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
    const s = getSocket();
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function fire(payload?: { room?: string }) {
      if (payload?.room !== channelName) return;
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

    join(channelName);
    s.on(LIVE_SIGNAL_EVENT, fire);
    return () => {
      if (timer) clearTimeout(timer);
      s.off(LIVE_SIGNAL_EVENT, fire);
      leave(channelName);
    };
  }, [channelName, minGapMs]);
}
