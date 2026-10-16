import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { clubPath } from "@/lib/club-path";
import { getClubBySlug } from "@/services/club-service";
import { getProfileByUserId } from "@/services/profile-service";
import { listClubTables, listPlayerBookings } from "@/services/table-service";
import { BookTableForm } from "@/features/tables/components/book-table-form";

export const metadata: Metadata = { title: "Book a table" };

export default async function BookTablePage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await getClubBySlug(clubSlug);
  if (!club || club.status !== "approved") notFound();

  const session = await getSession();
  if (!session) redirect(`${clubPath(clubSlug, "/login")}?redirect=${encodeURIComponent(clubPath(clubSlug, "/book"))}`);
  const profile = await getProfileByUserId(session.id);

  const [tables, bookings] = await Promise.all([
    listClubTables(club.id),
    profile ? listPlayerBookings(club.id, profile.id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{club.name}</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">Book a table</h1>
      <p className="mt-1 text-sm text-muted-foreground">Send a request. The club confirms it and you get a notification.</p>
      <div className="mt-6">
        {tables.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {club.name} hasn&apos;t set up table booking yet.
          </p>
        ) : (
          <BookTableForm
            clubSlug={clubSlug}
            tables={tables.map((t) => ({ tableNumber: t.tableNumber, name: t.name, hourlyRate: t.hourlyRate }))}
            bookings={bookings}
          />
        )}
      </div>
    </div>
  );
}
