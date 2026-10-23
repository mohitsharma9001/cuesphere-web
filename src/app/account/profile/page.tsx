import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getMyProfile } from "@/lib/auth/get-viewer";
import { PlatformHeader } from "@/components/layout/platform-header";
import { PlatformFooter } from "@/components/layout/platform-footer";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { NotificationOptIn } from "@/features/profile/components/notification-opt-in";

export const metadata: Metadata = { title: "My Profile" };

export default async function PlatformProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent("/account/profile")}`);
  }

  const { redirect: redirectParam } = await searchParams;
  const redirectTo = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";

  const profile = await getMyProfile();
  if (!profile) redirect("/");

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">My Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep your details up to date across every club you're part of.
          </p>
          <div className="mt-8 space-y-6">
            <NotificationOptIn />
            <ProfileForm profile={profile} redirectTo={redirectTo} />
          </div>
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}
