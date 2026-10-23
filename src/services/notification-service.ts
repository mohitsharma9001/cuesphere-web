import { cache } from "react";
import { api } from "@/lib/api/server";
import type { Notification } from "@/types/notification";

// Notifications are created by the API itself (e.g. when a player registers).
// These read the signed-in user's own: `userId` must be the signed-in user.

const path = (clubId: string) => `/clubs/${encodeURIComponent(clubId)}/notifications`;

export async function listForUser(_userId: string, clubId: string): Promise<Notification[]> {
  try {
    return await api<Notification[]>(path(clubId));
  } catch {
    return [];
  }
}

export async function markAllRead(_userId: string, clubId: string): Promise<void> {
  await api(`${path(clubId)}/read-all`, { method: "POST" }).catch(() => {});
}

/** Memoized per-request — the club layout and header both ask. */
export const getUnreadCount = cache(async (_userId: string, clubId: string): Promise<number> => {
  try {
    return (await api<{ count: number }>(`${path(clubId)}/unread-count`)).count;
  } catch {
    return 0;
  }
});
