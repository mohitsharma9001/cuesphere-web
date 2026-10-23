"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { followPlayer, unfollowPlayer } from "@/services/follow-service";

export async function followPlayerAction(playerId: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Log in to follow players." };

  // The API checks the player exists and isn't you.
  const { error } = await followPlayer(session.id, playerId);
  if (error) return { success: false as const, error };
  revalidatePath("/friends");
  return { success: true as const };
}

export async function unfollowPlayerAction(playerId: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "You must be logged in." };

  const { error } = await unfollowPlayer(session.id, playerId);
  if (error) return { success: false as const, error };
  revalidatePath("/friends");
  return { success: true as const };
}
