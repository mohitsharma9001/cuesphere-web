"use server";

import { getSession } from "@/lib/auth/session";
import { getClubBySlug, getMembership, uploadClubImage } from "@/services/club-service";
import { isStaffRole } from "@/types/club";

const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_COVER_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_COVER_BYTES = 5 * 1024 * 1024;

async function requireStaffClub(clubSlug: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "You must be logged in." };

  const club = await getClubBySlug(clubSlug);
  if (!club) return { ok: false as const, error: "Club not found." };

  const membership = await getMembership(club.id, session.id);
  if (!isStaffRole(membership?.role)) {
    return { ok: false as const, error: "You don't have permission to manage this club." };
  }
  return { ok: true as const, club };
}

export async function uploadClubLogoAction(clubSlug: string, formData: FormData) {
  const check = await requireStaffClub(clubSlug);
  if (!check.ok) return { success: false as const, error: check.error };

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false as const, error: "No file provided." };
  }
  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return { success: false as const, error: "Upload a PNG, JPG or WEBP image." };
  }
  if (file.size > MAX_BYTES) {
    return { success: false as const, error: "Logo must be under 2MB." };
  }

  try {
    const club = await uploadClubImage(check.club.id, "logo", file);
    return { success: true as const, logoUrl: club.logoUrl };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function uploadClubCoverAction(clubSlug: string, formData: FormData) {
  const check = await requireStaffClub(clubSlug);
  if (!check.ok) return { success: false as const, error: check.error };

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false as const, error: "No file provided." };
  }
  if (!ALLOWED_COVER_TYPES.has(file.type)) {
    return { success: false as const, error: "Upload a PNG, JPG or WEBP image." };
  }
  if (file.size > MAX_COVER_BYTES) {
    return { success: false as const, error: "Cover image must be under 5MB." };
  }

  try {
    const club = await uploadClubImage(check.club.id, "cover", file);
    return { success: true as const, heroBannerUrl: club.heroBannerUrl };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Upload failed." };
  }
}
