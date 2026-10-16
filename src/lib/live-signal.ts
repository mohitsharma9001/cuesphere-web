import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LIVE_SIGNAL_EVENT, liveClubChannel, liveMatchChannel, liveTableChannel } from "@/lib/live-channels";

/** Tells everyone watching this match (live page, table TV, stream overlay) to
 * refresh now. Carries no match data, so nothing private is broadcast. */
export async function signalMatchChanged(match: { id: string; clubId: string; tableNumber: number }): Promise<void> {
  const admin = createSupabaseAdminClient();
  // Friendlies belong to no club, so there is no table TV to wake.
  const names = [
    liveMatchChannel(match.id),
    ...(match.clubId ? [liveTableChannel(match.clubId, match.tableNumber), liveClubChannel(match.clubId)] : []),
  ];
  await Promise.all(
    names.map(async (name) => {
      const channel = admin.channel(name);
      try {
        await channel.httpSend(LIVE_SIGNAL_EVENT, { at: Date.now() }, { timeout: 3000 });
      } catch {
        // Screens still catch up on their next regular poll.
      } finally {
        await admin.removeChannel(channel);
      }
    })
  );
}
