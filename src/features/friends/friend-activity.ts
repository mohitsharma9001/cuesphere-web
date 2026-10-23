import { getOpenMatchesForPlayers } from "@/services/match-service";
import { getClubsByIds } from "@/services/club-service";
import { getClubTournamentsByIds } from "@/services/club-tournament-service";
import { getProfilesByUserIds } from "@/services/profile-service";
import { listFriendUserIds } from "@/services/friendship-service";
import { listFollowedPlayerIds } from "@/services/follow-service";

export interface FriendMatch {
  id: string;
  status: "live" | "scheduled";
  href: string;
  clubName: string;
  tournamentName: string;
  round: string;
  tableNumber: number;
  startTime: string;
  player1Name: string;
  player2Name: string;
  framesWonPlayer1: number;
  framesWonPlayer2: number;
  /** Friends / followed players in this match, e.g. "Rohan Iyer". */
  watching: string[];
}

/** Live and upcoming matches of the user's friends and the players they follow. */
export async function getFriendActivity(userId: string): Promise<{ live: FriendMatch[]; upcoming: FriendMatch[] }> {
  const [friendUserIds, followedIds] = await Promise.all([listFriendUserIds(userId), listFollowedPlayerIds(userId)]);
  const friendProfiles = [...(await getProfilesByUserIds(friendUserIds)).values()];
  const playerIds = [...new Set([...friendProfiles.map((p) => p.id), ...followedIds])];
  const matches = await getOpenMatchesForPlayers(playerIds);
  const wanted = new Set(playerIds);

  // Every club and tournament these matches mention, one request each.
  const [clubs, tournaments] = await Promise.all([
    getClubsByIds(matches.map((m) => (m.kind === "friendly" ? m.venueClubId : m.clubId))),
    getClubTournamentsByIds(matches.filter((m) => m.kind !== "friendly").map((m) => m.tournamentId)),
  ]);
  const items = matches.map((m): FriendMatch | null => {
    const watching = [
      ...(wanted.has(m.player1Id) ? [m.player1Name] : []),
      ...(wanted.has(m.player2Id) ? [m.player2Name] : []),
    ];
    if (m.kind === "friendly") {
      const venueId = m.venueClubId ?? "";
      return {
        id: m.id,
        status: m.status === "live" ? "live" : "scheduled",
        href: `/matches/${m.id}`,
        clubName: (venueId && clubs.get(venueId)?.name) || "",
        tournamentName: "Friendly",
        round: `Best of ${m.bestOf ?? 3}`,
        tableNumber: m.tableNumber,
        startTime: m.matchStartTime,
        player1Name: m.player1Name,
        player2Name: m.player2Name,
        framesWonPlayer1: m.framesWonPlayer1,
        framesWonPlayer2: m.framesWonPlayer2,
        watching,
      };
    }
    const club = clubs.get(m.clubId);
    if (!club || club.status !== "approved") return null;
    const tournament = tournaments.get(m.tournamentId);
    return {
      id: m.id,
      status: m.status === "live" ? "live" : "scheduled",
      href:
        m.status === "live"
          ? `/c/${club.slug}/live/${m.id}`
          : tournament
            ? `/c/${club.slug}/tournaments/${tournament.slug}`
            : `/c/${club.slug}`,
      clubName: club.name,
      tournamentName: tournament?.name ?? "",
      round: m.round,
      tableNumber: m.tableNumber,
      startTime: m.matchStartTime,
      player1Name: m.player1Name,
      player2Name: m.player2Name,
      framesWonPlayer1: m.framesWonPlayer1,
      framesWonPlayer2: m.framesWonPlayer2,
      watching,
    };
  });

  const valid = items.filter((i): i is FriendMatch => i !== null);
  return { live: valid.filter((i) => i.status === "live"), upcoming: valid.filter((i) => i.status === "scheduled") };
}
