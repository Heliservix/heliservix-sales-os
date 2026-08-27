import { supabase } from "@/lib/supabase";

// Shared bucket for tablet-captured field media (checklist item photos,
// anomaly photos, técnico/gerente signatures) across Work Orders and No
// Rutina — same "one bucket per concern, path-prefixed by record id"
// pattern as personnel-photos/helicopter-photos/insurance-policies.
const MAINTENANCE_PHOTOS_BUCKET = "maintenance-photos";

export type UploadResult = { url: string | null; error: string | null };

// Signatures come off the SignaturePad component (components/ui/signature-
// pad.tsx) as a PNG data URL sitting in a hidden form field — no separate
// upload/fetch call from the client, just decoded and uploaded here inside
// the same Server Action that saves the rest of the form.
export async function uploadDataUrlImage(path: string, dataUrl: string): Promise<UploadResult> {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return { url: null, error: "Formato de imagen inválido." };
  const [, contentType, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  const { error } = await supabase.storage.from(MAINTENANCE_PHOTOS_BUCKET).upload(path, buffer, { contentType, upsert: true });
  if (error) return { url: null, error: error.message };

  const {
    data: { publicUrl }
  } = supabase.storage.from(MAINTENANCE_PHOTOS_BUCKET).getPublicUrl(path);
  return { url: publicUrl, error: null };
}

// Camera/gallery photos come off a plain <input type="file" accept="image/*"
// capture="environment"> — on a tablet's browser that "capture" attribute
// opens the camera app directly, no native app needed.
export async function uploadPhotoFile(path: string, file: File): Promise<UploadResult> {
  if (!file.type.startsWith("image/")) return { url: null, error: "El archivo debe ser una imagen." };
  if (file.size > 10 * 1024 * 1024) return { url: null, error: "La foto pesa más de 10 MB — usa una versión más liviana." };

  const buffer = await file.arrayBuffer();
  const { error } = await supabase.storage.from(MAINTENANCE_PHOTOS_BUCKET).upload(path, new Uint8Array(buffer), {
    contentType: file.type,
    upsert: true
  });
  if (error) return { url: null, error: error.message };

  const {
    data: { publicUrl }
  } = supabase.storage.from(MAINTENANCE_PHOTOS_BUCKET).getPublicUrl(path);
  return { url: publicUrl, error: null };
}
