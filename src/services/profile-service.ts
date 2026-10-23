import { cache } from "react";
import { api, apiMaybe } from "@/lib/api/server";
import type { PlayerProfile } from "@/types/player-profile";
import { playerPhotoUrl } from "@/lib/player-photo";

/** The API's profile JSON. Other players' profiles omit email, mobile, dob and emergencyContact. */
type ProfileJSON = Omit<PlayerProfile, "email" | "mobile" | "dob" | "emergencyContact"> &
  Partial<Pick<PlayerProfile, "email" | "mobile" | "dob" | "emergencyContact">>;

export function profileFromApi(row: ProfileJSON): PlayerProfile {
  return {
    id: row.id,
    userId: row.userId,
    memberId: row.memberId,
    fullName: row.fullName ?? "",
    email: row.email ?? "",
    mobile: row.mobile ?? "",
    dob: row.dob ?? "",
    city: row.city ?? "",
    emergencyContact: row.emergencyContact ?? "",
    // A short cacheable address, not the inline image (see playerPhotoUrl).
    profilePhotoUrl: playerPhotoUrl(row.id, row.profilePhotoUrl),
    preferredCue: row.preferredCue ?? "",
    primaryClubId: row.primaryClubId ?? null,
    createdAt: row.createdAt,
  };
}

/** Memoized per-request — called from many pages plus getViewer()/get-club-viewer()
 * on the same navigation; cache() collapses repeat calls for the same userId. */
export const getProfileByUserId = cache(async (userId: string): Promise<PlayerProfile | undefined> => {
  const row = await apiMaybe<ProfileJSON>(`/profiles/by-user/${encodeURIComponent(userId)}`).catch(() => undefined);
  return row ? profileFromApi(row) : undefined;
});

export const getProfileById = cache(async (id: string): Promise<PlayerProfile | undefined> => {
  const row = await apiMaybe<ProfileJSON>(`/profiles/${encodeURIComponent(id)}`).catch(() => undefined);
  return row ? profileFromApi(row) : undefined;
});

/** Many profiles in one request per 200 ids (public fields; your own in full). */
const fetchProfileBatch = cache(async (param: "ids" | "userIds", key: string): Promise<PlayerProfile[]> => {
  const ids = key.split(",");
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 200) chunks.push(ids.slice(i, i + 200));
  const rows = await Promise.all(
    chunks.map((chunk) => api<ProfileJSON[]>("/profiles/batch", { query: { [param]: chunk.join(",") } }).catch(() => []))
  );
  return rows.flat().map(profileFromApi);
});

function batchKey(ids: (string | null | undefined)[]): string {
  return [...new Set(ids.filter((id): id is string => !!id))].sort().join(",");
}

/** Profiles by profile id, in one request instead of one per player. Missing ids are absent from the map. */
export async function getProfilesByIds(ids: (string | null | undefined)[]): Promise<Map<string, PlayerProfile>> {
  const key = batchKey(ids);
  const profiles = key ? await fetchProfileBatch("ids", key) : [];
  return new Map(profiles.map((p) => [p.id, p]));
}

/** Profiles by account (user) id, keyed by user id — one request instead of one per user. */
export async function getProfilesByUserIds(userIds: (string | null | undefined)[]): Promise<Map<string, PlayerProfile>> {
  const key = batchKey(userIds);
  const profiles = key ? await fetchProfileBatch("userIds", key) : [];
  return new Map(profiles.map((p) => [p.userId, p]));
}

/** Public display of another member's profile (name/photo). */
export async function getProfileByUserIdForDisplay(userId: string): Promise<PlayerProfile | undefined> {
  return getProfileByUserId(userId);
}

/** The API creates the profile on sign-up/sign-in; this fetches (or lazily creates) the caller's own. */
export async function ensureProfileForUser(_userId: string, _email: string): Promise<PlayerProfile> {
  return profileFromApi(await api<ProfileJSON>("/profiles/me"));
}

export async function setPrimaryClub(_userId: string, clubId: string | null): Promise<{ error?: string }> {
  try {
    await api("/profiles/me/primary-club", { method: "PUT", body: { clubId } });
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update your primary club." };
  }
}

export async function updateProfile(
  _userId: string,
  updates: Pick<PlayerProfile, "fullName" | "mobile" | "dob" | "city" | "emergencyContact" | "profilePhotoUrl" | "preferredCue">
): Promise<PlayerProfile> {
  // The form sends back the photo address it was shown when the photo is unchanged; the API keeps the stored image.
  return profileFromApi(await api<ProfileJSON>("/profiles/me", { method: "PUT", body: updates }));
}

/** Uploads a new profile photo (multipart field "file") and returns the updated profile. */
export async function uploadProfilePhoto(file: File): Promise<PlayerProfile> {
  const form = new FormData();
  form.append("file", file);
  return profileFromApi(await api<ProfileJSON>("/profiles/me/photo", { method: "POST", body: form }));
}

/** Every player registered on CueSphere, for the platform-wide directory (public fields only). */
export async function listAllPlayerProfiles(): Promise<PlayerProfile[]> {
  const rows = await api<ProfileJSON[]>("/profiles", { auth: false });
  return rows.map(profileFromApi);
}
