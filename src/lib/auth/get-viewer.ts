import { cache } from "react";
import { getSession } from "@/lib/auth/session";
import { api, ApiRequestError } from "@/lib/api/server";
import { profileFromApi } from "@/services/profile-service";
import { getProfileCompletion } from "@/types/player-profile";
import type { ClubMembership } from "@/types/club";
import type { SessionUser } from "@/types/user";
import type { PlayerProfile } from "@/types/player-profile";

export interface Viewer {
  user: SessionUser | null;
  profile: PlayerProfile | null;
  profileCompletionPercent: number;
  isProfileComplete: boolean;
  /** Has this user already created (or been granted) a club of their own —
   * used to hide "Create Your Club" once that's already true. */
  ownsClub: boolean;
  /** Can approve or reject new clubs. */
  isPlatformAdmin: boolean;
  /** Clubs waiting for approval (only counted for platform admins). */
  pendingClubCount: number;
  /** Club requests (enquiries) waiting for review (platform admins). */
  pendingEnquiryCount: number;
}

interface ViewerResponse {
  profile: Parameters<typeof profileFromApi>[0] | null;
  memberships: Pick<ClubMembership, "role">[];
  isPlatformAdmin: boolean;
  pendingClubCount: number;
  pendingEnquiryCount?: number;
}

const SIGNED_OUT: Viewer = {
  user: null,
  profile: null,
  profileCompletionPercent: 0,
  isProfileComplete: false,
  ownsClub: false,
  isPlatformAdmin: false,
  pendingClubCount: 0,
  pendingEnquiryCount: 0,
};

/** Global viewer — auth + player identity, independent of any club context.
 * One API call (GET /viewer), memoized per request: the root layout and many
 * pages ask for it on the same navigation. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const user = await getSession();
  if (!user) return SIGNED_OUT;

  let data: ViewerResponse;
  try {
    data = await api<ViewerResponse>("/viewer");
  } catch (error) {
    // The token stopped being valid since the session check — treat as signed out.
    if (error instanceof ApiRequestError && error.status === 401) return SIGNED_OUT;
    throw error;
  }

  const profile = data.profile ? profileFromApi(data.profile) : null;
  const completion = getProfileCompletion(profile ?? undefined);

  return {
    user,
    profile,
    profileCompletionPercent: completion.percent,
    isProfileComplete: completion.isComplete,
    ownsClub: data.memberships.some((m) => m.role === "club_admin"),
    isPlatformAdmin: data.isPlatformAdmin,
    pendingClubCount: data.pendingClubCount,
    pendingEnquiryCount: data.pendingEnquiryCount ?? 0,
  };
});

/** The signed-in user's own profile, from the per-request viewer — no extra
 * API call (same data as getProfileByUserId(session.id)). */
export async function getMyProfile(): Promise<PlayerProfile | undefined> {
  return (await getViewer()).profile ?? undefined;
}
