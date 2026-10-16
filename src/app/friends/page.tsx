import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PlatformHeader } from "@/components/layout/platform-header";
import { PlatformFooter } from "@/components/layout/platform-footer";
import { EmptyState } from "@/components/shared/empty-state";
import { LinkButton } from "@/components/shared/link-button";
import { Users } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getProfileById, getProfileByUserIdForDisplay } from "@/services/profile-service";
import { listFollowedPlayerIds } from "@/services/follow-service";
import { getFriendActivity } from "@/features/friends/friend-activity";
import { FriendMatches } from "@/features/friends/components/friend-matches";
import { FollowButton } from "@/features/friends/components/follow-button";
import { PlayerAvatar } from "@/features/platform/components/players-browse-client";
import { listFriendshipsForUser } from "@/services/friendship-service";
import { getClubById } from "@/services/club-service";
import { FriendsPageClient } from "@/features/platform/components/friends-page-client";
import type { PlayerDirectoryEntry } from "@/features/platform/components/players-browse-client";

export const metadata: Metadata = { title: "My Friends" };

export default async function FriendsPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=%2Ffriends");

  const [friendships, activity, followedIds] = await Promise.all([
    listFriendshipsForUser(session.id),
    getFriendActivity(session.id),
    listFollowedPlayerIds(session.id),
  ]);
  const followed = (await Promise.all(followedIds.map((id) => getProfileById(id)))).filter(
    (p): p is NonNullable<typeof p> => !!p && !!p.fullName
  );

  const entries = (
    await Promise.all(
      friendships.map(async (f) => {
        const otherUserId = f.requesterId === session.id ? f.recipientId : f.requesterId;
        const profile = await getProfileByUserIdForDisplay(otherUserId);
        if (!profile) return null;
        const relation: PlayerDirectoryEntry["relation"] =
          f.status === "accepted" ? "friends" : f.requesterId === session.id ? "outgoing" : "incoming";
        const primaryClub = profile.primaryClubId ? await getClubById(profile.primaryClubId) : undefined;
        return { profile, relation, friendshipId: f.id, primaryClubName: primaryClub?.name };
      })
    )
  ).filter((e): e is NonNullable<typeof e> => e !== null);

  const friends = entries.filter((e) => e.relation === "friends");
  const incoming = entries.filter((e) => e.relation === "incoming");
  const outgoing = entries.filter((e) => e.relation === "outgoing");

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">My Friends</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                See when friends and players you follow are playing, and watch them live.
              </p>
            </div>
            <LinkButton href="/players" variant="outline" size="sm">
              Find Players
            </LinkButton>
          </div>

          <div className="mt-8">
            <FriendMatches live={activity.live} upcoming={activity.upcoming} />
          </div>

          {followed.length > 0 ? (
            <section className="mt-8 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Following ({followed.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {followed.map((profile) => (
                  <div key={profile.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                    <Link href={`/players/${profile.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <PlayerAvatar profile={profile} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">{profile.fullName}</p>
                        {profile.city ? <p className="truncate text-xs text-muted-foreground">{profile.city}</p> : null}
                      </div>
                    </Link>
                    <FollowButton playerId={profile.id} playerName={profile.fullName} initialFollowing />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {entries.length === 0 ? (
            <EmptyState
              className="mt-8"
              icon={<Users className="size-6" />}
              title="No friends yet"
              description="Browse the player directory and send a few friend requests."
              action={<LinkButton href="/players">Browse Players</LinkButton>}
            />
          ) : (
            <div className="mt-8">
              <FriendsPageClient friends={friends} incoming={incoming} outgoing={outgoing} />
            </div>
          )}
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}
