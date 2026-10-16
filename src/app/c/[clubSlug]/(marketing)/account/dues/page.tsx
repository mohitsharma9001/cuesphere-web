import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { clubPath } from "@/lib/club-path";
import { getClubBySlug } from "@/services/club-service";
import { getProfileByUserId } from "@/services/profile-service";
import { getPlayerDues } from "@/services/table-service";
import { formatDuration, formatRupees, PAYMENT_LABELS, type OutstandingCharge } from "@/types/tables";

export const metadata: Metadata = { title: "My dues" };

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

function Game({ c, paid }: { c: OutstandingCharge; paid?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{when(c.startedAt)}</p>
        <p className="truncate text-xs text-muted-foreground">
          Table {c.tableNumber ?? "?"}
          {c.opponents.length > 0 ? ` · vs ${c.opponents.join(", ")}` : ""} · {formatDuration(c.minutes)}
          {c.splitMode === "loser" ? " · lost" : c.splitMode === "split" ? " · split" : ""}
        </p>
        {paid && c.paidAt ? (
          <p className="text-xs text-success">
            Paid {when(c.paidAt)}
            {c.paymentMethod ? ` · ${PAYMENT_LABELS[c.paymentMethod]}` : ""}
          </p>
        ) : null}
      </div>
      <p className={paid ? "font-semibold text-muted-foreground" : "font-heading text-lg font-bold text-primary"}>{formatRupees(c.amount)}</p>
    </div>
  );
}

/** A player's own table dues at this club, and what they've paid. Nobody else's. */
export default async function MyDuesPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await getClubBySlug(clubSlug);
  if (!club) notFound();
  const session = await getSession();
  if (!session) redirect(`${clubPath(clubSlug, "/login")}?redirect=${encodeURIComponent(clubPath(clubSlug, "/account/dues"))}`);
  const profile = await getProfileByUserId(session.id);
  const { due, paid } = profile ? await getPlayerDues(club.id, profile.id) : { due: [], paid: [] };
  const total = due.reduce((t, c) => t + c.amount, 0);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:px-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{club.name}</span>
        <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">My dues</h1>
      </div>

      <section className={total > 0 ? "rounded-2xl border border-primary/40 bg-primary/10 px-4 py-4" : "rounded-2xl border border-border bg-card px-4 py-4"}>
        <p className="text-xs font-bold uppercase tracking-wide text-primary">{total > 0 ? "You owe" : "All clear"}</p>
        <p className="font-heading text-4xl font-bold text-foreground">{formatRupees(total)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {total > 0 ? `For ${due.length} game${due.length === 1 ? "" : "s"}. Pay at the counter by cash, UPI or card.` : "Nothing due at this club."}
        </p>
      </section>

      {due.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-bold text-foreground">Due</h2>
          {due.map((c) => (
            <Game key={c.id} c={c} />
          ))}
        </section>
      ) : null}

      {paid.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-bold text-foreground">Paid (last 90 days)</h2>
          {paid.map((c) => (
            <Game key={c.id} c={c} paid />
          ))}
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Only games the club linked to your CueSphere account show here. If something&apos;s missing or wrong, ask at the counter.
      </p>
    </div>
  );
}
