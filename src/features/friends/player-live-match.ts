import { getOpenMatchesForPlayers } from "@/services/match-service";
import { getClubById } from "@/services/club-service";
import { getClubTournamentById } from "@/services/club-tournament-service";

export interface PlayerLiveMatch {
  href: string;
  opponent: string;
  framesFor: number;
  framesAgainst: number;
  context: string;
}

/** The player's live match right now, if any, with a link to watch it. */
export async function getPlayerLiveMatch(playerId: string): Promise<PlayerLiveMatch | null> {
  const match = (await getOpenMatchesForPlayers([playerId])).find((m) => m.status === "live");
  if (!match) return null;
  const isP1 = match.player1Id === playerId;
  if (match.kind === "friendly") {
    const venue = match.venueClubId ? await getClubById(match.venueClubId) : undefined;
    return {
      href: `/matches/${match.id}`,
      opponent: isP1 ? match.player2Name : match.player1Name,
      framesFor: isP1 ? match.framesWonPlayer1 : match.framesWonPlayer2,
      framesAgainst: isP1 ? match.framesWonPlayer2 : match.framesWonPlayer1,
      context: ["Friendly", venue?.name, `Best of ${match.bestOf ?? 3}`].filter(Boolean).join(" · "),
    };
  }
  const [club, tournament] = await Promise.all([getClubById(match.clubId), getClubTournamentById(match.tournamentId)]);
  if (!club || club.status !== "approved") return null;
  return {
    href: `/c/${club.slug}/live/${match.id}`,
    opponent: isP1 ? match.player2Name : match.player1Name,
    framesFor: isP1 ? match.framesWonPlayer1 : match.framesWonPlayer2,
    framesAgainst: isP1 ? match.framesWonPlayer2 : match.framesWonPlayer1,
    context: [club.name, tournament?.name, match.round, `Table ${match.tableNumber}`].filter(Boolean).join(" · "),
  };
}
