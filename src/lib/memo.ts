/** A tiny in-memory cache for data many requests ask for within seconds of each
 * other (table TVs, overlays and live-page viewers all polling the same match).
 * Per server instance only. Never cache user-specific data with it; a short-lived
 * permission decision keyed by user id (e.g. "may score this match") is fine. */
const store = new Map<string, { at: number; value: Promise<unknown> }>();
const MAX_ENTRIES = 1000;

export function remember<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < ttlMs) return hit.value as Promise<T>;

  if (store.size >= MAX_ENTRIES) {
    for (const [k, v] of store) if (now - v.at >= ttlMs) store.delete(k);
    if (store.size >= MAX_ENTRIES) store.clear();
  }

  // Store the promise itself so simultaneous callers share one database query.
  const value = load().catch((err) => {
    store.delete(key);
    throw err;
  });
  store.set(key, { at: now, value });
  return value;
}
