import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlatformHeader } from "@/components/layout/platform-header";
import { PlatformFooter } from "@/components/layout/platform-footer";
import { LiveMatchCentre } from "@/features/live-match/components/live-match-centre";
import { LiveAutoRefresh } from "@/features/live-match/components/live-auto-refresh";
import { buildLiveMatchView } from "@/features/live-match/build-live-view";
import { getMatchById } from "@/services/match-service";
import { getProfileById } from "@/services/profile-service";
import { getClubById } from "@/services/club-service";
import { getFriendlyHeadToHead, getFriendlyStats } from "@/services/friendly-service";
import { remember } from "@/lib/memo";

const AROUND_TTL_MS = 30_000;

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }): Promise<Metadata> {
  const { matchId } = await params;
  const match = await getMatchById(matchId);
  if (!match || match.kind !== "friendly") return { title: "Match" };
  return {
    title: `${match.player1Name} v ${match.player2Name}`,
    description:
      match.friendlyState === "confirmed"
        ? `${match.player1Name} ${match.framesWonPlayer1}–${match.framesWonPlayer2} ${match.player2Name} · a friendly on CueSphere`
        : "A friendly match on CueSphere",
  };
}

/** Public view of a friendly: live score while it's on, the result once it's done. */
export default async function FriendlyMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const match = await getMatchById(matchId);
  // Unanswered, declined or cancelled challenges stay private to the two players.
  if (!match || match.kind !== "friendly" || !["accepted", "pending_confirmation", "confirmed"].includes(match.friendlyState ?? "")) {
    notFound();
  }

  const [p1, p2, h2h, s1, s2, venue] = await Promise.all([
    remember(`profile:${match.player1Id}`, AROUND_TTL_MS, () => getProfileById(match.player1Id)),
    remember(`profile:${match.player2Id}`, AROUND_TTL_MS, () => getProfileById(match.player2Id)),
    remember(`fh2h:${match.player1Id}:${match.player2Id}`, AROUND_TTL_MS, () =>
      getFriendlyHeadToHead(match.player1Id, match.player2Id)
    ),
    remember(`fstats:${match.player1Id}`, AROUND_TTL_MS, () => getFriendlyStats(match.player1Id)),
    remember(`fstats:${match.player2Id}`, AROUND_TTL_MS, () => getFriendlyStats(match.player2Id)),
    match.venueClubId ? remember(`club:${match.venueClubId}`, AROUND_TTL_MS, () => getClubById(match.venueClubId!)) : undefined,
  ]);

  const view = buildLiveMatchView(
    match,
    { title: venue ? `Friendly · ${venue.name}` : "Friendly match", bestOf: match.bestOf ?? 3 },
    { player1: p1?.profilePhotoUrl, player2: p2?.profilePhotoUrl },
    h2h,
    { player1: s1, player2: s2 }
  );

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex-1">
        {match.status !== "completed" ? <LiveAutoRefresh matchId={match.id} /> : null}
        <LiveMatchCentre match={view} />
      </main>
      <PlatformFooter />
    </div>
  );
}
