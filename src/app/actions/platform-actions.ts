"use server";

import { getSession } from "@/lib/auth/session";
import { isPlatformAdmin, approveClub, rejectClub } from "@/services/club-service";
import { reviewClubEnquiry } from "@/services/club-enquiry-service";

async function requirePlatformAdmin() {
  const session = await getSession();
  if (!session || !(await isPlatformAdmin(session.id))) {
    return { ok: false as const, error: "You are not authorized to do this." };
  }
  return { ok: true as const };
}

export async function approveClubAction(clubId: string) {
  const check = await requirePlatformAdmin();
  if (!check.ok) return { success: false as const, error: check.error };

  try {
    await approveClub(clubId);
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Could not approve club." };
  }
  return { success: true as const };
}

export async function rejectClubAction(clubId: string) {
  const check = await requirePlatformAdmin();
  if (!check.ok) return { success: false as const, error: check.error };

  try {
    await rejectClub(clubId);
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Could not reject club." };
  }
  return { success: true as const };
}

export async function approveEnquiryAction(enquiryId: string) {
  const check = await requirePlatformAdmin();
  if (!check.ok) return { success: false as const, error: check.error };
  const result = await reviewClubEnquiry(enquiryId, "approve");
  return result.error ? { success: false as const, error: result.error } : { success: true as const };
}

export async function rejectEnquiryAction(enquiryId: string, reason: string) {
  const check = await requirePlatformAdmin();
  if (!check.ok) return { success: false as const, error: check.error };
  if (reason.trim().length < 3) return { success: false as const, error: "Tell the player why (a few words)." };
  const result = await reviewClubEnquiry(enquiryId, "reject", reason.trim());
  return result.error ? { success: false as const, error: result.error } : { success: true as const };
}
