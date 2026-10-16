import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";

import { clubPath } from "@/lib/club-path";
import { MatchScoreCard } from "@/features/live-match/components/match-score-card";
import { TableViewCard } from "@/features/live-match/components/table-view-card";
import { FrameHistoryCard } from "@/features/live-match/components/frame-history-card";
import { CurrentFrameCard } from "@/features/live-match/components/current-frame-card";
import { MatchInfoCard } from "@/features/live-match/components/match-info-card";
import { HeadToHeadCard } from "@/features/live-match/components/head-to-head-card";
import { SeasonStatsCard } from "@/features/live-match/components/season-stats-card";
import { HighestBreakCard } from "@/features/live-match/components/highest-break-card";
import { NextMatchCard } from "@/features/live-match/components/next-match-card";
import type { LiveMatchView } from "@/features/live-match/types";
import { youtubeEmbedUrl } from "@/types/stream";

export type { LiveMatchView };

export function LiveMatchCentre({
  match,
  clubSlug,
  youtubeUrl,
}: {
  match: LiveMatchView;
  /** Omitted for friendlies, which belong to no club. */
  clubSlug?: string;
  /** The table's YouTube stream, if the club has added one. */
  youtubeUrl?: string | null;
}) {
  const embedUrl = youtubeEmbedUrl(youtubeUrl);
  const now = Date.now();
  const startedAtMs = now - (18 * 60 + 25) * 1000;
  const nextFrameCountdownStartMs = match.nextFrameCountdownSeconds
    ? now + match.nextFrameCountdownSeconds * 1000
    : now;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={clubSlug ? clubPath(clubSlug) : "/"} className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={clubSlug ? clubPath(clubSlug, "/live") : "/play"} className="hover:text-foreground">
          {clubSlug ? "Live Matches" : "Friendlies"}
        </Link>
        <ChevronRight className="size-3.5" />
        <span>{match.tournamentName}</span>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-primary">{match.tableLabel}</span>
      </nav>

      {embedUrl && youtubeUrl ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-black">
          <div className="relative aspect-video w-full">
            <iframe
              src={embedUrl}
              title={`Live stream · ${match.tableLabel}`}
              className="absolute inset-0 size-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-card py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Watch on YouTube <ExternalLink className="size-3.5" />
          </a>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <MatchScoreCard match={match} startedAtMs={startedAtMs} />
        <TableViewCard match={match} nextFrameCountdownStartMs={nextFrameCountdownStartMs} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <FrameHistoryCard match={match} />
        <CurrentFrameCard match={match} frameStartMs={startedAtMs} />
        <MatchInfoCard match={match} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <HeadToHeadCard match={match} />
        <SeasonStatsCard match={match} />
        <HighestBreakCard match={match} />
        <NextMatchCard match={match} />
      </div>
    </div>
  );
}
