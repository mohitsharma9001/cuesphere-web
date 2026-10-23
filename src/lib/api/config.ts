/** Base URL of the CueSphere API (cuespherebackend), without the /api/v1 suffix. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5100").replace(/\/$/, "");
export const API_BASE = `${API_URL}/api/v1`;

/** The session lives in cookies on this (Next.js) domain; the API only sees a Bearer token. */
export const ACCESS_COOKIE = "cs_access";
export const REFRESH_COOKIE = "cs_refresh";
export const ACCESS_MAX_AGE = 60 * 60; // matches the API's ACCESS_TOKEN_EXPIRY (1h)
export const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // matches REFRESH_TOKEN_EXPIRY (30d)

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
