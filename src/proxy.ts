import { NextResponse, type NextRequest } from "next/server";
import { decodeJwt } from "jose";
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  API_BASE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  sessionCookieOptions,
} from "@/lib/api/config";

/** True when the access token is missing or expires within a minute. */
function needsRefresh(token: string | undefined) {
  if (!token) return true;
  try {
    const { exp } = decodeJwt(token);
    return !exp || exp * 1000 - Date.now() < 60_000;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh || !needsRefresh(access)) return NextResponse.next({ request });

  // Refresh the session before Server Components read it (they can't set cookies).
  let tokens: { accessToken: string; refreshToken: string } | null = null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
      cache: "no-store",
    });
    if (res.ok) tokens = (await res.json()).data;
  } catch {
    // API unreachable — carry on signed out for this request; retry next time.
    return NextResponse.next({ request });
  }

  if (!tokens) {
    request.cookies.delete(ACCESS_COOKIE);
    request.cookies.delete(REFRESH_COOKIE);
    const response = NextResponse.next({ request });
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  request.cookies.set(ACCESS_COOKIE, tokens.accessToken);
  request.cookies.set(REFRESH_COOKIE, tokens.refreshToken);
  const response = NextResponse.next({ request });
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, { ...sessionCookieOptions, maxAge: ACCESS_MAX_AGE });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, { ...sessionCookieOptions, maxAge: REFRESH_MAX_AGE });
  return response;
}

export const config = {
  // .well-known: the Android app checks assetlinks.json there; no session needed.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
