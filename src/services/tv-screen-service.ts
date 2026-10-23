import { api, apiResult } from "@/lib/api/server";

export interface TvScreen {
  id: string;
  clubId: string | null;
  tableNumber: number | null;
  pairCode: string | null;
  codeExpiresAt: string | null;
  pairedAt: string | null;
  lastSeenAt: string | null;
}

/** Normalises what staff type: case-insensitive, ignores spaces and dashes. */
export function cleanPairCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Registering a TV and its status polling go straight through the /api/tv
// route handlers to the API (/tv/register, /tv/status).

export async function pairTvScreen(clubId: string, code: string, tableNumber: number): Promise<{ error?: string }> {
  return apiResult(`/clubs/${clubId}/tv-screens/pair`, {
    method: "POST",
    body: { code: cleanPairCode(code), table: tableNumber },
  });
}

export async function listTvScreensForClub(clubId: string): Promise<TvScreen[]> {
  return api<TvScreen[]>(`/clubs/${clubId}/tv-screens`);
}

export async function moveTvScreen(clubId: string, id: string, tableNumber: number): Promise<{ error?: string }> {
  return apiResult(`/clubs/${clubId}/tv-screens/${id}`, { method: "PATCH", body: { table: tableNumber } });
}

/** Unpairing sends the TV back to its pairing-code screen. */
export async function unpairTvScreen(clubId: string, id: string): Promise<{ error?: string }> {
  return apiResult(`/clubs/${clubId}/tv-screens/${id}`, { method: "DELETE" });
}
