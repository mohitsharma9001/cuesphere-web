export type ClubStatus = "pending" | "approved" | "suspended";

export type ClubRole =
  | "club_admin"
  | "club_staff_receptionist"
  | "club_staff_referee"
  | "club_staff_scorekeeper"
  | "player";

export const CLUB_STAFF_ROLES: ClubRole[] = [
  "club_admin",
  "club_staff_receptionist",
  "club_staff_referee",
  "club_staff_scorekeeper",
];

export interface Club {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  heroBannerUrl: string;
  address: string;
  phone: string;
  email: string;
  googleMapsUrl: string;
  /** Launch state the club is in (e.g. "KA"); null for clubs created before locations. */
  stateCode: string | null;
  cityId: string | null;
  socialLinks: Record<string, string>;
  aboutText: string;
  rulesText: string;
  membershipText: string;
  privacyPolicyText: string;
  status: ClubStatus;
  createdAt: string;
}

export interface ClubMembership {
  id: string;
  clubId: string;
  userId: string;
  memberId: string;
  role: ClubRole;
  createdAt: string;
}

export function isStaffRole(role: ClubRole | undefined): boolean {
  return role === "club_admin" || role?.startsWith("club_staff_") === true;
}

/** A scorekeeper account only ever scores live matches — no access to
 * settings, tournaments, fixtures or anything else in the admin panel. */
export function isScorekeeperOnly(role: ClubRole | undefined): boolean {
  return role === "club_staff_scorekeeper";
}
