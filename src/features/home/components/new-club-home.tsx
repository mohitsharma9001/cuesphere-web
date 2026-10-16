import Image from "next/image";
import Link from "next/link";
import { Trophy, Users } from "lucide-react";

import { LinkButton } from "@/components/shared/link-button";
import { EmptyState } from "@/components/shared/empty-state";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { Reveal, RevealGroup, RevealItem } from "@/components/shared/reveal";
import { ClubTournamentCard, type ClubTournamentCardData } from "@/features/club-admin/components/club-tournament-card";
import { clubPath } from "@/lib/club-path";
import type { Club } from "@/types/club";

export function NewClubHome({
  club,
  tournaments,
  memberCount,
  totalTournamentCount,
  afterHero,
}: {
  club: Club;
  tournaments: ClubTournamentCardData[];
  memberCount: number;
  totalTournamentCount: number;
  /** Shown right under the welcome banner (e.g. live table status). */
  afterHero?: React.ReactNode;
}) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border felt-texture">
        {club.heroBannerUrl ? (
          <>
            <Image
              src={club.heroBannerUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-background/70" />
          </>
        ) : null}
        <div className="absolute inset-0 bg-grid-fade opacity-30" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <Reveal>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
              Welcome To
            </span>
            <h1 className="mt-3 text-4xl font-bold leading-[1.05] text-foreground sm:text-5xl">
              {club.name}
            </h1>
            {club.tagline ? (
              <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-primary/90">
                {club.tagline}
              </p>
            ) : null}
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <LinkButton href={clubPath(club.slug, "/tournaments")} size="lg">
                Browse Tournaments
              </LinkButton>
            </div>
          </Reveal>
        </div>
      </section>

      {afterHero}

      <section className="border-b border-border bg-card/40">
        <Reveal className="mx-auto flex max-w-7xl items-center justify-center gap-10 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Trophy className="size-5" />
            </span>
            <div>
              <AnimatedCounter
                value={totalTournamentCount}
                className="block text-2xl font-bold text-foreground"
              />
              <p className="text-xs text-muted-foreground">Tournaments</p>
            </div>
          </div>
          <Link
            href={clubPath(club.slug, "/members")}
            className="flex items-center gap-3 transition-all hover:scale-[1.03] hover:opacity-80"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <div>
              <AnimatedCounter
                value={memberCount}
                className="block text-2xl font-bold text-foreground"
              />
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </Link>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="font-heading text-xl font-bold text-foreground">Upcoming Tournaments</h2>
        </Reveal>

        {tournaments.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<Trophy className="size-6" />}
            title="No tournaments yet"
            description={`${club.name} hasn't announced a tournament yet. Check back soon.`}
          />
        ) : (
          <RevealGroup className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <RevealItem key={tournament.id}>
                <ClubTournamentCard tournament={tournament} />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </section>
    </>
  );
}
