import { api, ApiRequestError } from "@/lib/api/server";
import type { AdminClubEnquiry, ClubEnquiry, EnquiryStage } from "@/types/club-enquiry";

export async function getMyClubEnquiry(): Promise<{ stage: EnquiryStage; enquiry: ClubEnquiry | null }> {
  return api("/club-enquiries/me");
}

export async function sendClubEnquiry(input: {
  ownerName: string;
  mobile: string;
  clubName: string;
  stateCode: string;
  cityId: string;
  tables: number;
  message?: string;
}): Promise<{ error?: string }> {
  try {
    await api("/club-enquiries", { method: "POST", body: input });
    return {};
  } catch (error) {
    if (error instanceof ApiRequestError) return { error: error.message };
    console.error("Club enquiry failed:", error);
    return { error: "Could not send your request." };
  }
}

/** Platform admins. */
export async function listClubEnquiries(status: "pending" | "approved" | "rejected"): Promise<AdminClubEnquiry[]> {
  return api("/platform/club-enquiries", { query: { status } });
}

export async function reviewClubEnquiry(id: string, decision: "approve" | "reject", reason?: string): Promise<{ error?: string }> {
  try {
    await api(`/platform/club-enquiries/${encodeURIComponent(id)}/${decision}`, {
      method: "POST",
      body: decision === "reject" ? { reason } : {},
    });
    return {};
  } catch (error) {
    if (error instanceof ApiRequestError) return { error: error.message };
    return { error: "Could not update the request." };
  }
}
