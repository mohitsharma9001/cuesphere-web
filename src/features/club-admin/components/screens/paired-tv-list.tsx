"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tv, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moveTvAction, unpairTvAction } from "@/app/actions/club-screen-actions";
import { selectClass } from "@/features/club-admin/components/screens/pair-tv-form";

export interface PairedTv {
  id: string;
  tableNumber: number | null;
  lastSeenAt: string | null;
}

// Paired TVs check in every 20 seconds.
const ONLINE_WITHIN_MS = 60_000;

function PairedTvRow({ tv, clubSlug, tableCount, now }: { tv: PairedTv; clubSlug: string; tableCount: number; now: number }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const online = tv.lastSeenAt ? now - Date.parse(tv.lastSeenAt) < ONLINE_WITHIN_MS : false;

  async function move(table: number) {
    setBusy(true);
    const result = await moveTvAction(clubSlug, tv.id, table);
    setBusy(false);
    if (!result.success) toast.error(result.error);
    else {
      toast.success(table === 0 ? "TV now rotates through every live table" : `TV now shows Table ${table}`);
      router.refresh();
    }
  }

  async function unpair() {
    if (!window.confirm("Unpair this TV? It goes back to showing a pairing code.")) return;
    setBusy(true);
    const result = await unpairTvAction(clubSlug, tv.id);
    setBusy(false);
    if (!result.success) toast.error(result.error);
    else router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card-elevated text-primary">
        <Tv className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        {/* Online state and times depend on the viewer's clock and locale, so they differ from the server render. */}
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground" suppressHydrationWarning>
          <span className={`size-2 rounded-full ${online ? "bg-success" : "bg-muted-foreground/50"}`} />
          {online ? "Online" : "Offline"}
        </p>
        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
          {tv.lastSeenAt ? `Last seen ${new Date(tv.lastSeenAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Not seen yet"}
        </p>
      </div>
      <label className="sr-only" htmlFor={`tv-${tv.id}`}>
        Table for this TV
      </label>
      <select
        id={`tv-${tv.id}`}
        className={cn(selectClass, "w-44")}
        value={tv.tableNumber ?? 1}
        disabled={busy}
        onChange={(e) => move(Number(e.target.value))}
      >
        {Array.from({ length: tableCount }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            Table {i + 1}
          </option>
        ))}
        <option value={0}>All tables (rotate)</option>
      </select>
      <Button variant="outline" size="sm" className="h-11" disabled={busy} onClick={unpair}>
        <Unlink className="size-4" /> Unpair
      </Button>
    </div>
  );
}

export function PairedTvList({ tvs, clubSlug, tableCount }: { tvs: PairedTv[]; clubSlug: string; tableCount: number }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  if (tvs.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border-strong p-4 text-center text-sm text-muted-foreground">
        No TVs paired yet.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {tvs.map((tv) => (
        <PairedTvRow key={tv.id} tv={tv} clubSlug={clubSlug} tableCount={tableCount} now={now} />
      ))}
    </div>
  );
}
