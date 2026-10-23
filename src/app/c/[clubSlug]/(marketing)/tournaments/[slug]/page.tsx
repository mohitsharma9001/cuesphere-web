import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TournamentDetailHero } from "@/features/tournament-detail/components/tournament-detail-hero";
import { TournamentTabs } from "@/features/tournament-detail/components/tournament-tabs";
import { getTournamentDetail } from "@/lib/mock/tournament-detail";
import { clubPath } from "@/lib/club-path";
import { getClubBySlug, getMembership } from "@/services/club-service";
import { isStaffRole, isScorekeeperOnly } from "@/types/club";
import {
  getClubTournamentBySlug,
  countRegisteredForClubTournament,
} from "@/services/club-tournament-service";
import { getSession } from "@/lib/auth/session";
import { getMyProfile } from "@/lib/auth/get-viewer";
import { getProfilesByIds } from "@/services/profile-service";
import { getRegistrationForPlayer, getRegistrationsForTournament } from "@/services/registration-service";
import { getMatchesForTournament } from "@/services/match-service";
import { ClubTournamentDetailHero } from "@/features/club-admin/components/club-tournament-detail-hero";
import { ClubTournamentTabs } from "@/features/club-admin/components/club-tournament-tabs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clubSlug: string; slug: string }>;
}): Promise<Metadata> {
  const { clubSlug, slug } = await params;
  if (clubSlug === "xyz-snooker-club") {
    const tournament = getTournamentDetail(slug);
    return { title: tournament?.name ?? "Tournament" };
  }
  // Same arguments as the page's lookup, so the two share one request.
  const tournament = await getClubTournamentBySlug(clubSlug, slug);
  return { title: tournament?.name ?? "Tournament" };
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ clubSlug: string; slug: string }>;
}) {
  const { clubSlug, slug } = await params;

  if (clubSlug === "xyz-snooker-club") {
    const tournament = getTournamentDetail(slug);
    if (!tournament) notFound();

    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <a href={clubPath(clubSlug)} className="hover:text-foreground">
            Home
          </a>
          <span>/</span>
          <a href={clubPath(clubSlug, "/tournaments")} className="hover:text-foreground">
            Tournaments
          </a>
          <span>/</span>
          <span className="font-medium text-primary">{tournament.name}</span>
        </nav>

        <TournamentDetailHero tournament={tournament} />
        <TournamentTabs tournament={tournament} />
      </div>
    );
  }

  // The tournament lookup takes the club slug, so it doesn't wait for the club.
  const [club, tournament] = await Promise.all([getClubBySlug(clubSlug), getClubTournamentBySlug(clubSlug, slug)]);
  if (!club) notFound();
  if (!tournament) notFound();

  const session = await getSession();
  // Everything below is independent of everything else, so fetch it together.
  const [profile, membership, registeredCount, registrations, matches] = await Promise.all([
    session ? getMyProfile() : Promise.resolve(undefined),
    session ? getMembership(club.id, session.id) : Promise.resolve(undefined),
    countRegisteredForClubTournament(tournament.id),
    getRegistrationsForTournament(tournament.id),
    getMatchesForTournament(tournament.id),
  ]);
  const canManagePayments = isStaffRole(membership?.role) && !isScorekeeperOnly(membership?.role);

  // Every entrant's profile (plus the declared champion and runner-up) in one request.
  const [existingRegistration, profilesById] = await Promise.all([
    profile ? getRegistrationForPlayer(tournament.id, profile.id) : Promise.resolve(undefined),
    getProfilesByIds([...registrations.map((r) => r.playerId), tournament.championId, tournament.runnerUpId]),
  ]);

  const players = registrations.map((r) => ({ registration: r, profile: profilesById.get(r.playerId) }));

  const hasStarted = !!tournament.startDate && new Date(tournament.startDate) <= new Date();

  const playerPhotos: Record<string, string> = {};
  for (const { registration, profile } of players) {
    if (profile?.profilePhotoUrl) playerPhotos[registration.playerId] = profile.profilePhotoUrl;
  }

  const overrideResults = tournament.championId
    ? (() => {
        const championProfile = profilesById.get(tournament.championId as string);
        const runnerUpProfile = tournament.runnerUpId ? profilesById.get(tournament.runnerUpId) : undefined;
        if (!championProfile) return null;
        if (championProfile.profilePhotoUrl) playerPhotos[championProfile.id] = championProfile.profilePhotoUrl;
        if (runnerUpProfile?.profilePhotoUrl) playerPhotos[runnerUpProfile.id] = runnerUpProfile.profilePhotoUrl;
        return {
          champion: { id: championProfile.id, name: championProfile.fullName },
          runnerUp: runnerUpProfile ? { id: runnerUpProfile.id, name: runnerUpProfile.fullName } : null,
          semifinalists: [],
        };
      })()
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <a href={clubPath(clubSlug)} className="hover:text-foreground">
          Home
        </a>
        <span>/</span>
        <a href={clubPath(clubSlug, "/tournaments")} className="hover:text-foreground">
          Tournaments
        </a>
        <span>/</span>
        <span className="font-medium text-primary">{tournament.name}</span>
      </nav>

      <ClubTournamentDetailHero
        tournament={tournament}
        registeredCount={registeredCount}
        isRegistered={!!existingRegistration}
        hasStarted={hasStarted}
      />
      <ClubTournamentTabs
        clubSlug={clubSlug}
        tournament={tournament}
        clubName={club.name}
        registeredCount={registeredCount}
        players={players}
        matches={matches}
        playerPhotos={playerPhotos}
        overrideResults={overrideResults}
        canManagePayments={canManagePayments}
      />
    </div>
  );
}
