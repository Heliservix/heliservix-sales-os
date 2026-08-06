"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function number(form: FormData, key: string) {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : 0;
}

function optionalUuid(form: FormData, key: string) {
  const value = text(form, key);
  return value || null;
}

// Must match the normalization used by the Excel importers (lib/component-import.ts,
// lib/weekly-report-import.ts) — otherwise "HP-1804" created here and "HP-1804" typed
// into an Excel's Matrícula cell become two different rows ("HP1804" vs "HP-1804"),
// silently splitting one aircraft's components across two helicopter records.
function normalizeRegistration(value: string) {
  return value.replace(/[-\s]/g, "").toUpperCase();
}

export async function createHelicopter(formData: FormData) {
  const registration = normalizeRegistration(text(formData, "registration"));
  if (!registration) throw new Error("Registration is required.");

  const { error } = await supabase.from("helicopters").insert({
    registration,
    model: text(formData, "model"),
    serial_number: text(formData, "serialNumber"),
    manufacture_year: text(formData, "manufactureYear"),
    current_hourmeter: number(formData, "currentHourmeter"),
    status: text(formData, "status") || "Available",
    owner_company: text(formData, "ownerCompany"),
    operation_area: text(formData, "operationArea"),
    notes: text(formData, "notes")
  });

  if (error) {
    // 23505 = unique_violation (registration already exists)
    if (error.code === "23505") throw new Error(`A helicopter with registration ${registration} already exists.`);
    throw new Error(error.message);
  }

  revalidatePath("/helicopters");
  revalidatePath("/");
  redirect("/helicopters");
}

export async function updateHelicopter(registration: string, formData: FormData) {
  const { error } = await supabase
    .from("helicopters")
    .update({
      model: text(formData, "model"),
      serial_number: text(formData, "serialNumber"),
      manufacture_year: text(formData, "manufactureYear"),
      current_hourmeter: number(formData, "currentHourmeter"),
      status: text(formData, "status") || "Available",
      owner_company: text(formData, "ownerCompany"),
      operation_area: text(formData, "operationArea"),
      assigned_vessel_id: optionalUuid(formData, "assignedVesselId"),
      notes: text(formData, "notes")
    })
    .eq("registration", registration);

  if (error) throw new Error(error.message);

  revalidatePath("/helicopters");
  revalidatePath(`/helicopters/${registration}`);
  revalidatePath("/vessels");
  revalidatePath("/");
  redirect(`/helicopters/${registration}`);
}

const HELICOPTER_PHOTOS_BUCKET = "helicopter-photos";

// Purely cosmetic (see lib/helicopter-identity.ts) — lets a técnico
// recognize the right tail number at a glance, and gives the app a more
// polished look for prospective-client demos. Uploads to the
// "helicopter-photos" Supabase Storage bucket (infra/database's
// paso2_crear_bucket_fotos_helicopteros.sql creates it) and stores the
// public URL on helicopters.photo_url.
export type UploadPhotoState = { error?: string; success?: boolean };

// Returns a state object instead of throwing (matches useActionState's
// contract — see app/helicopters/photo-upload-form.tsx) so a real failure —
// missing bucket/column because a SQL migration hasn't been run yet, file
// too large, wrong file type — shows up as an actual message on the page
// instead of the form silently doing nothing.
export async function uploadHelicopterPhoto(registration: string, _prevState: UploadPhotoState, formData: FormData): Promise<UploadPhotoState> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una foto para subir." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "El archivo debe ser una imagen (JPG, PNG, etc.)." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "La foto pesa más de 10 MB — usa una versión más liviana." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${registration}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(HELICOPTER_PHOTOS_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true
  });
  if (uploadError) {
    return {
      error: `No se pudo subir la foto: ${uploadError.message}. Si nunca corriste "paso2_crear_bucket_fotos_helicopteros.sql" en Supabase, ese es probablemente el motivo.`
    };
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(HELICOPTER_PHOTOS_BUCKET).getPublicUrl(path);

  const { error: updateError } = await supabase.from("helicopters").update({ photo_url: publicUrl }).eq("registration", registration);
  if (updateError) {
    return {
      error: `La foto se subió pero no se pudo guardar en el helicóptero: ${updateError.message}. Si nunca corriste "paso1_agregar_foto_helicopteros.sql" en Supabase, ese es probablemente el motivo.`
    };
  }

  revalidatePath("/helicopters");
  revalidatePath(`/helicopters/${registration}`);
  revalidatePath("/compliance/bulletins");
  revalidatePath(`/reports/maintenance/${registration}`);
  return { success: true };
}

export async function archiveHelicopter(registration: string) {
  const { error } = await supabase.from("helicopters").update({ archived: true }).eq("registration", registration);
  if (error) throw new Error(error.message);
  revalidatePath("/helicopters");
  revalidatePath("/");
}

export async function deleteHelicopter(registration: string) {
  const { error } = await supabase.from("helicopters").delete().eq("registration", registration);
  if (error) throw new Error(error.message);
  revalidatePath("/helicopters");
  revalidatePath("/");
  redirect("/helicopters");
}
