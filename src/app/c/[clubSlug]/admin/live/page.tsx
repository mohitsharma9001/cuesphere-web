import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Radio, Tv } from "lucide-react";

import { getClubViewer } from "@/lib/auth/get-club-viewer";
import { getScorableMatchesForClub } from "@/services/match-service";
import { getClubTournamentsByIds } from "@/services/club-tournament-service";
import { EmptyState } from "@/components/shared/empty-state";
import { ScorableMatchCard } from "@/features/club-admin/components/scorable-match-card";
import { clubPath } from "@/lib/club-path";
import { LinkButton } from "@/components/shared/link-button";

export const metadata: Metadata = { title: "Live Scoring" };

export default async function AdminLiveScoringPage({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const clubViewer = await getClubViewer(clubSlug);
  if (!clubViewer || !clubViewer.isStaff) notFound();

  const matches = await getScorableMatchesForClub(clubViewer.club.id);
  // Every tournament on the worklist in one request.
  const tournaments = await getClubTournamentsByIds(matches.map((match) => match.tournamentId));
  const withTournament = matches.map((match) => ({ match, tournament: tournaments.get(match.tournamentId) }));
  const live = withTournament.filter(({ match }) => match.status === "live");
  const upcoming = withTournament.filter(({ match }) => match.status !== "live");

  const card = ({ match, tournament }: (typeof withTournament)[number]) => (
    <ScorableMatchCard
      key={match.id}
      match={match}
      clubSlug={clubSlug}
      context={`${tournament?.name ?? "Tournament"} · ${match.round}`}
      scoreHref={
        tournament ? clubPath(clubSlug, `/admin/tournaments/${tournament.slug}/matches/${match.id}`) : null
      }
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Live Scoring</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every match that&apos;s live or waiting to start, across all tournaments.
          </p>
        </div>
        <LinkButton href={clubPath(clubSlug, "/admin/screens")} variant="outline" size="sm" className="h-10">
          <Tv className="size-4" /> TV &amp; Stream
        </LinkButton>
      </div>

      {withTournament.length === 0 ? (
        <EmptyState
          icon={<Radio className="size-6" />}
          title="Nothing to score right now"
          description="Once a match is scheduled and marked live, it'll show up here."
        />
      ) : (
        <div className="space-y-6">
          {live.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-heading text-lg font-bold text-foreground">Live now</h2>
              <div className="grid gap-3 lg:grid-cols-2">{live.map(card)}</div>
            </section>
          ) : null}
          {upcoming.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-heading text-lg font-bold text-foreground">Up next</h2>
              <div className="grid gap-3 lg:grid-cols-2">{upcoming.map(card)}</div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
