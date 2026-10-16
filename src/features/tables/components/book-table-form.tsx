"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectClass } from "@/features/club-admin/components/screens/pair-tv-form";
import { cancelMyBookingAction, requestBookingAction } from "@/app/actions/table-actions";
import { cn } from "@/lib/utils";
import { formatRupees, type BookingStatus, type TableBooking } from "@/types/tables";

const DURATIONS = [30, 60, 90, 120, 180];
const TIMES = Array.from({ length: 34 }, (_, i) => {
  const mins = 7 * 60 + i * 30; // 7:00 am to 11:30 pm
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

function label12(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** Today's date in India, as YYYY-MM-DD. */
function todayIst() {
  return new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

const STATUS: Record<BookingStatus, { label: string; tone: string }> = {
  requested: { label: "Waiting for club", tone: "bg-muted text-muted-foreground" },
  confirmed: { label: "Confirmed", tone: "bg-success/15 text-success" },
  rejected: { label: "Not available", tone: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Cancelled", tone: "bg-muted text-muted-foreground" },
  started: { label: "Played", tone: "bg-primary/15 text-primary" },
  no_show: { label: "Missed", tone: "bg-muted text-muted-foreground" },
};

export function BookTableForm({
  clubSlug,
  tables,
  bookings,
}: {
  clubSlug: string;
  tables: { tableNumber: number; name: string; hourlyRate: number }[];
  bookings: TableBooking[];
}) {
  const router = useRouter();
  const [date, setDate] = React.useState(todayIst);
  const [time, setTime] = React.useState("19:00");
  const [duration, setDuration] = React.useState(60);
  const [table, setTable] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const rate = tables.find((t) => String(t.tableNumber) === table)?.hourlyRate ?? tables[0]?.hourlyRate ?? 0;

  async function submit() {
    setBusy(true);
    const r = await requestBookingAction(clubSlug, {
      date,
      time,
      durationMinutes: duration,
      tableNumber: table ? Number(table) : null,
      note,
    });
    setBusy(false);
    if (!r.success) return toast.error(r.error);
    toast.success("Request sent. You'll get a notification when the club confirms.");
    setNote("");
    router.refresh();
  }

  async function cancel(id: string) {
    if (!window.confirm("Cancel this booking?")) return;
    const r = await cancelMyBookingAction(clubSlug, id);
    if (!r.success) return toast.error(r.error);
    toast.success("Booking cancelled");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="bookDate">Date</Label>
            <Input id="bookDate" type="date" className="h-11" min={todayIst()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bookTime">Time</Label>
            <select id="bookTime" className={selectClass} value={time} onChange={(e) => setTime(e.target.value)}>
              {TIMES.map((t) => (
                <option key={t} value={t}>
                  {label12(t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>How long</Label>
          <div className="grid grid-cols-5 gap-1.5">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={cn(
                  "h-10 rounded-lg border text-xs font-semibold",
                  duration === d ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"
                )}
              >
                {d < 60 ? `${d} min` : `${d / 60} hr`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bookTable">Table</Label>
          <select id="bookTable" className={selectClass} value={table} onChange={(e) => setTable(e.target.value)}>
            <option value="">Any free table</option>
            {tables.map((t) => (
              <option key={t.tableNumber} value={t.tableNumber}>
                Table {t.tableNumber}
                {t.name ? ` · ${t.name}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bookNote">Note for the club (optional)</Label>
          <Input id="bookNote" className="h-11" placeholder="e.g. 4 of us, doubles" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {rate > 0 ? (
          <p className="text-sm text-muted-foreground">
            About <strong className="text-foreground">{formatRupees(Math.ceil((rate * duration) / 60))}</strong> at {formatRupees(rate)}
            /hr. You pay at the club for the time you actually play.
          </p>
        ) : null}

        <Button size="lg" className="w-full" disabled={busy} onClick={submit}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />} Request booking
        </Button>
      </div>

      {bookings.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-bold text-foreground">Your bookings</h2>
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  {new Date(b.startAt).toLocaleString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Asia/Kolkata",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">{b.durationMinutes} min</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS[b.status].tone)}>{STATUS[b.status].label}</span>
                {b.status === "requested" || b.status === "confirmed" ? (
                  <Button variant="ghost" size="sm" onClick={() => cancel(b.id)}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
