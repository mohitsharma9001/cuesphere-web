import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";

import { getClubViewer } from "@/lib/auth/get-club-viewer";
import { clubPath } from "@/lib/club-path";
import { isScorekeeperOnly } from "@/types/club";
import { LinkButton } from "@/components/shared/link-button";
import { TablesBoard } from "@/features/tables/components/tables-board";
import { TableSetup } from "@/features/tables/components/table-setup";
import { getTablesOverview } from "@/services/table-service";

export const metadata: Metadata = { title: "Tables" };

/** The front desk: table timers, bills, payments and booking requests. */
export default async function ClubTablesPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const clubViewer = await getClubViewer(clubSlug);
  if (!clubViewer) return null;
  if (isScorekeeperOnly(clubViewer.membership?.role)) redirect(clubPath(clubSlug, "/admin/live"));

  const clubId = clubViewer.club.id;
  const { tables, open, outstanding, bookings, summary } = await getTablesOverview(clubId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Tables</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a table when players begin, close it for the bill, then choose who pays.
          </p>
        </div>
        {tables.length > 0 ? (
          <LinkButton href={clubPath(clubSlug, "/admin/tables/setup")} variant="outline" size="sm">
            <Settings2 className="size-4" /> Tables &amp; rates
          </LinkButton>
        ) : null}
      </div>

      {tables.length === 0 ? (
        <section className="space-y-3 rounded-2xl border border-dashed border-border p-4">
          <p className="font-heading text-lg font-bold text-foreground">Add your tables</p>
          <p className="text-sm text-muted-foreground">
            Enter each table&apos;s number and hourly rate. Bills are worked out by the minute.
          </p>
          <TableSetup clubSlug={clubSlug} tables={[]} />
        </section>
      ) : (
        <TablesBoard
          clubSlug={clubSlug}
          tables={tables}
          open={open}
          unsplit={outstanding.unsplit}
          charges={outstanding.charges}
          bookings={bookings}
          summary={summary}
        />
      )}
    </div>
  );
}
