"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/server";
import { getSession } from "@/lib/auth/session";
import { clubPath } from "@/lib/club-path";
import type { PlayerSearchResult } from "@/services/friendly-service";
import type { LineupPlayer, PaymentMethod, SplitMode, TableSession } from "@/types/tables";

// The API checks permissions (front-desk staff and admins; scorekeeper-only
// accounts can't touch tables or money), validates input and sends the pushes.

type Fail = { success: false; error: string };

const club = (clubSlug: string) => `/clubs/${encodeURIComponent(clubSlug)}`;

function fail(error: unknown, fallback = "Something went wrong."): Fail {
  return { success: false, error: error instanceof Error ? error.message : fallback };
}

async function signedIn(message = "You must be logged in.") {
  return (await getSession()) ? null : ({ success: false, error: message } as Fail);
}

function refresh(clubSlug: string) {
  revalidatePath(clubPath(clubSlug, "/admin/tables"));
}

// ── Staff: table setup ──────────────────────────────────────────────────────

export async function saveTableAction(
  clubSlug: string,
  input: { id?: string; tableNumber: number; name: string; hourlyRate: number; active: boolean }
): Promise<{ success: true } | Fail> {
  const denied = await signedIn();
  if (denied) return denied;
  const { id, ...body } = input;
  try {
    if (id) await api(`${club(clubSlug)}/tables/${encodeURIComponent(id)}`, { method: "PUT", body });
    else await api(`${club(clubSlug)}/tables`, { method: "POST", body });
  } catch (error) {
    return fail(error);
  }
  refresh(clubSlug);
  return { success: true };
}

// ── Staff: timers and bills ─────────────────────────────────────────────────

export async function startTableAction(
  clubSlug: string,
  tableId: string,
  input: { lineup: LineupPlayer[]; playerId?: string | null; bookingId?: string | null }
): Promise<{ success: true } | Fail> {
  const denied = await signedIn();
  if (denied) return denied;
  try {
    await api(`${club(clubSlug)}/tables/${encodeURIComponent(tableId)}/start`, { method: "POST", body: input });
  } catch (error) {
    return fail(error);
  }
  refresh(clubSlug);
  return { success: true };
}

export async function stopTableAction(clubSlug: string, sessionId: string): Promise<{ success: true; session: TableSession } | Fail> {
  const denied = await signedIn();
  if (denied) return denied;
  try {
    const session = await api<TableSession>(`${club(clubSlug)}/table-sessions/${encodeURIComponent(sessionId)}/stop`, {
      method: "POST",
    });
    refresh(clubSlug);
    return { success: true, session };
  } catch (error) {
    return fail(error, "Could not stop the timer.");
  }
}

/** Who pays what: loser pays, split equally, or custom shares — they must add up to the bill. */
export async function settleBillAction(
  clubSlug: string,
  sessionId: string,
  shares: { payerName: string; payerPlayerId: string | null; amount: number }[],
  mode: SplitMode
): Promise<{ success: true } | Fail> {
  const denied = await signedIn();
  if (denied) return denied;
  try {
    await api(`${club(clubSlug)}/table-sessions/${encodeURIComponent(sessionId)}/settle`, {
      method: "POST",
      body: { mode, shares },
    });
  } catch (error) {
    return fail(error);
  }
  refresh(clubSlug);
  return { success: true };
}

export async function markChargePaidAction(clubSlug: string, chargeId: string, method: PaymentMethod): Promise<{ success: true } | Fail> {
  const denied = await signedIn();
  if (denied) return denied;
  try {
    await api(`${club(clubSlug)}/table-charges/${encodeURIComponent(chargeId)}/pay`, { method: "POST", body: { method } });
  } catch (error) {
    return fail(error);
  }
  refresh(clubSlug);
  return { success: true };
}

// ── Staff: players and dues ─────────────────────────────────────────────────

/** Registered players matching a name, member ID or mobile — to link a game to their account. */
export async function searchTablePlayersAction(clubSlug: string, query: string): Promise<PlayerSearchResult[]> {
  if (query.trim().length < 2) return [];
  return api<PlayerSearchResult[]>(`${club(clubSlug)}/table-players/search`, { query: { q: query } }).catch(() => []);
}

/** Collect some or all of a person's dues in one go. */
export async function collectDuesAction(
  clubSlug: string,
  chargeIds: string[],
  method: PaymentMethod
): Promise<{ success: true } | Fail> {
  const denied = await signedIn();
  if (denied) return denied;
  try {
    await api(`${club(clubSlug)}/dues/collect`, { method: "POST", body: { chargeIds, method } });
  } catch (error) {
    return fail(error);
  }
  refresh(clubSlug);
  revalidatePath(clubPath(clubSlug, "/admin/tables/dues"));
  return { success: true };
}

/** Sends a "please clear your dues" push to a player with an account (the API also marks the shares reminded). */
export async function sendDueReminderAction(clubSlug: string, payerKeyValue: string): Promise<{ success: true } | Fail> {
  const denied = await signedIn();
  if (denied) return denied;
  try {
    await api(`${club(clubSlug)}/dues/remind`, { method: "POST", body: { payerKey: payerKeyValue } });
  } catch (error) {
    return fail(error);
  }
  revalidatePath(clubPath(clubSlug, "/admin/tables/dues"));
  return { success: true };
}

// ── Staff: booking requests ─────────────────────────────────────────────────

/** Confirms (checking for clashes) or declines a booking; the API tells the player. */
export async function respondToBookingAction(
  clubSlug: string,
  bookingId: string,
  accept: boolean,
  tableId?: string | null
): Promise<{ success: true } | Fail> {
  const denied = await signedIn();
  if (denied) return denied;
  try {
    await api(`${club(clubSlug)}/bookings/${encodeURIComponent(bookingId)}/respond`, {
      method: "POST",
      body: { accept, tableId: tableId ?? null },
    });
  } catch (error) {
    return fail(error);
  }
  refresh(clubSlug);
  return { success: true };
}

export async function markNoShowAction(clubSlug: string, bookingId: string): Promise<{ success: true } | Fail> {
  const denied = await signedIn();
  if (denied) return denied;
  try {
    await api(`${club(clubSlug)}/bookings/${encodeURIComponent(bookingId)}/no-show`, { method: "POST" });
  } catch (error) {
    return fail(error);
  }
  refresh(clubSlug);
  return { success: true };
}

// ── Players: booking ────────────────────────────────────────────────────────

/** Date and time are picked in India time; the API validates them and notifies front-desk staff. */
export async function requestBookingAction(
  clubSlug: string,
  input: { date: string; time: string; durationMinutes: number; tableNumber: number | null; note: string }
): Promise<{ success: true } | Fail> {
  const denied = await signedIn("Log in to book a table.");
  if (denied) return denied;
  try {
    await api(`${club(clubSlug)}/bookings`, { method: "POST", body: input });
  } catch (error) {
    return fail(error, "Could not send the request.");
  }
  revalidatePath(clubPath(clubSlug, "/book"));
  return { success: true };
}

export async function cancelMyBookingAction(clubSlug: string, bookingId: string): Promise<{ success: true } | Fail> {
  const denied = await signedIn("Log in first.");
  if (denied) return denied;
  try {
    await api(`${club(clubSlug)}/bookings/${encodeURIComponent(bookingId)}/cancel`, { method: "POST" });
  } catch (error) {
    return fail(error);
  }
  revalidatePath(clubPath(clubSlug, "/book"));
  return { success: true };
}
