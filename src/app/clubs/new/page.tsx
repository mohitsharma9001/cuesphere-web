import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getClubById, listMembershipsForUser } from "@/services/club-service";
import { PlatformHeader } from "@/components/layout/platform-header";
import { CreateClubForm } from "@/features/clubs/components/create-club-form";
import { listActiveStates, listCities } from "@/services/location-service";

export const metadata: Metadata = { title: "Create Your Club" };

export default async function CreateClubPage() {
  const session = await getSession();

  if (session) {
    const memberships = await listMembershipsForUser(session.id);
    const ownedMembership = memberships.find((m) => m.role === "club_admin");
    if (ownedMembership) {
      const ownedClub = await getClubById(ownedMembership.clubId);
      if (ownedClub) {
        redirect(`/c/${ownedClub.slug}`);
      }
    }
  }

  const [states, cities] = await Promise.all([listActiveStates(), listCities()]);

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            CueSphere
          </span>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Create Your Club</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;ll be the Club Admin. Once approved, you can customise branding, add your
            logo and start creating tournaments.
          </p>

          <div className="mt-8">
            <CreateClubForm isLoggedIn={!!session} states={states} cities={cities} />
          </div>
        </div>
      </main>
    </div>
  );
}
