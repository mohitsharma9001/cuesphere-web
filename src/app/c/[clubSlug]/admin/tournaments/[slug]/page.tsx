import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, ListChecks, Radio, Users } from "lucide-react";

import { getClubViewer } from "@/lib/auth/get-club-viewer";
import { getClubTournamentBySlug, countRegisteredForClubTournament } from "@/services/club-tournament-service";
import { getRegistrationsForTournament } from "@/services/registration-service";
import { getMatchesForTournament } from "@/services/match-service";
import { getProfilesByIds } from "@/services/profile-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { EditTournamentForm } from "@/features/club-admin/components/edit-tournament-form";
import { DeclareWinnerCard } from "@/features/club-admin/components/declare-winner-card";
import { AssignScorekeeperCard } from "@/features/club-admin/components/assign-scorekeeper-card";
import { listScorekeepersForTournament } from "@/services/tournament-scorekeeper-service";
import { DeleteTournamentButton } from "@/features/club-admin/components/delete-tournament-button";
import { FixtureBuilder } from "@/features/club-admin/components/fixture-builder";
import { MatchStatusControl } from "@/features/club-admin/components/match-status-control";
import { clubPath } from "@/lib/club-path";
import { isScorekeeperOnly } from "@/types/club";

export const metadata: Metadata = { title: "Manage Tournament" };

export default async function ManageTournamentPage({
  params,
}: {
  params: Promise<{ clubSlug: string; slug: string }>;
}) {
  const { clubSlug, slug } = await params;
  // The tournament lookup only needs the slugs, so it runs alongside the viewer check.
  const [clubViewer, tournament] = await Promise.all([
    getClubViewer(clubSlug),
    getClubTournamentBySlug(clubSlug, slug),
  ]);
  if (!clubViewer || !clubViewer.isStaff) notFound();
  if (isScorekeeperOnly(clubViewer.membership?.role)) {
    redirect(clubPath(clubSlug, "/admin/live"));
  }
  if (!tournament) notFound();

  const [registeredCount, registrations, matches, scorekeepers] = await Promise.all([
    countRegisteredForClubTournament(tournament.id),
    getRegistrationsForTournament(tournament.id),
    getMatchesForTournament(tournament.id),
    listScorekeepersForTournament(tournament.id),
  ]);

  // Every entrant's profile in one request.
  const profilesById = await getProfilesByIds(registrations.map((r) => r.playerId));
  const players = registrations.map((r) => ({ registration: r, profile: profilesById.get(r.playerId) }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{tournament.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage this tournament.</p>
        </div>
        <DeleteTournamentButton
          clubSlug={clubSlug}
          tournamentId={tournament.id}
          tournamentName={tournament.name}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide">
                <Users className="size-4" /> Registered Players ({registeredCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <EmptyState
                  icon={<Users className="size-6" />}
                  title="No registrations yet"
                  description="Players who register for this tournament will show up here."
                />
              ) : (
                <div className="space-y-2">
                  {players.map(({ registration, profile }) => (
                    <div
                      key={registration.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2.5 font-medium text-foreground">
                        <AvatarInitials
                          name={profile?.fullName || "Unknown Player"}
                          photoUrl={profile?.profilePhotoUrl}
                          size="sm"
                        />
                        {profile?.fullName || "Unknown Player"}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge
                          className={
                            registration.paymentStatus === "paid"
                              ? "border-success/40 bg-success/15 text-success"
                              : "border-destructive/40 bg-destructive/15 text-destructive"
                          }
                        >
                          {registration.paymentStatus === "paid" ? "Paid" : "Pending"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{registration.registrationNumber}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide">Fixtures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {matches.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Total Matches", value: matches.length, icon: ListChecks },
                    {
                      label: "Completed",
                      value: matches.filter((m) => m.status === "completed").length,
                      icon: CheckCircle2,
                    },
                    {
                      label: "Live",
                      value: matches.filter((m) => m.status === "live").length,
                      icon: Radio,
                    },
                    {
                      label: "Upcoming",
                      value: matches.filter((m) => m.status === "scheduled").length,
                      icon: CalendarClock,
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-border bg-background/40 p-3">
                      <stat.icon className="size-4 text-primary" />
                      <p className="mt-2 font-tabular text-xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {players.length === 0 ? (
                <EmptyState
                  icon={<Users className="size-6" />}
                  title="No registered players yet"
                  description="Once players register, drag them into tables here to build fixtures."
                />
              ) : (
                <FixtureBuilder
                  clubSlug={clubSlug}
                  tournamentId={tournament.id}
                  players={players
                    .filter(({ registration }) => registration.paymentStatus === "paid")
                    .map(({ registration, profile }) => ({
                      id: registration.playerId,
                      name: profile?.fullName || "Unknown Player",
                      photoUrl: profile?.profilePhotoUrl,
                    }))}
                  matches={matches}
                />
              )}

              {matches.length > 0 ? (
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Match Status
                  </p>
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="text-foreground">
                        Table {match.tableNumber} · {match.player1Name} vs {match.player2Name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{match.status}</span>
                        <MatchStatusControl clubSlug={clubSlug} matchId={match.id} status={match.status} />
                        <Link
                          href={clubPath(clubSlug, `/admin/tournaments/${slug}/matches/${match.id}`)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Score Match
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {players.length > 0 ? (
            <DeclareWinnerCard
              clubSlug={clubSlug}
              tournament={tournament}
              players={players.map(({ registration, profile }) => ({
                id: registration.playerId,
                name: profile?.fullName || "Unknown Player",
              }))}
            />
          ) : null}

          <AssignScorekeeperCard clubSlug={clubSlug} tournamentId={tournament.id} existing={scorekeepers} />

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide">Tournament Details</CardTitle>
            </CardHeader>
            <CardContent>
              <EditTournamentForm clubSlug={clubSlug} tournament={tournament} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
