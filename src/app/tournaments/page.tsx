import type { Metadata } from "next";

import { PlatformHeader } from "@/components/layout/platform-header";
import { PlatformFooter } from "@/components/layout/platform-footer";
import { ClubTournamentsPageClient } from "@/features/club-admin/components/club-tournaments-page-client";
import type { ListingStatusFilter } from "@/features/tournaments/components/tournaments-filter-sidebar";
import { listClubs } from "@/services/club-service";
import {
  listClubTournaments,
  countRegisteredForClubTournament,
} from "@/services/club-tournament-service";
import { getSession } from "@/lib/auth/session";
import { getMyProfile } from "@/lib/auth/get-viewer";
import { getRegistrationForPlayer } from "@/services/registration-service";
import { listFriendUserIds, countFriendsRegistered } from "@/services/friendship-service";

export const metadata: Metadata = { title: "Tournaments" };

const VALID_STATUSES: ListingStatusFilter[] = ["registration-open", "upcoming", "live", "completed"];

export default async function PlatformTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const initialStatus = VALID_STATUSES.includes(status as ListingStatusFilter)
    ? (status as ListingStatusFilter)
    : "upcoming";

  const session = await getSession();
  const profile = session ? await getMyProfile() : undefined;
  const friendUserIds = session ? await listFriendUserIds(session.id) : [];

  const clubs = (await listClubs()).filter((club) => club.status === "approved");

  const tournamentsByClub = await Promise.all(
    clubs.map(async (club) => {
      const list = await listClubTournaments(club.id);
      return list.map((tournament) => ({ tournament, club }));
    })
  );

  const withCounts = await Promise.all(
    tournamentsByClub.flat().map(async ({ tournament, club }) => {
      const [registeredCount, existingRegistration, friendsRegisteredCount] = await Promise.all([
        countRegisteredForClubTournament(tournament.id),
        profile ? getRegistrationForPlayer(tournament.id, profile.id) : Promise.resolve(undefined),
        friendUserIds.length > 0 ? countFriendsRegistered(tournament.id, friendUserIds) : Promise.resolve(0),
      ]);
      return {
        ...tournament,
        registeredCount,
        isRegistered: !!existingRegistration,
        clubSlug: club.slug,
        clubName: club.name,
        friendsRegisteredCount,
      };
    })
  );

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Tournaments</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every tournament across every club on CueSphere, whether you&apos;ve joined it or not.
          </p>
        </div>
        <ClubTournamentsPageClient
          key={initialStatus}
          tournaments={withCounts}
          clubs={clubs.map((c) => ({ slug: c.slug, name: c.name }))}
          initialStatus={initialStatus}
          allClubsLabel="All Clubs"
        />
      </main>
      <PlatformFooter />
    </div>
  );
}
