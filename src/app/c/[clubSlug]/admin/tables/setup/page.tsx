import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getClubViewer } from "@/lib/auth/get-club-viewer";
import { clubPath } from "@/lib/club-path";
import { isScorekeeperOnly } from "@/types/club";
import { TableSetup } from "@/features/tables/components/table-setup";
import { listClubTables } from "@/services/table-service";

export const metadata: Metadata = { title: "Tables & rates" };

export default async function TableSetupPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const clubViewer = await getClubViewer(clubSlug);
  if (!clubViewer) return null;
  if (isScorekeeperOnly(clubViewer.membership?.role)) redirect(clubPath(clubSlug, "/admin/live"));
  const tables = await listClubTables(clubViewer.club.id, true);

  return (
    <div className="space-y-5">
      <Link href={clubPath(clubSlug, "/admin/tables")} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Tables
      </Link>
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Tables &amp; rates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rate changes apply to new timers only. Switch a table off to hide it from the front desk and bookings.
        </p>
      </div>
      <TableSetup clubSlug={clubSlug} tables={tables} />
    </div>
  );
}
