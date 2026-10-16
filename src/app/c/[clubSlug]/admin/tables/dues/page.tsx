import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getClubViewer } from "@/lib/auth/get-club-viewer";
import { clubPath } from "@/lib/club-path";
import { isScorekeeperOnly } from "@/types/club";
import { listDuesByPayer, listOutstanding } from "@/services/table-service";
import { DuesList } from "@/features/tables/components/dues-list";
import { formatRupees } from "@/types/tables";

export const metadata: Metadata = { title: "Dues" };

/** Who owes the club what: per player, with each game behind the amount. */
export default async function DuesPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const clubViewer = await getClubViewer(clubSlug);
  if (!clubViewer) return null;
  if (isScorekeeperOnly(clubViewer.membership?.role)) redirect(clubPath(clubSlug, "/admin/live"));

  const [dues, outstanding] = await Promise.all([listDuesByPayer(clubViewer.club.id), listOutstanding(clubViewer.club.id)]);
  const total = dues.reduce((t, d) => t + d.total, 0);
  const undecided = outstanding.unsplit.reduce((t, s) => t + (s.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <Link href={clubPath(clubSlug, "/admin/tables")} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Tables
      </Link>
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Dues</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a player to see each game, collect, or send a reminder. Players see only their own dues.
        </p>
      </div>
      <section className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Owed to {clubViewer.club.name}</p>
        <p className="font-heading text-4xl font-bold text-foreground">{formatRupees(total)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {dues.length} player{dues.length === 1 ? "" : "s"}
          {undecided > 0 ? ` · plus ${formatRupees(undecided)} where who pays isn't decided yet (on the Tables page)` : ""}
        </p>
      </section>
      <DuesList clubSlug={clubSlug} clubName={clubViewer.club.name} dues={dues} />
    </div>
  );
}
