"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Compass, IndianRupee, LogOut, Megaphone, Menu, Search, ShieldCheck, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/layout/logo";
import { LinkButton } from "@/components/shared/link-button";
import { NavbarUserMenu } from "@/components/layout/navbar-user-menu";
import { useViewer } from "@/components/shared/viewer-provider";
import { useClub } from "@/components/shared/club-provider";
import { useClubViewer } from "@/components/shared/club-viewer-provider";
import { logoutAction } from "@/app/actions/auth-actions";
import { isStaffRole } from "@/types/club";

function NavLink({
  href,
  label,
  basePath,
  homeHref,
}: {
  href: string;
  label: string;
  basePath: string;
  homeHref: string;
}) {
  const pathname = usePathname();
  const fullHref = href === "/" ? homeHref : `${basePath}${href}`;
  const isActive = href === "/" ? pathname === homeHref : pathname.startsWith(fullHref);

  return (
    <Link
      href={fullHref}
      className={cn(
        "relative rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        isActive && "text-foreground"
      )}
    >
      {label}
      {isActive ? (
        <span className="absolute inset-x-3 -bottom-px h-px bg-primary" />
      ) : null}
    </Link>
  );
}

export function Navbar() {
  const viewer = useViewer();
  const { basePath } = useClub();
  const clubViewer = useClubViewer();
  const router = useRouter();
  const isOwner = clubViewer.membership?.role === "club_admin";
  const homeHref = isOwner ? basePath : "/";

  async function handleLogout() {
    await logoutAction();
    router.push(basePath);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 glass pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-0.5 xl:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} basePath={basePath} homeHref={homeHref} />
          ))}
          <Link
            href="/clubs"
            className="ml-1 flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Compass className="size-3.5" />
            Browse Clubs
          </Link>
          <Link
            href="/tournaments"
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Trophy className="size-3.5" />
            All Tournaments
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            className="hidden sm:inline-flex"
          >
            <Search className="size-4" />
          </Button>
          {viewer.user ? (
            <LinkButton
              href={`${basePath}/notifications`}
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative hidden sm:inline-flex"
            >
              <Bell className="size-4" />
              {clubViewer.unreadNotifications > 0 ? (
                <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {clubViewer.unreadNotifications}
                </span>
              ) : null}
            </LinkButton>
          ) : null}
          <NavbarUserMenu />

          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" className="xl:hidden" />}>
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs glass-strong">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <SheetClose
                    key={link.href}
                    nativeButton={false}
                    render={<Link href={link.href === "/" ? homeHref : `${basePath}${link.href}`} />}
                  >
                    <span className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5">
                      {link.label}
                    </span>
                  </SheetClose>
                ))}
                <SheetClose nativeButton={false} render={<Link href="/clubs" />}>
                  <span className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5">
                    <Compass className="size-4" />
                    Browse Clubs
                  </span>
                </SheetClose>
                <SheetClose nativeButton={false} render={<Link href="/for-clubs" />}>
                  <span className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-white/5">
                    <Megaphone className="size-4" />
                    CueSphere for Clubs
                  </span>
                </SheetClose>
                <SheetClose nativeButton={false} render={<Link href="/tournaments" />}>
                  <span className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5">
                    <Trophy className="size-4" />
                    All Tournaments
                  </span>
                </SheetClose>
              </nav>
              <div className="mt-4 flex flex-col gap-2 border-t border-border px-4 pt-4">
                {viewer.user ? (
                  <>
                    <SheetClose
                      nativeButton={false}
                      render={<Button variant="outline" nativeButton={false} render={<Link href={`${basePath}/dashboard`} />} />}
                    >
                      Dashboard
                    </SheetClose>
                    <SheetClose
                      nativeButton={false}
                      render={<Button nativeButton={false} render={<Link href={`${basePath}/account/profile`} />} />}
                    >
                      {viewer.isProfileComplete
                        ? "My Profile"
                        : `Complete Profile (${viewer.profileCompletionPercent}%)`}
                    </SheetClose>
                    {isStaffRole(clubViewer.membership?.role) ? (
                      <SheetClose
                        nativeButton={false}
                        render={<Button variant="outline" nativeButton={false} render={<Link href={`${basePath}/admin`} />} />}
                      >
                        <ShieldCheck className="size-4" /> Club Admin
                      </SheetClose>
                    ) : null}
                    <SheetClose
                      nativeButton={false}
                      render={<Button variant="outline" nativeButton={false} render={<Link href={`${basePath}/account/dues`} />} />}
                    >
                      <IndianRupee className="size-4" /> My dues
                    </SheetClose>
                    <p className="mt-2 truncate px-1 text-xs text-muted-foreground">{viewer.user.email}</p>
                    <SheetClose
                      nativeButton={false}
                      render={<Button variant="ghost" className="text-destructive" onClick={handleLogout} />}
                    >
                      <LogOut className="size-4" /> Logout
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose
                      nativeButton={false}
                      render={<Button variant="outline" nativeButton={false} render={<Link href={`${basePath}/login`} />} />}
                    >
                      Login
                    </SheetClose>
                    <SheetClose
                      nativeButton={false}
                      render={<Button nativeButton={false} render={<Link href={`${basePath}/register`} />} />}
                    >
                      Register
                    </SheetClose>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
