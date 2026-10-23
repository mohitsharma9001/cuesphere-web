import { api } from "@/lib/api/server";
import type { Club } from "@/types/club";
import type { ClubBoard, TableBoard } from "@/features/table-display/types";

// The API builds the boards (with its own short caches, since every TV and
// overlay polls them); these are the initial server-rendered snapshots.

/** What one table's TV / overlay should show right now. */
export async function getTableBoard(club: Pick<Club, "slug">, table: number, followId?: string): Promise<TableBoard> {
  return api<TableBoard>(`/boards/${encodeURIComponent(club.slug)}/tables/${table}`, {
    auth: false,
    query: { follow: followId },
  });
}

/** Every live table in the club at once, for the single TV that rotates through them. */
export async function getClubBoard(club: Pick<Club, "slug">): Promise<ClubBoard> {
  return api<ClubBoard>(`/boards/${encodeURIComponent(club.slug)}`, { auth: false });
}
