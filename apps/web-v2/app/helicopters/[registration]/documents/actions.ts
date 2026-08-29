"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

const DOCUMENTS_BUCKET = "aircraft-documents";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optionalText(form: FormData, key: string) {
  const value = text(form, key);
  return value || null;
}

function optionalNumber(form: FormData, key: string) {
  const value = text(form, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function uploadFileIfPresent(registration: string, form: FormData, field: string): Promise<string | null> {
  const file = form.get(field);
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 15 * 1024 * 1024) throw new Error("El archivo pesa más de 15 MB — usa una versión más liviana.");
  const path = `${registration}/${field}-${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, { upsert: true });
  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`);
  const {
    data: { publicUrl }
  } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path);
  return publicUrl;
}

export type UploadAircraftDocumentState = { error?: string; success?: boolean };

// Compartida por Certificados, Bitácoras y Facturas — las tres son la misma
// biblioteca genérica (aircraft_documents), solo cambia la categoría. Un
// documento no siempre tiene fecha de vencimiento (una factura no vence,
// un Certificado de Registro puede no tenerlo) así que ambos campos de
// fecha son opcionales.
export async function uploadAircraftDocument(
  registration: string,
  category: "Certificados" | "Bitacoras" | "Facturas",
  _prevState: UploadAircraftDocumentState,
  formData: FormData
): Promise<UploadAircraftDocumentState> {
  const title = text(formData, "title");
  if (!title) return { error: "El título/nombre del documento es obligatorio." };

  let fileUrl: string | null = null;
  try {
    fileUrl = await uploadFileIfPresent(registration, formData, "file");
  } catch (err) {
    return { error: (err as Error).message };
  }

  const { error } = await supabase.from("aircraft_documents").insert({
    helicopter_registration: registration,
    category,
    title,
    document_number: optionalText(formData, "documentNumber"),
    issue_date: optionalText(formData, "issueDate"),
    expiry_date: optionalText(formData, "expiryDate"),
    amount: optionalNumber(formData, "amount"),
    currency: text(formData, "currency") || "USD",
    vendor: optionalText(formData, "vendor"),
    file_url: fileUrl,
    notes: optionalText(formData, "notes"),
    source: "User"
  });
  if (error) return { error: error.message };

  revalidatePath(`/helicopters/${registration}/documents`);
  revalidatePath(`/helicopters/${registration}`);
  revalidatePath("/helicopters");
  return { success: true };
}

export async function archiveAircraftDocument(registration: string, documentId: string) {
  const { error } = await supabase.from("aircraft_documents").update({ archived: true, updated_at: new Date().toISOString() }).eq("id", documentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/helicopters/${registration}/documents`);
  revalidatePath(`/helicopters/${registration}`);
  revalidatePath("/helicopters");
}

export type UpsertEltState = { error?: string; success?: boolean };

export async function upsertEltStatus(registration: string, _prevState: UpsertEltState, formData: FormData): Promise<UpsertEltState> {
  let certificateUrl: string | null = null;
  try {
    certificateUrl = await uploadFileIfPresent(registration, formData, "certificate");
  } catch (err) {
    return { error: (err as Error).message };
  }

  const { data: existing } = await supabase.from("aircraft_elt").select("certificate_url").eq("helicopter_registration", registration).maybeSingle();

  const { error } = await supabase.from("aircraft_elt").upsert(
    {
      helicopter_registration: registration,
      manufacturer: optionalText(formData, "manufacturer"),
      model: optionalText(formData, "model"),
      serial_number: optionalText(formData, "serialNumber"),
      battery_expiry_date: optionalText(formData, "batteryExpiryDate"),
      last_inspection_date: optionalText(formData, "lastInspectionDate"),
      next_inspection_date: optionalText(formData, "nextInspectionDate"),
      certificate_url: certificateUrl ?? existing?.certificate_url ?? null,
      notes: optionalText(formData, "notes"),
      updated_at: new Date().toISOString()
    },
    { onConflict: "helicopter_registration" }
  );
  if (error) return { error: error.message };

  revalidatePath(`/helicopters/${registration}/documents`);
  revalidatePath(`/helicopters/${registration}`);
  revalidatePath("/helicopters");
  return { success: true };
}
