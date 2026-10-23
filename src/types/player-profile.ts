export interface PlayerProfile {
  id: string;
  userId: string;
  memberId: string;
  fullName: string;
  email: string;
  mobile: string;
  dob: string;
  city: string;
  emergencyContact: string;
  profilePhotoUrl: string;
  preferredCue: string;
  primaryClubId: string | null;
  createdAt: string;
}

// A profile photo is optional.
export const REQUIRED_PROFILE_FIELDS: (keyof PlayerProfile)[] = [
  "fullName",
  "mobile",
  "email",
  "dob",
  "city",
  "emergencyContact",
];

export function getProfileCompletion(profile: PlayerProfile | null | undefined): {
  percent: number;
  missing: (keyof PlayerProfile)[];
  isComplete: boolean;
} {
  if (!profile) {
    return { percent: 0, missing: REQUIRED_PROFILE_FIELDS, isComplete: false };
  }
  const missing = REQUIRED_PROFILE_FIELDS.filter((field) => !profile[field]?.toString().trim());
  const percent = Math.round(
    ((REQUIRED_PROFILE_FIELDS.length - missing.length) / REQUIRED_PROFILE_FIELDS.length) * 100
  );
  return { percent, missing, isComplete: missing.length === 0 };
}

export const PROFILE_FIELD_LABELS: Record<keyof PlayerProfile, string> = {
  id: "ID",
  userId: "User ID",
  memberId: "Member ID",
  fullName: "Full Name",
  email: "Email",
  mobile: "Mobile Number",
  dob: "Date of Birth",
  city: "City",
  emergencyContact: "Emergency Contact",
  profilePhotoUrl: "Profile Photo",
  preferredCue: "Preferred Cue",
  primaryClubId: "Primary Club",
  createdAt: "Created At",
};
