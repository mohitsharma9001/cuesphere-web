import Link from "next/link";
import { ChevronRight, Radio } from "lucide-react";

import { LiveBadge } from "@/components/shared/live-badge";
import type { FriendMatch } from "@/features/friends/friend-activity";

function MatchRow({ match }: { match: FriendMatch }) {
  const isLive = match.status === "live";
  const context = [match.clubName, match.tournamentName, match.round, match.tableNumber > 0 ? `Table ${match.tableNumber}` : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={match.href}
      className={`flex min-w-0 items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-border-strong ${isLive ? "border-destructive/50" : "border-border"}`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {isLive ? (
            <LiveBadge />
          ) : (
            <span className="rounded-full bg-info-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-info">
              {match.startTime || "Scheduled"}
            </span>
          )}
          <span className="truncate text-xs text-muted-foreground">{match.watching.join(" & ")}</span>
        </div>
        <p className="truncate font-heading text-base font-semibold text-foreground">
          {match.player1Name}{" "}
          {isLive ? (
            <span className="font-tabular text-primary">
              {match.framesWonPlayer1}–{match.framesWonPlayer2}
            </span>
          ) : (
            <span className="text-muted-foreground">v</span>
          )}{" "}
          {match.player2Name}
        </p>
        <p className="truncate text-xs text-muted-foreground">{context}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
        {isLive ? "Watch" : "Details"} <ChevronRight className="size-4" />
      </span>
    </Link>
  );
}

/** "Playing now" and "Up next" for friends and followed players. */
export function FriendMatches({ live, upcoming }: { live: FriendMatch[]; upcoming: FriendMatch[] }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Radio className="size-3.5 text-destructive" /> Playing now ({live.length})
        </h2>
        {live.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
            None of your friends or followed players are playing right now. You&apos;ll get a notification when one
            starts.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {live.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>
      {upcoming.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Up next ({upcoming.length})</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {upcoming.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
