import { cache } from "react";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { ACCESS_COOKIE, ACCESS_MAX_AGE, REFRESH_COOKIE, REFRESH_MAX_AGE, sessionCookieOptions } from "@/lib/api/config";
import { api } from "@/lib/api/server";
import type { SessionUser } from "@/types/user";

const secret = process.env.API_ACCESS_TOKEN_SECRET ? new TextEncoder().encode(process.env.API_ACCESS_TOKEN_SECRET) : null;

/** Memoized per-request — getSession() is called from dozens of places on
 * every navigation. With API_ACCESS_TOKEN_SECRET set the token is verified
 * locally (no round trip); otherwise the API is asked who the token belongs to. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  if (secret) {
    try {
      const { payload } = await jwtVerify(token, secret);
      if (!payload.sub) return null;
      return { id: payload.sub, email: typeof payload.email === "string" ? payload.email : "" };
    } catch {
      return null;
    }
  }

  try {
    const me = await api<{ user: { id: string; email: string } }>("/auth/me");
    return { id: me.user.id, email: me.user.email };
  } catch {
    return null;
  }
});

/** Stores the API's tokens as httpOnly cookies on this domain. Server actions only. */
export async function setSessionTokens(tokens: { accessToken: string; refreshToken: string }) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, { ...sessionCookieOptions, maxAge: ACCESS_MAX_AGE });
  store.set(REFRESH_COOKIE, tokens.refreshToken, { ...sessionCookieOptions, maxAge: REFRESH_MAX_AGE });
}

export async function destroySession() {
  try {
    await api("/auth/signout", { method: "POST" });
  } catch {
    // Already signed out on the API side — still clear our cookies.
  }
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
