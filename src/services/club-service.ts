import { cache } from "react";
import { api, apiMaybe } from "@/lib/api/server";
import type { Club, ClubMembership } from "@/types/club";
import type { PlayerProfile } from "@/types/player-profile";
import { profileFromApi } from "@/services/profile-service";

/** The API returns clubs and memberships already shaped like the frontend
 * types (camelCase, `id`); these fill in defaults for older documents. */
function toClub(raw: Club): Club {
  return {
    ...raw,
    description: raw.description ?? "",
    stateCode: raw.stateCode ?? null,
    cityId: raw.cityId ?? null,
    socialLinks: raw.socialLinks ?? {},
    aboutText: raw.aboutText ?? "",
    rulesText: raw.rulesText ?? "",
    membershipText: raw.membershipText ?? "",
    privacyPolicyText: raw.privacyPolicyText ?? "",
  };
}

function toMembership(raw: ClubMembership): ClubMembership {
  return {
    id: raw.id,
    clubId: raw.clubId,
    userId: raw.userId,
    memberId: raw.memberId ?? "",
    role: raw.role,
    createdAt: raw.createdAt,
  };
}

const clubPath = (idOrSlug: string) => `/clubs/${encodeURIComponent(idOrSlug)}`;

/** Memoized per-request — called independently by ~2 dozen pages/actions
 * plus getClubViewer() on the same navigation; cache() collapses repeat
 * calls for the same slug into a single request. */
export const getClubBySlug = cache(async (slug: string): Promise<Club | undefined> => {
  if (!slug) return undefined;
  const club = await apiMaybe<Club>(clubPath(slug));
  return club ? toClub(club) : undefined;
});

export const getClubById = cache(async (id: string): Promise<Club | undefined> => {
  if (!id) return undefined;
  const club = await apiMaybe<Club>(clubPath(id));
  return club ? toClub(club) : undefined;
});

/** Approved clubs; platform admins get every club (pending and suspended too). */
export async function listClubs(): Promise<Club[]> {
  return (await api<Club[]>("/clubs")).map(toClub);
}

export interface ClubWithCounts {
  club: Club;
  memberCount: number;
  tournamentCount: number;
}

type ClubWithCountsJSON = Club & { memberCount: number; tournamentCount: number };

function withCounts({ memberCount, tournamentCount, ...club }: ClubWithCountsJSON): ClubWithCounts {
  return { club: toClub(club as Club), memberCount, tournamentCount };
}

/** Like listClubs(), with each club's member and tournament counts — one
 * request instead of two per club. */
export async function listClubsWithCounts(): Promise<ClubWithCounts[]> {
  return (await api<ClubWithCountsJSON[]>("/clubs", { query: { include: "counts" } })).map(withCounts);
}

/** These clubs (any status) with their counts, in one request. */
export async function getClubsWithCountsByIds(ids: string[]): Promise<ClubWithCounts[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  return (
    await api<ClubWithCountsJSON[]>("/clubs", { query: { ids: unique.join(","), include: "counts" }, auth: false })
  ).map(withCounts);
}

const fetchClubsByIds = cache(async (key: string): Promise<Club[]> =>
  (await api<Club[]>("/clubs", { query: { ids: key }, auth: false })).map(toClub)
);

/** Clubs by id (any status), in one request instead of one per club. Missing ids are absent from the map. */
export async function getClubsByIds(ids: (string | null | undefined)[]): Promise<Map<string, Club>> {
  const key = [...new Set(ids.filter((id): id is string => !!id))].sort().join(",");
  const clubs = key ? await fetchClubsByIds(key) : [];
  return new Map(clubs.map((c) => [c.id, c]));
}

/** The signed-in user creates the club (pending approval) and becomes its
 * club_admin. `ownerUserId` must be the signed-in user — the API takes the
 * owner from the session. */
export async function createClub(input: {
  name: string;
  tagline?: string;
  stateCode: string;
  cityId: string;
  ownerUserId: string;
}): Promise<{ club: Club } | { error: string }> {
  try {
    const club = await api<Club>("/clubs", {
      method: "POST",
      body: { name: input.name, tagline: input.tagline, stateCode: input.stateCode, cityId: input.cityId },
    });
    return { club: toClub(club) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create club." };
  }
}

/** New clubs waiting for a platform admin to approve them (platform admins only). */
export async function countPendingClubs(): Promise<number> {
  try {
    return (await api<{ count: number }>("/platform/clubs/pending-count")).count;
  } catch {
    return 0;
  }
}

/** Whether the signed-in user is a platform admin. The API only answers for
 * the caller, so any other userId is treated as "no". */
export const isPlatformAdmin = cache(async (userId: string): Promise<boolean> => {
  try {
    const me = await api<{ isPlatformAdmin: boolean; userId?: string }>("/platform/me");
    return me.isPlatformAdmin && (!me.userId || me.userId === userId);
  } catch {
    return false;
  }
});

export async function approveClub(clubId: string): Promise<void> {
  await api(`/platform/clubs/${clubId}/approve`, { method: "POST" });
}

export async function rejectClub(clubId: string): Promise<void> {
  await api(`/platform/clubs/${clubId}/reject`, { method: "POST" });
}

/** The club owner's account email, for the platform admin's approval queue. */
export async function getClubOwnerEmail(clubId: string): Promise<string | undefined> {
  try {
    return (await api<{ email: string | null }>(`/platform/clubs/${clubId}/owner`)).email ?? undefined;
  } catch {
    return undefined;
  }
}

/** Club settings (staff). Logo and cover images are uploaded separately
 * (uploadClubImage) — the API sets those URLs itself. */
export async function updateClub(
  clubId: string,
  input: {
    name?: string;
    tagline?: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    googleMapsUrl?: string;
    stateCode?: string;
    cityId?: string;
    socialLinks?: Record<string, string>;
    aboutText?: string;
    rulesText?: string;
    membershipText?: string;
    privacyPolicyText?: string;
  }
): Promise<void> {
  await api(clubPath(clubId), { method: "PATCH", body: input });
}

/** Uploads a club logo or cover (multipart field "file"); returns the updated club. */
export async function uploadClubImage(clubId: string, kind: "logo" | "cover", file: File): Promise<Club> {
  const form = new FormData();
  form.append("file", file);
  return toClub(await api<Club>(`${clubPath(clubId)}/${kind}`, { method: "POST", body: form }));
}

export const getMembership = cache(async (clubId: string, userId: string): Promise<ClubMembership | undefined> => {
  if (!clubId || !userId) return undefined;
  const membership = await apiMaybe<ClubMembership | null>(`${clubPath(clubId)}/members/${userId}`, { auth: false });
  return membership ? toMembership(membership) : undefined;
});

export const listMembershipsForUser = cache(async (userId: string): Promise<ClubMembership[]> => {
  if (!userId) return [];
  return (await api<ClubMembership[]>(`/clubs/memberships/by-user/${userId}`, { auth: false })).map(toMembership);
});

export const listMembershipsForClub = cache(async (clubId: string): Promise<ClubMembership[]> => {
  return (await api<ClubMembership[]>(`${clubPath(clubId)}/members`, { auth: false })).map(toMembership);
});

/** Joins the club as a player (idempotent). The API joins the signed-in
 * user, so `userId` must be the caller. */
export async function ensurePlayerMembership(clubId: string, userId: string): Promise<ClubMembership> {
  void userId;
  return toMembership(await api<ClubMembership>(`${clubPath(clubId)}/join`, { method: "POST" }));
}

/** Every membership in the club with the member's public profile (or undefined), in one request. */
export async function listMembersWithProfiles(
  clubId: string
): Promise<{ membership: ClubMembership; profile: PlayerProfile | undefined }[]> {
  const rows = await api<(ClubMembership & { profile: Parameters<typeof profileFromApi>[0] | null })[]>(
    `${clubPath(clubId)}/members`,
    { query: { include: "profile" }, auth: false }
  );
  return rows.map(({ profile, ...membership }) => ({
    membership: toMembership(membership as ClubMembership),
    profile: profile ? profileFromApi(profile) : undefined,
  }));
}
