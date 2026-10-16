import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { LiveBadge } from "@/components/shared/live-badge";
import type { PlayerLiveMatch } from "@/features/friends/player-live-match";

/** Shown on a player's profile while they're in a live match. */
export function PlayingNowBanner({ match }: { match: PlayerLiveMatch }) {
  return (
    <Link
      href={match.href}
      className="mt-4 flex items-center gap-3 rounded-2xl border border-destructive/50 bg-destructive-soft p-4 transition-colors hover:border-destructive"
    >
      <LiveBadge label="Playing now" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          v {match.opponent}{" "}
          <span className="font-tabular text-primary">
            {match.framesFor}–{match.framesAgainst}
          </span>
        </p>
        <p className="truncate text-xs text-muted-foreground">{match.context}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
        Watch live <ChevronRight className="size-4" />
      </span>
    </Link>
  );
}
