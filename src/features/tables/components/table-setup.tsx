"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { saveTableAction } from "@/app/actions/table-actions";
import type { ClubTable } from "@/types/tables";

type Draft = { id?: string; tableNumber: string; name: string; hourlyRate: string; active: boolean };

function TableRow({ clubSlug, initial, onSaved }: { clubSlug: string; initial: Draft; onSaved?: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const isNew = !initial.id;

  async function save() {
    setBusy(true);
    const r = await saveTableAction(clubSlug, {
      id: draft.id,
      tableNumber: Number(draft.tableNumber),
      name: draft.name,
      hourlyRate: Number(draft.hourlyRate || 0),
      active: draft.active,
    });
    setBusy(false);
    if (!r.success) return toast.error(r.error);
    toast.success(isNew ? `Table ${draft.tableNumber} added` : `Table ${draft.tableNumber} saved`);
    onSaved?.();
    router.refresh();
  }

  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[4.5rem_1fr_8rem_auto_auto] sm:items-center">
      <Input
        aria-label="Table number"
        className="h-10"
        inputMode="numeric"
        placeholder="No."
        value={draft.tableNumber}
        onChange={(e) => setDraft({ ...draft, tableNumber: e.target.value.replace(/\D/g, "").slice(0, 2) })}
      />
      <Input
        aria-label="Table name"
        className="h-10"
        placeholder="Name (optional), e.g. Championship table"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <div className="relative col-span-2 sm:col-span-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
        <Input
          aria-label="Rate per hour"
          className="h-10 pl-7 pr-10"
          inputMode="numeric"
          placeholder="300"
          value={draft.hourlyRate}
          onChange={(e) => setDraft({ ...draft, hourlyRate: e.target.value.replace(/\D/g, "").slice(0, 6) })}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/hr</span>
      </div>
      {!isNew ? (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /> In use
        </label>
      ) : (
        <span className="hidden sm:block" />
      )}
      <Button className="col-span-2 h-10 sm:col-span-1" disabled={busy || !draft.tableNumber} onClick={save}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : isNew ? <Plus className="size-4" /> : <Save className="size-4" />}
        {isNew ? "Add" : "Save"}
      </Button>
    </div>
  );
}

/** Add tables and set their hourly rate. Turning a table off hides it from the board and from bookings. */
export function TableSetup({ clubSlug, tables }: { clubSlug: string; tables: ClubTable[] }) {
  const nextNumber = String((tables.reduce((m, t) => Math.max(m, t.tableNumber), 0) || 0) + 1);
  const lastRate = tables[tables.length - 1]?.hourlyRate;
  const [newKey, setNewKey] = React.useState(0);
  return (
    <div className="space-y-2">
      {tables.map((t) => (
        <TableRow
          key={t.id}
          clubSlug={clubSlug}
          initial={{ id: t.id, tableNumber: String(t.tableNumber), name: t.name, hourlyRate: String(t.hourlyRate), active: t.active }}
        />
      ))}
      <TableRow
        key={`new-${newKey}-${nextNumber}`}
        clubSlug={clubSlug}
        initial={{ tableNumber: nextNumber, name: "", hourlyRate: lastRate ? String(lastRate) : "", active: true }}
        onSaved={() => setNewKey((k) => k + 1)}
      />
    </div>
  );
}
