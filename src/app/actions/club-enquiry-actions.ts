"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendClubEnquiry } from "@/services/club-enquiry-service";

const enquirySchema = z.object({
  ownerName: z.string().trim().min(2, "Enter your name."),
  mobile: z.string().trim().min(10, "Enter a valid 10-digit mobile number."),
  clubName: z.string().trim().min(2, "Enter the club's name."),
  stateCode: z.string().min(1, "Choose your club's state and city."),
  cityId: z.string().min(1, "Choose your club's state and city."),
  tables: z.coerce.number().int().min(1, "Enter the number of tables (1–100).").max(100, "Enter the number of tables (1–100)."),
  message: z.string().trim().max(1000).optional(),
});

/** Step 1 of creating a club: ask CueSphere (the API validates everything again). */
export async function sendClubEnquiryAction(input: z.input<typeof enquirySchema>) {
  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const result = await sendClubEnquiry(parsed.data);
  if (result.error) return { success: false as const, error: result.error };
  revalidatePath("/clubs/new");
  return { success: true as const };
}
