"use client";

import * as React from "react";
import { BadgeCheck, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { searchTablePlayersAction } from "@/app/actions/table-actions";
import type { PlayerSearchResult } from "@/services/friendly-service";
import type { LineupPlayer } from "@/types/tables";

/** A player's name at the table. Suggests registered players so their dues reach their own account;
 * any typed name still works for walk-ins. */
export function PlayerNameInput({
  clubSlug,
  value,
  onChange,
  placeholder,
  autoFocus,
  onEnter,
}: {
  clubSlug: string;
  value: LineupPlayer;
  onChange: (next: LineupPlayer) => void;
  placeholder: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const [results, setResults] = React.useState<PlayerSearchResult[]>([]);
  const [open, setOpen] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = React.useRef("");

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function type(text: string) {
    // Typing over a linked player unlinks them.
    onChange({ name: text, playerId: null });
    const q = text.trim();
    latest.current = q;
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const found = await searchTablePlayersAction(clubSlug, q);
      if (latest.current !== q) return;
      setResults(found.slice(0, 5));
      setOpen(found.length > 0);
      setSearching(false);
    }, 250);
  }

  return (
    <div className="relative">
      <Input
        autoFocus={autoFocus}
        className="h-11 pr-9"
        placeholder={placeholder}
        value={value.name}
        onChange={(e) => type(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !open) onEnter?.();
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
        {searching ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : value.playerId ? (
          <BadgeCheck className="size-4 text-success" aria-label="On CueSphere" />
        ) : null}
      </span>
      {open ? (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ name: p.name, playerId: p.id });
                  setOpen(false);
                }}
              >
                <span className="truncate font-semibold text-foreground">{p.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{p.memberId}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
