import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getClubViewer } from "@/lib/auth/get-club-viewer";
import { clubPath } from "@/lib/club-path";
import { cn } from "@/lib/utils";
import { isScorekeeperOnly } from "@/types/club";
import { getIncomeReport } from "@/services/table-service";
import { formatDuration, formatRupees, PAYMENT_LABELS } from "@/types/tables";

export const metadata: Metadata = { title: "Income" };

const IST_MS = 5.5 * 3_600_000;
const DAY_MS = 86_400_000;

/** Midnight (IST) of the given IST calendar date, as a UTC Date. */
function istMidnight(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d) - IST_MS);
}

function istParts(date = new Date()) {
  const ist = new Date(date.getTime() + IST_MS);
  return { y: ist.getUTCFullYear(), m: ist.getUTCMonth(), d: ist.getUTCDate(), dow: ist.getUTCDay() };
}

/** Today in India as YYYY-MM-DD (for the date pickers). */
function todayIstDate() {
  return new Date(Date.now() + IST_MS).toISOString().slice(0, 10);
}

const RANGES = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["week", "This week"],
  ["month", "This month"],
  ["lastmonth", "Last month"],
] as const;

function rangeBounds(range: string, fromParam?: string, toParam?: string): { from: Date; to: Date; label: string } {
  const { y, m, d, dow } = istParts();
  const today = istMidnight(y, m, d);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  switch (range) {
    case "yesterday":
      return { from: new Date(today.getTime() - DAY_MS), to: today, label: "Yesterday" };
    case "week": {
      const sinceMonday = (dow + 6) % 7;
      return { from: new Date(today.getTime() - sinceMonday * DAY_MS), to: tomorrow, label: "This week" };
    }
    case "month":
      return { from: istMidnight(y, m, 1), to: tomorrow, label: "This month" };
    case "lastmonth":
      return { from: istMidnight(y, m - 1, 1), to: istMidnight(y, m, 1), label: "Last month" };
    case "custom": {
      const ok = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
      if (ok(fromParam) && ok(toParam)) {
        const [fy, fm, fd] = fromParam!.split("-").map(Number);
        const [ty, tm, td] = toParam!.split("-").map(Number);
        const from = istMidnight(fy, fm - 1, fd);
        const to = new Date(istMidnight(ty, tm - 1, td).getTime() + DAY_MS);
        if (to > from && to.getTime() - from.getTime() <= 366 * DAY_MS) return { from, to, label: `${fromParam} to ${toParam}` };
      }
      return { from: today, to: tomorrow, label: "Today" };
    }
    default:
      return { from: today, to: tomorrow, label: "Today" };
  }
}

function dayLabel(date: string) {
  return new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

/** Money collected over any period: totals, a day-by-day view, and every payment. */
export default async function IncomePage({
  params,
  searchParams,
}: {
  params: Promise<{ clubSlug: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { clubSlug } = await params;
  const { range = "today", from: fromParam, to: toParam } = await searchParams;
  const clubViewer = await getClubViewer(clubSlug);
  if (!clubViewer) return null;
  if (isScorekeeperOnly(clubViewer.membership?.role)) redirect(clubPath(clubSlug, "/admin/live"));

  const { from, to, label } = rangeBounds(range, fromParam, toParam);
  const report = await getIncomeReport(clubViewer.club.id, from.toISOString(), to.toISOString());
  const best = Math.max(1, ...report.days.map((x) => x.amount));
  const base = clubPath(clubSlug, "/admin/tables/income");
  const todayIso = todayIstDate();

  return (
    <div className="space-y-6">
      <Link href={clubPath(clubSlug, "/admin/tables")} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Tables
      </Link>
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Income</h1>
        <p className="mt-1 text-sm text-muted-foreground">Table money collected, by the day it was paid.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {RANGES.map(([key, name]) => (
          <Link
            key={key}
            href={`${base}?range=${key}`}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold",
              range === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
            )}
          >
            {name}
          </Link>
        ))}
      </div>
      <form action={base} className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-3">
        <input type="hidden" name="range" value="custom" />
        <label className="space-y-1 text-xs text-muted-foreground">
          From
          <input type="date" name="from" max={todayIso} defaultValue={range === "custom" ? fromParam : undefined} className="block h-10 rounded-lg border border-input bg-background px-2 text-sm text-foreground" />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          To
          <input type="date" name="to" max={todayIso} defaultValue={range === "custom" ? toParam : undefined} className="block h-10 rounded-lg border border-input bg-background px-2 text-sm text-foreground" />
        </label>
        <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
          Show
        </button>
      </form>

      <section className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">{label}</p>
        <p className="font-heading text-4xl font-bold text-foreground">{formatRupees(report.collected)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Cash {formatRupees(report.byMethod.cash)} · UPI {formatRupees(report.byMethod.upi)} · Card {formatRupees(report.byMethod.card)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {report.sessions} session{report.sessions === 1 ? "" : "s"} · {formatDuration(report.minutes)} of table time
        </p>
      </section>

      {report.days.length > 1 ? (
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-bold text-foreground">By day</h2>
          <div className="space-y-1.5 rounded-2xl border border-border bg-card p-3">
            {report.days.map((day) => (
              <div key={day.date} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-muted-foreground">{dayLabel(day.date)}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(day.amount / best) * 100}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right font-semibold text-foreground">{formatRupees(day.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-heading text-lg font-bold text-foreground">Payments ({report.payments.length})</h2>
        {report.payments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">No payments in this period.</p>
        ) : (
          report.payments.map((pmt) => (
            <div key={pmt.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{pmt.payerName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Table {pmt.tableNumber ?? "?"}
                  {pmt.opponents.length > 0 ? ` · vs ${pmt.opponents.join(", ")}` : ""} · {formatDuration(pmt.minutes)}
                  {pmt.splitMode === "loser" ? " · lost" : pmt.splitMode === "split" ? " · split" : ""}
                </p>
                <p className="text-xs text-muted-foreground">Paid {pmt.paidAt ? when(pmt.paidAt) : ""}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-heading text-lg font-bold text-primary">{formatRupees(pmt.amount)}</p>
                <p className="text-xs font-semibold text-muted-foreground">{pmt.paymentMethod ? PAYMENT_LABELS[pmt.paymentMethod] : ""}</p>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
