import { CalendarClock } from "lucide-react";

import { LinkButton } from "@/components/shared/link-button";
import { clubPath } from "@/lib/club-path";
import { cn } from "@/lib/utils";
import type { PublicTableStatus } from "@/services/table-service";
import { formatRupees } from "@/types/tables";

function minutesSince(iso: string) {
  return Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

/** Free / playing / reserved for every table — so players know before they walk in. */
export function TablesNow({ clubSlug, tables }: { clubSlug: string; tables: PublicTableStatus[] }) {
  if (tables.length === 0) return null;
  const free = tables.filter((t) => t.state === "free").length;
  const rate = tables[0]?.hourlyRate;
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Tables right now</p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {free} of {tables.length} free
            </p>
            {rate ? <p className="text-sm text-muted-foreground">From {formatRupees(rate)} an hour</p> : null}
          </div>
          <LinkButton href={clubPath(clubSlug, "/book")}>
            <CalendarClock className="size-4" /> Book a table
          </LinkButton>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tables.map((t) => (
            <div
              key={t.tableNumber}
              className={cn(
                "rounded-2xl border bg-card px-3 py-3",
                t.state === "free" ? "border-success/40" : "border-primary/40"
              )}
            >
              <p className="font-heading font-bold text-foreground">Table {t.tableNumber}</p>
              <p className={cn("text-xs font-semibold", t.state === "free" ? "text-success" : "text-primary")}>
                {t.state === "free" ? "Free" : `Playing · ${minutesSince(t.busySince!)} min`}
              </p>
              {t.reservedAt ? <p className="text-[11px] text-muted-foreground">Booked {time(t.reservedAt)}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
