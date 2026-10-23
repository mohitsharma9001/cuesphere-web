import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Trophy } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { getMyProfile } from "@/lib/auth/get-viewer";
import { getRegistrationsForPlayer } from "@/services/registration-service";
import { getClubBySlug } from "@/services/club-service";
import { clubPath } from "@/lib/club-path";
import { PageHero } from "@/components/shared/page-hero";
import { EmptyState } from "@/components/shared/empty-state";
import { LinkButton } from "@/components/shared/link-button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const club = await getClubBySlug(clubSlug);
  if (!club) notFound();

  const session = await getSession();
  if (!session) {
    redirect(`${clubPath(clubSlug, "/login")}?redirect=${encodeURIComponent(clubPath(clubSlug, "/dashboard"))}`);
  }

  const profile = await getMyProfile();
  const registrations = profile ? await getRegistrationsForPlayer(profile.id, club.id) : [];

  if (registrations.length > 0) {
    redirect(clubPath(clubSlug, `/dashboard/tournaments/${registrations[0].id}`));
  }

  return (
    <>
      <PageHero title="Dashboard" breadcrumbs={[{ label: "Home", href: "/" }, { label: "Dashboard" }]} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <EmptyState
          icon={<Trophy className="size-6" />}
          title="No tournament registrations yet"
          description="Register for an open tournament to see your dashboard here."
          action={
            <LinkButton href={clubPath(clubSlug, "/tournaments?status=registration-open")}>
              Browse Tournaments
            </LinkButton>
          }
        />
      </div>
    </>
  );
}
