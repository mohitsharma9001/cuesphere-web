import { getSession } from "@/lib/auth/session";
import { getProfileByUserId } from "@/services/profile-service";
import { countPendingClubs, isPlatformAdmin, listMembershipsForUser } from "@/services/club-service";
import { getProfileCompletion } from "@/types/player-profile";
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
}

/** Global viewer — auth + player identity, independent of any club context. */
export async function getViewer(): Promise<Viewer> {
  const user = await getSession();
  if (!user) {
    return {
      user: null,
      profile: null,
      profileCompletionPercent: 0,
      isProfileComplete: false,
      ownsClub: false,
      isPlatformAdmin: false,
      pendingClubCount: 0,
    };
  }

  const [profile, memberships, platformAdmin] = await Promise.all([
    getProfileByUserId(user.id),
    listMembershipsForUser(user.id),
    isPlatformAdmin(user.id),
  ]);
  const pendingClubCount = platformAdmin ? await countPendingClubs() : 0;
  const completion = getProfileCompletion(profile ?? undefined);

  return {
    user,
    profile: profile ?? null,
    profileCompletionPercent: completion.percent,
    isProfileComplete: completion.isComplete,
    ownsClub: memberships.some((m) => m.role === "club_admin"),
    isPlatformAdmin: platformAdmin,
    pendingClubCount,
  };
}
