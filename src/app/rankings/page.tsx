import type { Metadata } from "next";
import Link from "next/link";
import { Medal, Trophy } from "lucide-react";

import { PlatformHeader } from "@/components/layout/platform-header";
import { PlatformFooter } from "@/components/layout/platform-footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { listActiveStates, listCitiesForState } from "@/services/location-service";
import { getCityRankings, getRankedCityIds, getStateRankings } from "@/services/ranking-service";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Rankings" };

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const chip = "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors";
const chipOn = "border-primary bg-primary text-primary-foreground";
const chipOff = "border-border bg-card text-muted-foreground hover:text-foreground";

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; city?: string }>;
}) {
  const params = await searchParams;
  const states = await listActiveStates();
  const state = states.find((s) => s.code === params.state) ?? states[0];

  const [cities, rankedCityIds] = state
    ? await Promise.all([listCitiesForState(state.code), getRankedCityIds(state.code)])
    : [[], new Set<string>()];
  const cityOptions = cities.filter((c) => rankedCityIds.has(c.id));
  const city = cityOptions.find((c) => c.id === params.city);

  const table = city ? await getCityRankings(city.id) : state ? await getStateRankings(state.code) : [];
  const placeName = city?.name ?? state?.name ?? "";

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Rankings</span>
          <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">
            {placeName ? `Best players in ${placeName}` : "Player Rankings"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ranking points from tournaments at clubs in this {city ? "city" : "state"}: 50 for a win, 10 for a
            loss. Friendly matches don&apos;t count.
          </p>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {states.map((s) => (
              <Link key={s.code} href={`/rankings?state=${s.code}`} className={cn(chip, s.code === state?.code ? chipOn : chipOff)}>
                {s.name}
              </Link>
            ))}
          </div>

          {cityOptions.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <Link href={`/rankings?state=${state?.code}`} className={cn(chip, "py-1.5 text-xs", !city ? chipOn : chipOff)}>
                All of {state?.name}
              </Link>
              {cityOptions.map((c) => (
                <Link
                  key={c.id}
                  href={`/rankings?state=${state?.code}&city=${c.id}`}
                  className={cn(chip, "py-1.5 text-xs", c.id === city?.id ? chipOn : chipOff)}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-8">
            {table.length === 0 ? (
              <EmptyState
                icon={<Trophy className="size-6" />}
                title={`No ranked players in ${placeName || "this state"} yet`}
                description="Rankings fill up as clubs here complete tournament matches on CueSphere."
              />
            ) : (
              <ol className="grid grid-cols-1 gap-2">
                {table.map((entry) => (
                  <li key={entry.playerId}>
                    <Link
                      href={`/players/${entry.playerId}`}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 transition-colors hover:border-primary/60 sm:px-4",
                        entry.rank <= 3 ? "border-primary/40" : "border-border"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold",
                          entry.rank === 1
                            ? "bg-primary text-primary-foreground"
                            : entry.rank <= 3
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {entry.rank <= 3 ? <Medal className="size-4" /> : entry.rank}
                      </span>
                      <Avatar className="size-10 shrink-0">
                        {entry.photoUrl ? <AvatarImage src={entry.photoUrl} alt={entry.name} /> : null}
                        <AvatarFallback>{initials(entry.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">
                          {entry.rank <= 3 ? <span className="mr-1 text-primary">#{entry.rank}</span> : null}
                          {entry.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.wins}W · {entry.matchesPlayed - entry.wins}L · Frames {entry.framesWon}–{entry.framesLost}
                          {entry.highestBreak > 0 ? ` · HB ${entry.highestBreak}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-heading text-xl font-bold text-primary">{entry.points}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">pts</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}
