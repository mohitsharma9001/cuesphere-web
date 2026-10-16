"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Bell, ChevronDown, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { collectDuesAction, sendDueReminderAction } from "@/app/actions/table-actions";
import { cn } from "@/lib/utils";
import { formatDuration, formatRupees, PAYMENT_LABELS, type PayerDues, type PaymentMethod } from "@/types/tables";

const METHODS: PaymentMethod[] = ["cash", "upi", "card"];

function when(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/** WhatsApp link with the dues spelled out; to their number when we have it. */
function whatsappLink(dues: PayerDues, clubName: string) {
  const lines = dues.charges.map(
    (c) =>
      `• ${when(c.endedAt)} · Table ${c.tableNumber ?? "?"}${c.opponents.length ? ` vs ${c.opponents.join(", ")}` : ""} · ${formatDuration(c.minutes)} · ${formatRupees(c.amount)}`
  );
  const text = `Hi ${dues.name}, a reminder from ${clubName}: ${formatRupees(dues.total)} is due for table time.\n${lines.join("\n")}\nThank you!`;
  const digits = (dues.mobile ?? "").replace(/\D/g, "");
  const phone = digits.length === 10 ? `91${digits}` : digits.length > 10 ? digits : "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function PayerCard({ clubSlug, clubName, dues }: { clubSlug: string; clubName: string; dues: PayerDues }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set(dues.charges.map((c) => c.id)));
  const [busy, setBusy] = React.useState<string | null>(null);
  const selectedTotal = dues.charges.filter((c) => selected.has(c.id)).reduce((t, c) => t + c.amount, 0);

  async function collect(method: PaymentMethod) {
    setBusy(method);
    const r = await collectDuesAction(clubSlug, [...selected], method);
    setBusy(null);
    if (!r.success) return toast.error(r.error);
    toast.success(`${dues.name} paid ${formatRupees(selectedTotal)} by ${PAYMENT_LABELS[method]}`);
    router.refresh();
  }

  async function remind() {
    setBusy("remind");
    const r = await sendDueReminderAction(clubSlug, dues.key);
    setBusy(null);
    if (!r.success) return toast.error(r.error);
    toast.success(`Reminder sent to ${dues.name}`);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-semibold text-foreground">
            {dues.name}
            {dues.playerId ? <BadgeCheck className="size-4 shrink-0 text-success" aria-label="On CueSphere" /> : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {dues.charges.length} game{dues.charges.length === 1 ? "" : "s"} · since {when(dues.charges[0]?.endedAt ?? null)}
            {dues.lastRemindedAt ? ` · reminded ${when(dues.lastRemindedAt)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-heading text-xl font-bold text-primary">{formatRupees(dues.total)}</span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border px-4 py-3">
          <ul className="space-y-1.5">
            {dues.charges.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-background/60 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-[var(--primary)]"
                    checked={selected.has(c.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(c.id);
                      else next.delete(c.id);
                      setSelected(next);
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{when(c.startedAt)}</span>
                    <span className="block text-xs text-muted-foreground">
                      Table {c.tableNumber ?? "?"}
                      {c.opponents.length > 0 ? ` · vs ${c.opponents.join(", ")}` : ""} · {formatDuration(c.minutes)}
                      {c.splitMode === "loser" ? " · lost" : c.splitMode === "split" ? " · split" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-foreground">{formatRupees(c.amount)}</span>
                </label>
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Collect {formatRupees(selectedTotal)}
              {selected.size < dues.charges.length ? ` (${selected.size} of ${dues.charges.length})` : ""}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <Button key={m} className="h-10" disabled={!!busy || selected.size === 0} onClick={() => collect(m)}>
                  {busy === m ? <Loader2 className="size-4 animate-spin" /> : null} {PAYMENT_LABELS[m]}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-10" disabled={!!busy || !dues.playerId} onClick={remind} title={dues.playerId ? "" : "Not on CueSphere"}>
              {busy === "remind" ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />} Send reminder
            </Button>
            <Button variant="outline" className="h-10" nativeButton={false} render={<a href={whatsappLink(dues, clubName)} target="_blank" rel="noopener noreferrer" />}>
              <MessageCircle className="size-4" /> WhatsApp
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DuesList({ clubSlug, clubName, dues }: { clubSlug: string; clubName: string; dues: PayerDues[] }) {
  if (dues.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Nobody owes anything. 🎉</p>;
  }
  return (
    <div className="space-y-2">
      {dues.map((d) => (
        <PayerCard key={d.key} clubSlug={clubSlug} clubName={clubName} dues={d} />
      ))}
    </div>
  );
}
