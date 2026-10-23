import type { Metadata } from "next";

import { listClubsWithCounts } from "@/services/club-service";
import { PlatformHeader } from "@/components/layout/platform-header";
import { PlatformFooter } from "@/components/layout/platform-footer";
import { ClubsBrowseClient } from "@/features/platform/components/clubs-browse-client";

export const metadata: Metadata = { title: "Browse Clubs" };

export default async function BrowseClubsPage() {
  // Every club with its member and tournament counts, in one request.
  const clubs = (await listClubsWithCounts()).filter(({ club }) => club.status === "approved");

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Browse Clubs</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every club registered with CueSphere. Find yours and join to register for tournaments.
          </p>

          <div className="mt-8">
            <ClubsBrowseClient clubs={clubs} />
          </div>
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}
