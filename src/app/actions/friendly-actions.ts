"use server";

import { after } from "next/server";

import { getSession } from "@/lib/auth/session";
import { signalMatchChanged } from "@/lib/live-signal";
import { getProfileById, getProfileByUserId } from "@/services/profile-service";
import { getClubById } from "@/services/club-service";
import { getMatchById } from "@/services/match-service";
import {
  FRIENDLY_BEST_OF,
  confirmFriendlyResult,
  createFriendly,
  searchPlayers,
  setFriendlyState,
} from "@/services/friendly-service";
import {
  notifyFriendlyAccepted,
  notifyFriendlyChallenge,
  notifyFriendlyStarted,
} from "@/services/push-notification-service";
import type { DrawMatch } from "@/types/match";

async function getMe() {
  const session = await getSession();
  if (!session) return null;
  const profile = await getProfileByUserId(session.id);
  return profile ? { userId: session.id, profile } : null;
}

/** The signed-in player's friendly, with which side they're on. */
async function loadMine(matchId: string) {
  const me = await getMe();
  if (!me) return { ok: false as const, error: "Log in to continue." };
  const match = await getMatchById(matchId);
  if (!match || match.kind !== "friendly") return { ok: false as const, error: "Match not found." };
  const side = match.player1Id === me.profile.id ? 1 : match.player2Id === me.profile.id ? 2 : 0;
  if (!side) return { ok: false as const, error: "This isn't your match." };
  return { ok: true as const, me, match, side };
}

function signal(match: DrawMatch) {
  after(() => signalMatchChanged(match).catch(() => {}));
}

export async function searchPlayersAction(query: string) {
  const me = await getMe();
  if (!me) return [];
  return searchPlayers(query, me.profile.id);
}

export async function createFriendlyAction(input: {
  opponentId: string;
  bestOf: number;
  venueClubId?: string | null;
  tableNumber?: number;
}) {
  const me = await getMe();
  if (!me) return { success: false as const, error: "Log in to challenge a player." };
  if (!me.profile.fullName) {
    return { success: false as const, error: "Add your name to your profile before challenging someone." };
  }
  if (!(FRIENDLY_BEST_OF as readonly number[]).includes(input.bestOf)) {
    return { success: false as const, error: "Choose best of 1, 3, 5 or 7." };
  }
  if (input.opponentId === me.profile.id) {
    return { success: false as const, error: "You can't challenge yourself." };
  }
  // The opponent must already be on CueSphere.
  const opponent = await getProfileById(input.opponentId);
  if (!opponent || !opponent.fullName) {
    return { success: false as const, error: "That player isn't registered on CueSphere." };
  }
  let venueClubId: string | null = null;
  if (input.venueClubId) {
    const club = await getClubById(input.venueClubId);
    if (!club || club.status !== "approved") return { success: false as const, error: "Choose a club from the list." };
    venueClubId = club.id;
  }
  const tableNumber = Math.max(0, Math.min(99, Math.round(input.tableNumber ?? 0)));

  try {
    const match = await createFriendly({
      creatorUserId: me.userId,
      creator: me.profile,
      opponent,
      bestOf: input.bestOf,
      venueClubId,
      tableNumber,
    });
    after(() =>
      notifyFriendlyChallenge({
        matchId: match.id,
        opponentProfileId: opponent.id,
        challengerName: me.profile.fullName,
        bestOf: input.bestOf,
      }).catch(() => {})
    );
    return { success: true as const, matchId: match.id };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Could not create the match." };
  }
}

/** The challenged player accepts or declines. */
export async function respondToFriendlyAction(matchId: string, accept: boolean) {
  const r = await loadMine(matchId);
  if (!r.ok) return { success: false as const, error: r.error };
  if (r.side !== 2) return { success: false as const, error: "Only the challenged player can answer." };
  if (r.match.friendlyState !== "invited") return { success: false as const, error: "This challenge was already answered." };

  await setFriendlyState(matchId, { friendly_state: accept ? "accepted" : "declined" });
  if (accept) {
    after(() =>
      notifyFriendlyAccepted({
        matchId,
        challengerProfileId: r.match.player1Id,
        opponentName: r.match.player2Name,
      }).catch(() => {})
    );
  }
  return { success: true as const };
}

/** Either player can call it off before it starts. */
export async function cancelFriendlyAction(matchId: string) {
  const r = await loadMine(matchId);
  if (!r.ok) return { success: false as const, error: r.error };
  if (!["invited", "accepted"].includes(r.match.friendlyState ?? "") || r.match.status !== "scheduled") {
    return { success: false as const, error: "This match can't be cancelled now." };
  }
  await setFriendlyState(matchId, { friendly_state: "cancelled" });
  return { success: true as const };
}

/** Goes live: friends and followers get a "watch now" alert. */
export async function startFriendlyAction(matchId: string) {
  const r = await loadMine(matchId);
  if (!r.ok) return { success: false as const, error: r.error };
  if (r.match.friendlyState !== "accepted") return { success: false as const, error: "Accept the challenge first." };
  if (r.match.status === "live") return { success: true as const };

  const startedAt = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  await setFriendlyState(matchId, { status: "live", match_start_time: startedAt });
  const match = r.match;
  after(async () => {
    const venue = match.venueClubId ? await getClubById(match.venueClubId) : undefined;
    await notifyFriendlyStarted({
      matchId,
      player1ProfileId: match.player1Id,
      player2ProfileId: match.player2Id,
      player1Name: match.player1Name,
      player2Name: match.player2Name,
      venueName: venue?.name ?? null,
    }).catch(() => {});
  });
  signal(match);
  return { success: true as const };
}

/** The player who didn't enter the score agrees with it — stats update now. */
export async function confirmFriendlyAction(matchId: string) {
  const r = await loadMine(matchId);
  if (!r.ok) return { success: false as const, error: r.error };
  if (r.match.friendlyState !== "pending_confirmation") return { success: false as const, error: "Nothing to confirm." };
  if (r.match.resultSubmittedBy === r.me.profile.id) {
    return { success: false as const, error: "Your opponent needs to confirm the score you entered." };
  }
  await confirmFriendlyResult(r.match);
  signal(r.match);
  return { success: true as const };
}

/** The other player disagrees: the match reopens so the score can be corrected and sent again. */
export async function disputeFriendlyAction(matchId: string) {
  const r = await loadMine(matchId);
  if (!r.ok) return { success: false as const, error: r.error };
  if (r.match.friendlyState !== "pending_confirmation") return { success: false as const, error: "Nothing to dispute." };
  if (r.match.resultSubmittedBy === r.me.profile.id) {
    return { success: false as const, error: "Only your opponent can reject this score." };
  }
  await setFriendlyState(matchId, { friendly_state: "accepted", status: "live", result_submitted_by: null });
  signal(r.match);
  return { success: true as const };
}
