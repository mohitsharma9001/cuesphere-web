import webpush from "web-push";
import {
  listAllPushSubscriptions,
  listPushSubscriptionsForUsers,
  deletePushSubscriptionByEndpoint,
  type PushSubscriptionRecord,
} from "@/services/push-subscription-service";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@cuesphere.app";
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

interface NotificationPayload {
  title: string;
  body: string;
  url: string;
}

/** Broadcasts to every registered user's subscribed devices, regardless of
 * club membership — used for "a new tournament was created somewhere" so
 * nobody misses one. Expired/invalid subscriptions are cleaned up as they're
 * discovered rather than left to accumulate. */
export async function broadcastPushNotification(payload: NotificationPayload): Promise<void> {
  const subscriptions = await listAllPushSubscriptions();
  await sendToSubscriptions(subscriptions, payload);
}

async function sendToSubscriptions(
  subscriptions: PushSubscriptionRecord[],
  payload: NotificationPayload
): Promise<void> {
  ensureConfigured();
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
  if (subscriptions.length === 0) return;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscriptionByEndpoint(sub.endpoint);
        }
      }
    })
  );
}

export async function notifyNewTournament(clubName: string, clubSlug: string, tournamentName: string, tournamentSlug: string) {
  await broadcastPushNotification({
    title: `New tournament: ${tournamentName}`,
    body: `${clubName} just announced "${tournamentName}". Tap to see details and register.`,
    url: `/c/${clubSlug}/tournaments/${tournamentSlug}`,
  });
}

/** Notifies a player's friends when they register for a tournament, so no one
 * misses that someone they know is playing. */
export async function notifyFriendRegistered(
  friendUserIds: string[],
  playerName: string,
  clubSlug: string,
  tournamentName: string,
  tournamentSlug: string
) {
  const subscriptions = await listPushSubscriptionsForUsers(friendUserIds);
  await sendToSubscriptions(subscriptions, {
    title: `${playerName} is playing ${tournamentName}`,
    body: `Your friend ${playerName} just registered for "${tournamentName}". Tap to see who else is in.`,
    url: `/c/${clubSlug}/tournaments/${tournamentSlug}`,
  });
}

/** When a match goes live, tells the friends and followers of both players so
 * they can watch — the "your friend is playing now" nudge. */
export async function notifyMatchStarted(input: {
  player1UserId: string | null;
  player2UserId: string | null;
  player1ProfileId: string;
  player2ProfileId: string;
  player1Name: string;
  player2Name: string;
  tableNumber: number;
  clubName: string;
  clubSlug: string;
  matchId: string;
}) {
  const { listFriendUserIds } = await import("@/services/friendship-service");
  const { listFollowerUserIds } = await import("@/services/follow-service");

  const playerUserIds = [input.player1UserId, input.player2UserId].filter((id): id is string => !!id);
  const [friendLists, followers] = await Promise.all([
    Promise.all(playerUserIds.map((id) => listFriendUserIds(id))),
    listFollowerUserIds([input.player1ProfileId, input.player2ProfileId]),
  ]);
  const recipients = [...new Set([...friendLists.flat(), ...followers])].filter((id) => !playerUserIds.includes(id));
  if (recipients.length === 0) return;

  const subscriptions = await listPushSubscriptionsForUsers(recipients);
  await sendToSubscriptions(subscriptions, {
    title: `${input.player1Name} v ${input.player2Name} is live`,
    body: `Now playing on Table ${input.tableNumber} at ${input.clubName}. Tap to watch.`,
    url: `/c/${input.clubSlug}/live/${input.matchId}`,
  });
}

async function userIdForProfile(profileId: string): Promise<string | null> {
  const { getProfileById } = await import("@/services/profile-service");
  return (await getProfileById(profileId))?.userId ?? null;
}

async function sendToProfile(profileId: string, payload: NotificationPayload) {
  const userId = await userIdForProfile(profileId);
  if (!userId) return;
  await sendToSubscriptions(await listPushSubscriptionsForUsers([userId]), payload);
}

/** "Rohan challenged you to a best-of-3 friendly." */
export async function notifyFriendlyChallenge(input: {
  matchId: string;
  opponentProfileId: string;
  challengerName: string;
  bestOf: number;
}) {
  await sendToProfile(input.opponentProfileId, {
    title: `${input.challengerName} challenged you`,
    body: `A best-of-${input.bestOf} friendly on CueSphere. Tap to accept.`,
    url: `/play/${input.matchId}`,
  });
}

export async function notifyFriendlyAccepted(input: { matchId: string; challengerProfileId: string; opponentName: string }) {
  await sendToProfile(input.challengerProfileId, {
    title: `${input.opponentName} accepted your challenge`,
    body: "Start the match and score it from your phone.",
    url: `/play/${input.matchId}`,
  });
}

export async function notifyFriendlyResultToConfirm(input: {
  matchId: string;
  opponentProfileId: string;
  submitterName: string;
}) {
  await sendToProfile(input.opponentProfileId, {
    title: "Confirm your friendly result",
    body: `${input.submitterName} entered the final score. Tap to confirm it.`,
    url: `/play/${input.matchId}`,
  });
}

/** A friendly went live: friends and followers of both players can watch. */
export async function notifyFriendlyStarted(input: {
  matchId: string;
  player1ProfileId: string;
  player2ProfileId: string;
  player1Name: string;
  player2Name: string;
  venueName: string | null;
}) {
  const { listFriendUserIds } = await import("@/services/friendship-service");
  const { listFollowerUserIds } = await import("@/services/follow-service");

  const playerUserIds = (
    await Promise.all([userIdForProfile(input.player1ProfileId), userIdForProfile(input.player2ProfileId)])
  ).filter((id): id is string => !!id);
  const [friendLists, followers] = await Promise.all([
    Promise.all(playerUserIds.map((id) => listFriendUserIds(id))),
    listFollowerUserIds([input.player1ProfileId, input.player2ProfileId]),
  ]);
  const recipients = [...new Set([...friendLists.flat(), ...followers])].filter((id) => !playerUserIds.includes(id));
  if (recipients.length === 0) return;

  await sendToSubscriptions(await listPushSubscriptionsForUsers(recipients), {
    title: `${input.player1Name} v ${input.player2Name} is live`,
    body: input.venueName ? `A friendly at ${input.venueName}. Tap to watch.` : "A friendly match. Tap to watch.",
    url: `/matches/${input.matchId}`,
  });
}
