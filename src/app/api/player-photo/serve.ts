import { getStoredProfilePhoto } from "@/services/profile-service";

/** Serves a player's stored photo as an image. With a version in the URL the
 * response never changes, so browsers and the image optimizer cache it long-term. */
export async function servePlayerPhoto(playerId: string, versioned: boolean): Promise<Response> {
  const photo = await getStoredProfilePhoto(playerId);
  if (!photo) return new Response(null, { status: 404 });

  if (/^https?:\/\//.test(photo)) return Response.redirect(photo, 302);

  const match = /^data:([^;,]+);base64,(.*)$/.exec(photo);
  if (!match) return new Response(null, { status: 404 });

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=300",
    },
  });
}
