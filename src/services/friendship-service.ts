import { cache } from "react";
import { api } from "@/lib/api/server";
import type { Friendship } from "@/types/friendship";

// The API scopes friendships to the signed-in user, so the userId arguments
// below are kept for callers' convenience but must be the session user.

export { listAllPlayerProfiles } from "@/services/profile-service";

function errorOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** Every friendship (any status, either direction) involving the signed-in user. */
export const listFriendshipsForUser = cache(async (_userId: string): Promise<Friendship[]> => {
  const rows = await api<Friendship[]>("/friendships").catch(() => []);
  return rows.map((r) => ({ ...r, respondedAt: r.respondedAt ?? null }));
});

/** Accepted friends' user ids only (the "other side" of each friendship). */
export const listFriendUserIds = cache(async (_userId: string): Promise<string[]> => {
  return api<string[]>("/friendships/friend-ids").catch(() => []);
});

export async function sendFriendRequest(requesterId: string, recipientId: string): Promise<{ error?: string }> {
  if (requesterId === recipientId) return { error: "You can't send a friend request to yourself." };
  try {
    await api("/friendships", { method: "POST", body: { recipientUserId: recipientId } });
    return {};
  } catch (error) {
    return { error: errorOf(error, "Could not send the friend request.") };
  }
}

export async function respondToFriendRequest(friendshipId: string, _userId: string, accept: boolean): Promise<{ error?: string }> {
  try {
    await api(`/friendships/${encodeURIComponent(friendshipId)}/respond`, { method: "POST", body: { accept } });
    return {};
  } catch (error) {
    return { error: errorOf(error, "Could not respond to the request.") };
  }
}

/** Cancels a pending request or removes an existing friendship. */
export async function removeFriendship(friendshipId: string, _userId: string): Promise<{ error?: string }> {
  try {
    await api(`/friendships/${encodeURIComponent(friendshipId)}`, { method: "DELETE" });
    return {};
  } catch (error) {
    return { error: errorOf(error, "Could not remove the friendship.") };
  }
}

/** How many of the signed-in user's friends are registered for this tournament. */
export async function countFriendsRegistered(tournamentId: string, friendUserIds: string[]): Promise<number> {
  if (friendUserIds.length === 0) return 0;
  const { count } = await api<{ count: number }>(`/friendships/tournaments/${encodeURIComponent(tournamentId)}/count`).catch(
    () => ({ count: 0 })
  );
  return count;
}
