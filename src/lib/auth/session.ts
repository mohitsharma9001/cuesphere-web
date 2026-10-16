import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/types/user";

/** Memoized per-request — getSession() is called from dozens of places
 * (pages, layouts, getClubViewer, getViewer) on every navigation.
 * getClaims() verifies the login token's signature on the server itself
 * (the project signs tokens with ES256 keys), so there's no round trip to
 * Supabase Auth on every page view. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});

export async function destroySession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
