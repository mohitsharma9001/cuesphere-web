/** Where a player is in the "open a club" journey (GET /club-enquiries/me). */
export type EnquiryStage = "none" | "pending" | "rejected" | "approved" | "club_pending" | "club_live";

export interface ClubEnquiry {
  id: string;
  userId: string;
  ownerName: string;
  mobile: string;
  clubName: string;
  stateCode: string;
  cityId: string;
  tables: number;
  message: string;
  status: "pending" | "approved" | "rejected";
  rejectReason: string;
  reviewedAt: string | null;
  clubId: string | null;
  createdAt: string;
}

/** As the platform-admin list returns it. */
export interface AdminClubEnquiry extends ClubEnquiry {
  email: string | null;
  stateName: string;
  cityName: string;
}
