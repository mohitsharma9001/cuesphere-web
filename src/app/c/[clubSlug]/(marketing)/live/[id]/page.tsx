import type { Metadata } from "next";
import { Radio } from "lucide-react";

import { getMatchById, getHeadToHead } from "@/services/match-service";
import { getClubBySlug } from "@/services/club-service";
import { getClubTournamentById } from "@/services/club-tournament-service";
import { getProfileById } from "@/services/profile-service";
import { getStatsForPlayer } from "@/services/stats-service";
import { getStreamSettings } from "@/services/stream-settings-service";
import { remember } from "@/lib/memo";

const AROUND_TTL_MS = 30_000;
import { MOCK_LIVE_MATCH } from "@/lib/mock/live-match";
import { LiveMatchCentre } from "@/features/live-match/components/live-match-centre";
import { LiveAutoRefresh } from "@/features/live-match/components/live-auto-refresh";
import { PageHero } from "@/components/shared/page-hero";
import { EmptyState } from "@/components/shared/empty-state";
import { buildLiveMatchView } from "@/features/live-match/build-live-view";

export const metadata: Metadata = { title: "Live Match Centre" };

export default async function LiveMatchPage({
  params,
}: {
  params: Promise<{ clubSlug: string; id: string }>;
}) {
  const { clubSlug, id } = await params;
  // The page re-renders every few seconds for every viewer; only the match itself
  // changes that often, so everything around it is shared for 30 seconds.
  const match = await getMatchById(id);
  const [tournament, player1Profile, player2Profile, headToHead, player1Stats, player2Stats] = match
    ? await Promise.all([
        remember(`tournament:${match.tournamentId}`, AROUND_TTL_MS, () => getClubTournamentById(match.tournamentId)),
        remember(`profile:${match.player1Id}`, AROUND_TTL_MS, () => getProfileById(match.player1Id)),
        remember(`profile:${match.player2Id}`, AROUND_TTL_MS, () => getProfileById(match.player2Id)),
        remember(`h2h:${match.clubId}:${match.player1Id}:${match.player2Id}`, AROUND_TTL_MS, () =>
          getHeadToHead(match.clubId, match.player1Id, match.player2Id)
        ),
        remember(`stats:${match.clubId}:${match.player1Id}`, AROUND_TTL_MS, () =>
          getStatsForPlayer(match.player1Id, match.clubId)
        ),
        remember(`stats:${match.clubId}:${match.player2Id}`, AROUND_TTL_MS, () =>
          getStatsForPlayer(match.player2Id, match.clubId)
        ),
      ])
    : [undefined, undefined, undefined, { player1Wins: 0, player2Wins: 0 }, undefined, undefined];
  const photos = { player1: player1Profile?.profilePhotoUrl, player2: player2Profile?.profilePhotoUrl };
  const playerStats = { player1: player1Stats, player2: player2Stats };

  // XYZ Snooker Club keeps its original, always-on demo live match — it
  // falls back to mock data when the requested match isn't real.
  if (clubSlug === "xyz-snooker-club") {
    const view = match ? buildLiveMatchView(match, tournament ? { title: tournament.name, bestOf: tournament.bestOf } : undefined, photos, headToHead, playerStats) : MOCK_LIVE_MATCH;
    return <LiveMatchCentre match={view} clubSlug={clubSlug} />;
  }

  const club = await getClubBySlug(clubSlug);
  if (!club) return null;

  if (match && match.clubId === club.id && match.status === "live") {
    const streamSettings = await remember(`stream:${club.id}`, 10_000, () => getStreamSettings(club.id));
    const youtubeUrl = streamSettings.youtubeUrls[String(match.tableNumber)] ?? null;
    return (
      <>
        <LiveAutoRefresh matchId={match.id} />
        <LiveMatchCentre
          match={buildLiveMatchView(match, tournament ? { title: tournament.name, bestOf: tournament.bestOf } : undefined, photos, headToHead, playerStats)}
          clubSlug={clubSlug}
          youtubeUrl={youtubeUrl}
        />
      </>
    );
  }

  return (
    <>
      <PageHero
        title="Live Matches"
        description={`Follow live scoring from ${club.name}.`}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Live Matches" }]}
      />
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <EmptyState
          icon={<Radio className="size-6" />}
          title="No live match right now"
          description={`${club.name} doesn't have a match in progress at the moment. Check back once a tournament is underway.`}
        />
      </div>
    </>
  );
}
