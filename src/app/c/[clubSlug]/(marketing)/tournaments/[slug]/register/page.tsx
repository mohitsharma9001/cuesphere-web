import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { getMyProfile } from "@/lib/auth/get-viewer";
import { getProfileCompletion } from "@/types/player-profile";
import { checkRegistrationEligibility, getTournamentBySlug } from "@/services/tournament-service";
import { clubPath } from "@/lib/club-path";
import { PageHero } from "@/components/shared/page-hero";
import { EmptyState } from "@/components/shared/empty-state";
import { LinkButton } from "@/components/shared/link-button";
import { RegistrationForm } from "@/features/registration/components/registration-form";

export const metadata: Metadata = { title: "Register" };

const ELIGIBILITY_MESSAGES = {
  closed: "Registration for this tournament is closed.",
  full: "This tournament has reached its maximum player capacity.",
  already_registered: "You are already registered for this tournament.",
};

export default async function TournamentRegisterPage({
  params,
}: {
  params: Promise<{ clubSlug: string; slug: string }>;
}) {
  const { clubSlug, slug } = await params;
  const redirectPath = clubPath(clubSlug, `/tournaments/${slug}/register`);

  const session = await getSession();
  if (!session) {
    redirect(`${clubPath(clubSlug, "/login")}?redirect=${encodeURIComponent(redirectPath)}`);
  }

  const profile = await getMyProfile();
  const { isComplete } = getProfileCompletion(profile);
  if (!profile || !isComplete) {
    redirect(`${clubPath(clubSlug, "/account/profile")}?redirect=${encodeURIComponent(redirectPath)}`);
  }

  const tournament = getTournamentBySlug(slug);
  if (!tournament) {
    notFound();
  }

  const eligibility = await checkRegistrationEligibility(tournament.id, profile.id);

  return (
    <>
      <PageHero
        title="Register"
        description={tournament.name}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Tournaments", href: "/tournaments" },
          { label: tournament.name, href: `/tournaments/${slug}` },
          { label: "Register" },
        ]}
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {eligibility.ok ? (
          <RegistrationForm tournament={tournament} profile={profile} clubSlug={clubSlug} />
        ) : (
          <EmptyState
            icon={<AlertTriangle className="size-6" />}
            title={
              eligibility.reason === "already_registered"
                ? "Already Registered"
                : eligibility.reason === "full"
                  ? "Tournament Full"
                  : "Registration Closed"
            }
            description={ELIGIBILITY_MESSAGES[eligibility.reason]}
            action={
              <LinkButton href={clubPath(clubSlug, `/tournaments/${slug}`)} variant="outline">
                Back to Tournament
              </LinkButton>
            }
          />
        )}
      </div>
    </>
  );
}
