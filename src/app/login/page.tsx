import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Trophy } from "lucide-react";

import { PlatformHeader } from "@/components/layout/platform-header";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Login" };

export default async function PlatformLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  const redirectTo = redirect && redirect.startsWith("/") ? redirect : "/";

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <div className="grid flex-1 lg:grid-cols-2">
        <div className="relative hidden overflow-hidden felt-texture lg:block">
          <Image
            src="/images/landing-hero.jpg"
            alt=""
            fill
            sizes="50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-grid-fade opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-transparent" />
          <div className="absolute -left-24 top-1/3 size-96 rounded-full bg-primary/30 blur-[120px]" />
          <div className="relative flex h-full flex-col items-start justify-center px-16">
            <Trophy className="size-12 text-primary drop-shadow-[0_0_24px_rgba(212,175,55,0.5)]" />
            <h2 className="mt-6 max-w-sm text-3xl font-bold text-foreground drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              One account. Every club.
            </h2>
            <p className="mt-3 max-w-sm text-sm text-white/80">
              Sign in to manage your clubs, or join a club to start playing tournaments.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-16 sm:px-6">
          <div className="w-full max-w-sm">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              CueSphere
            </span>
            <h1 className="mt-2 text-3xl font-bold text-foreground">Login</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your credentials to access your account.
            </p>

            <div className="mt-8">
              <LoginForm redirectTo={redirectTo} />
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href={`/register?redirect=${encodeURIComponent(redirectTo)}`}
                className="font-medium text-primary hover:underline"
              >
                Create one
              </Link>
            </p>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              <Link href="/admin/login" className="inline-flex items-center gap-1.5 font-medium hover:text-primary hover:underline">
                <ShieldCheck className="size-4" /> Login as admin
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
