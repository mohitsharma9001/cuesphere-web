import { cache } from "react";
import { api, apiMaybe } from "@/lib/api/server";
import { clubActionError } from "@/services/club-tournament-service";
import type { TournamentRegistration } from "@/types/registration";

/** A registration as the API returns it. Public tournament lists omit the
 * private fields (emergency contact, notes, cue) for non-staff viewers. */
type RegistrationDoc = Omit<TournamentRegistration, "emergencyContact" | "preferredCue" | "notes"> &
  Partial<Pick<TournamentRegistration, "emergencyContact" | "preferredCue" | "notes">>;

function fromDoc(doc: RegistrationDoc): TournamentRegistration {
  return {
    id: doc.id,
    registrationNumber: doc.registrationNumber,
    clubId: doc.clubId,
    tournamentId: doc.tournamentId,
    playerId: doc.playerId,
    status: doc.status,
    emergencyContact: doc.emergencyContact ?? "",
    preferredCue: doc.preferredCue ?? "",
    notes: doc.notes ?? "",
    agreedToRules: doc.agreedToRules,
    paymentStatus: doc.paymentStatus,
    createdAt: doc.createdAt,
  };
}

/** The signed-in player's active registrations across every club, newest
 * first — fetched once per request and shared by the lookups below. */
const getMyRegistrations = cache(async (): Promise<TournamentRegistration[]> => {
  try {
    return (await api<RegistrationDoc[]>("/registrations/mine")).map(fromDoc);
  } catch {
    return []; // signed out
  }
});

/** `playerId` must be the signed-in viewer's own profile id — the API only
 * reveals a player's registrations to that player. */
export async function getRegistrationForPlayer(
  tournamentId: string,
  playerId: string
): Promise<TournamentRegistration | undefined> {
  const mine = await getMyRegistrations();
  return mine.find((r) => r.tournamentId === tournamentId && r.playerId === playerId);
}

/** Visible to the registered player and the club's staff. */
export const getRegistrationById = cache(async (id: string): Promise<TournamentRegistration | undefined> => {
  const doc = await getRegistrationWithPayment(id);
  return doc ? fromDoc(doc) : undefined;
});

/** Shared with payment-service: GET /registrations/:id returns the payment alongside. */
export const getRegistrationWithPayment = cache(async (id: string) => {
  try {
    return await apiMaybe<RegistrationDoc & { payment: unknown }>(`/registrations/${encodeURIComponent(id)}`);
  } catch {
    return undefined; // invalid id, signed out, or not allowed to see it
  }
});

/** `playerId` must be the signed-in viewer's own profile id (see above). */
export async function getRegistrationsForPlayer(playerId: string, clubId?: string): Promise<TournamentRegistration[]> {
  const mine = await getMyRegistrations();
  return mine.filter((r) => r.playerId === playerId && (!clubId || r.clubId === clubId));
}

/** Staff only: every registration in the club, newest first. */
export async function getRegistrationsForClub(clubId: string): Promise<TournamentRegistration[]> {
  const docs = await api<RegistrationDoc[]>(`/clubs/${encodeURIComponent(clubId)}/registrations`);
  return docs.map(fromDoc);
}

/** Active entries, oldest first. Staff get the full rows; everyone else gets
 * the entry list with private fields blank. */
export const getRegistrationsForTournament = cache(async (tournamentId: string): Promise<TournamentRegistration[]> => {
  const docs = await apiMaybe<RegistrationDoc[]>(`/tournaments/${encodeURIComponent(tournamentId)}/registrations`).catch(
    () => undefined // e.g. a static mock tournament id
  );
  return docs?.map(fromDoc) ?? [];
});

export async function getRegisteredPlayerIds(tournamentId: string): Promise<string[]> {
  return (await getRegistrationsForTournament(tournamentId)).map((r) => r.playerId);
}

/** Active registrations for any tournament id — including the static catalog's
 * ("t-1"), which the registration list above can't resolve. */
export const getRegisteredCount = cache(async (tournamentId: string): Promise<number> => {
  const result = await apiMaybe<{ count: number }>(
    `/tournaments/${encodeURIComponent(tournamentId)}/registered-count`,
    { auth: false }
  ).catch(() => undefined);
  return result?.count ?? 0;
});

export async function updateRegistrationPaymentStatus(
  clubId: string,
  registrationId: string,
  paymentStatus: "paid" | "pending"
): Promise<{ error?: string }> {
  try {
    await api(`/clubs/${encodeURIComponent(clubId)}/registrations/${encodeURIComponent(registrationId)}/payment-status`, {
      method: "PATCH",
      body: { paymentStatus },
    });
    return {};
  } catch (error) {
    return { error: clubActionError(error, "Could not update payment status.") };
  }
}
