"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { getClubBySlug, getMembership } from "@/services/club-service";
import { isStaffRole } from "@/types/club";
import { moveTvScreen, pairTvScreen, unpairTvScreen } from "@/services/tv-screen-service";
import {
  addAdImage,
  addSponsorLogo,
  getStreamSettings,
  removeAdImage,
  removeSponsorLogo,
  saveAdOptions,
  saveOverlayOptions,
  saveYoutubeLink,
} from "@/services/stream-settings-service";
import { clubPath } from "@/lib/club-path";
import {
  ACCENT_OPTIONS,
  MAX_SPONSOR_LOGOS,
  MAX_AD_IMAGES,
  AD_SECONDS_OPTIONS,
  youtubeEmbedUrl,
  type OverlayToggles,
} from "@/types/stream";

type Result = { success: true } | { success: false; error: string };

async function requireClubStaff(clubSlug: string) {
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

function validTable(table: number) {
  return Number.isInteger(table) && table >= 1 && table <= 99;
}

/** A TV can also be set to 0: every live table in turn. */
function validTvTable(table: number) {
  return table === 0 || validTable(table);
}

function done(clubSlug: string): Result {
  revalidatePath(clubPath(clubSlug, "/admin/screens"));
  return { success: true };
}

export async function pairTvAction(clubSlug: string, code: string, table: number): Promise<Result> {
  const check = await requireClubStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  if (!validTvTable(table)) return { success: false, error: "Pick a table." };
  if (!code.trim()) return { success: false, error: "Enter the code shown on the TV." };

  const { error } = await pairTvScreen(check.club.id, code, table);
  if (error) return { success: false, error };
  return done(clubSlug);
}

export async function moveTvAction(clubSlug: string, screenId: string, table: number): Promise<Result> {
  const check = await requireClubStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  if (!validTvTable(table)) return { success: false, error: "Pick a table." };

  const { error } = await moveTvScreen(check.club.id, screenId, table);
  if (error) return { success: false, error };
  return done(clubSlug);
}

export async function unpairTvAction(clubSlug: string, screenId: string): Promise<Result> {
  const check = await requireClubStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };

  const { error } = await unpairTvScreen(check.club.id, screenId);
  if (error) return { success: false, error };
  return done(clubSlug);
}

export async function saveYoutubeLinkAction(clubSlug: string, table: number, url: string): Promise<Result> {
  const check = await requireClubStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  if (!validTable(table)) return { success: false, error: "Unknown table." };

  const trimmed = url.trim();
  if (trimmed && !youtubeEmbedUrl(trimmed)) {
    return { success: false, error: "That doesn't look like a YouTube video or live link." };
  }

  const { error } = await saveYoutubeLink(check.club.id, table, trimmed);
  if (error) return { success: false, error };
  return done(clubSlug);
}

export async function saveOverlayOptionsAction(
  clubSlug: string,
  input: { accent: string; show: OverlayToggles }
): Promise<Result> {
  const check = await requireClubStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  if (!(ACCENT_OPTIONS as readonly string[]).includes(input.accent)) {
    return { success: false, error: "Pick one of the accent colours." };
  }

  const show: OverlayToggles = {
    photos: !!input.show.photos,
    breakBalls: !!input.show.breakBalls,
    intro: !!input.show.intro,
    bigBreakAlert: !!input.show.bigBreakAlert,
    frameBanner: !!input.show.frameBanner,
    reds: !!input.show.reds,
  };
  const { error } = await saveOverlayOptions(check.club.id, { accent: input.accent, show });
  if (error) return { success: false, error };
  return done(clubSlug);
}

const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function uploadSponsorLogoAction(clubSlug: string, formData: FormData): Promise<Result> {
  const check = await requireClubStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };

  const settings = await getStreamSettings(check.club.id);
  if (settings.sponsorLogos.length >= MAX_SPONSOR_LOGOS) {
    return { success: false, error: `You can show up to ${MAX_SPONSOR_LOGOS} sponsor logos. Remove one first.` };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file provided." };
  if (!LOGO_TYPES.has(file.type)) return { success: false, error: "Upload a PNG, JPG or WEBP image." };
  if (file.size > MAX_LOGO_BYTES) return { success: false, error: "Logo must be under 2MB." };

  const { error } = await addSponsorLogo(check.club.id, file);
  if (error) return { success: false, error };
  return done(clubSlug);
}

export async function removeSponsorLogoAction(clubSlug: string, url: string): Promise<Result> {
  const check = await requireClubStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };

  // The API also deletes the stored file when it's one of ours.
  const { error } = await removeSponsorLogo(check.club.id, url);
  if (error) return { success: false, error };
  return done(clubSlug);
}

export async function saveAdOptionsAction(
  clubSlug: string,
  input: { enabled: boolean; secondsPerImage: number; onTv: boolean; onOverlay: boolean; afterMatch: boolean }
): Promise<Result> {
  const check = await requireClubStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };
  if (!(AD_SECONDS_OPTIONS as readonly number[]).includes(input.secondsPerImage)) {
    return { success: false, error: "Pick how long each ad shows." };
  }

  const { error } = await saveAdOptions(check.club.id, {
    enabled: !!input.enabled,
    secondsPerImage: input.secondsPerImage,
    onTv: !!input.onTv,
    onOverlay: !!input.onOverlay,
    afterMatch: !!input.afterMatch,
  });
  if (error) return { success: false, error };
  return done(clubSlug);
}

const AD_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_AD_BYTES = 5 * 1024 * 1024;

export async function uploadAdImageAction(clubSlug: string, formData: FormData): Promise<Result> {
  const check = await requireClubStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };

  const settings = await getStreamSettings(check.club.id);
  if (settings.ads.images.length >= MAX_AD_IMAGES) {
    return { success: false, error: `You can have up to ${MAX_AD_IMAGES} ads. Remove one first.` };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file provided." };
  if (!AD_TYPES.has(file.type)) return { success: false, error: "Upload a PNG, JPG or WEBP image." };
  if (file.size > MAX_AD_BYTES) return { success: false, error: "Ad images must be under 5MB." };

  const { error } = await addAdImage(check.club.id, file);
  if (error) return { success: false, error };
  return done(clubSlug);
}

export async function removeAdImageAction(clubSlug: string, url: string): Promise<Result> {
  const check = await requireClubStaff(clubSlug);
  if (!check.ok) return { success: false, error: check.error };

  // The API also deletes the stored file when it's one of ours.
  const { error } = await removeAdImage(check.club.id, url);
  if (error) return { success: false, error };
  return done(clubSlug);
}
