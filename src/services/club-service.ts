import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Club, ClubMembership, ClubRole } from "@/types/club";

interface ClubRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  hero_banner_url: string;
  address: string;
  phone: string;
  email: string;
  google_maps_url: string;
  state_code: string | null;
  city_id: string | null;
  social_links: Record<string, string>;
  about_text: string;
  rules_text: string;
  membership_text: string;
  privacy_policy_text: string;
  status: Club["status"];
  created_at: string;
}

interface MembershipRow {
  id: string;
  club_id: string;
  user_id: string;
  member_id: string;
  role: ClubRole;
  created_at: string;
}

function clubFromRow(row: ClubRow): Club {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description ?? "",
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    heroBannerUrl: row.hero_banner_url,
    address: row.address,
    phone: row.phone,
    email: row.email,
    googleMapsUrl: row.google_maps_url,
    stateCode: row.state_code ?? null,
    cityId: row.city_id ?? null,
    socialLinks: row.social_links ?? {},
    aboutText: row.about_text ?? "",
    rulesText: row.rules_text ?? "",
    membershipText: row.membership_text ?? "",
    privacyPolicyText: row.privacy_policy_text ?? "",
    status: row.status,
    createdAt: row.created_at,
  };
}

function membershipFromRow(row: MembershipRow): ClubMembership {
  return {
    id: row.id,
    clubId: row.club_id,
    userId: row.user_id,
    memberId: row.member_id,
    role: row.role,
    createdAt: row.created_at,
  };
}

/** Memoized per-request — called independently by ~2 dozen pages/actions
 * plus getClubViewer() on the same navigation; cache() collapses repeat
 * calls for the same slug into a single query. */
export const getClubBySlug = cache(async (slug: string): Promise<Club | undefined> => {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("clubs").select("*").eq("slug", slug).maybeSingle();
  return data ? clubFromRow(data as ClubRow) : undefined;
});

export async function getClubById(id: string): Promise<Club | undefined> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("clubs").select("*").eq("id", id).maybeSingle();
  return data ? clubFromRow(data as ClubRow) : undefined;
}

export async function listClubs(): Promise<Club[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("clubs").select("*").order("created_at", { ascending: false });
  return (data as ClubRow[] | null)?.map(clubFromRow) ?? [];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createClub(input: {
  name: string;
  tagline?: string;
  stateCode: string;
  cityId: string;
  ownerUserId: string;
}): Promise<{ club: Club } | { error: string }> {
  const baseSlug = slugify(input.name);
  if (!baseSlug) return { error: "Enter a valid club name." };

  const admin = createSupabaseAdminClient();

  let slug = baseSlug;
  for (let i = 0; i < 20; i++) {
    const { data: existing } = await admin.from("clubs").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${i + 2}`;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clubs")
    .insert({
      slug,
      name: input.name,
      tagline: input.tagline ?? "",
      state_code: input.stateCode,
      city_id: input.cityId,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create club." };
  }

  const club = clubFromRow(data as ClubRow);

  const { error: membershipError } = await supabase.from("club_memberships").insert({
    club_id: club.id,
    user_id: input.ownerUserId,
    role: "club_admin",
  });

  if (membershipError) {
    return { error: membershipError.message };
  }

  return { club };
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function approveClub(clubId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("clubs").update({ status: "approved" }).eq("id", clubId);
}

export async function rejectClub(clubId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("clubs").delete().eq("id", clubId);
}

export async function updateClub(
  clubId: string,
  input: {
    name?: string;
    tagline?: string;
    description?: string;
    logoUrl?: string;
    heroBannerUrl?: string;
    address?: string;
    phone?: string;
    email?: string;
    googleMapsUrl?: string;
    stateCode?: string;
    cityId?: string;
    socialLinks?: Record<string, string>;
    aboutText?: string;
    rulesText?: string;
    membershipText?: string;
    privacyPolicyText?: string;
  }
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clubs")
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.logoUrl !== undefined ? { logo_url: input.logoUrl } : {}),
      ...(input.heroBannerUrl !== undefined ? { hero_banner_url: input.heroBannerUrl } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.googleMapsUrl !== undefined ? { google_maps_url: input.googleMapsUrl } : {}),
      ...(input.stateCode !== undefined ? { state_code: input.stateCode } : {}),
      ...(input.cityId !== undefined ? { city_id: input.cityId } : {}),
      ...(input.socialLinks !== undefined ? { social_links: input.socialLinks } : {}),
      ...(input.aboutText !== undefined ? { about_text: input.aboutText } : {}),
      ...(input.rulesText !== undefined ? { rules_text: input.rulesText } : {}),
      ...(input.membershipText !== undefined ? { membership_text: input.membershipText } : {}),
      ...(input.privacyPolicyText !== undefined ? { privacy_policy_text: input.privacyPolicyText } : {}),
    })
    .eq("id", clubId)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error(
      "Update didn't apply — you may not have permission to edit this club (RLS blocked the write)."
    );
  }
}

export async function getMembership(clubId: string, userId: string): Promise<ClubMembership | undefined> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("club_memberships")
    .select("*")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ? membershipFromRow(data as MembershipRow) : undefined;
}

export async function listMembershipsForUser(userId: string): Promise<ClubMembership[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("club_memberships").select("*").eq("user_id", userId);
  return (data as MembershipRow[] | null)?.map(membershipFromRow) ?? [];
}

export async function listMembershipsForClub(clubId: string): Promise<ClubMembership[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("club_memberships").select("*").eq("club_id", clubId);
  return (data as MembershipRow[] | null)?.map(membershipFromRow) ?? [];
}

export async function ensurePlayerMembership(
  clubId: string,
  userId: string
): Promise<ClubMembership> {
  const existing = await getMembership(clubId, userId);
  if (existing) return existing;

  const supabase = await createSupabaseServerClient();
  const memberId = `M-${Math.floor(1000 + Math.random() * 8999)}`;
  const { data, error } = await supabase
    .from("club_memberships")
    .insert({ club_id: clubId, user_id: userId, member_id: memberId, role: "player" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not join club.");
  }

  return membershipFromRow(data as MembershipRow);
}

