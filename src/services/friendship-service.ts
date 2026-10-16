import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRegisteredPlayerIds } from "@/services/registration-service";
import type { PlayerProfile } from "@/types/player-profile";
import type { Friendship } from "@/types/friendship";
import { playerPhotoUrl } from "@/lib/player-photo";

interface FriendshipRow {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: Friendship["status"];
  created_at: string;
  responded_at: string | null;
}

function fromRow(row: FriendshipRow): Friendship {
  return {
    id: row.id,
    requesterId: row.requester_id,
    recipientId: row.recipient_id,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

interface ProfileRow {
  id: string;
  user_id: string;
  member_id: string;
  full_name: string;
  email: string;
  mobile: string;
  dob: string | null;
  city: string;
  emergency_contact: string;
  profile_photo_url: string;
  preferred_cue: string;
  primary_club_id: string | null;
  created_at: string;
}

function profileFromRow(row: ProfileRow): PlayerProfile {
  return {
    id: row.id,
    userId: row.user_id,
    memberId: row.member_id,
    fullName: row.full_name,
    email: row.email,
    mobile: row.mobile,
    dob: row.dob ?? "",
    city: row.city,
    primaryClubId: row.primary_club_id,
    emergencyContact: row.emergency_contact,
    profilePhotoUrl: playerPhotoUrl(row.id, row.profile_photo_url),
    preferredCue: row.preferred_cue,
    createdAt: row.created_at,
  };
}

/** Every player registered on CueSphere, for the platform-wide directory. */
export async function listAllPlayerProfiles(): Promise<PlayerProfile[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("player_profiles")
    .select("*")
    .order("full_name", { ascending: true });
  return (data as ProfileRow[] | null)?.map(profileFromRow) ?? [];
}

/** Every friendship row (any status, either direction) involving this user. */
export async function listFriendshipsForUser(userId: string): Promise<Friendship[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
  return (data as FriendshipRow[] | null)?.map(fromRow) ?? [];
}

/** Accepted friends' user ids only (the "other side" of each friendship). */
export async function listFriendUserIds(userId: string): Promise<string[]> {
  const friendships = await listFriendshipsForUser(userId);
  return friendships
    .filter((f) => f.status === "accepted")
    .map((f) => (f.requesterId === userId ? f.recipientId : f.requesterId));
}

export async function sendFriendRequest(
  requesterId: string,
  recipientId: string
): Promise<{ error?: string }> {
  if (requesterId === recipientId) {
    return { error: "You can't send a friend request to yourself." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: requesterId, recipient_id: recipientId });
  if (error) {
    if (error.code === "23505") return { error: "A friend request already exists between you two." };
    return { error: error.message };
  }
  return {};
}

export async function respondToFriendRequest(
  friendshipId: string,
  userId: string,
  accept: boolean
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
    .eq("id", friendshipId)
    .eq("recipient_id", userId);
  return { error: error?.message };
}

/** Cancels a pending request or removes an existing friendship. */
export async function removeFriendship(friendshipId: string, userId: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
  return { error: error?.message };
}

/** How many of the given friend user-ids are registered for this tournament. */
export async function countFriendsRegistered(tournamentId: string, friendUserIds: string[]): Promise<number> {
  if (friendUserIds.length === 0) return 0;
  const registeredProfileIds = await getRegisteredPlayerIds(tournamentId);
  if (registeredProfileIds.length === 0) return 0;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("player_profiles")
    .select("user_id")
    .in("id", registeredProfileIds);

  const friendSet = new Set(friendUserIds);
  return (data as { user_id: string }[] | null)?.filter((row) => friendSet.has(row.user_id)).length ?? 0;
}
