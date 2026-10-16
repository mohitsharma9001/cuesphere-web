import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PlatformHeader } from "@/components/layout/platform-header";
import { ChallengeForm, type VenueOption } from "@/features/friendlies/components/challenge-form";
import { getViewer } from "@/lib/auth/get-viewer";
import { getSiteUrl } from "@/lib/site-url";
import { listClubs } from "@/services/club-service";
import { getProfileById } from "@/services/profile-service";
import { listCities, listStates } from "@/services/location-service";

export const metadata: Metadata = { title: "Challenge a Player" };

export default async function NewFriendlyPage({
  searchParams,
}: {
  searchParams: Promise<{ opponent?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer.user) redirect("/login?redirect=%2Fplay%2Fnew");
  if (!viewer.profile) redirect("/account/profile");

  const { opponent: opponentId } = await searchParams;
  const [clubs, states, cities, opponent, siteUrl] = await Promise.all([
    listClubs(),
    listStates(),
    listCities(),
    opponentId && opponentId !== viewer.profile.id ? getProfileById(opponentId) : undefined,
    getSiteUrl(),
  ]);

  const stateName = new Map(states.map((s) => [s.code, s.name]));
  const cityName = new Map(cities.map((c) => [c.id, c.name]));
  const venues: VenueOption[] = clubs
    .filter((c) => c.status === "approved")
    .map((c) => {
      const place = [c.cityId ? cityName.get(c.cityId) : undefined, c.stateCode ? stateName.get(c.stateCode) : undefined]
        .filter(Boolean)
        .join(", ");
      return { id: c.id, label: place ? `${c.name} · ${place}` : c.name };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
          <Link href="/play" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" /> Friendlies
          </Link>
          <h1 className="mt-3 font-heading text-2xl font-bold text-foreground">Challenge a player</h1>
          <p className="mt-1 text-sm text-muted-foreground">Anyone already on CueSphere.</p>
          <div className="mt-6">
            <ChallengeForm
              venues={venues}
              inviteUrl={`${siteUrl}/register`}
              initialOpponent={
                opponent?.fullName
                  ? {
                      id: opponent.id,
                      name: opponent.fullName,
                      memberId: opponent.memberId,
                      city: opponent.city,
                      photoUrl: opponent.profilePhotoUrl,
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
