import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getMyProfile } from "@/lib/auth/get-viewer";
import { clubPath } from "@/lib/club-path";
import { PageHero } from "@/components/shared/page-hero";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { NotificationOptIn } from "@/features/profile/components/notification-opt-in";

export const metadata: Metadata = { title: "Complete Your Profile" };

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ clubSlug: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { clubSlug } = await params;
  const session = await getSession();
  if (!session) {
    redirect(`${clubPath(clubSlug, "/login")}?redirect=${encodeURIComponent(clubPath(clubSlug, "/account/profile"))}`);
  }

  const { redirect: redirectParam } = await searchParams;
  const redirectTo =
    redirectParam && redirectParam.startsWith("/") ? redirectParam : clubPath(clubSlug, "/dashboard");

  const profile = await getMyProfile();
  if (!profile) {
    redirect(clubPath(clubSlug));
  }

  return (
    <>
      <PageHero
        title="Complete Your Profile"
        description="A complete profile is required before you can register for tournaments."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Profile" }]}
      />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <NotificationOptIn />
        <ProfileForm profile={profile} redirectTo={redirectTo} />
      </div>
    </>
  );
}
