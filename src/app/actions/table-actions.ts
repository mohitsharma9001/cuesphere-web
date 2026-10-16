"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { clubPath } from "@/lib/club-path";
import { getClubBySlug, getMembership, listMembershipsForClub } from "@/services/club-service";
import { getProfileById, getProfileByUserId } from "@/services/profile-service";
import { sendPushToUsers } from "@/services/push-notification-service";
import { searchPlayers } from "@/services/friendly-service";
import {
  collectCharges,
  createBookingRequest,
  listDuesByPayer,
  markChargesReminded,
  findBookingClash,
  getBooking,
  listClubTables,
  markChargePaid,
  saveClubTable,
  setBookingStatus,
  settleSession,
  startSession,
  stopSession,
} from "@/services/table-service";
import { isScorekeeperOnly, isStaffRole } from "@/types/club";
import { formatRupees, type LineupPlayer, type PaymentMethod, type SplitMode, type TableSession } from "@/types/tables";

type Fail = { success: false; error: string };

/** Front-desk staff and admins; scorekeeper-only accounts can't touch tables or money. */
async function requireTableStaff(clubSlug: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "You must be logged in." };
  const club = await getClubBySlug(clubSlug);
  if (!club) return { ok: false as const, error: "Club not found." };
  const membership = await getMembership(club.id, session.id);
  if (!isStaffRole(membership?.role) || isScorekeeperOnly(membership?.role)) {
    return { ok: false as const, error: "You don't have permission to manage tables." };
  }
  return { ok: true as const, club, userId: session.id };
}

function refresh(clubSlug: string) {
  revalidatePath(clubPath(clubSlug, "/admin/tables"));
}

/** "Fri 17 Oct, 7:30 pm" in India time. */
function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

// ── Staff: table setup ──────────────────────────────────────────────────────

export async function saveTableAction(
  clubSlug: string,
  input: { id?: string; tableNumber: number; name: string; hourlyRate: number; active: boolean }
): Promise<{ success: true } | Fail> {
  const check = await requireTableStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  if (!Number.isInteger(input.tableNumber) || input.tableNumber < 1 || input.tableNumber > 99) {
    return { success: false, error: "Table number must be 1–99." };
  }
  if (!Number.isFinite(input.hourlyRate) || input.hourlyRate < 0 || input.hourlyRate > 100_000) {
    return { success: false, error: "Enter a valid hourly rate." };
  }
  const { error } = await saveClubTable(check.club.id, {
    ...input,
    name: input.name.trim().slice(0, 40),
    hourlyRate: Math.round(input.hourlyRate),
  });
  if (error) return { success: false, error };
  refresh(clubSlug);
  return { success: true };
}

// ── Staff: timers and bills ─────────────────────────────────────────────────

export async function startTableAction(
  clubSlug: string,
  tableId: string,
  input: { lineup: LineupPlayer[]; playerId?: string | null; bookingId?: string | null }
): Promise<{ success: true } | Fail> {
  const check = await requireTableStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  const table = (await listClubTables(check.club.id)).find((t) => t.id === tableId);
  if (!table) return { success: false, error: "Table not found." };
  // Keep only real accounts for linked players; anyone else is a walk-in name.
  const lineup: LineupPlayer[] = [];
  for (const x of input.lineup.slice(0, 8)) {
    const name = x.name.trim().slice(0, 40);
    if (!name) continue;
    const linked = x.playerId ? await getProfileById(x.playerId) : undefined;
    lineup.push({ name: linked?.fullName || name, playerId: linked ? linked.id : null });
  }
  const { error } = await startSession(check.club.id, table, {
    lineup,
    playerId: input.playerId ?? null,
    bookingId: input.bookingId ?? null,
    startedBy: check.userId,
  });
  if (error) return { success: false, error };
  refresh(clubSlug);
  return { success: true };
}

export async function stopTableAction(clubSlug: string, sessionId: string): Promise<{ success: true; session: TableSession } | Fail> {
  const check = await requireTableStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  const { session, error } = await stopSession(check.club.id, sessionId);
  if (error || !session) return { success: false, error: error ?? "Could not stop the timer." };
  refresh(clubSlug);
  return { success: true, session };
}

/** Who pays what: loser pays, split equally, or custom shares — they must add up to the bill. */
export async function settleBillAction(
  clubSlug: string,
  sessionId: string,
  shares: { payerName: string; payerPlayerId: string | null; amount: number }[],
  mode: SplitMode
): Promise<{ success: true } | Fail> {
  const check = await requireTableStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  if (!["loser", "split", "custom"].includes(mode)) return { success: false, error: "Choose who pays." };
  const clean = shares
    .map((x) => ({
      payerName: x.payerName.trim().slice(0, 40) || "Player",
      payerPlayerId: x.payerPlayerId || null,
      amount: Math.round(x.amount),
    }))
    .filter((x) => Number.isFinite(x.amount) && x.amount >= 0);
  if (clean.length === 0 || clean.length > 8) return { success: false, error: "Add who is paying." };
  const { error } = await settleSession(check.club.id, sessionId, clean, mode);
  if (error) return { success: false, error };
  refresh(clubSlug);
  return { success: true };
}

export async function markChargePaidAction(clubSlug: string, chargeId: string, method: PaymentMethod): Promise<{ success: true } | Fail> {
  const check = await requireTableStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  if (!["cash", "upi", "card"].includes(method)) return { success: false, error: "Choose Cash, UPI or Card." };
  const { error } = await markChargePaid(check.club.id, chargeId, method);
  if (error) return { success: false, error };
  refresh(clubSlug);
  return { success: true };
}

// ── Staff: players and dues ─────────────────────────────────────────────────

/** Registered players matching a name, member ID or mobile — to link a game to their account. */
export async function searchTablePlayersAction(clubSlug: string, query: string) {
  const check = await requireTableStaff(clubSlug);
  if (!check.ok) return [];
  return searchPlayers(query, "00000000-0000-0000-0000-000000000000");
}

/** Collect some or all of a person's dues in one go. */
export async function collectDuesAction(
  clubSlug: string,
  chargeIds: string[],
  method: PaymentMethod
): Promise<{ success: true } | Fail> {
  const check = await requireTableStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  if (!["cash", "upi", "card"].includes(method)) return { success: false, error: "Choose Cash, UPI or Card." };
  if (chargeIds.length === 0 || chargeIds.length > 200) return { success: false, error: "Nothing selected." };
  const { error } = await collectCharges(check.club.id, chargeIds, method);
  if (error) return { success: false, error };
  refresh(clubSlug);
  revalidatePath(clubPath(clubSlug, "/admin/tables/dues"));
  return { success: true };
}

/** Sends a "please clear your dues" notification to a player with an account. */
export async function sendDueReminderAction(clubSlug: string, payerKeyValue: string): Promise<{ success: true } | Fail> {
  const check = await requireTableStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  const dues = (await listDuesByPayer(check.club.id)).find((d) => d.key === payerKeyValue);
  if (!dues) return { success: false, error: "No dues for this player." };
  if (!dues.playerId) return { success: false, error: "This player isn't on CueSphere — use WhatsApp instead." };
  const profile = await getProfileById(dues.playerId);
  if (!profile?.userId) return { success: false, error: "Player not found." };
  await sendPushToUsers([profile.userId], {
    title: `${formatRupees(dues.total)} due at ${check.club.name}`,
    body: `For ${dues.charges.length} game${dues.charges.length === 1 ? "" : "s"}. Tap to see the details.`,
    url: clubPath(check.club.slug, "/account/dues"),
  });
  await markChargesReminded(check.club.id, dues.charges.map((c) => c.id));
  revalidatePath(clubPath(clubSlug, "/admin/tables/dues"));
  return { success: true };
}

// ── Staff: booking requests ─────────────────────────────────────────────────

export async function respondToBookingAction(
  clubSlug: string,
  bookingId: string,
  accept: boolean,
  tableId?: string | null
): Promise<{ success: true } | Fail> {
  const check = await requireTableStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  const booking = await getBooking(check.club.id, bookingId);
  if (!booking) return { success: false, error: "Booking not found." };
  if (booking.status !== "requested" && booking.status !== "confirmed") {
    return { success: false, error: "This booking was already handled." };
  }

  if (accept) {
    const chosen = tableId ?? booking.tableId;
    if (!chosen) return { success: false, error: "Pick a table for this booking." };
    const clash = await findBookingClash(check.club.id, chosen, booking.startAt, booking.durationMinutes, booking.id);
    if (clash) return { success: false, error: `That table is already booked by ${clash.playerName} at ${when(clash.startAt)}.` };
    const { error } = await setBookingStatus(check.club.id, booking.id, "confirmed", chosen);
    if (error) return { success: false, error };
  } else {
    const { error } = await setBookingStatus(check.club.id, booking.id, booking.status === "confirmed" ? "cancelled" : "rejected");
    if (error) return { success: false, error };
  }

  const club = check.club;
  after(async () => {
    const player = await getProfileById(booking.playerId);
    if (!player?.userId) return;
    const tables = await listClubTables(club.id);
    const table = tables.find((t) => t.id === (tableId ?? booking.tableId));
    await sendPushToUsers([player.userId], {
      title: accept ? "Table booked" : "Booking not available",
      body: accept
        ? `${club.name}: Table ${table?.tableNumber ?? ""} on ${when(booking.startAt)} is confirmed.`
        : `${club.name} couldn't confirm your table for ${when(booking.startAt)}. Try another time.`,
      url: clubPath(club.slug, "/book"),
    }).catch(() => {});
  });
  refresh(clubSlug);
  return { success: true };
}

export async function markNoShowAction(clubSlug: string, bookingId: string): Promise<{ success: true } | Fail> {
  const check = await requireTableStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  const { error } = await setBookingStatus(check.club.id, bookingId, "no_show");
  if (error) return { success: false, error };
  refresh(clubSlug);
  return { success: true };
}

// ── Players: booking ────────────────────────────────────────────────────────

const DURATIONS = [30, 60, 90, 120, 180];

export async function requestBookingAction(
  clubSlug: string,
  input: { date: string; time: string; durationMinutes: number; tableNumber: number | null; note: string }
): Promise<{ success: true } | Fail> {
  const session = await getSession();
  if (!session) return { success: false, error: "Log in to book a table." };
  const profile = await getProfileByUserId(session.id);
  if (!profile?.fullName) return { success: false, error: "Add your name to your profile first." };
  const club = await getClubBySlug(clubSlug);
  if (!club || club.status !== "approved") return { success: false, error: "Club not found." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) {
    return { success: false, error: "Choose a date and time." };
  }
  if (!DURATIONS.includes(input.durationMinutes)) return { success: false, error: "Choose how long you'll play." };
  // The date and time are picked in India time.
  const start = new Date(`${input.date}T${input.time}:00+05:30`);
  if (Number.isNaN(start.getTime())) return { success: false, error: "Choose a valid date and time." };
  if (start.getTime() < Date.now() - 5 * 60_000) return { success: false, error: "That time has already passed." };
  if (start.getTime() > Date.now() + 30 * 86_400_000) return { success: false, error: "You can book up to 30 days ahead." };

  let tableId: string | null = null;
  if (input.tableNumber !== null) {
    const table = (await listClubTables(club.id)).find((t) => t.tableNumber === input.tableNumber);
    if (!table) return { success: false, error: "That table isn't available." };
    tableId = table.id;
  }

  const { booking, error } = await createBookingRequest({
    clubId: club.id,
    tableId,
    playerId: profile.id,
    requestedBy: session.id,
    startAt: start.toISOString(),
    durationMinutes: input.durationMinutes,
    note: input.note.trim().slice(0, 200),
  });
  if (error || !booking) return { success: false, error: error ?? "Could not send the request." };

  after(async () => {
    const staff = (await listMembershipsForClub(club.id))
      .filter((m) => isStaffRole(m.role) && !isScorekeeperOnly(m.role))
      .map((m) => m.userId);
    await sendPushToUsers(staff, {
      title: "New table booking request",
      body: `${profile.fullName} · ${when(booking.startAt)} · ${input.durationMinutes} min${input.tableNumber ? ` · Table ${input.tableNumber}` : ""}`,
      url: clubPath(club.slug, "/admin/tables"),
    }).catch(() => {});
  });
  revalidatePath(clubPath(clubSlug, "/book"));
  return { success: true };
}

export async function cancelMyBookingAction(clubSlug: string, bookingId: string): Promise<{ success: true } | Fail> {
  const session = await getSession();
  if (!session) return { success: false, error: "Log in first." };
  const profile = await getProfileByUserId(session.id);
  const club = await getClubBySlug(clubSlug);
  if (!club || !profile) return { success: false, error: "Not found." };
  const booking = await getBooking(club.id, bookingId);
  if (!booking || booking.playerId !== profile.id) return { success: false, error: "Booking not found." };
  if (booking.status !== "requested" && booking.status !== "confirmed") {
    return { success: false, error: "This booking can't be cancelled." };
  }
  const { error } = await setBookingStatus(club.id, bookingId, "cancelled");
  if (error) return { success: false, error };
  revalidatePath(clubPath(clubSlug, "/book"));
  return { success: true };
}
