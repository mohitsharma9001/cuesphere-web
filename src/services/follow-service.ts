import { cache } from "react";
import { api } from "@/lib/api/server";

// Follows are scoped to the signed-in user by the API; userId arguments must be the session user.

/** Player profile ids the signed-in user follows. */
export const listFollowedPlayerIds = cache(async (_userId: string): Promise<string[]> => {
  return api<string[]>("/follows").catch(() => []);
});

export async function isFollowingPlayer(_userId: string, playerId: string): Promise<boolean> {
  const { following } = await api<{ following: boolean }>(`/follows/${encodeURIComponent(playerId)}`).catch(() => ({
    following: false,
  }));
  return following;
}

export async function followPlayer(_userId: string, playerId: string): Promise<{ error?: string }> {
  try {
    await api(`/follows/${encodeURIComponent(playerId)}`, { method: "POST" });
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not follow this player." };
  }
}

export async function unfollowPlayer(_userId: string, playerId: string): Promise<{ error?: string }> {
  try {
    await api(`/follows/${encodeURIComponent(playerId)}`, { method: "DELETE" });
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not unfollow this player." };
  }
}
