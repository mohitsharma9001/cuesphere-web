import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Trophy, Radio, Users, ArrowRight } from "lucide-react";

import { listClubsWithCounts, listMembershipsForUser, getClubById } from "@/services/club-service";
import { getSession } from "@/lib/auth/session";
import { clubPath } from "@/lib/club-path";
import { PlatformHeader } from "@/components/layout/platform-header";
import { PlatformFooter } from "@/components/layout/platform-footer";
import { LinkButton } from "@/components/shared/link-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ClubCard } from "@/features/platform/components/club-card";
import { Reveal, RevealGroup, RevealItem } from "@/components/shared/reveal";

export const metadata: Metadata = { title: "CueSphere — The Complete Operating System for Snooker & Pool Clubs" };

export default async function LandingPage() {
  // Start loading the club list while we check whether to redirect a club owner.
  const clubsPromise = listClubsWithCounts();
  clubsPromise.catch(() => {}); // unused if we redirect; any error resurfaces below
  const session = await getSession();
  if (session) {
    const memberships = await listMembershipsForUser(session.id);
    const ownedMembership = memberships.find((m) => m.role === "club_admin");
    if (ownedMembership) {
      const club = await getClubById(ownedMembership.clubId);
      if (club) redirect(clubPath(club.slug));
    }
  }

  // Every club with its member and tournament counts, in one request.
  const clubs = (await clubsPromise).filter(({ club }) => club.status === "approved");

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border">
          <Image
            src="/images/landing-hero.jpg"
            alt="Snooker balls on a table"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-background/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <Reveal className="relative mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
              For Snooker &amp; Pool Clubs
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
              The Complete Operating System for Snooker &amp; Pool Clubs
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground">
              Tournaments, live scoring, player registrations, payments and rankings — all in one
              branded portal for your club. CueSphere gives every club its own home online, without
              writing a line of code.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <LinkButton href="/clubs/new" size="lg">
                Create Your Club <ArrowRight className="size-4" />
              </LinkButton>
              <LinkButton href="/clubs" variant="outline" size="lg">
                Browse Clubs
              </LinkButton>
            </div>
          </Reveal>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <RevealGroup className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Trophy,
                eyebrow: "01",
                title: "Run Tournaments",
                description:
                  "Registration, draws, fixtures and results — managed end to end for every event your club hosts.",
              },
              {
                icon: Radio,
                eyebrow: "02",
                title: "Live Scoring",
                description:
                  "Frame-by-frame live match centres your players and fans can follow in real time.",
              },
              {
                icon: Users,
                eyebrow: "03",
                title: "One Account, Every Club",
                description:
                  "Players sign up once and can join as many clubs as they like, keeping their history with each.",
              },
            ].map(({ icon: Icon, eyebrow, title, description }) => (
              <RevealItem
                key={title}
                className="card-hover group relative overflow-hidden rounded-2xl border border-border bg-card p-6"
              >
                <div className="absolute -right-6 -top-6 size-28 rounded-full bg-primary/10 blur-2xl transition-colors group-hover:bg-primary/20" />
                <div className="relative flex items-start justify-between">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 text-primary shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                    <Icon className="size-6" strokeWidth={1.6} />
                  </span>
                  <span className="font-tabular text-2xl font-bold text-border">{eyebrow}</span>
                </div>
                <p className="relative mt-5 font-heading text-lg font-bold text-foreground">{title}</p>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        <section id="clubs" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Reveal className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">Clubs on CueSphere</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Find your club, or explore what other clubs are running.
              </p>
            </div>
          </Reveal>

          {clubs.length === 0 ? (
            <EmptyState
              icon={<Trophy className="size-6" />}
              title="No clubs yet"
              description="Be the first to bring your club onto CueSphere."
              action={<LinkButton href="/clubs/new">Create Your Club</LinkButton>}
            />
          ) : (
            <RevealGroup className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {clubs.map(({ club, tournamentCount, memberCount }) => (
                <RevealItem key={club.id}>
                  <ClubCard club={club} tournamentCount={tournamentCount} memberCount={memberCount} />
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </section>
      </main>

      <PlatformFooter />
    </div>
  );
}
