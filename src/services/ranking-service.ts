import { cache } from "react";
import { api } from "@/lib/api/server";

/** One player's place in a state or city table. Built only from tournament
 * results (ranking points), at clubs located in that state / city — friendly
 * matches never count. Tables are computed (and cached) by the API. */
export interface RankingEntry {
  rank: number;
  playerId: string;
  name: string;
  photoUrl: string;
  points: number;
  matchesPlayed: number;
  wins: number;
  framesWon: number;
  framesLost: number;
  highestBreak: number;
}

export interface PlayerRank {
  scope: "state" | "city";
  code: string;
  name: string;
  /** Link to the ranking table this rank comes from. */
  href: string;
  rank: number;
  total: number;
}

interface RankingsResponse {
  entries: RankingEntry[];
  rankedCityIds: string[];
}

/** Memoized per request: the rankings page asks for the same state table twice
 * (its entries and its ranked cities) — one API call serves both. */
const rankingsFor = cache((state: string | undefined, city: string | undefined) =>
  api<RankingsResponse>("/stats/rankings", { query: { state, city }, auth: false })
);

function rankings(query: { state?: string; city?: string }) {
  return rankingsFor(query.state, query.city);
}

export async function getStateRankings(stateCode: string): Promise<RankingEntry[]> {
  return (await rankings({ state: stateCode })).entries;
}

export async function getCityRankings(cityId: string): Promise<RankingEntry[]> {
  return (await rankings({ city: cityId })).entries;
}

/** Cities in a state that have at least one ranked club, for the city filter. */
export async function getRankedCityIds(stateCode: string): Promise<Set<string>> {
  return new Set((await rankings({ state: stateCode })).rankedCityIds);
}

/** Where a player stands: every launch state and city they have ranking points in. */
export async function getPlayerRanks(playerId: string): Promise<PlayerRank[]> {
  return api<PlayerRank[]>(`/stats/players/${encodeURIComponent(playerId)}/ranks`, { auth: false }).catch(() => []);
}
