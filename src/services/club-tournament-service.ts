import { cache } from "react";
import { api, apiMaybe, ApiRequestError } from "@/lib/api/server";
import type { ClubTournament, PrizeBreakdownItem } from "@/types/club-tournament";

/** The message the app has always shown: the API's guards answer 403/401 with
 * terse role names ("Club managers only"), so map those back. */
export function clubActionError(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "You must be logged in.";
    if (error.status === 403) return "You don't have permission to manage this club.";
  }
  return error instanceof Error ? error.message : fallback;
}

/** Runs an API call, returning `{ data }` or `{ error }` with clubActionError's message. */
export async function clubActionResult<T>(call: () => Promise<T>, fallback: string): Promise<{ data?: T; error?: string }> {
  try {
    return { data: await call() };
  } catch (error) {
    return { error: clubActionError(error, fallback) };
  }
}

/** A tournament as the API returns it (dates as ISO timestamps). */
interface ClubTournamentDoc extends Omit<ClubTournament, "startDate" | "endDate"> {
  startDate: string | null;
  endDate: string | null;
  registeredCount?: number;
}

/** "2026-11-01T00:00:00.000Z" → "2026-11-01", like the old Postgres date column. */
function toDateOnly(value: string | null | undefined): string | null {
  return value ? value.slice(0, 10) : null;
}

function fromDoc(doc: ClubTournamentDoc): ClubTournament {
  return {
    id: doc.id,
    clubId: doc.clubId,
    slug: doc.slug,
    name: doc.name,
    description: doc.description ?? "",
    status: doc.status,
    startDate: toDateOnly(doc.startDate),
    endDate: toDateOnly(doc.endDate),
    location: doc.location ?? "",
    prizePool: doc.prizePool ?? "",
    entryFee: doc.entryFee ?? "",
    format: doc.format ?? "Knockout",
    bestOf: doc.bestOf,
    maxPlayers: doc.maxPlayers,
    registrationOpen: doc.registrationOpen,
    imageUrl: doc.imageUrl ?? "",
    prizeBreakdown: doc.prizeBreakdown ?? [],
    championId: doc.championId ?? null,
    runnerUpId: doc.runnerUpId ?? null,
    createdAt: doc.createdAt,
  };
}

/** Per-request store of what the API already told us, so a page that lists a
 * club's tournaments and then asks for each one's count or details doesn't
 * make one more request per tournament. */
const requestStore = cache(() => ({
  counts: new Map<string, number>(),
  byId: new Map<string, ClubTournament>(),
}));

function remember(doc: ClubTournamentDoc): ClubTournament {
  const tournament = fromDoc(doc);
  const store = requestStore();
  store.byId.set(tournament.id, tournament);
  if (typeof doc.registeredCount === "number") store.counts.set(tournament.id, doc.registeredCount);
  return tournament;
}

const clubPath = (clubId: string) => `/clubs/${encodeURIComponent(clubId)}/tournaments`;

export const listClubTournaments = cache(async (clubId: string): Promise<ClubTournament[]> => {
  const docs = await api<ClubTournamentDoc[]>(clubPath(clubId), { auth: false });
  return docs.map(remember);
});

export const getClubTournamentBySlug = cache(
  async (clubId: string, slug: string): Promise<ClubTournament | undefined> => {
    const doc = await apiMaybe<ClubTournamentDoc>(`${clubPath(clubId)}/${encodeURIComponent(slug)}`, { auth: false });
    return doc ? remember(doc) : undefined;
  }
);

export async function createClubTournament(input: {
  clubId: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  prizePool?: string;
  entryFee?: string;
  format?: string;
  bestOf?: number;
  maxPlayers?: number;
  prizeBreakdown?: PrizeBreakdownItem[];
}): Promise<{ tournament: ClubTournament } | { error: string }> {
  const { clubId, ...body } = input;
  // The API creates the slug and broadcasts the "new tournament" push itself.
  const { data, error } = await clubActionResult(
    () =>
      api<ClubTournamentDoc>(clubPath(clubId), {
        method: "POST",
        body: { ...body, startDate: body.startDate || undefined, endDate: body.endDate || undefined },
      }),
    "Could not create tournament."
  );
  if (error || !data) return { error: error ?? "Could not create tournament." };
  return { tournament: remember(data) };
}

export const getClubTournamentById = cache(async (tournamentId: string): Promise<ClubTournament | undefined> => {
  if (!tournamentId) return undefined;
  const known = requestStore().byId.get(tournamentId);
  if (known) return known;
  const doc = await apiMaybe<ClubTournamentDoc>(`/tournaments/${encodeURIComponent(tournamentId)}`, { auth: false }).catch(
    () => undefined // e.g. a static mock tournament id the API doesn't know
  );
  return doc ? remember(doc) : undefined;
});

/** Tournaments by id (any club), one request for the ones this request hasn't
 * already seen. Missing ids (e.g. static mock tournaments) are absent from the map. */
export async function getClubTournamentsByIds(ids: (string | null | undefined)[]): Promise<Map<string, ClubTournament>> {
  const store = requestStore();
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  const missing = wanted.filter((id) => !store.byId.has(id) && /^[0-9a-f]{24}$/i.test(id));
  if (missing.length) {
    const docs = await api<ClubTournamentDoc[]>("/tournaments", { query: { ids: missing.join(",") }, auth: false }).catch(
      () => [] as ClubTournamentDoc[]
    );
    docs.forEach(remember);
  }
  return new Map(wanted.flatMap((id) => (store.byId.has(id) ? [[id, store.byId.get(id)!] as const] : [])));
}

export async function updateClubTournament(
  tournamentId: string,
  input: {
    name?: string;
    description?: string;
    status?: ClubTournament["status"];
    startDate?: string;
    endDate?: string;
    location?: string;
    prizePool?: string;
    entryFee?: string;
    format?: string;
    bestOf?: number;
    maxPlayers?: number;
    registrationOpen?: boolean;
    prizeBreakdown?: PrizeBreakdownItem[];
    championId?: string | null;
    runnerUpId?: string | null;
  }
): Promise<{ error?: string }> {
  const tournament = await getClubTournamentById(tournamentId);
  if (!tournament) return { error: "Tournament not found." };
  const { error } = await clubActionResult(
    () => api(`${clubPath(tournament.clubId)}/${tournamentId}`, { method: "PATCH", body: input }),
    "Could not update the tournament."
  );
  return { error };
}

/** The API removes the tournament's payments, registrations, matches and scorekeepers too. */
export async function deleteClubTournament(tournamentId: string): Promise<void> {
  const tournament = await getClubTournamentById(tournamentId);
  if (!tournament) return;
  await api(`${clubPath(tournament.clubId)}/${tournamentId}`, { method: "DELETE" });
}

export async function countRegisteredForClubTournament(tournamentId: string): Promise<number> {
  const known = requestStore().counts.get(tournamentId);
  if (known !== undefined) return known;
  const doc = await apiMaybe<ClubTournamentDoc>(`/tournaments/${encodeURIComponent(tournamentId)}`, { auth: false }).catch(
    () => undefined
  );
  if (doc) remember(doc);
  return doc?.registeredCount ?? 0;
}
