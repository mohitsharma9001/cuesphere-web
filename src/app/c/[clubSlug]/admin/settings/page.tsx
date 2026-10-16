import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getClubViewer } from "@/lib/auth/get-club-viewer";
import { clubPath } from "@/lib/club-path";
import { isScorekeeperOnly } from "@/types/club";
import { UpdateClubSettingsForm } from "@/features/club-admin/components/update-club-settings-form";
import { ClubLogoUpload } from "@/features/club-admin/components/club-logo-upload";
import { ClubCoverUpload } from "@/features/club-admin/components/club-cover-upload";
import { LinkButton } from "@/components/shared/link-button";
import { listActiveStates, listCities } from "@/services/location-service";

export const metadata: Metadata = { title: "Settings" };

export default async function ClubAdminSettingsPage({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const clubViewer = await getClubViewer(clubSlug);
  if (!clubViewer) return null;
  if (isScorekeeperOnly(clubViewer.membership?.role)) {
    redirect(clubPath(clubSlug, "/admin/live"));
  }

  const [states, cities] = await Promise.all([listActiveStates(), listCities()]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Basic branding for {clubViewer.club.name}.</p>
      <LinkButton href={clubPath(clubSlug, "/admin/gallery")} variant="outline" size="sm" className="mt-3 md:hidden">
        Photo gallery
      </LinkButton>

      <div className="mt-8 max-w-lg space-y-8">
        <ClubLogoUpload clubSlug={clubSlug} initialLogoUrl={clubViewer.club.logoUrl} />
        <ClubCoverUpload clubSlug={clubSlug} initialCoverUrl={clubViewer.club.heroBannerUrl} />
        <UpdateClubSettingsForm clubSlug={clubSlug} club={clubViewer.club} states={states} cities={cities} />
      </div>
    </div>
  );
}
