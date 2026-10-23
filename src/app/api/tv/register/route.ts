import { api } from "@/lib/api/server";

/** Called once by a new TV: returns its device token and a code to show on screen. */
export async function POST() {
  try {
    const result = await api<{ token: string; code: string; expiresAt: string }>("/tv/register", {
      method: "POST",
      auth: false,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not register this TV." },
      { status: 500 }
    );
  }
}
