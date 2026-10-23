"use server";

import { getSession } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { clubActionError } from "@/services/club-tournament-service";

const MAX_BYTES = 3 * 1024 * 1024;

export async function uploadTournamentThumbnailAction(clubSlug: string, tournamentSlug: string, dataUrl: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "You must be logged in." };

  const match = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { success: false as const, error: "Upload a PNG, JPG or WEBP image." };
  }

  const [, mime, ext, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength > MAX_BYTES) {
    return { success: false as const, error: "Thumbnail must be under 3MB." };
  }

  // Club staff only (checked by the API); the old image is replaced.
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mime }), `thumbnail.${ext}`);
  try {
    const { imageUrl } = await api<{ imageUrl: string }>(
      `/clubs/${encodeURIComponent(clubSlug)}/tournaments/${encodeURIComponent(tournamentSlug)}/thumbnail`,
      { method: "POST", body: form }
    );
    return { success: true as const, imageUrl };
  } catch (error) {
    return { success: false as const, error: clubActionError(error, "Could not upload the thumbnail.") };
  }
}
