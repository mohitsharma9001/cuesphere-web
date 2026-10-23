import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { TournamentsPageClient } from "@/features/tournaments/components/tournaments-page-client";
import type { ListingStatusFilter } from "@/features/tournaments/components/tournaments-filter-sidebar";
import { ClubTournamentsPageClient } from "@/features/club-admin/components/club-tournaments-page-client";
import { getClubBySlug, getClubsByIds, listMembershipsForUser } from "@/services/club-service";
import {
  listClubTournaments,
  countRegisteredForClubTournament,
} from "@/services/club-tournament-service";
import { getSession } from "@/lib/auth/session";
import { getMyProfile } from "@/lib/auth/get-viewer";
import { getRegistrationForPlayer } from "@/services/registration-service";
import { listFriendUserIds, countFriendsRegistered } from "@/services/friendship-service";
import type { Club } from "@/types/club";

export const metadata: Metadata = {
  title: "Tournaments",
};

const VALID_STATUSES: ListingStatusFilter[] = ["registration-open", "upcoming", "live", "completed"];

export default async function TournamentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { clubSlug } = await params;
  const { status } = await searchParams;
  const initialStatus = VALID_STATUSES.includes(status as ListingStatusFilter)
    ? (status as ListingStatusFilter)
    : "upcoming";

  if (clubSlug === "xyz-snooker-club") {
    return (
      <>
        <PageHero
          title="Tournaments"
          description="Compete. Conquer. Be the Champion."
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Tournaments" }]}
        />
        <TournamentsPageClient key={initialStatus} initialStatus={initialStatus} />
      </>
    );
  }

  const club = await getClubBySlug(clubSlug);
  if (!club) return null;

  const session = await getSession();
  const [profile, friendUserIds, memberships] = await Promise.all([
    session ? getMyProfile() : Promise.resolve(undefined),
    session ? listFriendUserIds(session.id) : Promise.resolve([]),
    session ? listMembershipsForUser(session.id) : Promise.resolve([]),
  ]);

  // Base: the club being viewed (always public). Extended with every other
  // club the viewer is a member of, so a logged-in player can see all their
  // clubs' tournaments in one place.
  const clubsById = new Map<string, Club>([[club.id, club]]);
  // The viewer's other clubs in one request.
  const otherClubs = await getClubsByIds(memberships.filter((m) => m.clubId !== club.id).map((m) => m.clubId));
  for (const m of memberships) {
    const otherClub = otherClubs.get(m.clubId);
    if (otherClub && otherClub.status === "approved") clubsById.set(otherClub.id, otherClub);
  }
  const clubs = Array.from(clubsById.values());

  const tournamentsByClub = await Promise.all(
    clubs.map(async (c) => {
      const list = await listClubTournaments(c.id);
      return list.map((tournament) => ({ tournament, club: c }));
    })
  );

  const withCounts = await Promise.all(
    tournamentsByClub.flat().map(async ({ tournament, club: tournamentClub }) => {
      const [registeredCount, existingRegistration, friendsRegisteredCount] = await Promise.all([
        countRegisteredForClubTournament(tournament.id),
        profile ? getRegistrationForPlayer(tournament.id, profile.id) : Promise.resolve(undefined),
        friendUserIds.length > 0 ? countFriendsRegistered(tournament.id, friendUserIds) : Promise.resolve(0),
      ]);
      return {
        ...tournament,
        registeredCount,
        isRegistered: !!existingRegistration,
        clubSlug: tournamentClub.slug,
        clubName: tournamentClub.name,
        friendsRegisteredCount,
      };
    })
  );

  return (
    <>
      <PageHero
        title="Tournaments"
        description={
          clubs.length > 1
            ? "Tournaments across every club you're part of."
            : `Tournaments at ${club.name}.`
        }
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Tournaments" }]}
      />
      <ClubTournamentsPageClient
        key={initialStatus}
        tournaments={withCounts}
        clubs={clubs.map((c) => ({ slug: c.slug, name: c.name }))}
        initialStatus={initialStatus}
      />
    </>
  );
}
