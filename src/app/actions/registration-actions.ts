"use server";

import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { api, ApiRequestError } from "@/lib/api/server";

const registrationSchema = z.object({
  clubSlug: z.string().min(1),
  slug: z.string().min(1),
  emergencyContact: z.string().min(8, "Enter a valid emergency contact number."),
  preferredCue: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(["online", "offline"]),
  agreedToRules: z.literal(true, { error: "You must agree to the tournament rules." }),
});

export type RegisterForTournamentInput = z.infer<typeof registrationSchema>;

type FailureCode = "incomplete_profile" | "closed" | "full" | "already_registered";
const FAILURE_CODES: FailureCode[] = ["incomplete_profile", "closed", "full", "already_registered"];

interface RegistrationResult {
  registrationId: string;
  registrationNumber: string;
  paymentStatus: "pending" | "paid" | "failed";
}

/** One call to the API, which checks the profile and eligibility, joins the
 * player to the club, records the registration and its payment, and sends the
 * "Registration Successful" notification. */
export async function registerForTournamentAction(input: RegisterForTournamentInput) {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (!(await getSession())) {
    return { success: false as const, error: "You must be logged in to register.", code: "unauthenticated" as const };
  }

  const { clubSlug, slug, ...form } = parsed.data;
  try {
    const result = await api<RegistrationResult>(`/clubs/${encodeURIComponent(clubSlug)}/registrations`, {
      method: "POST",
      body: { tournamentSlug: slug, ...form },
    });
    return {
      success: true as const,
      registrationId: result.registrationId,
      registrationNumber: result.registrationNumber,
      paymentStatus: result.paymentStatus,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not register.";
    // The API puts the reason code in `errors.code` (see registration.controller).
    const code = error instanceof ApiRequestError ? (error.body as { errors?: { code?: string } } | null)?.errors?.code : undefined;
    return FAILURE_CODES.includes(code as FailureCode)
      ? { success: false as const, error: message, code: code as FailureCode }
      : { success: false as const, error: message };
  }
}
