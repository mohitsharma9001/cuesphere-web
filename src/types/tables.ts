export type PaymentMethod = "cash" | "upi" | "card";

export type BookingStatus = "requested" | "confirmed" | "rejected" | "cancelled" | "started" | "no_show";

export interface ClubTable {
  id: string;
  clubId: string;
  tableNumber: number;
  name: string;
  /** Rupees per hour; billed by the minute. */
  hourlyRate: number;
  active: boolean;
}

export type SplitMode = "loser" | "split" | "custom";

/** Someone at the table — linked to their CueSphere account when staff picked one. */
export interface LineupPlayer {
  name: string;
  playerId: string | null;
}

export interface TableSession {
  id: string;
  clubId: string;
  tableId: string;
  /** Everyone at the table. */
  players: string[];
  lineup: LineupPlayer[];
  /** Display line, e.g. "Rohan v Sameer". */
  playerName: string;
  playerId: string | null;
  bookingId: string | null;
  startedAt: string;
  endedAt: string | null;
  hourlyRate: number;
  minutes: number | null;
  amount: number | null;
  /** Every share of the bill has been paid. */
  paid: boolean;
}

/** One person's share of a session's bill. */
export interface TableCharge {
  id: string;
  sessionId: string;
  payerName: string;
  payerPlayerId: string | null;
  splitMode: SplitMode | null;
  amount: number;
  paid: boolean;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  remindedAt: string | null;
  createdAt: string;
}

/** A share with the game it came from: when, which table, against whom, how long. */
export interface OutstandingCharge extends TableCharge {
  tableId: string;
  tableNumber: number | null;
  sessionLabel: string;
  /** Everyone else at the table. */
  opponents: string[];
  minutes: number;
  startedAt: string | null;
  endedAt: string | null;
}

/** Everything one person owes a club. Keyed by account, or by name for walk-ins. */
export interface PayerDues {
  key: string;
  name: string;
  playerId: string | null;
  mobile: string | null;
  total: number;
  charges: OutstandingCharge[];
  lastRemindedAt: string | null;
}

export interface IncomeReport {
  from: string;
  to: string;
  collected: number;
  byMethod: Record<PaymentMethod, number>;
  /** Collected per IST day, oldest first. */
  days: { date: string; amount: number }[];
  payments: OutstandingCharge[];
  sessions: number;
  minutes: number;
}

/** Key that groups one payer's dues: their account if linked, else their name. */
export function payerKey(c: { payerPlayerId: string | null; payerName: string }): string {
  return c.payerPlayerId ? `p:${c.payerPlayerId}` : `n:${c.payerName.trim().toLowerCase()}`;
}

export interface TableBooking {
  id: string;
  clubId: string;
  tableId: string | null;
  playerId: string;
  playerName: string;
  startAt: string;
  durationMinutes: number;
  status: BookingStatus;
  note: string;
  createdAt: string;
}

export interface DaySummary {
  /** Paid today (IST). */
  collected: number;
  byMethod: Record<PaymentMethod, number>;
  /** Everything still owed, any day. */
  unpaid: number;
  /** Sessions stopped today, and their total minutes. */
  sessions: number;
  minutes: number;
  playing: number;
  free: number;
  /** Confirmed bookings still to come today. */
  bookedToday: number;
}

/** Splits an amount equally; the first payers absorb the leftover rupees. */
export function splitEqually(amount: number, people: number): number[] {
  const n = Math.max(1, people);
  const base = Math.floor(amount / n);
  return Array.from({ length: n }, (_, i) => base + (i < amount - base * n ? 1 : 0));
}

/** Billed minutes (rounded up, at least 1) and amount (rupees, rounded up) for a stretch of table time. */
export function billFor(startedAt: string, endedAt: string | Date, hourlyRate: number): { minutes: number; amount: number } {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return { minutes, amount: Math.ceil((hourlyRate * minutes) / 60) };
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: "Cash", upi: "UPI", card: "Card" };
