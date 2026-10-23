import type { Metadata } from "next";

import { PlatformHeader } from "@/components/layout/platform-header";
import { PlatformFooter } from "@/components/layout/platform-footer";
import { PlayersBrowseClient, type PlayerDirectoryEntry } from "@/features/platform/components/players-browse-client";
import { listAllPlayerProfiles, listFriendshipsForUser } from "@/services/friendship-service";
import { getClubsByIds } from "@/services/club-service";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Player Directory" };

export default async function PlayersDirectoryPage() {
  const session = await getSession();
  const [allProfiles, friendships] = await Promise.all([
    listAllPlayerProfiles(),
    session ? listFriendshipsForUser(session.id) : Promise.resolve([]),
  ]);
  const profiles = allProfiles.filter((p) => p.fullName);

  // Every primary club in one request, not one per club.
  const clubsById = await getClubsByIds(profiles.map((p) => p.primaryClubId));

  const entries: PlayerDirectoryEntry[] = profiles
    .filter((profile) => profile.userId !== session?.id)
    .map((profile) => {
      const friendship = friendships.find(
        (f) => f.requesterId === profile.userId || f.recipientId === profile.userId
      );
      let relation: PlayerDirectoryEntry["relation"] = "none";
      if (friendship) {
        if (friendship.status === "accepted") relation = "friends";
        else if (friendship.status === "pending") {
          relation = friendship.requesterId === session?.id ? "outgoing" : "incoming";
        }
      }
      const primaryClubName = profile.primaryClubId ? clubsById.get(profile.primaryClubId)?.name : undefined;
      return { profile, relation, friendshipId: friendship?.id, primaryClubName };
    });

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Player Directory</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Find players across every club on CueSphere and add them as friends.
          </p>

          <div className="mt-8">
            <PlayersBrowseClient entries={entries} isLoggedIn={!!session} />
          </div>
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}
