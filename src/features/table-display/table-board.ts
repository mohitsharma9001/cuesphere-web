import { getMatchById, getScorableMatchesForClub } from "@/services/match-service";
import { getClubTournamentById } from "@/services/club-tournament-service";
import { getProfileById } from "@/services/profile-service";
import { getStreamSettings } from "@/services/stream-settings-service";
import { remember } from "@/lib/memo";
import type { Club } from "@/types/club";
import type { DrawMatch } from "@/types/match";
import type { ClubBoard, TableBoard, TableMatch, TableSide } from "@/features/table-display/types";

// TVs and overlays poll every couple of seconds; player photos and tournament
// names barely change, so keep them a minute instead of re-reading each time.
const SLOW_TTL_MS = 60_000;
// Every screen in a club polls the same open-match list: share one read per 1.5s.
const OPEN_MATCHES_TTL_MS = 1_500;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

async function side(playerId: string, name: string, score: number, frames: number): Promise<TableSide> {
  const photoUrl = await remember(
    `photo:${playerId}`,
    SLOW_TTL_MS,
    async () => (await getProfileById(playerId))?.profilePhotoUrl || null
  );
  return { name, initials: initials(name), photoUrl, score, frames };
}

export async function toTableMatch(match: DrawMatch): Promise<TableMatch> {
  const [tournament, p1, p2] = await Promise.all([
    remember(`tournament:${match.tournamentId}`, SLOW_TTL_MS, () => getClubTournamentById(match.tournamentId)),
    side(match.player1Id, match.player1Name, match.currentFrameScorePlayer1, match.framesWonPlayer1),
    side(match.player2Id, match.player2Name, match.currentFrameScorePlayer2, match.framesWonPlayer2),
  ]);
  const onColour = match.currentBreakBalls[match.currentBreakBalls.length - 1] === "red";

  return {
    id: match.id,
    status: match.status,
    round: match.round,
    tournamentName: tournament?.name ?? "",
    bestOf: tournament?.bestOf ?? null,
    tableNumber: match.tableNumber,
    reportingTime: match.reportingTime,
    startTime: match.matchStartTime,
    p1,
    p2,
    currentBreak: match.currentBreak,
    breakBalls: match.currentBreakBalls,
    redsRemaining: match.redsRemaining,
    pointsRemaining: match.redsRemaining > 0 ? match.redsRemaining * 8 + 27 + (onColour ? 7 : 0) : null,
    onStrike: match.currentPlayer,
    inFrameBreak: match.inFrameBreak,
    frames: match.frameScores,
    highestBreak: match.highestBreak,
    highestBreakBy:
      match.highestBreakPlayerId === match.player1Id ? 1 : match.highestBreakPlayerId === match.player2Id ? 2 : null,
    winner: match.winnerId === match.player1Id ? 1 : match.winnerId === match.player2Id ? 2 : null,
  };
}

/** What one table's TV / overlay should show right now. */
export async function getTableBoard(club: Club, table: number, followId?: string): Promise<TableBoard> {
  const open = await remember(`open:${club.id}`, OPEN_MATCHES_TTL_MS, () => getScorableMatchesForClub(club.id));
  const live = open.find((m) => m.status === "live" && m.tableNumber === table);
  const next = open.find((m) => m.status === "scheduled" && m.tableNumber === table);

  let followed: DrawMatch | undefined;
  if (followId && followId !== live?.id) {
    const match = await getMatchById(followId);
    if (match && match.clubId === club.id && match.tableNumber === table) followed = match;
  }

  const byTable = new Map<number, DrawMatch>();
  for (const m of open) {
    if (m.tableNumber === table) continue;
    const current = byTable.get(m.tableNumber);
    if (!current || (m.status === "live" && current.status !== "live")) byTable.set(m.tableNumber, m);
  }
  const ticker = [...byTable.values()]
    .sort((a, b) => a.tableNumber - b.tableNumber)
    .map((m) => ({
      table: m.tableNumber,
      live: m.status === "live",
      text:
        m.status === "live"
          ? `${m.player1Name} ${m.framesWonPlayer1} – ${m.framesWonPlayer2} ${m.player2Name}`
          : `${m.player1Name} v ${m.player2Name}${m.matchStartTime ? ` · ${m.matchStartTime}` : ""}`,
    }));

  const [settings, liveView, nextView, followedView] = await Promise.all([
    // Short cache so admin changes show on screens within a few seconds.
    remember(`stream:${club.id}`, 5_000, () => getStreamSettings(club.id)),
    live ? toTableMatch(live) : null,
    next ? toTableMatch(next) : null,
    followed ? toTableMatch(followed) : null,
  ]);

  return {
    club: { id: club.id, name: club.name, logoUrl: club.logoUrl },
    stream: {
      youtubeUrl: settings.youtubeUrls[String(table)] ?? null,
      sponsorLogos: settings.sponsorLogos,
      accent: settings.accent,
      show: settings.show,
      ads: settings.ads,
    },
    table,
    live: liveView,
    next: nextView,
    followed: followedView,
    ticker,
  };
}

/** Every live table in the club at once, for the single TV that rotates through them. */
export async function getClubBoard(club: Club): Promise<ClubBoard> {
  const open = await remember(`open:${club.id}`, OPEN_MATCHES_TTL_MS, () => getScorableMatchesForClub(club.id));
  const live = new Map<number, DrawMatch>();
  const next = new Map<number, DrawMatch>();
  for (const m of open) {
    const into = m.status === "live" ? live : next;
    if (!into.has(m.tableNumber)) into.set(m.tableNumber, m);
  }
  const byTable = (a: DrawMatch, b: DrawMatch) => a.tableNumber - b.tableNumber;

  const [settings, liveViews, nextViews] = await Promise.all([
    remember(`stream:${club.id}`, 5_000, () => getStreamSettings(club.id)),
    Promise.all([...live.values()].sort(byTable).map(toTableMatch)),
    Promise.all(
      [...next.values()]
        .filter((m) => !live.has(m.tableNumber))
        .sort(byTable)
        .map(toTableMatch)
    ),
  ]);

  return {
    club: { id: club.id, name: club.name, logoUrl: club.logoUrl },
    stream: {
      youtubeUrl: null,
      sponsorLogos: settings.sponsorLogos,
      accent: settings.accent,
      show: settings.show,
      ads: settings.ads,
    },
    live: liveViews,
    next: nextViews,
  };
}
