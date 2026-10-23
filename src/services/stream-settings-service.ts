import { api, apiResult } from "@/lib/api/server";
import { normalizeStreamSettings, type OverlayToggles, type StreamSettings } from "@/types/stream";

const base = (clubId: string) => `/clubs/${clubId}/stream-settings`;

/** Stream settings for a club; defaults if none are saved. */
export async function getStreamSettings(clubId: string): Promise<StreamSettings> {
  try {
    return normalizeStreamSettings(await api<StreamSettings>(base(clubId), { auth: false }));
  } catch {
    return normalizeStreamSettings(null);
  }
}

// Each change is its own endpoint; the API validates and merges it into the saved settings.

export async function saveYoutubeLink(clubId: string, table: number, url: string): Promise<{ error?: string }> {
  return apiResult(`${base(clubId)}/youtube/${table}`, { method: "PUT", body: { url } });
}

export async function saveOverlayOptions(
  clubId: string,
  input: { accent: string; show: OverlayToggles }
): Promise<{ error?: string }> {
  return apiResult(`${base(clubId)}/overlay`, { method: "PUT", body: input });
}

export async function saveAdOptions(
  clubId: string,
  input: { enabled: boolean; secondsPerImage: number; onTv: boolean; onOverlay: boolean; afterMatch: boolean }
): Promise<{ error?: string }> {
  return apiResult(`${base(clubId)}/ads`, { method: "PUT", body: input });
}

function fileForm(file: File) {
  const form = new FormData();
  form.append("file", file);
  return form;
}

export async function addSponsorLogo(clubId: string, file: File): Promise<{ error?: string }> {
  return apiResult(`${base(clubId)}/sponsor-logos`, { method: "POST", body: fileForm(file) });
}

export async function removeSponsorLogo(clubId: string, url: string): Promise<{ error?: string }> {
  return apiResult(`${base(clubId)}/sponsor-logos`, { method: "DELETE", body: { url } });
}

export async function addAdImage(clubId: string, file: File): Promise<{ error?: string }> {
  return apiResult(`${base(clubId)}/ads/images`, { method: "POST", body: fileForm(file) });
}

export async function removeAdImage(clubId: string, url: string): Promise<{ error?: string }> {
  return apiResult(`${base(clubId)}/ads/images`, { method: "DELETE", body: { url } });
}
