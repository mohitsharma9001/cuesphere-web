import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, Users } from "lucide-react";

import { getClubBySlug, listMembersWithProfiles } from "@/services/club-service";
import { PageHero } from "@/components/shared/page-hero";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { EmptyState } from "@/components/shared/empty-state";
import { RevealGroup, RevealItem } from "@/components/shared/reveal";
import { PlayerLink } from "@/features/club-admin/components/player-link";
import { isStaffRole } from "@/types/club";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}): Promise<Metadata> {
  const { clubSlug } = await params;
  const club = await getClubBySlug(clubSlug);
  return { title: club ? `Members — ${club.name}` : "Members" };
}

const ROLE_LABELS: Record<string, string> = {
  club_admin: "Club Admin",
  club_staff_receptionist: "Receptionist",
  club_staff_referee: "Referee",
  club_staff_scorekeeper: "Scorekeeper",
  player: "Member",
};

export default async function ClubMembersPage({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;

  const club = await getClubBySlug(clubSlug);
  if (!club) notFound();

  // One request for every member and their profile (not one per member).
  const members = await listMembersWithProfiles(club.id);
  members.sort((a, b) => (a.profile?.fullName ?? "").localeCompare(b.profile?.fullName ?? ""));

  return (
    <div>
      <PageHero
        title="Members"
        description={`Everyone who's part of ${club.name}.`}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Members" }]}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {members.length === 0 ? (
          <EmptyState
            icon={<Users className="size-6" />}
            title="No members yet"
            description="Members will appear here as players and staff join the club."
          />
        ) : (
          <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map(({ membership, profile }) => {
              const name = profile?.fullName || "Unnamed Member";
              const card = (
                <div className="card-hover flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <AvatarInitials name={name} photoUrl={profile?.profilePhotoUrl} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate font-heading font-bold text-foreground">{name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {isStaffRole(membership.role) ? (
                        <ShieldCheck className="size-3.5 text-primary" />
                      ) : null}
                      {ROLE_LABELS[membership.role] ?? membership.role}
                    </p>
                  </div>
                </div>
              );

              return (
                <RevealItem key={membership.id}>
                  {profile ? (
                    <PlayerLink clubSlug={clubSlug} playerId={profile.id}>
                      {card}
                    </PlayerLink>
                  ) : (
                    card
                  )}
                </RevealItem>
              );
            })}
          </RevealGroup>
        )}
      </div>
    </div>
  );
}
