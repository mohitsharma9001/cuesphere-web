/** Player photos are stored inline in the database as data URLs (often a few
 * hundred KB). Pages get this short, cacheable address instead of the image
 * itself; the version changes whenever the photo does. */
export function playerPhotoUrl(profileId: string, stored: string | null | undefined): string {
  if (!stored) return "";
  if (!stored.startsWith("data:")) return stored;
  return `/api/player-photo/${profileId}/${photoVersion(stored)}`;
}

/** True for addresses made by playerPhotoUrl — i.e. "the photo is unchanged". */
export function isServedPlayerPhotoUrl(value: string | null | undefined): boolean {
  return !!value && value.startsWith("/api/player-photo/");
}

function photoVersion(value: string): string {
  // FNV-1a over the whole string: cheap, and any edit to the photo changes it.
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
