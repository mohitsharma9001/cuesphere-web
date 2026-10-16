import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MonitorPlay, Tv } from "lucide-react";

import { getClubViewer } from "@/lib/auth/get-club-viewer";
import { getScorableMatchesForClub } from "@/services/match-service";
import { listTvScreensForClub } from "@/services/tv-screen-service";
import { getStreamSettings } from "@/services/stream-settings-service";
import { clubPath } from "@/lib/club-path";
import { Button } from "@/components/ui/button";
import { LiveBadge } from "@/components/shared/live-badge";
import { CopyLinkButton } from "@/features/club-admin/components/copy-link-button";
import { PairTvForm } from "@/features/club-admin/components/screens/pair-tv-form";
import { PairedTvList } from "@/features/club-admin/components/screens/paired-tv-list";
import { YoutubeLinkField } from "@/features/club-admin/components/screens/youtube-link-field";
import { OverlayOptionsForm } from "@/features/club-admin/components/screens/overlay-options-form";
import { SponsorLogosManager } from "@/features/club-admin/components/screens/sponsor-logos-manager";
import { AdsManager } from "@/features/club-admin/components/screens/ads-manager";

export const metadata: Metadata = { title: "TV & Stream" };

const MIN_TABLES = 4;

export default async function AdminScreensPage({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const clubViewer = await getClubViewer(clubSlug);
  if (!clubViewer || !clubViewer.isStaff) notFound();

  const clubId = clubViewer.club.id;
  const [open, tvs, settings] = await Promise.all([
    getScorableMatchesForClub(clubId),
    listTvScreensForClub(clubId),
    getStreamSettings(clubId),
  ]);
  const tableCount = Math.max(
    MIN_TABLES,
    ...open.map((m) => m.tableNumber),
    ...tvs.map((t) => t.tableNumber ?? 0),
    ...Object.keys(settings.youtubeUrls).map(Number).filter(Number.isFinite)
  );
  const tables = Array.from({ length: tableCount }, (_, i) => {
    const table = i + 1;
    return {
      table,
      live: open.find((m) => m.tableNumber === table && m.status === "live"),
      next: open.find((m) => m.tableNumber === table && m.status === "scheduled"),
      tvCount: tvs.filter((t) => t.tableNumber === table).length,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">TV &amp; Stream</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Table TVs and live-stream overlays update on their own as the referee scores.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
          <Tv className="size-5 text-primary" /> Table TVs
        </h2>
        <PairTvForm clubSlug={clubSlug} tableCount={tableCount} />
        <PairedTvList
          clubSlug={clubSlug}
          tableCount={tableCount}
          tvs={tvs.map((t) => ({ id: t.id, tableNumber: t.tableNumber, lastSeenAt: t.lastSeenAt }))}
        />
        <p className="text-xs text-muted-foreground">
          Only one TV? Choose <strong className="text-foreground">All tables (rotate)</strong>: it shows each live table for
          10 seconds in turn. Or open{" "}
          <Link href={clubPath(clubSlug, "/tv/all")} target="_blank" className="text-primary hover:underline">
            {clubPath(clubSlug, "/tv/all")}
          </Link>{" "}
          on the TV directly.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
          <MonitorPlay className="size-5 text-primary" /> Tables
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {tables.map(({ table, live, next, tvCount }) => {
            const tvPath = clubPath(clubSlug, `/tv/${table}`);
            const overlayPath = clubPath(clubSlug, `/overlay/${table}`);
            return (
              <div key={table} className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-heading text-lg font-bold text-foreground">Table {table}</p>
                  <div className="flex items-center gap-2">
                    {tvCount > 0 ? (
                      <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-success">
                        {tvCount === 1 ? "TV paired" : `${tvCount} TVs`}
                      </span>
                    ) : null}
                    {live ? <LiveBadge /> : null}
                  </div>
                </div>
                <p className="min-w-0 truncate text-sm text-muted-foreground">
                  {live
                    ? `${live.player1Name} ${live.framesWonPlayer1} – ${live.framesWonPlayer2} ${live.player2Name}`
                    : next
                      ? `Up next: ${next.player1Name} v ${next.player2Name}`
                      : "No match on this table"}
                </p>

                <YoutubeLinkField clubSlug={clubSlug} table={table} initial={settings.youtubeUrls[String(table)] ?? ""} />

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stream overlay (OBS)</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 flex-1 sm:flex-none"
                      nativeButton={false}
                      render={<Link href={overlayPath} target="_blank" />}
                    >
                      Open
                    </Button>
                    <CopyLinkButton path={overlayPath} label="Copy overlay link" />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  No pairing code? This table&apos;s TV page also works directly:{" "}
                  <Link href={tvPath} target="_blank" className="text-primary hover:underline">
                    {tvPath}
                  </Link>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold text-foreground">Ads</h2>
        <AdsManager clubSlug={clubSlug} ads={settings.ads} />
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold text-foreground">Stream overlay</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <OverlayOptionsForm clubSlug={clubSlug} initialAccent={settings.accent} initialShow={settings.show} />
          <div className="space-y-3">
            <SponsorLogosManager clubSlug={clubSlug} logos={settings.sponsorLogos} />
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
              <p className="font-heading text-base font-bold text-foreground">Add the score to a YouTube stream</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>In OBS, add your camera, then Sources → + → Browser.</li>
                <li>Paste the table&apos;s overlay link and set width 1920, height 1080.</li>
                <li>Keep the Browser source above the camera, then stream to YouTube as usual.</li>
                <li>Paste the YouTube link above so viewers can watch on the club&apos;s live page.</li>
              </ol>
              <p className="text-xs text-muted-foreground">Your YouTube stream key stays in OBS. CueSphere never needs it.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
