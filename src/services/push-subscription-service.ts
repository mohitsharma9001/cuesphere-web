import { api } from "@/lib/api/server";

// Sending pushes now happens in the API; this only manages the signed-in user's devices.

export async function savePushSubscription(
  _userId: string,
  subscription: { endpoint: string; p256dh: string; auth: string }
): Promise<{ error?: string }> {
  try {
    await api("/push/subscriptions", {
      method: "POST",
      body: { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    });
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the subscription." };
  }
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await api("/push/subscriptions", { method: "DELETE", body: { endpoint }, auth: false }).catch(() => {});
}

export async function isUserSubscribed(_userId: string): Promise<boolean> {
  const { subscribed } = await api<{ subscribed: boolean }>("/push/status").catch(() => ({ subscribed: false }));
  return subscribed;
}
