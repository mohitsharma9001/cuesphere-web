import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Player profile ids the user follows (empty if migration 0025 isn't applied yet). */
export async function listFollowedPlayerIds(userId: string): Promise<string[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("player_follows").select("player_id").eq("follower_id", userId);
  return (data ?? []).map((row) => row.player_id as string);
}

/** Users following any of these players. */
export async function listFollowerUserIds(playerIds: string[]): Promise<string[]> {
  if (playerIds.length === 0) return [];
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("player_follows").select("follower_id").in("player_id", playerIds);
  return [...new Set((data ?? []).map((row) => row.follower_id as string))];
}

export async function isFollowingPlayer(userId: string, playerId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("player_follows")
    .select("id")
    .eq("follower_id", userId)
    .eq("player_id", playerId)
    .maybeSingle();
  return !!data;
}

export async function followPlayer(userId: string, playerId: string): Promise<{ error?: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("player_follows")
    .upsert({ follower_id: userId, player_id: playerId }, { onConflict: "follower_id,player_id", ignoreDuplicates: true });
  return { error: error?.message };
}

export async function unfollowPlayer(userId: string, playerId: string): Promise<{ error?: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("player_follows").delete().eq("follower_id", userId).eq("player_id", playerId);
  return { error: error?.message };
}
