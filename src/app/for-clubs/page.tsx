import type { Metadata } from "next";
import Image from "next/image";
import {
  BarChart3,
  Bell,
  CalendarClock,
  Check,
  Clock,
  Medal,
  MessageCircle,
  Monitor,
  Radio,
  Scale,
  Smartphone,
  Trophy,
  Users,
  MonitorPlay,
} from "lucide-react";

import { PlatformHeader } from "@/components/layout/platform-header";
import { PlatformFooter } from "@/components/layout/platform-footer";
import { LinkButton } from "@/components/shared/link-button";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "For clubs",
  description:
    "Table timers and billing, dues, tournaments, live scores, TV scoreboards and YouTube streaming — the complete operating system for snooker clubs. Free while we launch.",
};

/** A real snooker table (no people) under a dark wash, so the text on top stays readable. */
function SnookerBackdrop({ strong = false }: { strong?: boolean }) {
  return (
    <>
      {/* Club lights, green cloth and the white ball — wide on computers, tall on phones. */}
      <Image src="/media/hero-table-wide.jpg" alt="" fill priority={!strong} sizes="100vw" className="object-cover max-lg:hidden" />
      <Image src="/media/hero-table-tall.jpg" alt="" fill priority={!strong} sizes="100vw" className="object-cover object-[center_70%] lg:hidden" />
      <div
        className={
          strong
            ? "absolute inset-0 bg-background/80"
            : "absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40 max-lg:bg-gradient-to-b max-lg:from-background/75 max-lg:via-background/45 max-lg:to-background/80"
        }
      />
    </>
  );
}

const WHATSAPP = `https://wa.me/917904551660?text=${encodeURIComponent(
  "Hi! I run a snooker club and I'd like to know more about CueSphere."
)}`;

const SHEET_PROBLEMS = [
  "Start and end times written on paper or a Google Sheet, one sheet per table",
  "“I'll pay later” — and the club forgets who owes what",
  "No idea how much the club made this week until someone adds it up",
];

const FEATURES = [
  { icon: Clock, title: "Table timers & billing", text: "Start a table in one tap. Close it and the bill is worked out to the minute at your rate." },
  { icon: Scale, title: "Loser pays or split", text: "Loser pays, split equally or custom shares. Collect by cash, UPI or card." },
  { icon: Bell, title: "Dues & reminders", text: "Every due tracked by player with the games behind it. Send a reminder or WhatsApp in one tap." },
  { icon: BarChart3, title: "Income reports", text: "Today, this week, this month or any dates — by cash, UPI and card, with every payment listed." },
  { icon: CalendarClock, title: "Bookings & live status", text: "Players see which tables are free and request a booking. You confirm with a tap." },
  { icon: Trophy, title: "Tournaments", text: "Create events, take registrations, track entry fees, build the draw and assign tables." },
  { icon: Smartphone, title: "Referee scoring", text: "Score every ball from a phone — reds, colours, fouls, free balls. Snooker rules built in." },
  { icon: Monitor, title: "TV scoreboards", text: "A TV per table, or one TV that rotates through every live table. Pair with a 6-letter code." },
  { icon: MonitorPlay, title: "YouTube score overlay", text: "Go live on YouTube with a pro score bar that follows every shot. Just add one link." },
  { icon: Radio, title: "Sponsor ads", text: "Your sponsors' ads play between frames on every TV and stream." },
  { icon: Users, title: "Players & friends", text: "Player profiles, follows, alerts when friends play, and friendly matches." },
  { icon: Medal, title: "State & city rankings", text: "Your tournaments feed the Karnataka, West Bengal and Sikkim rankings — players love it." },
];

const STEPS = [
  ["Create your club", "Name, city and state. Takes two minutes."],
  ["Add your tables", "Table numbers and your hourly rate, e.g. ₹300/hr."],
  ["Start your first table", "Your staff use their phones. No new hardware needed."],
];

const FAQ = [
  ["Do players pay anything?", "No. Players and fans always use CueSphere free."],
  ["What do I need?", "Any smartphone for the front desk and referees. For scoreboards, any smart TV or TV stick with a web browser."],
  ["Is it an app?", "It works in the browser and installs like an app on Android and iPhone. An Android app is also available."],
  ["Who sees the dues?", "You see every player's dues at your club. Each player sees only their own."],
  ["What happens after the launch period?", "We'll announce Club Pro pricing in advance, and every club gets a 30-day free trial before paying anything."],
];

export default function ForClubsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <SnookerBackdrop />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_minmax(0,380px)] lg:py-16 lg:px-8">
            <div className="space-y-5">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">CueSphere for clubs</span>
              <h1 className="font-heading text-4xl font-bold leading-[1.05] text-foreground sm:text-5xl">
                Run your club. <span className="text-primary">Stream every frame.</span>
              </h1>
              <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                Table timers and billing, dues, tournaments, live scores, TV scoreboards and YouTube streaming — all from
                your phone. Built for snooker clubs in India.
              </p>
              <div className="flex flex-wrap gap-3">
                <LinkButton href="/clubs/new" size="lg">
                  Start your club — free
                </LinkButton>
                <Button size="lg" variant="outline" nativeButton={false} render={<a href={WHATSAPP} target="_blank" rel="noopener noreferrer" />}>
                  <MessageCircle className="size-4" /> Chat on WhatsApp
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Free while we launch · No card needed · Set up in 2 minutes</p>
            </div>
            <div className="mx-auto w-full max-w-[360px]">
              <div className="overflow-hidden rounded-[28px] border border-border bg-black shadow-2xl">
                <video
                  className="block aspect-[9/16] w-full"
                  src="/media/cuesphere-demo.mp4"
                  poster="/media/cuesphere-demo-poster.jpg"
                  controls
                  playsInline
                  preload="none"
                />
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">Watch the 2-minute demo (sound on)</p>
            </div>
          </div>
        </section>

        {/* The problem */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl space-y-5 px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Still running your club on a sheet?</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {SHEET_PROBLEMS.map((p) => (
                <li key={p} className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  {p}
                </li>
              ))}
            </ul>
            <p className="text-base text-foreground">
              CueSphere replaces all of it: <strong className="text-primary">one screen for every table</strong>, bills worked out for you,
              and a list of exactly who owes what.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Everything your club needs</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-border bg-card p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <p className="mt-3 font-heading text-base font-bold text-foreground">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Up and running today</h2>
            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {STEPS.map(([title, text], i) => (
                <li key={title} className="rounded-2xl border border-border bg-card p-5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary font-heading font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="mt-3 font-heading text-base font-bold text-foreground">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Pricing</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-3xl border-2 border-primary bg-card p-6">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Launch offer
                </span>
                <p className="mt-4 font-heading text-xl font-bold text-foreground">Club Pro</p>
                <p className="mt-1 font-heading text-4xl font-bold text-primary">Free</p>
                <p className="text-sm text-muted-foreground">while we launch — every feature, every table</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {[
                    "Unlimited tables, timers and billing",
                    "Dues, reminders and income reports",
                    "Tournaments, referee scoring and live scores",
                    "TV scoreboards and YouTube overlay",
                    "Sponsor ads between frames",
                    "Bookings and live table status for players",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
                    </li>
                  ))}
                </ul>
                <LinkButton href="/clubs/new" size="lg" className="mt-6 w-full">
                  Start your club — free
                </LinkButton>
              </div>
              <div className="flex flex-col justify-center rounded-3xl border border-border bg-card p-6">
                <p className="font-heading text-xl font-bold text-foreground">After the launch</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  When paid plans start, we&apos;ll tell you well in advance. Every club gets a{" "}
                  <strong className="text-foreground">30-day free trial</strong> of Club Pro before paying anything — and you can always
                  keep using the free plan.
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  <strong className="text-foreground">Players and fans never pay.</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl space-y-3 px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Questions</h2>
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-border bg-card px-5 py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-semibold text-foreground">
                  <span>{q}</span>
                  <span className="shrink-0 text-lg leading-none text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final call */}
        <section className="relative overflow-hidden">
          <SnookerBackdrop strong />
          <div className="relative mx-auto max-w-3xl space-y-5 px-4 py-14 text-center sm:px-6 lg:px-8">
            <h2 className="font-heading text-3xl font-bold text-foreground">Bring your club onto CueSphere</h2>
            <p className="text-muted-foreground">Free while we launch. Takes two minutes. Questions? Message us on WhatsApp.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <LinkButton href="/clubs/new" size="lg">
                Start your club — free
              </LinkButton>
              <Button size="lg" variant="outline" nativeButton={false} render={<a href={WHATSAPP} target="_blank" rel="noopener noreferrer" />}>
                <MessageCircle className="size-4" /> +91 79045 51660
              </Button>
            </div>
          </div>
        </section>
      </main>
      <PlatformFooter />
    </div>
  );
}
