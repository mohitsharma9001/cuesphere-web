"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, ShieldCheck, UserCog, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/shared/link-button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useViewer } from "@/components/shared/viewer-provider";
import { logoutAction } from "@/app/actions/auth-actions";
import { PlatformTabBar } from "@/components/layout/platform-tab-bar";

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/40 bg-primary/10">
        <Image src="/branding/cuesphere-icon.png" alt="CueSphere" fill className="object-cover" />
      </span>
      <span className="font-heading text-base font-bold tracking-tight text-foreground">
        Cue<span className="text-primary">Sphere</span>
      </span>
    </Link>
  );
}

/** Small count of clubs waiting for approval. */
function PendingBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
      {count}
    </span>
  );
}

export function PlatformHeader() {
  const viewer = useViewer();
  const router = useRouter();

  async function handleLogout() {
    await logoutAction();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-50 glass pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Brand />

          {/* Desktop nav — collapses into the sheet menu below md */}
          <div className="hidden items-center gap-2 md:flex">
            <LinkButton href="/clubs" variant="ghost" size="sm">
              Browse Clubs
            </LinkButton>
            <LinkButton href="/tournaments" variant="ghost" size="sm">
              Tournaments
            </LinkButton>
            <LinkButton href="/rankings" variant="ghost" size="sm">
              Rankings
            </LinkButton>
            <LinkButton href="/for-clubs" variant="ghost" size="sm">
              For Clubs
            </LinkButton>
            {!viewer.ownsClub ? (
              <LinkButton href="/clubs/new" variant="outline" size="sm">
                Create Your Club
              </LinkButton>
            ) : null}
            {viewer.user ? (
              <>
                {viewer.isPlatformAdmin ? (
                  <LinkButton href="/platform/admin" variant="ghost" size="sm">
                    <ShieldCheck className="size-4 text-primary" /> Club Approvals
                    <PendingBadge count={viewer.pendingClubCount} />
                  </LinkButton>
                ) : null}
                <LinkButton href="/play" variant="ghost" size="sm">
                  Friendlies
                </LinkButton>
                <LinkButton href="/players" variant="ghost" size="sm">
                  Players
                </LinkButton>
                <LinkButton href="/my-clubs" variant="ghost" size="sm">
                  My Clubs
                </LinkButton>
                <LinkButton href="/friends" variant="ghost" size="icon" aria-label="My Friends">
                  <Users className="size-4" />
                </LinkButton>
                <LinkButton href="/account/profile" variant="ghost" size="icon" aria-label="My Profile">
                  <UserCog className="size-4" />
                </LinkButton>
                <span className="hidden max-w-[10rem] truncate text-sm text-muted-foreground lg:inline">
                  {viewer.user.email}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="size-3.5" /> Logout
                </Button>
              </>
            ) : (
              <>
                <LinkButton href="/login" variant="ghost" size="sm">
                  Login
                </LinkButton>
                <LinkButton href="/register" size="sm">
                  Register
                </LinkButton>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden" />}>
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs glass-strong">
              <SheetHeader>
                <SheetTitle>
                  <Brand />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                <SheetClose nativeButton={false} render={<Link href="/clubs" />}>
                  <span className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5">
                    Browse Clubs
                  </span>
                </SheetClose>
                <SheetClose nativeButton={false} render={<Link href="/tournaments" />}>
                  <span className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5">
                    Tournaments
                  </span>
                </SheetClose>
                <SheetClose nativeButton={false} render={<Link href="/rankings" />}>
                  <span className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5">
                    Rankings
                  </span>
                </SheetClose>
                <SheetClose nativeButton={false} render={<Link href="/for-clubs" />}>
                  <span className="block rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-white/5">
                    For Clubs
                  </span>
                </SheetClose>
                {!viewer.ownsClub ? (
                  <SheetClose nativeButton={false} render={<Link href="/clubs/new" />}>
                    <span className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5">
                      Create Your Club
                    </span>
                  </SheetClose>
                ) : null}
                {viewer.user ? (
                  <>
                    {viewer.isPlatformAdmin ? (
                      <SheetClose nativeButton={false} render={<Link href="/platform/admin" />}>
                        <span className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-white/5">
                          <ShieldCheck className="size-4" /> Club Approvals
                          <PendingBadge count={viewer.pendingClubCount} />
                        </span>
                      </SheetClose>
                    ) : null}
                    <SheetClose nativeButton={false} render={<Link href="/play" />}>
                      <span className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5">
                        Friendlies
                      </span>
                    </SheetClose>
                    <SheetClose nativeButton={false} render={<Link href="/players" />}>
                      <span className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5">
                        Players
                      </span>
                    </SheetClose>
                    <SheetClose nativeButton={false} render={<Link href="/my-clubs" />}>
                      <span className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5">
                        My Clubs
                      </span>
                    </SheetClose>
                    <SheetClose nativeButton={false} render={<Link href="/friends" />}>
                      <span className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5">
                        My Friends
                      </span>
                    </SheetClose>
                    <SheetClose nativeButton={false} render={<Link href="/account/profile" />}>
                      <span className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5">
                        My Profile
                      </span>
                    </SheetClose>
                  </>
                ) : null}
              </nav>
              <div className="mt-4 flex flex-col gap-2 border-t border-border px-4 pt-4">
                {viewer.user ? (
                  <>
                    <p className="truncate px-1 text-xs text-muted-foreground">{viewer.user.email}</p>
                    <SheetClose
                      nativeButton={false}
                      render={<Button variant="outline" onClick={handleLogout} />}
                    >
                      <LogOut className="size-3.5" /> Logout
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose
                      nativeButton={false}
                      render={<Button variant="outline" nativeButton={false} render={<Link href="/login" />} />}
                    >
                      Login
                    </SheetClose>
                    <SheetClose
                      nativeButton={false}
                      render={<Button nativeButton={false} render={<Link href="/register" />} />}
                    >
                      Register
                    </SheetClose>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <PlatformTabBar />
    </>
  );
}
