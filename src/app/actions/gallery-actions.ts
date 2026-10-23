"use server";

import { getSession } from "@/lib/auth/session";
import { getClubBySlug, getMembership } from "@/services/club-service";
import { isStaffRole, isScorekeeperOnly } from "@/types/club";
import { addGalleryImage, deleteGalleryImage } from "@/services/gallery-service";

async function requireGalleryManager(clubSlug: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "You must be logged in." };

  const club = await getClubBySlug(clubSlug);
  if (!club) return { ok: false as const, error: "Club not found." };

  const membership = await getMembership(club.id, session.id);
  if (!isStaffRole(membership?.role) || isScorekeeperOnly(membership?.role)) {
    return { ok: false as const, error: "You don't have permission to manage this club's gallery." };
  }

  return { ok: true as const, club };
}

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadGalleryImageAction(clubSlug: string, formData: FormData) {
  const check = await requireGalleryManager(clubSlug);
  if (!check.ok) return { success: false as const, error: check.error };

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false as const, error: "No file provided." };
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return { success: false as const, error: "Upload a PNG, JPG or WEBP image." };
  }
  if (file.size > MAX_BYTES) {
    return { success: false as const, error: "Image must be under 5MB." };
  }

  const caption = String(formData.get("caption") ?? "").trim();

  const { error } = await addGalleryImage(check.club.id, file, caption);
  if (error) return { success: false as const, error };

  return { success: true as const };
}

export async function deleteGalleryImageAction(clubSlug: string, imageId: string) {
  const check = await requireGalleryManager(clubSlug);
  if (!check.ok) return { success: false as const, error: check.error };

  const { error } = await deleteGalleryImage(imageId, check.club.id);
  if (error) return { success: false as const, error };
  return { success: true as const };
}
