import { notFound } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Trophy, Settings, Radio, Image as ImageIcon, Home, Tv, Timer } from "lucide-react";

import { getClubViewer } from "@/lib/auth/get-club-viewer";
import { getSession } from "@/lib/auth/session";
import { getActiveScorekeeperAssignment } from "@/services/tournament-scorekeeper-service";
import { clubPath } from "@/lib/club-path";
import { isScorekeeperOnly } from "@/types/club";
import { AdminTabBar } from "@/components/layout/admin-tab-bar";

export default async function ClubAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const clubViewer = await getClubViewer(clubSlug);
  if (!clubViewer) notFound();

  // A tournament-scoped scorekeeper has no club membership at all — they can
  // only reach the one match-scoring page for their assigned tournament, so
  // they skip the staff sidebar entirely rather than 404ing.
  if (!clubViewer.isStaff) {
    const session = await getSession();
    const assignment = session ? await getActiveScorekeeperAssignment(session.id) : null;
    if (!assignment || assignment.clubSlug !== clubSlug) notFound();

    return (
      <main className="mx-auto max-w-3xl px-4 pb-8 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6 sm:py-8 lg:px-8">{children}</main>
    );
  }

  const basePath = clubPath(clubSlug, "/admin");
  const scorekeeperOnly = isScorekeeperOnly(clubViewer.membership?.role);

  const navItems = scorekeeperOnly
    ? [{ href: `${basePath}/live`, label: "Live Scoring", icon: Radio }]
    : [
        { href: basePath, label: "Overview", icon: LayoutDashboard },
        { href: `${basePath}/tables`, label: "Tables", icon: Timer },
        { href: `${basePath}/tournaments`, label: "Tournaments", icon: Trophy },
        { href: `${basePath}/live`, label: "Live Scoring", icon: Radio },
        { href: `${basePath}/screens`, label: "TV & Stream", icon: Tv },
        { href: `${basePath}/gallery`, label: "Gallery", icon: ImageIcon },
        { href: `${basePath}/settings`, label: "Settings", icon: Settings },
      ];

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 pb-8 sm:px-6 md:flex-row md:gap-8 md:py-8 lg:px-8">
      <header className="sticky top-0 z-40 -mx-4 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-lg box-content sm:-mx-6 sm:px-6 md:hidden">
        <Link
          href={clubPath(clubSlug)}
          className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"
        >
          <Home className="size-3.5 shrink-0" />
          <span className="truncate">{clubViewer.club.name}</span>
        </Link>
        <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
          Admin
        </span>
      </header>
      <aside className="hidden w-56 shrink-0 md:block">
        <Link
          href={clubPath(clubSlug)}
          className="mb-4 flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-[0.2em] text-primary hover:text-primary/80"
        >
          <Home className="size-3.5" />
          {clubViewer.club.name}
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
      <AdminTabBar basePath={basePath} scorekeeperOnly={scorekeeperOnly} />
    </div>
  );
}
