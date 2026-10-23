import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getViewer } from "@/lib/auth/get-viewer";
import { getClubById, listMembershipsForUser } from "@/services/club-service";
import { getMyClubEnquiry } from "@/services/club-enquiry-service";
import { PlatformHeader } from "@/components/layout/platform-header";
import { CreateClubForm } from "@/features/clubs/components/create-club-form";
import { ClubEnquiryForm } from "@/features/clubs/components/club-enquiry-form";
import { ClubEnquiryStatus } from "@/features/clubs/components/club-enquiry-status";
import { listActiveStates, listCities } from "@/services/location-service";

export const metadata: Metadata = { title: "Create Your Club" };

/** Create Your Club: step 1 asks CueSphere (a club request), step 2 — once the request
 * is approved — creates the club, which CueSphere then approves. Platform admins skip step 1. */
export default async function CreateClubPage({ searchParams }: { searchParams: Promise<{ resend?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/clubs/new");

  const [viewer, { stage, enquiry }, { resend }] = await Promise.all([getViewer(), getMyClubEnquiry(), searchParams]);

  // Already running a live club: go there.
  if (stage === "club_live") {
    const memberships = await listMembershipsForUser(session.id);
    const owned = memberships.find((m) => m.role === "club_admin");
    const club = owned ? await getClubById(owned.clubId) : undefined;
    if (club) redirect(`/c/${club.slug}`);
  }

  const [states, cities] = await Promise.all([listActiveStates(), listCities()]);
  const canCreate = viewer.isPlatformAdmin || stage === "approved";
  const askFirst = !viewer.isPlatformAdmin && (stage === "none" || (stage === "rejected" && resend === "1"));

  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-lg">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            {canCreate ? (viewer.isPlatformAdmin ? "CueSphere" : "Step 2 of 2 · Request approved") : "Step 1 of 2"}
          </span>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{canCreate ? "Create Your Club" : "Tell us about your club"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {canCreate
              ? "Check the details below. We review new clubs once more before they go live — then you can add your logo, tables and tournaments."
              : "The CueSphere team reviews every request. Once it's approved, you add your club's details here."}
          </p>

          <div className="mt-8 space-y-6">
            {!viewer.isPlatformAdmin && stage !== "none" && !(stage === "rejected" && resend === "1") ? (
              <ClubEnquiryStatus stage={stage} enquiry={enquiry} />
            ) : null}

            {canCreate ? (
              <CreateClubForm
                isLoggedIn
                states={states}
                cities={cities}
                initial={stage === "approved" && enquiry ? { name: enquiry.clubName, stateCode: enquiry.stateCode, cityId: enquiry.cityId } : undefined}
              />
            ) : askFirst ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <ClubEnquiryForm
                  states={states}
                  cities={cities}
                  defaults={{ ownerName: viewer.profile?.fullName ?? "", mobile: viewer.profile?.mobile ?? "" }}
                  previous={stage === "rejected" ? enquiry : null}
                />
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
