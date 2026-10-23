import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getMyProfile } from "@/lib/auth/get-viewer";
import { getRegistrationById } from "@/services/registration-service";
import { getPaymentForRegistration } from "@/services/payment-service";
import { getPlayerCurrentMatch, getPlayerMatchHistory } from "@/services/match-service";
import { getStatsForPlayer } from "@/services/stats-service";
import { getClubBySlug } from "@/services/club-service";
import { clubPath } from "@/lib/club-path";
import { TOURNAMENTS } from "@/lib/mock/tournaments";
import { getTournamentDetail } from "@/lib/mock/tournament-detail";
import { TournamentDashboard } from "@/features/dashboard/components/tournament-dashboard";

export const metadata: Metadata = { title: "My Tournament" };

export default async function TournamentDashboardPage({
  params,
}: {
  params: Promise<{ clubSlug: string; registrationId: string }>;
}) {
  const { clubSlug, registrationId } = await params;
  const club = await getClubBySlug(clubSlug);
  if (!club) notFound();

  const session = await getSession();
  if (!session) {
    redirect(
      `${clubPath(clubSlug, "/login")}?redirect=${encodeURIComponent(
        clubPath(clubSlug, `/dashboard/tournaments/${registrationId}`)
      )}`
    );
  }

  const profile = await getMyProfile();
  const registration = await getRegistrationById(registrationId);

  if (!profile || !registration || registration.playerId !== profile.id || registration.clubId !== club.id) {
    notFound();
  }

  const base = TOURNAMENTS.find((t) => t.id === registration.tournamentId);
  const tournament = base ? getTournamentDetail(base.slug) : undefined;
  if (!tournament) {
    notFound();
  }

  const payment = await getPaymentForRegistration(registration.id);
  const match =
    (await getPlayerCurrentMatch(registration.tournamentId, profile.id)) ??
    (await getPlayerMatchHistory(profile.id)).find((m) => m.tournamentId === registration.tournamentId);

  const stats = await getStatsForPlayer(profile.id, club.id);

  return (
    <TournamentDashboard
      tournament={tournament}
      registration={registration}
      payment={payment}
      match={match}
      playerId={profile.id}
      stats={stats}
    />
  );
}
