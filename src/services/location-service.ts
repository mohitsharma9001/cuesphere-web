import { api } from "@/lib/api/server";
import { remember } from "@/lib/memo";

export interface IndianState {
  code: string;
  name: string;
  active: boolean;
}

export interface City {
  id: string;
  stateCode: string;
  name: string;
}

const TTL_MS = 5 * 60_000;

/** All states, launch (active) states first. Rarely changes, so cached. */
export async function listStates(): Promise<IndianState[]> {
  return remember("locations:states", TTL_MS, () => api<IndianState[]>("/locations/states", { auth: false }));
}

export async function listActiveStates(): Promise<IndianState[]> {
  return (await listStates()).filter((s) => s.active);
}

export async function listCities(): Promise<City[]> {
  return remember("locations:cities", TTL_MS, () => api<City[]>("/locations/cities", { auth: false }));
}

export async function listCitiesForState(stateCode: string): Promise<City[]> {
  return (await listCities()).filter((c) => c.stateCode === stateCode);
}

export async function getStateName(code: string | null | undefined): Promise<string | undefined> {
  if (!code) return undefined;
  return (await listStates()).find((s) => s.code === code)?.name;
}

export async function getCityName(id: string | null | undefined): Promise<string | undefined> {
  if (!id) return undefined;
  return (await listCities()).find((c) => c.id === id)?.name;
}

/** Validates a club location pick: the state must be live and the city must be in it.
 * (The API checks again on save; this gives the form an early, friendly error.) */
export async function validateClubLocation(
  stateCode: string,
  cityId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [states, cities] = await Promise.all([listActiveStates(), listCities()]);
  if (!states.some((s) => s.code === stateCode)) {
    return { ok: false, error: "CueSphere isn't open in that state yet." };
  }
  if (!cities.some((c) => c.id === cityId && c.stateCode === stateCode)) {
    return { ok: false, error: "Choose a city in the selected state." };
  }
  return { ok: true };
}
