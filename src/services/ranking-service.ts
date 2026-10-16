import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { remember } from "@/lib/memo";
import { playerPhotoUrl } from "@/lib/player-photo";
import { listActiveStates, listCities } from "@/services/location-service";

/** One player's place in a state or city table. Built only from tournament
 * results (ranking points), at clubs located in that state / city — friendly
 * matches never count. */
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

const TTL_MS = 60_000;

interface StatsRow {
  player_id: string;
  club_id: string;
  matches_played: number;
  wins: number;
  frames_won: number;
  frames_lost: number;
  highest_break: number;
  ranking_points: number;
}

interface ClubLocationRow {
  id: string;
  state_code: string | null;
  city_id: string | null;
}

/** Approved clubs that have a location, with every stats row recorded at them. */
async function loadRankingData(): Promise<{ clubs: ClubLocationRow[]; stats: StatsRow[] }> {
  return remember("rankings:data", TTL_MS, async () => {
    const admin = createSupabaseAdminClient();
    const { data: clubData } = await admin
      .from("clubs")
      .select("id, state_code, city_id")
      .eq("status", "approved")
      .not("state_code", "is", null);
    const clubs = (clubData as ClubLocationRow[] | null) ?? [];
    if (clubs.length === 0) return { clubs, stats: [] };

    const { data: statsData } = await admin
      .from("player_statistics")
      .select("player_id, club_id, matches_played, wins, frames_won, frames_lost, highest_break, ranking_points")
      .in(
        "club_id",
        clubs.map((c) => c.id)
      )
      .gt("matches_played", 0);
    return { clubs, stats: (statsData as StatsRow[] | null) ?? [] };
  });
}

async function buildTable(clubIds: Set<string>): Promise<RankingEntry[]> {
  const { stats } = await loadRankingData();
  const byPlayer = new Map<string, Omit<RankingEntry, "rank" | "name" | "photoUrl">>();
  for (const row of stats) {
    if (!clubIds.has(row.club_id)) continue;
    const cur = byPlayer.get(row.player_id) ?? {
      playerId: row.player_id,
      points: 0,
      matchesPlayed: 0,
      wins: 0,
      framesWon: 0,
      framesLost: 0,
      highestBreak: 0,
    };
    cur.points += row.ranking_points;
    cur.matchesPlayed += row.matches_played;
    cur.wins += row.wins;
    cur.framesWon += row.frames_won;
    cur.framesLost += row.frames_lost;
    cur.highestBreak = Math.max(cur.highestBreak, row.highest_break);
    byPlayer.set(row.player_id, cur);
  }
  if (byPlayer.size === 0) return [];

  const profiles = await loadProfiles([...byPlayer.keys()]);
  const sorted = [...byPlayer.values()]
    .map((p) => ({ ...p, name: profiles.get(p.playerId)?.name ?? "Player", photoUrl: profiles.get(p.playerId)?.photoUrl ?? "" }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.framesWon - b.framesLost - (a.framesWon - a.framesLost) ||
        a.name.localeCompare(b.name)
    );

  // Players level on points, wins and frame difference share a rank.
  let rank = 0;
  return sorted.map((p, i) => {
    const prev = sorted[i - 1];
    const tied =
      prev &&
      prev.points === p.points &&
      prev.wins === p.wins &&
      prev.framesWon - prev.framesLost === p.framesWon - p.framesLost;
    if (!tied) rank = i + 1;
    return { ...p, rank };
  });
}

async function loadProfiles(ids: string[]): Promise<Map<string, { name: string; photoUrl: string }>> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("player_profiles").select("id, full_name, profile_photo_url").in("id", ids);
  const rows = (data as { id: string; full_name: string; profile_photo_url: string | null }[] | null) ?? [];
  return new Map(rows.map((r) => [r.id, { name: r.full_name || "Player", photoUrl: playerPhotoUrl(r.id, r.profile_photo_url) }]));
}

export async function getStateRankings(stateCode: string): Promise<RankingEntry[]> {
  return remember(`rankings:state:${stateCode}`, TTL_MS, async () => {
    const { clubs } = await loadRankingData();
    return buildTable(new Set(clubs.filter((c) => c.state_code === stateCode).map((c) => c.id)));
  });
}

export async function getCityRankings(cityId: string): Promise<RankingEntry[]> {
  return remember(`rankings:city:${cityId}`, TTL_MS, async () => {
    const { clubs } = await loadRankingData();
    return buildTable(new Set(clubs.filter((c) => c.city_id === cityId).map((c) => c.id)));
  });
}

/** Cities in a state that have at least one ranked club, for the city filter. */
export async function getRankedCityIds(stateCode: string): Promise<Set<string>> {
  const { clubs, stats } = await loadRankingData();
  const clubsWithStats = new Set(stats.map((s) => s.club_id));
  return new Set(
    clubs
      .filter((c) => c.state_code === stateCode && c.city_id && clubsWithStats.has(c.id))
      .map((c) => c.city_id as string)
  );
}

/** Where a player stands: every launch state and city they have ranking points in. */
export async function getPlayerRanks(playerId: string): Promise<PlayerRank[]> {
  const { clubs, stats } = await loadRankingData();
  const playedClubIds = new Set(stats.filter((s) => s.player_id === playerId).map((s) => s.club_id));
  if (playedClubIds.size === 0) return [];

  const played = clubs.filter((c) => playedClubIds.has(c.id));
  const [states, cities] = await Promise.all([listActiveStates(), listCities()]);
  const ranks: PlayerRank[] = [];

  for (const state of states) {
    if (!played.some((c) => c.state_code === state.code)) continue;
    const table = await getStateRankings(state.code);
    const me = table.find((e) => e.playerId === playerId);
    if (me) {
      ranks.push({ scope: "state", code: state.code, name: state.name, href: `/rankings?state=${state.code}`, rank: me.rank, total: table.length });
    }
  }
  for (const city of cities) {
    if (!played.some((c) => c.city_id === city.id)) continue;
    const table = await getCityRankings(city.id);
    const me = table.find((e) => e.playerId === playerId);
    if (me) {
      ranks.push({
        scope: "city",
        code: city.id,
        name: city.name,
        href: `/rankings?state=${city.stateCode}&city=${city.id}`,
        rank: me.rank,
        total: table.length,
      });
    }
  }
  return ranks;
}
