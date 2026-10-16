"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, IndianRupee, Loader2, Play, Plus, Square, UserX, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClass } from "@/features/club-admin/components/screens/pair-tv-form";
import {
  markChargePaidAction,
  markNoShowAction,
  respondToBookingAction,
  settleBillAction,
  startTableAction,
  stopTableAction,
} from "@/app/actions/table-actions";
import { cn } from "@/lib/utils";
import {
  billFor,
  formatDuration,
  formatRupees,
  PAYMENT_LABELS,
  splitEqually,
  type ClubTable,
  type DaySummary,
  type OutstandingCharge,
  type PaymentMethod,
  type TableBooking,
  type TableSession,
} from "@/types/tables";

const METHODS: PaymentMethod[] = ["cash", "upi", "card"];

function useNow(intervalMs = 1000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

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

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

// ── Who pays? ───────────────────────────────────────────────────────────────

/** After the timer stops: loser pays, split equally, or custom shares. */
function BillSplitter({ clubSlug, session, onDone }: { clubSlug: string; session: TableSession; onDone: () => void }) {
  const router = useRouter();
  const amount = session.amount ?? 0;
  const [names, setNames] = React.useState<string[]>(session.players.length > 0 ? session.players : ["Player 1", "Player 2"]);
  const [mode, setMode] = React.useState<"loser" | "split" | "custom">("loser");
  const [loser, setLoser] = React.useState(0);
  const [custom, setCustom] = React.useState<string[]>(() => splitEqually(amount, names.length).map(String));
  const [busy, setBusy] = React.useState(false);

  const shares =
    mode === "loser"
      ? [{ payerName: names[loser] ?? "Player", amount }]
      : mode === "split"
        ? splitEqually(amount, names.length).map((a, i) => ({ payerName: names[i], amount: a }))
        : names.map((n, i) => ({ payerName: n, amount: Number(custom[i] || 0) }));
  const total = shares.reduce((t, x) => t + x.amount, 0);

  async function save() {
    setBusy(true);
    const r = await settleBillAction(clubSlug, session.id, shares);
    setBusy(false);
    if (!r.success) return toast.error(r.error);
    onDone();
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl bg-background/60 p-3">
      <div>
        <p className="text-sm text-muted-foreground">
          {session.playerName} · {formatDuration(session.minutes ?? 0)}
        </p>
        <p className="font-heading text-3xl font-bold text-primary">{formatRupees(amount)}</p>
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Who pays?</p>
      <div className="grid grid-cols-3 gap-1.5">
        {(
          [
            ["loser", "Loser pays"],
            ["split", "Split equally"],
            ["custom", "Custom"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "h-9 rounded-lg border text-xs font-semibold",
              mode === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {names.map((n, i) => (
          <div key={i} className="flex items-center gap-2">
            {mode === "loser" ? (
              <button
                type="button"
                aria-label={`${n} lost`}
                onClick={() => setLoser(i)}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border",
                  loser === i ? "border-primary bg-primary text-primary-foreground" : "border-border"
                )}
              >
                {loser === i ? <Check className="size-4" /> : null}
              </button>
            ) : null}
            <Input
              className="h-9"
              value={n}
              onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))}
            />
            {mode === "custom" ? (
              <Input
                className="h-9 w-24"
                inputMode="numeric"
                value={custom[i] ?? ""}
                onChange={(e) => setCustom(names.map((_, j) => (j === i ? e.target.value.replace(/\D/g, "") : custom[j] ?? "")))}
              />
            ) : (
              <span className="w-20 shrink-0 text-right text-sm font-semibold text-foreground">
                {formatRupees(shares.find((x) => x.payerName === n)?.amount ?? 0)}
              </span>
            )}
          </div>
        ))}
        {names.length < 8 ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            onClick={() => {
              setNames([...names, `Player ${names.length + 1}`]);
              setCustom([...custom, "0"]);
            }}
          >
            <Plus className="size-3.5" /> Add player
          </button>
        ) : null}
      </div>

      {mode === "custom" && total !== amount ? (
        <p className="text-xs text-destructive">
          Shares add up to {formatRupees(total)}; the bill is {formatRupees(amount)}.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onDone}>
          Decide later
        </Button>
        <Button disabled={busy || total !== amount} onClick={save}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Confirm
        </Button>
      </div>
    </div>
  );
}

/** One person's share: tap how they paid. */
function ChargeRow({ clubSlug, charge, tableNumber }: { clubSlug: string; charge: OutstandingCharge; tableNumber?: number }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<PaymentMethod | null>(null);
  async function pay(method: PaymentMethod) {
    setBusy(method);
    const r = await markChargePaidAction(clubSlug, charge.id, method);
    setBusy(null);
    if (!r.success) return toast.error(r.error);
    toast.success(`${charge.payerName} paid ${formatRupees(charge.amount)} by ${PAYMENT_LABELS[method]}`);
    router.refresh();
  }
  return (
    <div className="space-y-2.5 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{charge.payerName}</p>
          <p className="truncate text-xs text-muted-foreground">
            Table {tableNumber ?? "?"} · {charge.sessionLabel} · {formatDuration(charge.minutes)}
            {charge.endedAt ? ` · ${when(charge.endedAt)}` : ""}
          </p>
        </div>
        <p className="font-heading text-xl font-bold text-primary">{formatRupees(charge.amount)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {METHODS.map((m) => (
          <Button key={m} size="sm" variant="outline" className="h-10" disabled={!!busy} onClick={() => pay(m)}>
            {busy === m ? <Loader2 className="size-4 animate-spin" /> : null} {PAYMENT_LABELS[m]}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ── Tables ──────────────────────────────────────────────────────────────────

function TableCard({
  clubSlug,
  table,
  session,
  nextBooking,
  now,
}: {
  clubSlug: string;
  table: ClubTable;
  session?: TableSession;
  nextBooking?: TableBooking;
  now: number;
}) {
  const router = useRouter();
  const [starting, setStarting] = React.useState(false);
  const [players, setPlayers] = React.useState(["", ""]);
  const [busy, setBusy] = React.useState(false);
  const [stopped, setStopped] = React.useState<TableSession | null>(null);

  async function start() {
    setBusy(true);
    const r = await startTableAction(clubSlug, table.id, { players });
    setBusy(false);
    if (!r.success) return toast.error(r.error);
    setStarting(false);
    setPlayers(["", ""]);
    router.refresh();
  }

  async function stop() {
    if (!session) return;
    setBusy(true);
    const r = await stopTableAction(clubSlug, session.id);
    setBusy(false);
    if (!r.success) return toast.error(r.error);
    setStopped(r.session);
    router.refresh();
  }

  const running = session ? billFor(session.startedAt, new Date(now), session.hourlyRate) : null;

  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4", session ? "border-primary/60" : "border-border")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-heading text-lg font-bold text-foreground">Table {table.tableNumber}</p>
          <p className="truncate text-xs text-muted-foreground">
            {table.name ? `${table.name} · ` : ""}
            {formatRupees(table.hourlyRate)}/hr
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
            session ? "bg-primary/15 text-primary" : "bg-success/15 text-success"
          )}
        >
          {session ? "Playing" : "Free"}
        </span>
      </div>

      {stopped ? (
        <BillSplitter clubSlug={clubSlug} session={stopped} onDone={() => setStopped(null)} />
      ) : session && running ? (
        <>
          <div>
            <p className="truncate text-sm text-muted-foreground">
              {session.playerName} · since {time(session.startedAt)}
            </p>
            <p suppressHydrationWarning className="font-heading text-3xl font-bold tabular-nums text-foreground">
              {clock(now - new Date(session.startedAt).getTime())}
            </p>
            <p suppressHydrationWarning className="text-sm font-semibold text-primary">
              {formatRupees(running.amount)} so far
            </p>
          </div>
          <Button variant="outline" className="h-11" disabled={busy} onClick={stop}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />} Close table &amp; bill
          </Button>
        </>
      ) : starting ? (
        <div className="space-y-2">
          {players.map((p, i) => (
            <Input
              key={i}
              autoFocus={i === 0}
              className="h-11"
              placeholder={`Player ${i + 1}`}
              value={p}
              onChange={(e) => setPlayers(players.map((x, j) => (j === i ? e.target.value : x)))}
              onKeyDown={(e) => e.key === "Enter" && start()}
            />
          ))}
          {players.length < 8 ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
              onClick={() => setPlayers([...players, ""])}
            >
              <Plus className="size-3.5" /> Add player
            </button>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setStarting(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={start}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Start
            </Button>
          </div>
        </div>
      ) : (
        <>
          {nextBooking ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5 text-primary" /> Booked {when(nextBooking.startAt)} · {nextBooking.playerName}
            </p>
          ) : null}
          <Button className="h-11" onClick={() => setStarting(true)}>
            <Play className="size-4" /> Start table
          </Button>
        </>
      )}
    </div>
  );
}

// ── Bookings ────────────────────────────────────────────────────────────────

function BookingRow({ clubSlug, booking, tables }: { clubSlug: string; booking: TableBooking; tables: ClubTable[] }) {
  const router = useRouter();
  const [tableId, setTableId] = React.useState(booking.tableId ?? "");
  const [busy, setBusy] = React.useState(false);
  const table = tables.find((t) => t.id === booking.tableId);

  async function run(fn: () => Promise<{ success: boolean; error?: string }>, done: string) {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.success) return toast.error(r.error ?? "Something went wrong.");
    toast.success(done);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{booking.playerName}</p>
        <p className="text-xs text-muted-foreground">
          {when(booking.startAt)} · {booking.durationMinutes} min
          {table ? ` · Table ${table.tableNumber}` : booking.tableId ? "" : " · any table"}
        </p>
        {booking.note ? <p className="mt-0.5 text-xs italic text-muted-foreground">“{booking.note}”</p> : null}
      </div>
      {booking.status === "requested" ? (
        <div className="flex flex-wrap items-center gap-2">
          {!booking.tableId ? (
            <select className={cn(selectClass, "h-10 w-32")} value={tableId} onChange={(e) => setTableId(e.target.value)}>
              <option value="">Pick table</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.tableNumber}
                </option>
              ))}
            </select>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="h-10"
            disabled={busy}
            onClick={() => run(() => respondToBookingAction(clubSlug, booking.id, false), "Booking declined")}
          >
            <X className="size-4" /> Decline
          </Button>
          <Button
            size="sm"
            className="h-10"
            disabled={busy}
            onClick={() => run(() => respondToBookingAction(clubSlug, booking.id, true, tableId || null), "Booking confirmed")}
          >
            <Check className="size-4" /> Confirm
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 text-muted-foreground"
            disabled={busy}
            onClick={() => run(() => markNoShowAction(clubSlug, booking.id), "Marked as no-show")}
          >
            <UserX className="size-4" /> No-show
          </Button>
          {booking.tableId ? (
            <Button
              size="sm"
              className="h-10"
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    startTableAction(clubSlug, booking.tableId!, {
                      players: [booking.playerName],
                      playerId: booking.playerId,
                      bookingId: booking.id,
                    }),
                  `Table ${table?.tableNumber ?? ""} started for ${booking.playerName}`
                )
              }
            >
              <Play className="size-4" /> Start
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── The board ───────────────────────────────────────────────────────────────

/** The front desk: every table's timer, who pays what, booking requests and the day's takings. */
export function TablesBoard({
  clubSlug,
  tables,
  open,
  unsplit,
  charges,
  bookings,
  summary,
}: {
  clubSlug: string;
  tables: ClubTable[];
  open: TableSession[];
  unsplit: TableSession[];
  charges: OutstandingCharge[];
  bookings: TableBooking[];
  summary: DaySummary;
}) {
  const router = useRouter();
  const now = useNow();
  const [splitting, setSplitting] = React.useState<string | null>(null);

  // Other staff phones may start or close tables too — stay in sync.
  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  const requests = bookings.filter((b) => b.status === "requested");
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const tableNo = (id: string) => tables.find((t) => t.id === id)?.tableNumber;

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <div className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Today&apos;s income</p>
          <p className="font-heading text-4xl font-bold text-foreground">{formatRupees(summary.collected)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cash {formatRupees(summary.byMethod.cash)} · UPI {formatRupees(summary.byMethod.upi)} · Card{" "}
            {formatRupees(summary.byMethod.card)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Playing now", `${summary.playing} table${summary.playing === 1 ? "" : "s"}`],
            ["Free", `${summary.free} table${summary.free === 1 ? "" : "s"}`],
            ["Booked later today", String(summary.bookedToday)],
            ["To collect", formatRupees(summary.unpaid)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 truncate font-heading text-lg font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Today: {summary.sessions} session{summary.sessions === 1 ? "" : "s"} · {formatDuration(summary.minutes)} of table time
        </p>
      </section>

      {requests.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-bold text-foreground">Booking requests ({requests.length})</h2>
          {requests.map((b) => (
            <BookingRow key={b.id} clubSlug={clubSlug} booking={b} tables={tables} />
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold text-foreground">Tables</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((t) => (
            <TableCard
              key={t.id}
              clubSlug={clubSlug}
              table={t}
              session={open.find((s) => s.tableId === t.id)}
              nextBooking={confirmed.find((b) => b.tableId === t.id)}
              now={now}
            />
          ))}
        </div>
      </section>

      {unsplit.length > 0 || charges.length > 0 ? (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <IndianRupee className="size-4 text-primary" /> To collect
          </h2>
          {unsplit.map((s) =>
            splitting === s.id ? (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-3">
                <BillSplitter clubSlug={clubSlug} session={s} onDone={() => setSplitting(null)} />
              </div>
            ) : (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{s.playerName}</p>
                  <p className="text-xs text-muted-foreground">
                    Table {tableNo(s.tableId) ?? "?"} · {formatDuration(s.minutes ?? 0)} · who pays not decided yet
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-heading text-xl font-bold text-primary">{formatRupees(s.amount ?? 0)}</p>
                  <Button size="sm" className="h-10" onClick={() => setSplitting(s.id)}>
                    Who pays?
                  </Button>
                </div>
              </div>
            )
          )}
          {charges.map((c) => (
            <ChargeRow key={c.id} clubSlug={clubSlug} charge={c} tableNumber={tableNo(c.tableId)} />
          ))}
        </section>
      ) : null}

      {confirmed.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-bold text-foreground">Upcoming bookings</h2>
          {confirmed.map((b) => (
            <BookingRow key={b.id} clubSlug={clubSlug} booking={b} tables={tables} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
