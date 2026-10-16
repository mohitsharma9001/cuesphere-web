import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  billFor,
  type BookingStatus,
  type ClubTable,
  type DaySummary,
  type IncomeReport,
  type LineupPlayer,
  type OutstandingCharge,
  type PayerDues,
  payerKey,
  type SplitMode,
  type PaymentMethod,
  type TableBooking,
  type TableCharge,
  type TableSession,
} from "@/types/tables";

interface TableRow {
  id: string;
  club_id: string;
  table_number: number;
  name: string;
  hourly_rate: number;
  active: boolean;
}
interface SessionRow {
  id: string;
  club_id: string;
  table_id: string;
  players: string[] | null;
  lineup: LineupPlayer[] | null;
  player_name: string;
  player_id: string | null;
  booking_id: string | null;
  started_at: string;
  ended_at: string | null;
  hourly_rate: number;
  minutes: number | null;
  amount: number | null;
  paid: boolean;
}
interface ChargeRow {
  id: string;
  session_id: string;
  payer_name: string;
  payer_player_id: string | null;
  split_mode: SplitMode | null;
  amount: number;
  paid: boolean;
  payment_method: PaymentMethod | null;
  paid_at: string | null;
  reminded_at: string | null;
  created_at: string;
}
type SessionWithTable = SessionRow & { club_tables?: { table_number: number } | null };
interface BookingRow {
  id: string;
  club_id: string;
  table_id: string | null;
  player_id: string;
  start_at: string;
  duration_minutes: number;
  status: BookingStatus;
  note: string;
  created_at: string;
  player_profiles?: { full_name: string } | null;
}

const tableFromRow = (r: TableRow): ClubTable => ({
  id: r.id,
  clubId: r.club_id,
  tableNumber: r.table_number,
  name: r.name,
  hourlyRate: r.hourly_rate,
  active: r.active,
});

const sessionFromRow = (r: SessionRow): TableSession => ({
  id: r.id,
  clubId: r.club_id,
  tableId: r.table_id,
  players: r.players ?? [],
  lineup: r.lineup && r.lineup.length > 0 ? r.lineup : (r.players ?? []).map((name) => ({ name, playerId: null })),
  playerName: r.player_name,
  playerId: r.player_id,
  bookingId: r.booking_id,
  startedAt: r.started_at,
  endedAt: r.ended_at,
  hourlyRate: r.hourly_rate,
  minutes: r.minutes,
  amount: r.amount,
  paid: r.paid,
});

const chargeFromRow = (r: ChargeRow): TableCharge => ({
  id: r.id,
  sessionId: r.session_id,
  payerName: r.payer_name,
  payerPlayerId: r.payer_player_id ?? null,
  splitMode: r.split_mode ?? null,
  amount: r.amount,
  paid: r.paid,
  paymentMethod: r.payment_method,
  paidAt: r.paid_at,
  remindedAt: r.reminded_at ?? null,
  createdAt: r.created_at,
});

/** A share plus the game it came from. */
function withGame(charge: TableCharge, row: SessionWithTable): OutstandingCharge {
  const session = sessionFromRow(row);
  const payer = charge.payerName.trim().toLowerCase();
  return {
    ...charge,
    tableId: session.tableId,
    tableNumber: row.club_tables?.table_number ?? null,
    sessionLabel: session.playerName,
    opponents: session.lineup
      .filter((x) => (charge.payerPlayerId ? x.playerId !== charge.payerPlayerId : x.name.trim().toLowerCase() !== payer))
      .map((x) => x.name),
    minutes: session.minutes ?? 0,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  };
}

const CHARGE_WITH_GAME = "*, table_sessions(*, club_tables(table_number))";
type ChargeWithGame = ChargeRow & { table_sessions: SessionWithTable | null };

function chargesWithGame(rows: ChargeWithGame[] | null): OutstandingCharge[] {
  return (rows ?? []).filter((r) => r.table_sessions).map((r) => withGame(chargeFromRow(r), r.table_sessions!));
}

const bookingFromRow = (r: BookingRow): TableBooking => ({
  id: r.id,
  clubId: r.club_id,
  tableId: r.table_id,
  playerId: r.player_id,
  playerName: r.player_profiles?.full_name || "Player",
  startAt: r.start_at,
  durationMinutes: r.duration_minutes,
  status: r.status,
  note: r.note,
  createdAt: r.created_at,
});

const BOOKING_SELECT = "*, player_profiles(full_name)";

// ── Tables ──────────────────────────────────────────────────────────────────

export async function listClubTables(clubId: string, includeInactive = false): Promise<ClubTable[]> {
  const admin = createSupabaseAdminClient();
  let q = admin.from("club_tables").select("*").eq("club_id", clubId).order("table_number");
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q;
  return ((data as TableRow[] | null) ?? []).map(tableFromRow);
}

export async function saveClubTable(
  clubId: string,
  input: { id?: string; tableNumber: number; name: string; hourlyRate: number; active: boolean }
): Promise<{ error?: string }> {
  const admin = createSupabaseAdminClient();
  const row = {
    club_id: clubId,
    table_number: input.tableNumber,
    name: input.name,
    hourly_rate: input.hourlyRate,
    active: input.active,
  };
  const { error } = input.id
    ? await admin.from("club_tables").update(row).eq("id", input.id).eq("club_id", clubId)
    : await admin.from("club_tables").insert(row);
  if (error?.code === "23505") return { error: `Table ${input.tableNumber} already exists.` };
  return { error: error?.message };
}

// ── Sessions (timers and bills) ─────────────────────────────────────────────

export async function listOpenSessions(clubId: string): Promise<TableSession[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("table_sessions").select("*").eq("club_id", clubId).is("ended_at", null);
  return ((data as SessionRow[] | null) ?? []).map(sessionFromRow);
}

/** Stopped sessions whose bill hasn't been shared out yet, and every share still owed. */
export async function listOutstanding(clubId: string): Promise<{ unsplit: TableSession[]; charges: OutstandingCharge[] }> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("table_sessions")
    .select("*, club_tables(table_number), table_session_charges(*)")
    .eq("club_id", clubId)
    .not("ended_at", "is", null)
    .eq("paid", false)
    .order("ended_at", { ascending: false });
  const rows = (data as (SessionWithTable & { table_session_charges: ChargeRow[] | null })[] | null) ?? [];
  const unsplit: TableSession[] = [];
  const charges: OutstandingCharge[] = [];
  for (const row of rows) {
    const session = sessionFromRow(row);
    const shares = (row.table_session_charges ?? []).map(chargeFromRow);
    if (shares.length === 0) unsplit.push(session);
    for (const c of shares) {
      if (!c.paid) charges.push(withGame(c, row));
    }
  }
  return { unsplit, charges };
}

export async function startSession(
  clubId: string,
  table: ClubTable,
  input: { lineup: LineupPlayer[]; playerId?: string | null; bookingId?: string | null; startedBy: string }
): Promise<{ error?: string }> {
  const admin = createSupabaseAdminClient();
  const names = input.lineup.map((x) => x.name);
  const { error } = await admin.from("table_sessions").insert({
    club_id: clubId,
    table_id: table.id,
    players: names,
    lineup: input.lineup,
    player_name: names.join(" v ") || "Walk-in",
    player_id: input.playerId ?? null,
    booking_id: input.bookingId ?? null,
    hourly_rate: table.hourlyRate,
    started_by: input.startedBy,
  });
  if (error?.code === "23505") return { error: `Table ${table.tableNumber} is already in use.` };
  if (error) return { error: error.message };
  if (input.bookingId) {
    await admin.from("table_bookings").update({ status: "started", table_id: table.id }).eq("id", input.bookingId).eq("club_id", clubId);
  }
  return {};
}

/** Stops the timer and works out the bill. */
export async function stopSession(clubId: string, sessionId: string): Promise<{ session?: TableSession; error?: string }> {
  const admin = createSupabaseAdminClient();
  const { data: current } = await admin.from("table_sessions").select("*").eq("id", sessionId).eq("club_id", clubId).maybeSingle();
  if (!current) return { error: "Session not found." };
  const row = current as SessionRow;
  if (row.ended_at) return { session: sessionFromRow(row) };

  const endedAt = new Date();
  const { minutes, amount } = billFor(row.started_at, endedAt, row.hourly_rate);
  const { data, error } = await admin
    .from("table_sessions")
    .update({ ended_at: endedAt.toISOString(), minutes, amount })
    .eq("id", sessionId)
    .is("ended_at", null)
    .select("*")
    .maybeSingle();
  if (error) return { error: error.message };
  return { session: data ? sessionFromRow(data as SessionRow) : undefined };
}

/** Records who pays what for a stopped session. The shares must add up to the bill. */
export async function settleSession(
  clubId: string,
  sessionId: string,
  shares: { payerName: string; payerPlayerId: string | null; amount: number }[],
  mode: SplitMode
): Promise<{ error?: string }> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("table_sessions").select("*").eq("id", sessionId).eq("club_id", clubId).maybeSingle();
  if (!data) return { error: "Session not found." };
  const session = sessionFromRow(data as SessionRow);
  if (!session.endedAt || session.amount === null) return { error: "Stop the timer first." };
  const atTable = new Set(session.lineup.map((x) => x.playerId).filter(Boolean));
  shares = shares.map((x) => ({ ...x, payerPlayerId: x.payerPlayerId && atTable.has(x.payerPlayerId) ? x.payerPlayerId : null }));
  const total = shares.reduce((t, x) => t + x.amount, 0);
  if (total !== session.amount) return { error: `Shares add up to ₹${total}, but the bill is ₹${session.amount}.` };

  // Re-splitting replaces shares nobody has paid yet.
  const { data: existing } = await admin.from("table_session_charges").select("paid").eq("session_id", sessionId);
  if (((existing as { paid: boolean }[] | null) ?? []).some((x) => x.paid)) {
    return { error: "Part of this bill is already paid, so it can't be split again." };
  }
  await admin.from("table_session_charges").delete().eq("session_id", sessionId);
  const rows = shares
    .filter((x) => x.amount > 0)
    .map((x) => ({
      club_id: clubId,
      session_id: sessionId,
      payer_name: x.payerName,
      payer_player_id: x.payerPlayerId,
      split_mode: mode,
      amount: x.amount,
    }));
  if (rows.length > 0) {
    const { error } = await admin.from("table_session_charges").insert(rows);
    if (error) return { error: error.message };
  } else {
    await admin.from("table_sessions").update({ paid: true }).eq("id", sessionId);
  }
  return {};
}

/** One person paid their share. When every share is in, the session is settled. */
export async function markChargePaid(clubId: string, chargeId: string, method: PaymentMethod): Promise<{ error?: string }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("table_session_charges")
    .update({ paid: true, payment_method: method, paid_at: new Date().toISOString() })
    .eq("id", chargeId)
    .eq("club_id", clubId)
    .select("session_id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Charge not found." };
  const sessionId = (data as { session_id: string }).session_id;
  const { count } = await admin
    .from("table_session_charges")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("paid", false);
  if ((count ?? 0) === 0) await admin.from("table_sessions").update({ paid: true }).eq("id", sessionId);
  return {};
}

/** Start and end of "today" in India, as ISO timestamps. */
export function istDayBounds(date = new Date()): { start: string; end: string } {
  const ist = new Date(date.getTime() + 5.5 * 3_600_000);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();
  const start = new Date(Date.UTC(y, m, d) - 5.5 * 3_600_000);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86_400_000).toISOString() };
}

/** The owner's day at a glance: money in today (IST), money owed, tables playing/free, bookings still to come. */
export async function getDaySummary(clubId: string): Promise<DaySummary> {
  const { start, end } = istDayBounds();
  const admin = createSupabaseAdminClient();
  const [paidToday, endedToday, outstanding, tables, open, bookings] = await Promise.all([
    admin
      .from("table_session_charges")
      .select("amount, payment_method")
      .eq("club_id", clubId)
      .eq("paid", true)
      .gte("paid_at", start)
      .lt("paid_at", end),
    admin.from("table_sessions").select("minutes").eq("club_id", clubId).gte("ended_at", start).lt("ended_at", end),
    listOutstanding(clubId),
    listClubTables(clubId),
    listOpenSessions(clubId),
    admin
      .from("table_bookings")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "confirmed")
      .gte("start_at", new Date().toISOString())
      .lt("start_at", end),
  ]);
  const summary: DaySummary = {
    collected: 0,
    byMethod: { cash: 0, upi: 0, card: 0 },
    unpaid:
      outstanding.charges.reduce((t, c) => t + c.amount, 0) +
      outstanding.unsplit.reduce((t, x) => t + (x.amount ?? 0), 0),
    sessions: 0,
    minutes: 0,
    playing: open.length,
    free: Math.max(0, tables.length - open.length),
    bookedToday: bookings.count ?? 0,
  };
  for (const r of (paidToday.data as { amount: number; payment_method: PaymentMethod | null }[] | null) ?? []) {
    summary.collected += r.amount;
    if (r.payment_method) summary.byMethod[r.payment_method] += r.amount;
  }
  const ended = (endedToday.data as { minutes: number | null }[] | null) ?? [];
  summary.sessions = ended.length;
  summary.minutes = ended.reduce((t, x) => t + (x.minutes ?? 0), 0);
  return summary;
}

// ── Dues ────────────────────────────────────────────────────────────────────

/** Everyone who owes this club, biggest first, with the games behind each amount. */
export async function listDuesByPayer(clubId: string): Promise<PayerDues[]> {
  const { charges } = await listOutstanding(clubId);
  const groups = new Map<string, PayerDues>();
  for (const c of charges) {
    const key = payerKey(c);
    const g = groups.get(key) ?? {
      key,
      name: c.payerName,
      playerId: c.payerPlayerId,
      mobile: null,
      total: 0,
      charges: [],
      lastRemindedAt: null,
    };
    g.total += c.amount;
    g.charges.push(c);
    if (c.remindedAt && (!g.lastRemindedAt || c.remindedAt > g.lastRemindedAt)) g.lastRemindedAt = c.remindedAt;
    groups.set(key, g);
  }
  const list = [...groups.values()];
  const ids = list.map((g) => g.playerId).filter((x): x is string => !!x);
  if (ids.length > 0) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.from("player_profiles").select("id, mobile, full_name").in("id", ids);
    for (const row of (data as { id: string; mobile: string | null; full_name: string }[] | null) ?? []) {
      const g = list.find((x) => x.playerId === row.id);
      if (g) {
        g.mobile = row.mobile || null;
        if (row.full_name) g.name = row.full_name;
      }
    }
  }
  for (const g of list) g.charges.sort((a, b) => (a.endedAt ?? "").localeCompare(b.endedAt ?? ""));
  return list.sort((a, b) => b.total - a.total);
}

/** Collect several shares at once (e.g. "Ashu pays all ₹540 by UPI"). */
export async function collectCharges(clubId: string, chargeIds: string[], method: PaymentMethod): Promise<{ error?: string }> {
  for (const id of chargeIds) {
    const { error } = await markChargePaid(clubId, id, method);
    if (error) return { error };
  }
  return {};
}

export async function markChargesReminded(clubId: string, chargeIds: string[]): Promise<void> {
  if (chargeIds.length === 0) return;
  const admin = createSupabaseAdminClient();
  await admin.from("table_session_charges").update({ reminded_at: new Date().toISOString() }).eq("club_id", clubId).in("id", chargeIds);
}

/** A player's own dues at a club, plus what they paid in the last 90 days. Only ever their own. */
export async function getPlayerDues(clubId: string, playerId: string): Promise<{ due: OutstandingCharge[]; paid: OutstandingCharge[] }> {
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [due, paid] = await Promise.all([
    admin
      .from("table_session_charges")
      .select(CHARGE_WITH_GAME)
      .eq("club_id", clubId)
      .eq("payer_player_id", playerId)
      .eq("paid", false)
      .order("created_at"),
    admin
      .from("table_session_charges")
      .select(CHARGE_WITH_GAME)
      .eq("club_id", clubId)
      .eq("payer_player_id", playerId)
      .eq("paid", true)
      .gte("paid_at", since)
      .order("paid_at", { ascending: false })
      .limit(50),
  ]);
  return { due: chargesWithGame(due.data as ChargeWithGame[] | null), paid: chargesWithGame(paid.data as ChargeWithGame[] | null) };
}

/** Total a player owes at a club (for the "You owe ₹540" banner). */
export async function getPlayerDueTotal(clubId: string, playerId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("table_session_charges")
    .select("amount")
    .eq("club_id", clubId)
    .eq("payer_player_id", playerId)
    .eq("paid", false);
  return ((data as { amount: number }[] | null) ?? []).reduce((t, x) => t + x.amount, 0);
}

// ── Income reports ──────────────────────────────────────────────────────────

/** Everything collected between two moments: totals by method, per IST day, and each payment. */
export async function getIncomeReport(clubId: string, from: string, to: string): Promise<IncomeReport> {
  const admin = createSupabaseAdminClient();
  const [paid, sessions] = await Promise.all([
    admin
      .from("table_session_charges")
      .select(CHARGE_WITH_GAME)
      .eq("club_id", clubId)
      .eq("paid", true)
      .gte("paid_at", from)
      .lt("paid_at", to)
      .order("paid_at", { ascending: false })
      .limit(1000),
    admin.from("table_sessions").select("minutes").eq("club_id", clubId).gte("ended_at", from).lt("ended_at", to),
  ]);
  const payments = chargesWithGame(paid.data as ChargeWithGame[] | null);
  const report: IncomeReport = {
    from,
    to,
    collected: 0,
    byMethod: { cash: 0, upi: 0, card: 0 },
    days: [],
    payments,
    sessions: 0,
    minutes: 0,
  };
  const perDay = new Map<string, number>();
  for (let t = new Date(from).getTime(); t < new Date(to).getTime(); t += 86_400_000) {
    perDay.set(new Date(t + 5.5 * 3_600_000).toISOString().slice(0, 10), 0);
  }
  for (const pmt of payments) {
    report.collected += pmt.amount;
    if (pmt.paymentMethod) report.byMethod[pmt.paymentMethod] += pmt.amount;
    const day = new Date(new Date(pmt.paidAt!).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + pmt.amount);
  }
  report.days = [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount }));
  const ended = (sessions.data as { minutes: number | null }[] | null) ?? [];
  report.sessions = ended.length;
  report.minutes = ended.reduce((t, x) => t + (x.minutes ?? 0), 0);
  return report;
}

// ── Bookings ────────────────────────────────────────────────────────────────

/** Requests and confirmed bookings from now on (staff view). */
export async function listUpcomingBookings(clubId: string): Promise<TableBooking[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("table_bookings")
    .select(BOOKING_SELECT)
    .eq("club_id", clubId)
    .in("status", ["requested", "confirmed"])
    .gte("start_at", new Date(Date.now() - 2 * 3_600_000).toISOString())
    .order("start_at");
  return ((data as BookingRow[] | null) ?? []).map(bookingFromRow);
}

export async function listPlayerBookings(clubId: string, playerId: string): Promise<TableBooking[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("table_bookings")
    .select(BOOKING_SELECT)
    .eq("club_id", clubId)
    .eq("player_id", playerId)
    .gte("start_at", new Date(Date.now() - 24 * 3_600_000).toISOString())
    .order("start_at");
  return ((data as BookingRow[] | null) ?? []).map(bookingFromRow);
}

export async function getBooking(clubId: string, id: string): Promise<TableBooking | undefined> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("table_bookings").select(BOOKING_SELECT).eq("id", id).eq("club_id", clubId).maybeSingle();
  return data ? bookingFromRow(data as BookingRow) : undefined;
}

export async function createBookingRequest(input: {
  clubId: string;
  tableId: string | null;
  playerId: string;
  requestedBy: string;
  startAt: string;
  durationMinutes: number;
  note: string;
}): Promise<{ booking?: TableBooking; error?: string }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("table_bookings")
    .insert({
      club_id: input.clubId,
      table_id: input.tableId,
      player_id: input.playerId,
      requested_by: input.requestedBy,
      start_at: input.startAt,
      duration_minutes: input.durationMinutes,
      note: input.note,
    })
    .select(BOOKING_SELECT)
    .single();
  if (error || !data) return { error: error?.message ?? "Could not send the request." };
  return { booking: bookingFromRow(data as BookingRow) };
}

export async function setBookingStatus(
  clubId: string,
  id: string,
  status: BookingStatus,
  tableId?: string | null
): Promise<{ error?: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("table_bookings")
    .update({ status, ...(tableId !== undefined ? { table_id: tableId } : {}) })
    .eq("id", id)
    .eq("club_id", clubId);
  return { error: error?.message };
}

/** Confirmed bookings on this table that overlap the given time. */
export async function findBookingClash(
  clubId: string,
  tableId: string,
  startAt: string,
  durationMinutes: number,
  excludeId?: string
): Promise<TableBooking | undefined> {
  const start = new Date(startAt).getTime();
  const end = start + durationMinutes * 60_000;
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("table_bookings")
    .select(BOOKING_SELECT)
    .eq("club_id", clubId)
    .eq("table_id", tableId)
    .eq("status", "confirmed")
    .gte("start_at", new Date(start - 8 * 3_600_000).toISOString())
    .lt("start_at", new Date(end).toISOString());
  return ((data as BookingRow[] | null) ?? [])
    .map(bookingFromRow)
    .find((b) => b.id !== excludeId && new Date(b.startAt).getTime() + b.durationMinutes * 60_000 > start);
}

// ── Public table status ─────────────────────────────────────────────────────

export interface PublicTableStatus {
  tableNumber: number;
  name: string;
  hourlyRate: number;
  state: "free" | "busy";
  /** When busy: when the timer started. */
  busySince: string | null;
  /** Next confirmed booking in the coming 3 hours. */
  reservedAt: string | null;
}

/** Free / in use / reserved-soon for every active table — what players see on the club page. */
export async function getPublicTableStatus(clubId: string): Promise<PublicTableStatus[]> {
  const admin = createSupabaseAdminClient();
  const now = Date.now();
  const [tables, open, bookings] = await Promise.all([
    listClubTables(clubId),
    listOpenSessions(clubId),
    admin
      .from("table_bookings")
      .select("table_id, start_at")
      .eq("club_id", clubId)
      .eq("status", "confirmed")
      .gte("start_at", new Date(now - 30 * 60_000).toISOString())
      .lt("start_at", new Date(now + 3 * 3_600_000).toISOString())
      .order("start_at"),
  ]);
  const upcoming = (bookings.data as { table_id: string | null; start_at: string }[] | null) ?? [];
  return tables.map((t) => {
    const session = open.find((s) => s.tableId === t.id);
    return {
      tableNumber: t.tableNumber,
      name: t.name,
      hourlyRate: t.hourlyRate,
      state: session ? "busy" : "free",
      busySince: session?.startedAt ?? null,
      reservedAt: upcoming.find((b) => b.table_id === t.id)?.start_at ?? null,
    };
  });
}
