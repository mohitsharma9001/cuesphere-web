import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getClubViewer } from "@/lib/auth/get-club-viewer";
import { getClubBoard } from "@/features/table-display/table-board";
import { RotatingTvScoreboard } from "@/features/table-display/components/rotating-tv-scoreboard";

export const metadata: Metadata = { title: "All tables scoreboard" };

/** One TV for the whole club: rotates through every table with a live match. */
export default async function AllTablesTvPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const clubViewer = await getClubViewer(clubSlug);
  if (!clubViewer) notFound();

  const initial = await getClubBoard(clubViewer.club);
  return <RotatingTvScoreboard initial={initial} clubSlug={clubSlug} />;
}
