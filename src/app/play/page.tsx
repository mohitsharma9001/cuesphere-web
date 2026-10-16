import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Swords } from "lucide-react";

import { PlatformHeader } from "@/components/layout/platform-header";
import { PlatformFooter } from "@/components/layout/platform-footer";
import { LinkButton } from "@/components/shared/link-button";
import { EmptyState } from "@/components/shared/empty-state";
import { getViewer } from "@/lib/auth/get-viewer";
import { getFriendlyStats, listFriendliesForPlayer } from "@/services/friendly-service";
import { cn } from "@/lib/utils";
import type { DrawMatch } from "@/types/match";

export const metadata: Metadata = { title: "Friendlies" };

function statusFor(match: DrawMatch, myId: string): { label: string; tone: "action" | "live" | "muted" | "done" } {
  const mine = match.player1Id === myId;
  switch (match.friendlyState) {
    case "invited":
      return mine ? { label: "Waiting for reply", tone: "muted" } : { label: "Challenge · respond", tone: "action" };
    case "accepted":
      return match.status === "live" ? { label: "Live", tone: "live" } : { label: "Ready to start", tone: "action" };
    case "pending_confirmation":
      return match.resultSubmittedBy === myId
        ? { label: "Awaiting confirmation", tone: "muted" }
        : { label: "Confirm result", tone: "action" };
    case "confirmed":
      return { label: match.winnerId === myId ? "Won" : "Lost", tone: "done" };
    case "declined":
      return { label: "Declined", tone: "muted" };
    default:
      return { label: "Cancelled", tone: "muted" };
  }
}

function needsMe(match: DrawMatch, myId: string) {
  return (
    (match.friendlyState === "invited" && match.player2Id === myId) ||
    (match.friendlyState === "pending_confirmation" && match.resultSubmittedBy !== myId)
  );
}

function Row({ match, myId }: { match: DrawMatch; myId: string }) {
  const status = statusFor(match, myId);
  const opponent = match.player1Id === myId ? match.player2Name : match.player1Name;
  const showScore = ["pending_confirmation", "confirmed"].includes(match.friendlyState ?? "") || match.status === "live";
  const myFrames = match.player1Id === myId ? match.framesWonPlayer1 : match.framesWonPlayer2;
  const theirFrames = match.player1Id === myId ? match.framesWonPlayer2 : match.framesWonPlayer1;
  return (
    <Link
      href={`/play/${match.id}`}
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 transition-colors hover:border-primary/60",
        status.tone === "action" ? "border-primary/50" : status.tone === "live" ? "border-destructive/50" : "border-border"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">vs {opponent}</p>
        <p className="text-xs text-muted-foreground">Best of {match.bestOf ?? 3}</p>
      </div>
      {showScore ? (
        <span className="font-heading text-lg font-bold text-foreground">
          {myFrames}–{theirFrames}
        </span>
      ) : null}
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
          status.tone === "action" && "bg-primary text-primary-foreground",
          status.tone === "live" && "bg-destructive/15 text-destructive",
          status.tone === "muted" && "bg-muted text-muted-foreground",
          status.tone === "done" && (status.label === "Won" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")
        )}
      >
        {status.tone === "live" ? "● " : ""}
        {status.label}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function Section({ title, matches, myId }: { title: string; matches: DrawMatch[]; myId: string }) {
  if (matches.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-1 gap-2">
        {matches.map((m) => (
          <Row key={m.id} match={m} myId={myId} />
        ))}
      </div>
    </section>
  );
}

export default async function PlayPage() {
  const viewer = await getViewer();
  if (!viewer.user) redirect("/login?redirect=%2Fplay");
  if (!viewer.profile) redirect("/account/profile");
  const myId = viewer.profile.id;

  const [matches, stats] = await Promise.all([listFriendliesForPlayer(myId), getFriendlyStats(myId)]);
  const action = matches.filter((m) => needsMe(m, myId));
  const active = matches.filter(
    (m) => !needsMe(m, myId) && (m.friendlyState === "accepted" || m.friendlyState === "invited")
  );
  const results = matches.filter(
    (m) => !needsMe(m, myId) && (m.friendlyState === "confirmed" || m.friendlyState === "pending_confirmation")
  );

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Friendlies</span>
              <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">Play a friend</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Challenge any player on CueSphere, score it on your phone, and it goes on both profiles.
              </p>
            </div>
            <LinkButton href="/play/new" size="lg">
              <Swords className="size-4" /> Challenge a player
            </LinkButton>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              ["Played", stats.matchesPlayed],
              ["Won", stats.wins],
              ["Lost", stats.losses],
              ["Best break", stats.highestBreak],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
                <p className="font-heading text-2xl font-bold text-primary">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {matches.length === 0 ? (
            <EmptyState
              icon={<Swords className="size-6" />}
              title="No friendlies yet"
              description="Challenge someone you play with. They get a notification and accept from their phone."
              action={<LinkButton href="/play/new">Challenge a player</LinkButton>}
            />
          ) : (
            <>
              <Section title="Needs you" matches={action} myId={myId} />
              <Section title="Live & upcoming" matches={active} myId={myId} />
              <Section title="Results" matches={results} myId={myId} />
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Friendly results count towards your friendly record and head-to-heads. Rankings only use tournament results.
          </p>
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}
