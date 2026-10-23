import { api, apiResult } from "@/lib/api/server";
import type { GalleryImage } from "@/types/gallery";

export async function listGalleryImages(clubId: string): Promise<GalleryImage[]> {
  return api<GalleryImage[]>(`/clubs/${clubId}/gallery`, { auth: false });
}

/** Uploads an image (multipart "file") with an optional caption; the API stores the file. */
export async function addGalleryImage(clubId: string, file: File, caption: string): Promise<{ error?: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("caption", caption);
  const { error } = await apiResult(`/clubs/${clubId}/gallery`, { method: "POST", body: form });
  return { error };
}

export async function deleteGalleryImage(imageId: string, clubId: string): Promise<{ error?: string }> {
  const { error } = await apiResult(`/clubs/${clubId}/gallery/${imageId}`, { method: "DELETE" });
  return { error };
}
