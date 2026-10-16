"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pairTvAction } from "@/app/actions/club-screen-actions";

export const selectClass =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Staff type the 6-letter code a TV shows and choose its table. */
export function PairTvForm({ clubSlug, tableCount }: { clubSlug: string; tableCount: number }) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [table, setTable] = React.useState(1);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await pairTvAction(clubSlug, code, table);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(table === 0 ? "TV paired — it rotates through every live table" : `TV paired with Table ${table}`);
    setCode("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <p className="font-heading text-base font-bold text-foreground">Pair a TV</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Open <strong className="text-foreground">/tv</strong>{" "}
          on this site in the TV&apos;s browser. It shows a 6-letter code.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="tvCode">Code on the TV</Label>
          <Input
            id="tvCode"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. K7Q4MD"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={9}
            className="h-11 font-tabular text-lg tracking-[0.3em]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tvTable">Show scores for</Label>
          <select id="tvTable" className={selectClass} value={table} onChange={(e) => setTable(Number(e.target.value))}>
            {Array.from({ length: tableCount }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Table {i + 1}
              </option>
            ))}
            <option value={0}>All tables (rotate)</option>
          </select>
        </div>
        <Button type="submit" className="h-11" disabled={busy || code.replace(/[^A-Z0-9]/gi, "").length < 6}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
          Pair TV
        </Button>
      </div>
    </form>
  );
}
