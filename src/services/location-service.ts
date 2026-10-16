import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  return remember("locations:states", TTL_MS, async () => {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.from("states").select("code, name, active").order("name");
    const states = (data as IndianState[] | null) ?? [];
    return [...states.filter((s) => s.active), ...states.filter((s) => !s.active)];
  });
}

export async function listActiveStates(): Promise<IndianState[]> {
  return (await listStates()).filter((s) => s.active);
}

export async function listCities(): Promise<City[]> {
  return remember("locations:cities", TTL_MS, async () => {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.from("cities").select("id, state_code, name").order("name");
    return ((data as { id: string; state_code: string; name: string }[] | null) ?? []).map((c) => ({
      id: c.id,
      stateCode: c.state_code,
      name: c.name,
    }));
  });
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

/** Validates a club location pick: the state must be live and the city must be in it. */
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
