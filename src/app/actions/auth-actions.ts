"use server";

import { z } from "zod";
import { destroySession } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { signIn, signUp, signUpAdmin } from "@/services/auth-service";
import { clubPath } from "@/lib/club-path";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  clubSlug: z.string().optional(),
});

const registerSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  clubSlug: z.string().optional(),
});

/** The API creates the player profile on sign-up/sign-in; joining the club is separate. */
async function joinClubIfProvided(clubSlug: string | undefined) {
  if (!clubSlug) return;
  try {
    await api(`/clubs/${encodeURIComponent(clubSlug)}/join`, { method: "POST" });
  } catch {
    // Unknown or unapproved club — signing in still succeeds.
  }
}

export async function loginAction(input: { email: string; password: string; clubSlug?: string }) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await signIn(parsed.data.email, parsed.data.password);
  if ("error" in result) {
    return { success: false as const, error: result.error };
  }

  await joinClubIfProvided(parsed.data.clubSlug);

  const assignment = await api<{ clubSlug: string } | null>("/scorekeepers/me").catch(() => null);
  if (assignment) {
    return { success: true as const, redirectTo: clubPath(assignment.clubSlug, "/scorekeeper") };
  }

  return { success: true as const };
}

/** Admin login: signs in, then only keeps the session for platform admins. */
export async function adminLoginAction(input: { email: string; password: string }) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await signIn(parsed.data.email, parsed.data.password);
  if ("error" in result) {
    return { success: false as const, error: result.error };
  }

  const me = await api<{ isPlatformAdmin: boolean }>("/platform/me").catch(() => null);
  if (!me?.isPlatformAdmin) {
    await destroySession();
    return { success: false as const, error: "This account isn't a CueSphere admin." };
  }
  return { success: true as const, redirectTo: "/platform/admin" };
}

const adminRegisterSchema = registerSchema.extend({ code: z.string().trim().min(1, "Enter the admin code.") });

export async function registerAdminAction(input: { email: string; password: string; code: string }) {
  const parsed = adminRegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const result = await signUpAdmin(parsed.data.email, parsed.data.password, parsed.data.code);
  if ("error" in result) return { success: false as const, error: result.error };
  return { success: true as const, redirectTo: "/platform/admin" };
}

export async function registerAccountAction(input: { email: string; password: string; clubSlug?: string }) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await signUp(parsed.data.email, parsed.data.password);
  if ("error" in result) {
    return { success: false as const, error: result.error };
  }

  if (result.needsEmailConfirmation) {
    return {
      success: false as const,
      error: "Account created — check your email to confirm it before logging in.",
    };
  }

  await joinClubIfProvided(parsed.data.clubSlug);
  return { success: true as const };
}

export async function logoutAction() {
  await destroySession();
}
