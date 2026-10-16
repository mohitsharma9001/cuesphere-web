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

export interface TableSession {
  id: string;
  clubId: string;
  tableId: string;
  /** Everyone at the table. */
  players: string[];
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
  amount: number;
  paid: boolean;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
}

/** A share still owed, with enough context to recognise it at the counter. */
export interface OutstandingCharge extends TableCharge {
  tableId: string;
  sessionLabel: string;
  minutes: number;
  endedAt: string | null;
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
