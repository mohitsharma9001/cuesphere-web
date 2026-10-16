import { cache } from "react";
import { getSession } from "@/lib/auth/session";
import { getClubBySlug, getMembership } from "@/services/club-service";
import { getProfileByUserId } from "@/services/profile-service";
import { getUnreadCount } from "@/services/notification-service";
import { getRegistrationsForPlayer } from "@/services/registration-service";
import { getPlayerCurrentMatch } from "@/services/match-service";
import { isStaffRole, type Club, type ClubMembership } from "@/types/club";

export interface ClubViewer {
  club: Club;
  membership: ClubMembership | null;
  isStaff: boolean;
  unreadNotifications: number;
  activeRegistrationId: string | null;
  currentMatchId: string | null;
}

/** Club-scoped viewer — resolves the club by slug and the caller's role in it.
 * Memoized per-request (keyed on clubSlug): the club layout calls this, and
 * every page nested under it calls it again independently since Server
 * Component pages can't read the layout's React Context — cache() collapses
 * those into a single set of queries instead of running them twice. */
export const getClubViewer = cache(async (clubSlug: string): Promise<ClubViewer | null> => {
  // Independent lookups — run together instead of one after the other.
  const [club, user] = await Promise.all([getClubBySlug(clubSlug), getSession()]);
  if (!club) return null;

  if (!user) {
    return { club, membership: null, isStaff: false, unreadNotifications: 0, activeRegistrationId: null, currentMatchId: null };
  }

  const [membership, profile, unreadNotifications] = await Promise.all([
    getMembership(club.id, user.id),
    getProfileByUserId(user.id),
    getUnreadCount(user.id, club.id),
  ]);

  const registrations = profile ? await getRegistrationsForPlayer(profile.id, club.id) : [];
  const activeRegistration = registrations[0];
  const currentMatch =
    profile && activeRegistration
      ? await getPlayerCurrentMatch(activeRegistration.tournamentId, profile.id)
      : undefined;

  return {
    club,
    membership: membership ?? null,
    isStaff: isStaffRole(membership?.role),
    unreadNotifications,
    activeRegistrationId: activeRegistration?.id ?? null,
    currentMatchId: currentMatch?.id ?? null,
  };
});
