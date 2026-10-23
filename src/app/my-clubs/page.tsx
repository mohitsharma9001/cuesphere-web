import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { getMyProfile } from "@/lib/auth/get-viewer";
import { getClubsWithCountsByIds, listMembershipsForUser } from "@/services/club-service";
import { PlatformHeader } from "@/components/layout/platform-header";
import { PlatformFooter } from "@/components/layout/platform-footer";
import { EmptyState } from "@/components/shared/empty-state";
import { LinkButton } from "@/components/shared/link-button";
import { MyClubCard } from "@/features/platform/components/my-club-card";

export const metadata: Metadata = { title: "My Clubs" };

const ROLE_LABELS: Record<string, string> = {
  club_admin: "Club Admin",
  club_staff_receptionist: "Receptionist",
  club_staff_referee: "Referee",
  club_staff_scorekeeper: "Score Keeper",
  player: "Player",
};

export default async function MyClubsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=%2Fmy-clubs");
  }

  const [profile, memberships] = await Promise.all([getMyProfile(), listMembershipsForUser(session.id)]);
  // Every club with its counts in one request, not three per club.
  const clubs = new Map(
    (await getClubsWithCountsByIds(memberships.map((m) => m.clubId))).map((entry) => [entry.club.id, entry])
  );
  const entries = memberships.map((membership) => {
    const entry = clubs.get(membership.clubId);
    return entry ? { membership, ...entry } : null;
  });
  const validClubs = entries.filter((e): e is NonNullable<typeof e> => e !== null);

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">My Clubs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every club you&apos;ve joined, across CueSphere.
          </p>

          {validClubs.length === 0 ? (
            <EmptyState
              className="mt-8"
              icon={<Building2 className="size-6" />}
              title="You haven't joined any clubs yet"
              description="Browse clubs from the homepage and join one to get started."
              action={<LinkButton href="/clubs">Browse Clubs</LinkButton>}
            />
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {validClubs.map(({ club, membership, tournamentCount, memberCount }) => (
                <MyClubCard
                  key={membership.id}
                  club={club}
                  tournamentCount={tournamentCount}
                  memberCount={memberCount}
                  badge={ROLE_LABELS[membership.role] ?? membership.role}
                  isPrimary={profile?.primaryClubId === club.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}
