"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search, Send, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { selectClass } from "@/features/club-admin/components/screens/pair-tv-form";
import { createFriendlyAction, searchPlayersAction } from "@/app/actions/friendly-actions";
import type { PlayerSearchResult } from "@/services/friendly-service";
import { cn } from "@/lib/utils";

const BEST_OF = [1, 3, 5, 7];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export interface VenueOption {
  id: string;
  label: string;
}

export function ChallengeForm({
  venues,
  initialOpponent,
  inviteUrl,
}: {
  venues: VenueOption[];
  initialOpponent?: PlayerSearchResult;
  /** Shared when the person isn't on CueSphere yet. */
  inviteUrl: string;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<PlayerSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [opponent, setOpponent] = React.useState<PlayerSearchResult | undefined>(initialOpponent);
  const [bestOf, setBestOf] = React.useState(3);
  const [venueId, setVenueId] = React.useState("");
  const [table, setTable] = React.useState("");
  const [sending, setSending] = React.useState(false);

  // Search as you type, after a short pause; only the latest query's answer is shown.
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = React.useRef("");
  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onQueryChange(value: string) {
    setQuery(value);
    const q = value.trim();
    latest.current = q;
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const found = await searchPlayersAction(q);
      if (latest.current !== q) return;
      setResults(found);
      setSearching(false);
    }, 300);
  }

  async function send() {
    if (!opponent) return;
    setSending(true);
    const result = await createFriendlyAction({
      opponentId: opponent.id,
      bestOf,
      venueClubId: venueId || null,
      tableNumber: table ? Number(table) : 0,
    });
    setSending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Challenge sent to ${opponent.name}`);
    router.push(`/play/${result.matchId}`);
  }

  const inviteText = `Join me on CueSphere so we can record our snooker matches: ${inviteUrl}`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="opponentSearch">Opponent</Label>
        {opponent ? (
          <div className="flex items-center gap-3 rounded-2xl border border-primary/50 bg-card px-3 py-3">
            <Avatar className="size-11">
              {opponent.photoUrl ? <AvatarImage src={opponent.photoUrl} alt={opponent.name} /> : null}
              <AvatarFallback>{initials(opponent.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">{opponent.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {opponent.memberId}
                {opponent.city ? ` · ${opponent.city}` : ""}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpponent(undefined)}>
              Change
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="opponentSearch"
                className="h-11 pl-9"
                placeholder="Name, member ID or mobile number"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                autoComplete="off"
              />
              {searching ? (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            {results.length > 0 ? (
              <ul className="grid grid-cols-1 gap-1.5">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setOpponent(p)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/60"
                    >
                      <Avatar className="size-9">
                        {p.photoUrl ? <AvatarImage src={p.photoUrl} alt={p.name} /> : null}
                        <AvatarFallback>{initials(p.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.memberId}
                          {p.city ? ` · ${p.city}` : ""}
                        </p>
                      </div>
                      <Check className="size-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.trim().length >= 2 && !searching ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 px-4 py-4 text-sm">
                <p className="font-semibold text-foreground">No one called &ldquo;{query.trim()}&rdquo; on CueSphere yet</p>
                <p className="mt-1 text-muted-foreground">
                  Only registered players can be challenged. Invite them, then challenge them once they&apos;ve joined.
                </p>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-[#06260f]"
                >
                  <UserPlus className="size-4" /> Invite on WhatsApp
                </a>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label>Format</Label>
        <div className="grid grid-cols-4 gap-2">
          {BEST_OF.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setBestOf(n)}
              className={cn(
                "h-11 rounded-xl border text-sm font-semibold transition-colors",
                bestOf === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
              )}
            >
              Best of {n}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div className="space-y-2">
          <Label htmlFor="venue">Where (optional)</Label>
          <select id="venue" className={selectClass} value={venueId} onChange={(e) => setVenueId(e.target.value)}>
            <option value="">Not at a CueSphere club</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="table">Table (optional)</Label>
          <Input
            id="table"
            className="h-11"
            inputMode="numeric"
            placeholder="e.g. 3"
            value={table}
            onChange={(e) => setTable(e.target.value.replace(/\D/g, "").slice(0, 2))}
          />
        </div>
      </div>

      <Button size="lg" className="w-full" disabled={!opponent || sending} onClick={send}>
        {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {opponent ? `Challenge ${opponent.name.split(" ")[0]}` : "Pick an opponent"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        They get a notification and accept. Either of you can score it, and the other confirms the result.
      </p>
    </div>
  );
}
