"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { updateProfile, setPrimaryClub, uploadProfilePhoto } from "@/services/profile-service";

const profileSchema = z.object({
  fullName: z.string().min(2, "Enter your full name."),
  mobile: z.string().min(8, "Enter a valid mobile number."),
  dob: z.string().min(1, "Date of birth is required."),
  city: z.string().min(1, "City is required."),
  emergencyContact: z.string().min(8, "Enter a valid emergency contact number."),
  profilePhotoUrl: z.string(), // optional; "" = no photo
  preferredCue: z.string().optional(),
});

export async function updateProfileAction(input: z.infer<typeof profileSchema>) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "You must be logged in." };
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const profile = await updateProfile(session.id, {
      ...parsed.data,
      preferredCue: parsed.data.preferredCue ?? "",
    });
    return { success: true as const, profile };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Could not save your profile." };
  }
}

// Server actions accept bodies up to 4 MB (next.config.ts).
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/** Uploads the photo straight away (form field "file") and returns its address for the profile form. */
export async function uploadProfilePhotoAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "You must be logged in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false as const, error: "Choose a photo to upload." };
  if (!file.type.startsWith("image/")) return { success: false as const, error: "Only image files are allowed." };
  if (file.size > MAX_PHOTO_BYTES) return { success: false as const, error: "Photos must be 4 MB or smaller." };

  try {
    const profile = await uploadProfilePhoto(file);
    return { success: true as const, photoUrl: profile.profilePhotoUrl };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Could not upload the photo." };
  }
}

export async function setPrimaryClubAction(clubId: string | null) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "You must be logged in." };
  }

  // The API checks you're a member of the club.
  const { error } = await setPrimaryClub(session.id, clubId);
  if (error) return { success: false as const, error };

  revalidatePath("/my-clubs");
  revalidatePath("/players");
  revalidatePath("/friends");
  return { success: true as const };
}
