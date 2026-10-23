import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flame, Medal, Star, Target, Trophy, TrendingDown, TrendingUp } from "lucide-react";

import { getClubBySlug, getMembership } from "@/services/club-service";
import { getProfileById } from "@/services/profile-service";
import { getStatsForPlayer, getAchievementsForPlayer } from "@/services/stats-service";
import { getPlayerMatchHistoryForClub, getHighestBreaksForPlayer } from "@/services/match-service";
import { getClubTournamentsByIds } from "@/services/club-tournament-service";
import { PageHero } from "@/components/shared/page-hero";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { Reveal, RevealGroup, RevealItem } from "@/components/shared/reveal";
import { getSession } from "@/lib/auth/session";
import { isFollowingPlayer } from "@/services/follow-service";
import { FollowButton } from "@/features/friends/components/follow-button";
import { PlayingNowBanner } from "@/features/friends/components/playing-now-banner";
import { getPlayerLiveMatch } from "@/features/friends/player-live-match";
import type { Achievement } from "@/types/player-stats";

const ACHIEVEMENT_ICONS: Record<Achievement["icon"], React.ElementType> = {
  trophy: Trophy,
  medal: Medal,
  flame: Flame,
  star: Star,
};

function StatTile({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <>
      <Icon className="size-4 text-primary" />
      {typeof value === "number" ? (
        <AnimatedCounter value={value} className="mt-2 block text-2xl font-bold text-foreground" />
      ) : (
        <p className="mt-2 font-tabular text-2xl font-bold text-foreground">{value}</p>
      )}
      <p className="text-xs text-muted-foreground">{label}</p>
    </>
  );

  if (href) {
    return (
      <a href={href} className="card-hover block rounded-xl border border-border bg-card p-4">
        {content}
      </a>
    );
  }
  return <div className="card-hover rounded-xl border border-border bg-card p-4">{content}</div>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clubSlug: string; playerId: string }>;
}): Promise<Metadata> {
  const { playerId } = await params;
  const profile = await getProfileById(playerId);
  return { title: profile?.fullName || "Player" };
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ clubSlug: string; playerId: string }>;
}) {
  const { clubSlug, playerId } = await params;

  const [club, profile] = await Promise.all([getClubBySlug(clubSlug), getProfileById(playerId)]);
  if (!club) notFound();
  if (!profile) notFound();

  const membership = await getMembership(club.id, profile.userId);
  if (!membership) notFound();

  const session = await getSession();
  const [stats, achievements, matchHistory, highestBreaks, following, liveNow] = await Promise.all([
    getStatsForPlayer(playerId, club.id),
    getAchievementsForPlayer(playerId, club.id),
    getPlayerMatchHistoryForClub(playerId, club.id),
    getHighestBreaksForPlayer(playerId, club.id),
    session ? isFollowingPlayer(session.id, playerId) : Promise.resolve(false),
    getPlayerLiveMatch(playerId),
  ]);
  const canFollow = !!session && session.id !== profile.userId;

  // Every tournament in the history, in one request.
  const tournamentsById: Map<string, { name: string; slug: string }> = await getClubTournamentsByIds(
    [...matchHistory, ...highestBreaks].map((m) => m.tournamentId)
  );

  const winRate = stats && stats.matchesPlayed > 0 ? Math.round((stats.wins / stats.matchesPlayed) * 100) : 0;

  return (
    <>
      <PageHero
        title={profile.fullName || "Player"}
        description={`Player profile at ${club.name}.`}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: profile.fullName || "Player" }]}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Reveal className="flex flex-wrap items-center gap-5">
          <AvatarInitials name={profile.fullName || "Player"} photoUrl={profile.profilePhotoUrl} size="xl" />
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {profile.fullName || "Player"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Member ID: {membership.memberId || profile.memberId}
            </p>
            {profile.city ? <p className="text-sm text-muted-foreground">{profile.city}</p> : null}
          </div>
          {canFollow ? (
            <div className="ml-auto">
              <FollowButton playerId={playerId} playerName={profile.fullName || "this player"} initialFollowing={following} />
            </div>
          ) : null}
        </Reveal>

        {liveNow ? <PlayingNowBanner match={liveNow} /> : null}

        {!stats || stats.matchesPlayed === 0 ? (
          <EmptyState
            className="mt-8"
            icon={<Trophy className="size-6" />}
            title="No matches played yet"
            description={`${profile.fullName || "This player"} hasn't completed a match at ${club.name} yet.`}
          />
        ) : (
          <>
            <RevealGroup className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <RevealItem><StatTile icon={Trophy} label="Tournaments Played" value={stats.tournamentsPlayed} /></RevealItem>
              <RevealItem><StatTile icon={Target} label="Matches Played" value={stats.matchesPlayed} /></RevealItem>
              <RevealItem><StatTile icon={TrendingUp} label="Wins" value={stats.wins} /></RevealItem>
              <RevealItem><StatTile icon={TrendingDown} label="Losses" value={stats.losses} /></RevealItem>
              <RevealItem><StatTile icon={Trophy} label="Win Rate" value={`${winRate}%`} /></RevealItem>
              <RevealItem>
                <StatTile
                  icon={Star}
                  label="Highest Break"
                  value={stats.highestBreak}
                  href={highestBreaks.length > 0 ? "#highest-breaks" : undefined}
                />
              </RevealItem>
              <RevealItem><StatTile icon={Target} label="Frames Won" value={stats.framesWon} /></RevealItem>
              <RevealItem><StatTile icon={Target} label="Frames Lost" value={stats.framesLost} /></RevealItem>
            </RevealGroup>

            {stats.recentForm.length > 0 ? (
              <div className="mt-6 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recent Form
                </span>
                <div className="flex gap-1">
                  {stats.recentForm.map((result, i) => (
                    <span
                      key={i}
                      className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${
                        result === "W" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {result}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {achievements.length > 0 ? (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-wide">Achievements</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {achievements.map((achievement) => {
                    const Icon = ACHIEVEMENT_ICONS[achievement.icon];
                    return (
                      <div
                        key={achievement.id}
                        className="flex items-start gap-3 rounded-lg border border-border p-3"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{achievement.title}</p>
                          <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : null}

            {highestBreaks.length > 0 ? (
              <Card id="highest-breaks" className="mt-8">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-wide">Break History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {highestBreaks.map((match) => {
                    const isPlayer1 = match.player1Id === playerId;
                    const opponent = isPlayer1 ? match.player2Name : match.player1Name;
                    const tournament = tournamentsById.get(match.tournamentId);
                    return (
                      <div
                        key={match.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm"
                      >
                        <p className="font-medium text-foreground">
                          vs {opponent}{" "}
                          <span className="text-xs text-muted-foreground">
                            &bull; {tournament?.name ?? "Tournament"} &bull; {match.round}
                          </span>
                        </p>
                        <span className="flex items-center gap-1.5 font-tabular text-sm font-bold text-primary">
                          <Star className="size-3.5" /> {match.highestBreak}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : null}

            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide">Match History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {matchHistory.map((match) => {
                  const isPlayer1 = match.player1Id === playerId;
                  const opponent = isPlayer1 ? match.player2Name : match.player1Name;
                  const won = match.winnerId === playerId;
                  const tournament = tournamentsById.get(match.tournamentId);
                  return (
                    <div
                      key={match.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          vs {opponent}{" "}
                          <span className="text-xs text-muted-foreground">
                            &bull; {tournament?.name ?? "Tournament"} &bull; {match.round}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {match.score ? (
                          <span className="font-tabular text-sm font-bold text-primary">{match.score}</span>
                        ) : null}
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                            won ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {won ? "Won" : "Lost"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
