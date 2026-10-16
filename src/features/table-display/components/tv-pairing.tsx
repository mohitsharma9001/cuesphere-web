"use client";

import * as React from "react";
import Image from "next/image";

import { ScaledStage } from "@/features/table-display/components/scaled-stage";
import { TvScoreboard } from "@/features/table-display/components/tv-scoreboard";
import { RotatingTvScoreboard } from "@/features/table-display/components/rotating-tv-scoreboard";
import type { ClubBoard, TableBoard } from "@/features/table-display/types";

const TOKEN_KEY = "cuesphere-tv-token";
const UNPAIRED_POLL_MS = 3000;
const PAIRED_POLL_MS = 20000;

type State =
  | { kind: "loading" }
  | { kind: "code"; code: string; expiresAt: string | null }
  | { kind: "paired"; clubSlug: string; table: number; board: TableBoard }
  /** Paired to "All tables" (table 0): rotates through every live table. */
  | { kind: "rotating"; clubSlug: string; board: ClubBoard }
  | { kind: "error" };

function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode etc. — the TV just pairs again next time it's opened.
  }
}

function useCountdown(expiresAt: string | null) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!expiresAt) return null;
  const left = Math.max(0, Math.floor((Date.parse(expiresAt) - now) / 1000));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

export function PairingScreen({ code, expiresAt }: { code: string | null; expiresAt: string | null }) {
  const countdown = useCountdown(expiresAt);
  const chars = (code ?? "······").split("");

  return (
    <ScaledStage background="#000">
      <div className="flex size-full flex-col items-center justify-center gap-14 bg-background text-foreground">
        <div className="flex items-center gap-6">
          <Image src="/branding/icon-192.png" alt="" width={104} height={104} className="rounded-full" />
          <p className="font-heading text-[80px] font-extrabold">
            Cue<span className="text-primary">Sphere</span> <span className="font-semibold text-muted-foreground">TV</span>
          </p>
        </div>
        <p className="text-[44px] font-semibold">Pair this TV with a table</p>
        <div className="flex items-center gap-5" aria-label={code ? `Pairing code ${code}` : "Getting a code"}>
          {chars.map((ch, i) => (
            <React.Fragment key={i}>
              {i === 3 ? <span className="h-1.5 w-10 rounded-full bg-border-strong" /> : null}
              <span className="flex h-[150px] w-[120px] items-center justify-center rounded-3xl border-[3px] border-border-strong bg-card font-heading text-[100px] font-bold text-primary">
                {ch}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div className="flex gap-8">
          {[
            "On your phone, open CueSphere admin",
            "Go to TV & Stream → Pair a TV",
            "Enter this code and choose the table",
          ].map((step, i) => (
            <div key={step} className="flex items-center gap-5 rounded-[28px] border-2 border-border bg-card px-8 py-5">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-[28px] font-extrabold text-primary">
                {i + 1}
              </span>
              <span className="text-[30px]">{step}</span>
            </div>
          ))}
        </div>
        <p className="text-[26px] text-muted-foreground">
          {countdown ? `Code refreshes in ${countdown} · ` : ""}Once paired, this TV shows its table&apos;s scores by itself
        </p>
      </div>
    </ScaledStage>
  );
}

/** The /tv page: shows a pairing code until staff link this TV to a table,
 * then turns into that table's scoreboard. Unpairing sends it back here. */
export function TvPairing() {
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const pairedRef = React.useRef<{ clubSlug: string; table: number } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function register(): Promise<string | null> {
      const res = await fetch("/api/tv/register", { method: "POST" });
      if (!res.ok) return null;
      const data = (await res.json()) as { token: string; code: string; expiresAt: string };
      writeToken(data.token);
      if (!cancelled) setState({ kind: "code", code: data.code, expiresAt: data.expiresAt });
      return data.token;
    }

    async function tick() {
      try {
        let token = readToken();
        if (!token) token = await register();
        if (!token) throw new Error("register failed");

        const res = await fetch("/api/tv/status", { headers: { "x-tv-token": token }, cache: "no-store" });
        if (res.status === 404) {
          writeToken(null);
          pairedRef.current = null;
          await register();
        } else if (res.ok) {
          const status = (await res.json()) as
            | { paired: true; clubSlug: string; table: number }
            | { paired: false; code: string | null; expiresAt: string | null };

          if (status.paired) {
            const current = pairedRef.current;
            if (!current || current.clubSlug !== status.clubSlug || current.table !== status.table) {
              const url =
                status.table === 0
                  ? `/api/club-board/${status.clubSlug}`
                  : `/api/table-board/${status.clubSlug}/${status.table}`;
              const boardRes = await fetch(url, { cache: "no-store" });
              if (boardRes.ok && !cancelled) {
                pairedRef.current = { clubSlug: status.clubSlug, table: status.table };
                if (status.table === 0) {
                  setState({ kind: "rotating", clubSlug: status.clubSlug, board: (await boardRes.json()) as ClubBoard });
                } else {
                  const board = (await boardRes.json()) as TableBoard;
                  setState({ kind: "paired", clubSlug: status.clubSlug, table: status.table, board });
                }
              }
            }
          } else {
            pairedRef.current = null;
            if (!cancelled) setState({ kind: "code", code: status.code ?? "", expiresAt: status.expiresAt });
          }
        }
      } catch {
        if (!cancelled && !pairedRef.current) setState((s) => (s.kind === "loading" ? { kind: "error" } : s));
      }
      if (!cancelled) timer = setTimeout(tick, pairedRef.current ? PAIRED_POLL_MS : UNPAIRED_POLL_MS);
    }

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (state.kind === "rotating") {
    return <RotatingTvScoreboard key={`${state.clubSlug}:all`} initial={state.board} clubSlug={state.clubSlug} />;
  }
  if (state.kind === "paired") {
    return (
      <TvScoreboard
        key={`${state.clubSlug}:${state.table}`}
        initial={state.board}
        clubSlug={state.clubSlug}
        table={state.table}
      />
    );
  }
  if (state.kind === "code") return <PairingScreen code={state.code || null} expiresAt={state.expiresAt} />;
  return <PairingScreen code={null} expiresAt={null} />;
}
