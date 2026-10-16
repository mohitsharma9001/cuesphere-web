import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Eye, Trophy } from "lucide-react";

import { PlatformHeader } from "@/components/layout/platform-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MatchScoringView } from "@/features/club-admin/components/scoring/match-scoring-view";
import { LiveAutoRefresh } from "@/features/live-match/components/live-auto-refresh";
import {
  CancelButton,
  ConfirmButtons,
  RespondButtons,
  ShareResult,
  StartButton,
} from "@/features/friendlies/components/friendly-actions";
import { getViewer } from "@/lib/auth/get-viewer";
import { getSiteUrl } from "@/lib/site-url";
import { getMatchById } from "@/services/match-service";
import { getProfileById } from "@/services/profile-service";
import { getClubById } from "@/services/club-service";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Friendly" };

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Player({ name, photo, frames, highlight }: { name: string; photo?: string; frames: number | null; highlight: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <Avatar className={cn("size-16", highlight && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
        {photo ? <AvatarImage src={photo} alt={name} /> : null}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <p className="w-full truncate text-sm font-semibold text-foreground">{name}</p>
      {frames !== null ? <p className={cn("font-heading text-4xl font-bold", highlight ? "text-primary" : "text-foreground")}>{frames}</p> : null}
    </div>
  );
}

export default async function FriendlyPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const viewer = await getViewer();
  if (!viewer.user) redirect(`/login?redirect=${encodeURIComponent(`/play/${matchId}`)}`);

  const match = await getMatchById(matchId);
  if (!match || match.kind !== "friendly") notFound();
  const me = viewer.profile?.id;
  const side = match.player1Id === me ? 1 : match.player2Id === me ? 2 : 0;
  // Everyone else watches the public page.
  if (!side) redirect(`/matches/${matchId}`);

  const [p1, p2, venue, siteUrl] = await Promise.all([
    getProfileById(match.player1Id),
    getProfileById(match.player2Id),
    match.venueClubId ? getClubById(match.venueClubId) : undefined,
    getSiteUrl(),
  ]);
  const opponentName = side === 1 ? match.player2Name : match.player1Name;
  const state = match.friendlyState;
  const showFrames = state === "pending_confirmation" || state === "confirmed";
  const isScoring = state === "accepted" && match.status === "live";
  const iSubmitted = match.resultSubmittedBy === me;
  const winnerName = match.winnerId === match.player1Id ? match.player1Name : match.player2Name;
  const loserName = match.winnerId === match.player1Id ? match.player2Name : match.player1Name;
  const winnerFrames = Math.max(match.framesWonPlayer1, match.framesWonPlayer2);
  const loserFrames = Math.min(match.framesWonPlayer1, match.framesWonPlayer2);
  const publicUrl = `${siteUrl}/matches/${match.id}`;

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      {/* Pick up the opponent's accept / confirm without a manual reload. */}
      {!isScoring && state !== "confirmed" && state !== "declined" && state !== "cancelled" ? <LiveAutoRefresh matchId={match.id} /> : null}
      <main className="flex-1">
        <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
          <Link href="/play" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" /> Friendlies
          </Link>

          <div className="rounded-3xl border border-border bg-card p-5">
            <p className="text-center text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Friendly · Best of {match.bestOf ?? 3}
              {venue ? ` · ${venue.name}` : ""}
              {match.tableNumber > 0 ? ` · Table ${match.tableNumber}` : ""}
            </p>
            <div className="mt-4 flex items-start gap-3">
              <Player
                name={match.player1Name}
                photo={p1?.profilePhotoUrl}
                frames={showFrames ? match.framesWonPlayer1 : null}
                highlight={showFrames && match.winnerId === match.player1Id}
              />
              <span className="pt-6 font-heading text-lg font-bold text-muted-foreground">v</span>
              <Player
                name={match.player2Name}
                photo={p2?.profilePhotoUrl}
                frames={showFrames ? match.framesWonPlayer2 : null}
                highlight={showFrames && match.winnerId === match.player2Id}
              />
            </div>
            {showFrames && match.highestBreak > 0 ? (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Trophy className="size-3.5 text-primary" /> Highest break {match.highestBreak}
              </p>
            ) : null}
          </div>

          {state === "invited" && side === 2 ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{match.player1Name}</span> challenged you.
              </p>
              <RespondButtons matchId={match.id} />
            </div>
          ) : null}

          {state === "invited" && side === 1 ? (
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">Waiting for {opponentName} to accept.</p>
              <CancelButton matchId={match.id} />
            </div>
          ) : null}

          {state === "accepted" && match.status === "scheduled" ? (
            <div className="space-y-2">
              <StartButton matchId={match.id} />
              <p className="text-center text-xs text-muted-foreground">
                Use one phone to score. Your friends and followers get a &ldquo;watch live&rdquo; alert.
              </p>
              <CancelButton matchId={match.id} />
            </div>
          ) : null}

          {isScoring ? (
            <div className="space-y-4">
              <Link
                href={`/matches/${match.id}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <Eye className="size-4" /> Open the live page (share it so people can watch)
              </Link>
              <MatchScoringView match={match} player1PhotoUrl={p1?.profilePhotoUrl} player2PhotoUrl={p2?.profilePhotoUrl} />
            </div>
          ) : null}

          {state === "pending_confirmation" && !iSubmitted ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                {opponentName} entered this score. Is it right?
              </p>
              <ConfirmButtons matchId={match.id} />
            </div>
          ) : null}

          {state === "pending_confirmation" && iSubmitted ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
              Result sent. It counts once {opponentName} confirms it.
            </p>
          ) : null}

          {state === "confirmed" ? (
            <div className="space-y-2">
              <ShareResult
                text={`${winnerName} beat ${loserName} ${winnerFrames}–${loserFrames} in a friendly on CueSphere${
                  match.highestBreak > 0 ? ` (highest break ${match.highestBreak})` : ""
                }.`}
                url={publicUrl}
              />
              <p className="text-center text-xs text-muted-foreground">Added to both players&apos; friendly records.</p>
            </div>
          ) : null}

          {state === "declined" || state === "cancelled" ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
              {state === "declined" ? `${match.player2Name} declined this challenge.` : "This match was cancelled."}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
