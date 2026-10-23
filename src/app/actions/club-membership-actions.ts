"use server";

import { getSession } from "@/lib/auth/session";
import { getClubBySlug, ensurePlayerMembership } from "@/services/club-service";

export async function joinClubAction(clubSlug: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "You must be logged in." };

  const club = await getClubBySlug(clubSlug);
  if (!club) return { success: false as const, error: "Club not found." };

  try {
    await ensurePlayerMembership(club.id, session.id);
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Could not join club." };
  }
  return { success: true as const };
}
