import { api } from "@/lib/api/server";
import type {
  ClubTable,
  DaySummary,
  IncomeReport,
  OutstandingCharge,
  PayerDues,
  TableBooking,
  TableSession,
} from "@/types/tables";

// Billing, splitting, dues and bookings are worked out by the API; these are
// the reads pages need. Mutations live in src/app/actions/table-actions.ts.

const club = (clubId: string) => `/clubs/${encodeURIComponent(clubId)}`;

// ── Tables ──────────────────────────────────────────────────────────────────

const toClubTable = (t: ClubTable): ClubTable => ({
  id: t.id,
  clubId: t.clubId,
  tableNumber: t.tableNumber,
  name: t.name,
  hourlyRate: t.hourlyRate,
  active: t.active,
});

/** Active tables are public; `includeInactive` needs a club manager. */
export async function listClubTables(clubId: string, includeInactive = false): Promise<ClubTable[]> {
  const rows = await api<ClubTable[]>(`${club(clubId)}/tables`, { query: { includeInactive: includeInactive || undefined } });
  return rows.map(toClubTable);
}

/** The front desk in one request: active tables, open sessions, outstanding bills,
 * upcoming bookings and today's summary (staff). */
export async function getTablesOverview(clubId: string): Promise<{
  tables: ClubTable[];
  open: TableSession[];
  outstanding: { unsplit: TableSession[]; charges: OutstandingCharge[] };
  bookings: TableBooking[];
  summary: DaySummary;
}> {
  const data = await api<{
    tables: ClubTable[];
    open: TableSession[];
    outstanding: { unsplit: TableSession[]; charges: OutstandingCharge[] };
    bookings: TableBooking[];
    summary: DaySummary;
  }>(`${club(clubId)}/table-overview`);
  return { ...data, tables: data.tables.map(toClubTable) };
}

// ── Sessions (staff) ────────────────────────────────────────────────────────

export async function listOpenSessions(clubId: string): Promise<TableSession[]> {
  return api<TableSession[]>(`${club(clubId)}/table-sessions/open`);
}

/** Stopped sessions whose bill hasn't been shared out yet, and every share still owed. */
export async function listOutstanding(clubId: string): Promise<{ unsplit: TableSession[]; charges: OutstandingCharge[] }> {
  return api(`${club(clubId)}/table-sessions/outstanding`);
}

/** Start and end of "today" in India, as ISO timestamps. */
export function istDayBounds(date = new Date()): { start: string; end: string } {
  const ist = new Date(date.getTime() + 5.5 * 3_600_000);
  const start = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 5.5 * 3_600_000);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86_400_000).toISOString() };
}

/** The owner's day at a glance: money in today (IST), money owed, tables playing/free, bookings still to come. */
export async function getDaySummary(clubId: string): Promise<DaySummary> {
  return api<DaySummary>(`${club(clubId)}/table-summary`);
}

// ── Dues ────────────────────────────────────────────────────────────────────

/** Everyone who owes this club, biggest first, with the games behind each amount. */
export async function listDuesByPayer(clubId: string): Promise<PayerDues[]> {
  return api<PayerDues[]>(`${club(clubId)}/dues`);
}

/** The signed-in player's own dues at a club, plus what they paid in the last 90 days. */
export async function getPlayerDues(clubId: string, _playerId: string): Promise<{ due: OutstandingCharge[]; paid: OutstandingCharge[] }> {
  return api(`${club(clubId)}/my/dues`);
}

/** Total the signed-in player owes at a club (for the "You owe ₹540" banner). */
export async function getPlayerDueTotal(clubId: string, _playerId: string): Promise<number> {
  const { total } = await api<{ total: number }>(`${club(clubId)}/my/dues/total`).catch(() => ({ total: 0 }));
  return total;
}

// ── Income reports ──────────────────────────────────────────────────────────

/** Everything collected between two moments: totals by method, per IST day, and each payment. */
export async function getIncomeReport(clubId: string, from: string, to: string): Promise<IncomeReport> {
  return api<IncomeReport>(`${club(clubId)}/reports/income`, { query: { from, to } });
}

// ── Bookings ────────────────────────────────────────────────────────────────

/** Requests and confirmed bookings from now on (staff view). */
export async function listUpcomingBookings(clubId: string): Promise<TableBooking[]> {
  return api<TableBooking[]>(`${club(clubId)}/bookings`);
}

/** The signed-in player's bookings at a club. */
export async function listPlayerBookings(clubId: string, _playerId: string): Promise<TableBooking[]> {
  return api<TableBooking[]>(`${club(clubId)}/my/bookings`);
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
  return api<PublicTableStatus[]>(`${club(clubId)}/table-status`, { auth: false });
}
