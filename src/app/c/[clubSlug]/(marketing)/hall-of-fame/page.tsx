import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crown } from "lucide-react";

import { getClubBySlug } from "@/services/club-service";
import { listClubTournaments } from "@/services/club-tournament-service";
import { getTournamentResultsForIds } from "@/services/match-service";
import { getProfilesByIds } from "@/services/profile-service";
import { PageHero } from "@/components/shared/page-hero";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { EmptyState } from "@/components/shared/empty-state";
import { RevealGroup, RevealItem } from "@/components/shared/reveal";
import { PlayerLink } from "@/features/club-admin/components/player-link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}): Promise<Metadata> {
  const { clubSlug } = await params;
  const club = await getClubBySlug(clubSlug);
  return { title: club ? `Hall of Fame — ${club.name}` : "Hall of Fame" };
}

export default async function HallOfFamePage({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;

  const club = await getClubBySlug(clubSlug);
  if (!club) notFound();

  const tournaments = await listClubTournaments(club.id);
  const completed = tournaments.filter((t) => t.status === "completed");

  // Results for every completed tournament without a declared champion, then
  // every profile we need — two requests in total, not two per tournament.
  const results = await getTournamentResultsForIds(completed.filter((t) => !t.championId).map((t) => t.id));
  const profilesById = await getProfilesByIds(
    completed.flatMap((t) => (t.championId ? [t.championId, t.runnerUpId] : [results[t.id]?.champion?.id]))
  );

  const champions = completed.map((tournament) => {
    if (tournament.championId) {
      const championProfile = profilesById.get(tournament.championId);
      const runnerUpProfile = tournament.runnerUpId ? profilesById.get(tournament.runnerUpId) : undefined;
      if (!championProfile) return null;
      return {
        tournament,
        champion: { id: tournament.championId, name: championProfile.fullName },
        runnerUp: runnerUpProfile ? { id: runnerUpProfile.id, name: runnerUpProfile.fullName } : null,
        profile: championProfile,
      };
    }

    const result = results[tournament.id];
    if (!result?.champion) return null;
    return { tournament, champion: result.champion, runnerUp: result.runnerUp, profile: profilesById.get(result.champion.id) };
  });
  const entries = champions
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => (b.tournament.endDate ?? "").localeCompare(a.tournament.endDate ?? ""));

  return (
    <div>
      <PageHero
        title="Hall of Fame"
        description={`The champions of ${club.name}.`}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Hall of Fame" }]}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {entries.length === 0 ? (
          <EmptyState
            icon={<Crown className="size-6" />}
            title="No champions crowned yet"
            description="Once a tournament is marked completed with a finals result, its champion will appear here."
          />
        ) : (
          <RevealGroup className="grid gap-5 sm:grid-cols-2">
            {entries.map(({ tournament, champion, runnerUp, profile }) => (
              <RevealItem key={tournament.id}>
                <div className="card-hover flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Crown className="size-5" />
                  </span>
                  <PlayerLink clubSlug={clubSlug} playerId={champion.id}>
                    <AvatarInitials name={champion.name} photoUrl={profile?.profilePhotoUrl} size="lg" />
                  </PlayerLink>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      {tournament.name}
                    </p>
                    <PlayerLink clubSlug={clubSlug} playerId={champion.id} className="hover:text-primary">
                      <p className="truncate font-heading text-lg font-bold text-foreground">
                        {champion.name}
                      </p>
                    </PlayerLink>
                    {runnerUp ? (
                      <p className="truncate text-xs text-muted-foreground">
                        Runner-up: {runnerUp.name}
                      </p>
                    ) : null}
                    {tournament.endDate ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{tournament.endDate}</p>
                    ) : null}
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </div>
  );
}
