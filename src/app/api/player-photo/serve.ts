import { API_BASE } from "@/lib/api/config";

/** Proxies a player's photo from the API (legacy inline photos are served there;
 * uploaded photos redirect to their file). With a version in the URL the
 * response never changes, so browsers and the image optimizer cache it long-term. */
export async function servePlayerPhoto(playerId: string, version?: string): Promise<Response> {
  const path = `/profiles/${encodeURIComponent(playerId)}/photo${version ? `/${encodeURIComponent(version)}` : ""}`;
  const res = await fetch(`${API_BASE}${path}`, { redirect: "manual", cache: "no-store" });

  const location = res.headers.get("location");
  if (res.status >= 300 && res.status < 400 && location) return Response.redirect(location, 302);
  if (!res.ok) return new Response(null, { status: 404 });

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": version ? "public, max-age=31536000, immutable" : "public, max-age=300",
    },
  });
}
