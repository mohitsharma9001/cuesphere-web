import { API_URL } from "@/lib/api/config";

/** The API serves legacy inline (data URL) photos at
 * `${API_URL}/api/v1/profiles/<id>/photo/<version>`. Pages use this site's
 * short `/api/player-photo/...` address instead, which proxies to it — a
 * same-origin path next/image accepts without extra config. Uploaded photos
 * are plain URLs and pass through unchanged. */
export function playerPhotoUrl(_profileId: string, stored: string | null | undefined): string {
  if (!stored) return "";
  const apiPrefix = `${API_URL}/api/v1/profiles/`;
  if (stored.startsWith(apiPrefix)) return `/api/player-photo/${stored.slice(apiPrefix.length).replace(/\/photo(\/|$)/, "$1")}`;
  return stored;
}

/** True for addresses made by playerPhotoUrl — i.e. "the photo is unchanged". */
export function isServedPlayerPhotoUrl(value: string | null | undefined): boolean {
  return !!value && value.startsWith("/api/player-photo/");
}
