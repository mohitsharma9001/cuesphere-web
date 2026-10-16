"use server";

import { getSession } from "@/lib/auth/session";
import { signUp } from "@/services/auth-service";
import { ensureProfileForUser } from "@/services/profile-service";
import { createClub } from "@/services/club-service";
import { validateClubLocation } from "@/services/location-service";

export async function createClubAction(input: {
  name: string;
  tagline?: string;
  email?: string;
  password?: string;
  stateCode: string;
  cityId: string;
}) {
  if (!input.name.trim()) {
    return { success: false as const, error: "Enter a club name." };
  }
  const location = await validateClubLocation(input.stateCode, input.cityId);
  if (!location.ok) return { success: false as const, error: location.error };

  let ownerUserId: string;

  const session = await getSession();
  if (session) {
    ownerUserId = session.id;
  } else {
    if (!input.email || !input.password) {
      return { success: false as const, error: "Enter an email and password to create your account." };
    }
    if (input.password.length < 8) {
      return { success: false as const, error: "Password must be at least 8 characters." };
    }

    const signUpResult = await signUp(input.email, input.password);
    if ("error" in signUpResult) {
      return { success: false as const, error: signUpResult.error };
    }
    if (signUpResult.needsEmailConfirmation) {
      return {
        success: false as const,
        error: "Account created — check your email to confirm it, then create your club.",
      };
    }

    await ensureProfileForUser(signUpResult.userId, signUpResult.email);
    ownerUserId = signUpResult.userId;
  }

  const result = await createClub({
    name: input.name,
    tagline: input.tagline,
    stateCode: input.stateCode,
    cityId: input.cityId,
    ownerUserId,
  });
  if ("error" in result) {
    return { success: false as const, error: result.error };
  }

  return { success: true as const, slug: result.club.slug };
}
