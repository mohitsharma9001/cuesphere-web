import { HeroSection } from "@/features/home/components/hero-section";
import { StatsBar } from "@/features/home/components/stats-bar";
import { HighlightsGrid } from "@/features/home/components/highlights-grid";
import { NewsGallerySection } from "@/features/home/components/news-gallery-section";
import { SponsorsStrip } from "@/components/layout/sponsors-strip";
import { NewClubHome } from "@/features/home/components/new-club-home";
import { getClubBySlug, listMembershipsForClub } from "@/services/club-service";
import { listClubTournaments, countRegisteredForClubTournament } from "@/services/club-tournament-service";
import { getSession } from "@/lib/auth/session";
import { getProfileByUserId } from "@/services/profile-service";
import { getRegistrationForPlayer } from "@/services/registration-service";
import { getPublicTableStatus } from "@/services/table-service";
import { TablesNow } from "@/features/tables/components/tables-now";

export default async function Home({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;

  // XYZ Snooker Club keeps its original, hand-built demo content (static
  // mock data). Every other club gets a real, data-driven home page.
  if (clubSlug === "xyz-snooker-club") {
    return (
      <>
        <HeroSection />
        <StatsBar />
        <HighlightsGrid />
        <NewsGallerySection />
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Our Sponsors
            </p>
            <SponsorsStrip />
          </div>
        </section>
      </>
    );
  }

  const club = await getClubBySlug(clubSlug);
  if (!club) return null;

  const session = await getSession();
  const profile = session ? await getProfileByUserId(session.id) : undefined;

  const [tournaments, members, tableStatus] = await Promise.all([
    listClubTournaments(club.id),
    listMembershipsForClub(club.id),
    getPublicTableStatus(club.id),
  ]);

  const upcoming = tournaments.filter((t) => t.status !== "completed");
  const cardData = await Promise.all(
    upcoming.map(async (tournament) => {
      const [registeredCount, registration] = await Promise.all([
        countRegisteredForClubTournament(tournament.id),
        profile ? getRegistrationForPlayer(tournament.id, profile.id) : Promise.resolve(undefined),
      ]);
      return {
        ...tournament,
        registeredCount,
        isRegistered: !!registration,
        clubSlug: club.slug,
        clubName: club.name,
      };
    })
  );

  return (
    <NewClubHome
      club={club}
      tournaments={cardData}
      memberCount={members.length}
      totalTournamentCount={tournaments.length}
      afterHero={<TablesNow clubSlug={club.slug} tables={tableStatus} />}
    />
  );
}
