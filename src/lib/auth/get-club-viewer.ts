import { cache } from "react";
import { getSession } from "@/lib/auth/session";
import { api, ApiRequestError } from "@/lib/api/server";
import { getClubBySlug } from "@/services/club-service";
import { isStaffRole, type Club, type ClubMembership } from "@/types/club";

export interface ClubViewer {
  club: Club;
  membership: ClubMembership | null;
  isStaff: boolean;
  unreadNotifications: number;
  activeRegistrationId: string | null;
  currentMatchId: string | null;
}

interface ClubStanding {
  membership: ClubMembership | null;
  unreadNotifications: number;
  activeRegistrationId: string | null;
  currentMatchId: string | null;
}

const NO_STANDING: ClubStanding = { membership: null, unreadNotifications: 0, activeRegistrationId: null, currentMatchId: null };

/** The signed-in user's membership, unread count, active registration and
 * current match in this club — one call (GET /viewer/clubs/:slug). */
async function getClubStanding(clubSlug: string): Promise<ClubStanding> {
  if (!(await getSession())) return NO_STANDING;
  try {
    const standing = await api<ClubStanding>(`/viewer/clubs/${encodeURIComponent(clubSlug)}`);
    const m = standing.membership;
    return {
      ...standing,
      membership: m
        ? { id: m.id, clubId: m.clubId, userId: m.userId, memberId: m.memberId ?? "", role: m.role, createdAt: m.createdAt }
        : null,
    };
  } catch (error) {
    // Unknown club (handled by getClubBySlug) or a token that just expired.
    if (error instanceof ApiRequestError && (error.status === 401 || error.status === 404)) return NO_STANDING;
    throw error;
  }
}

/** Club-scoped viewer — resolves the club by slug and the caller's role in it.
 * Memoized per-request (keyed on clubSlug): the club layout calls this, and
 * every page nested under it calls it again independently since Server
 * Component pages can't read the layout's React Context — cache() collapses
 * those into a single set of requests. The club itself comes from
 * getClubBySlug (shared with the pages' own lookups); both requests run at once. */
export const getClubViewer = cache(async (clubSlug: string): Promise<ClubViewer | null> => {
  const [club, standing] = await Promise.all([getClubBySlug(clubSlug), getClubStanding(clubSlug)]);
  if (!club) return null;

  return {
    club,
    membership: standing.membership,
    isStaff: isStaffRole(standing.membership?.role),
    unreadNotifications: standing.unreadNotifications,
    activeRegistrationId: standing.activeRegistrationId,
    currentMatchId: standing.currentMatchId,
  };
});
