import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Trophy, Target, TrendingUp, Flame, MapPin, Star, Medal, Swords } from "lucide-react";

import { PlatformHeader } from "@/components/layout/platform-header";
import { PlatformFooter } from "@/components/layout/platform-footer";
import { LinkButton } from "@/components/shared/link-button";
import { PlayerAvatar, PlayerActions, type PlayerDirectoryEntry } from "@/features/platform/components/players-browse-client";
import { getProfileById } from "@/services/profile-service";
import { getClubById, listMembershipsForUser } from "@/services/club-service";
import { getStatsForPlayerAllClubs } from "@/services/stats-service";
import { getSession } from "@/lib/auth/session";
import { listFriendshipsForUser } from "@/services/friendship-service";
import { isFollowingPlayer } from "@/services/follow-service";
import { FollowButton } from "@/features/friends/components/follow-button";
import { PlayingNowBanner } from "@/features/friends/components/playing-now-banner";
import { getPlayerLiveMatch } from "@/features/friends/player-live-match";
import { getPlayerRanks } from "@/services/ranking-service";
import { getFriendlyStats } from "@/services/friendly-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ playerId: string }>;
}): Promise<Metadata> {
  const { playerId } = await params;
  const profile = await getProfileById(playerId);
  return { title: profile ? profile.fullName : "Player" };
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-heading text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const profile = await getProfileById(playerId);
  if (!profile || !profile.fullName) notFound();

  const session = await getSession();

  const [memberships, statsRows, friendships, following, liveNow, ranks, friendly] = await Promise.all([
    listMembershipsForUser(profile.userId),
    getStatsForPlayerAllClubs(profile.id),
    session ? listFriendshipsForUser(session.id) : Promise.resolve([]),
    session ? isFollowingPlayer(session.id, profile.id) : Promise.resolve(false),
    getPlayerLiveMatch(profile.id),
    getPlayerRanks(profile.id),
    getFriendlyStats(profile.id),
  ]);

  const clubs = (
    await Promise.all(memberships.map((m) => getClubById(m.clubId)))
  ).filter((c): c is NonNullable<typeof c> => !!c && c.status === "approved");

  const totals = statsRows.reduce(
    (acc, s) => ({
      tournamentsPlayed: acc.tournamentsPlayed + s.tournamentsPlayed,
      matchesPlayed: acc.matchesPlayed + s.matchesPlayed,
      wins: acc.wins + s.wins,
      losses: acc.losses + s.losses,
      highestBreak: Math.max(acc.highestBreak, s.highestBreak),
    }),
    { tournamentsPlayed: 0, matchesPlayed: 0, wins: 0, losses: 0, highestBreak: 0 }
  );
  const winRate = totals.matchesPlayed > 0 ? Math.round((totals.wins / totals.matchesPlayed) * 100) : 0;

  const primaryClub = clubs.find((c) => c.id === profile.primaryClubId);
  const isSelf = session?.id === profile.userId;
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
  const entry: PlayerDirectoryEntry = { profile, relation, friendshipId: friendship?.id };

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-6">
            <PlayerAvatar profile={profile} />
            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {profile.fullName}
                {primaryClub ? <span className="ml-2 text-lg font-semibold text-success">({primaryClub.name})</span> : null}
              </h1>
              {profile.city ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 text-primary" /> {profile.city}
                </p>
              ) : null}
            </div>
            {!isSelf && session ? (
              <div className="flex flex-wrap gap-2">
                <FollowButton playerId={profile.id} playerName={profile.fullName} initialFollowing={following} />
                <PlayerActions entry={entry} />
                <LinkButton href={`/play/new?opponent=${profile.id}`} size="sm">
                  <Swords className="size-3.5" /> Challenge
                </LinkButton>
              </div>
            ) : null}
          </div>

          {liveNow ? <PlayingNowBanner match={liveNow} /> : null}

          {ranks.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {ranks.map((r) => (
                <Link
                  key={`${r.scope}-${r.code}`}
                  href={r.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/15"
                >
                  <Medal className="size-3.5" /> #{r.rank} in {r.name}
                  <span className="font-normal text-muted-foreground">of {r.total}</span>
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={Trophy} label="Tournaments" value={totals.tournamentsPlayed} />
            <StatCard icon={Target} label="Matches" value={totals.matchesPlayed} />
            <StatCard icon={TrendingUp} label="Win Rate" value={`${winRate}%`} />
            <StatCard icon={Flame} label="Highest Break" value={totals.highestBreak} />
          </div>

          {friendly.matchesPlayed > 0 ? (
            <div className="mt-8">
              <h2 className="font-heading text-lg font-bold text-foreground">Friendlies</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {friendly.wins}W · {friendly.losses}L · Frames {friendly.framesWon}–{friendly.framesLost}
                {friendly.highestBreak > 0 ? ` · Highest break ${friendly.highestBreak}` : ""}
              </p>
              {friendly.recentForm.length > 0 ? (
                <div className="mt-2 flex gap-1">
                  {friendly.recentForm.map((f, i) => (
                    <span
                      key={i}
                      className={f === "W" ? "flex size-6 items-center justify-center rounded-md bg-success/15 text-xs font-bold text-success" : "flex size-6 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground"}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8">
            <h2 className="font-heading text-lg font-bold text-foreground">Clubs</h2>
            {clubs.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Not a member of any club yet.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {clubs.map((club) => (
                  <LinkButton key={club.id} href={`/c/${club.slug}`} variant="outline" size="sm">
                    {club.id === profile.primaryClubId ? <Star className="size-3.5 fill-success text-success" /> : null}
                    {club.name}
                  </LinkButton>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}
