"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendAccountCreatedEmail } from "@/lib/email";
import { extractSeamanBookFields } from "@/lib/document-vision";

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

export async function createPersonnel(formData: FormData) {
  const fullName = text(formData, "fullName");
  if (!fullName) throw new Error("El nombre es obligatorio.");

  const { error } = await supabase.from("personnel").insert({
    full_name: fullName,
    role: text(formData, "role") || "Piloto",
    monthly_salary: optionalNumber(formData, "monthlySalary"),
    rate_per_ton: optionalNumber(formData, "ratePerTon"),
    phone: optionalText(formData, "phone"),
    email: optionalText(formData, "email"),
    notes: optionalText(formData, "notes"),
    status: text(formData, "status") || "Active",
    prior_experience_hours: optionalNumber(formData, "priorExperienceHours"),
    license_number: optionalText(formData, "licenseNumber"),
    license_type: optionalText(formData, "licenseType"),
    license_expiry: optionalText(formData, "licenseExpiry"),
    medical_certificate_class: optionalText(formData, "medicalCertificateClass"),
    medical_certificate_expiry: optionalText(formData, "medicalCertificateExpiry"),
    recurrency_date: optionalText(formData, "recurrencyDate"),
    recurrency_expiry: optionalText(formData, "recurrencyExpiry"),
    flight_check_date: optionalText(formData, "flightCheckDate"),
    flight_check_expiry: optionalText(formData, "flightCheckExpiry"),
    passport_number: optionalText(formData, "passportNumber"),
    passport_expiry: optionalText(formData, "passportExpiry"),
    seaman_book_number: optionalText(formData, "seamanBookNumber"),
    seaman_book_issue_date: optionalText(formData, "seamanBookIssueDate"),
    seaman_book_expiry: optionalText(formData, "seamanBookExpiry"),
    source: "User"
  });

  if (error) throw new Error(error.message);

  revalidatePath("/personnel");
  revalidatePath("/alerts");
  redirect("/personnel");
}

export async function updatePersonnel(id: string, formData: FormData) {
  const fullName = text(formData, "fullName");
  if (!fullName) throw new Error("El nombre es obligatorio.");

  const { error } = await supabase
    .from("personnel")
    .update({
      full_name: fullName,
      role: text(formData, "role") || "Piloto",
      monthly_salary: optionalNumber(formData, "monthlySalary"),
      rate_per_ton: optionalNumber(formData, "ratePerTon"),
      phone: optionalText(formData, "phone"),
      email: optionalText(formData, "email"),
      notes: optionalText(formData, "notes"),
      status: text(formData, "status") || "Active",
      prior_experience_hours: optionalNumber(formData, "priorExperienceHours"),
      license_number: optionalText(formData, "licenseNumber"),
      license_type: optionalText(formData, "licenseType"),
      license_expiry: optionalText(formData, "licenseExpiry"),
      medical_certificate_class: optionalText(formData, "medicalCertificateClass"),
      medical_certificate_expiry: optionalText(formData, "medicalCertificateExpiry"),
      recurrency_date: optionalText(formData, "recurrencyDate"),
      recurrency_expiry: optionalText(formData, "recurrencyExpiry"),
      flight_check_date: optionalText(formData, "flightCheckDate"),
      flight_check_expiry: optionalText(formData, "flightCheckExpiry"),
      passport_number: optionalText(formData, "passportNumber"),
      passport_expiry: optionalText(formData, "passportExpiry"),
      seaman_book_number: optionalText(formData, "seamanBookNumber"),
      seaman_book_issue_date: optionalText(formData, "seamanBookIssueDate"),
      seaman_book_expiry: optionalText(formData, "seamanBookExpiry"),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/personnel");
  revalidatePath("/alerts");
  redirect("/personnel");
}

export async function archivePersonnel(id: string) {
  const { error } = await supabase.from("personnel").update({ archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/personnel");
  revalidatePath("/alerts");
  redirect("/personnel");
}

export type CreateTechnicianAccountState = { error?: string; success?: boolean };

function generateTempPassword() {
  // 12 chars, letters+digits, avoids ambiguous look-alikes (0/O, 1/l/I) so
  // it's easy to type on a tablet keyboard if the técnico ever has to enter
  // it by hand instead of copy/paste.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// Gives a Piloto/Mecánico their own login: creates a real Supabase Auth
// user (email + a random temporary password) and emails it to them via
// Resend. No password ever passes through this app's UI or Adolfo's hands —
// he only clicks a button here, the técnico gets the credentials directly
// in their own inbox. Matching this person to their `personnel` row at
// login time already works today via email (see lib/auth.ts's
// getSessionUser), so nothing else needs to change once the account exists.
export async function createTechnicianAccount(
  personnelId: string,
  _prevState: CreateTechnicianAccountState,
  _formData: FormData
): Promise<CreateTechnicianAccountState> {
  const { data: person, error: fetchError } = await supabase
    .from("personnel")
    .select("full_name, email, role, status")
    .eq("id", personnelId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!person) return { error: "No se encontró a esta persona." };
  if (!person.email) return { error: "Primero guarda un correo para esta persona — ese correo será su usuario." };
  if (person.status !== "Active") return { error: "Solo se puede crear acceso a personas con estado Activo." };

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo preparar la creación de la cuenta." };
  }

  const tempPassword = generateTempPassword();

  const { error: createError } = await admin.auth.admin.createUser({
    email: person.email,
    password: tempPassword,
    email_confirm: true
  });

  if (createError) {
    const alreadyExists = createError.message.toLowerCase().includes("already been registered") || createError.message.toLowerCase().includes("already exists");
    return {
      error: alreadyExists
        ? `${person.email} ya tiene una cuenta creada. Si perdió la contraseña, tienes que restablecerla desde el panel de Supabase (Authentication → Users).`
        : `No se pudo crear la cuenta: ${createError.message}`
    };
  }

  try {
    await sendAccountCreatedEmail({ to: person.email, fullName: person.full_name, tempPassword });
  } catch (error) {
    return {
      error: `Se creó la cuenta pero no se pudo enviar el correo con la contraseña: ${
        error instanceof Error ? error.message : "error desconocido"
      }. La cuenta ya existe — puedes restablecer la contraseña desde Supabase y avisarle por otro medio.`
    };
  }

  await supabase.from("personnel").update({ account_invited_at: new Date().toISOString() }).eq("id", personnelId);
  revalidatePath("/personnel");
  revalidatePath(`/personnel/${personnelId}/edit`);

  return { success: true };
}

const PERSONNEL_PHOTOS_BUCKET = "personnel-photos";

export type UploadPersonnelPhotoState = {
  error?: string;
  success?: boolean;
  // Only populated for kind="seaman-book" — lets the form show what Claude
  // read off the photo right away, so Adolfo can eyeball it against the
  // fields below (already auto-filled) before hitting "Guardar cambios".
  extracted?: { documentNumber: string | null; issueDate: string | null; expiryDate: string | null; fullNameOnDocument: string | null };
  extractionWarning?: string;
};

// Same useActionState-returns-state pattern as
// app/helicopters/actions.ts's uploadHelicopterPhoto. "kind" picks which
// column gets the resulting public URL: the person's own photo (photo_url,
// so a técnico can recognize them), their passport photo (passport_photo_url,
// so Adolfo can check the passport itself without digging through paper
// files when it's close to expiring — see personnel.passport_expiry), or
// their Seaman Book / Libreta de Marino photo (seaman_book_photo_url) —
// the latter additionally runs lib/document-vision.ts's Claude-vision
// extraction to auto-fill seaman_book_number/issue_date/expiry, since
// unlike a passport this fleet asked specifically for automatic reading
// (Aug 2026). Never blocks the photo upload itself if extraction fails —
// the photo always saves; only the auto-fill step is best-effort.
export async function uploadPersonnelPhoto(
  personnelId: string,
  kind: "photo" | "passport" | "seaman-book",
  _prevState: UploadPersonnelPhotoState,
  formData: FormData
): Promise<UploadPersonnelPhotoState> {
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

  const buffer = await file.arrayBuffer();
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${personnelId}/${kind}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(PERSONNEL_PHOTOS_BUCKET).upload(path, new Uint8Array(buffer), {
    contentType: file.type,
    upsert: true
  });
  if (uploadError) {
    return {
      error: `No se pudo subir la foto: ${uploadError.message}. Si nunca corriste el script que crea el bucket "personnel-photos" en Supabase, ese es probablemente el motivo.`
    };
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(PERSONNEL_PHOTOS_BUCKET).getPublicUrl(path);

  const column = kind === "photo" ? "photo_url" : kind === "passport" ? "passport_photo_url" : "seaman_book_photo_url";

  if (kind !== "seaman-book") {
    const { error: updateError } = await supabase.from("personnel").update({ [column]: publicUrl }).eq("id", personnelId);
    if (updateError) return { error: `La foto se subió pero no se pudo guardar: ${updateError.message}.` };
    revalidatePath("/personnel");
    revalidatePath(`/personnel/${personnelId}/edit`);
    return { success: true };
  }

  // Seaman Book: also try to auto-read the number/dates off the photo.
  // Best-effort — a failed/missing-key extraction still saves the photo,
  // just leaves the three text fields for Adolfo to type in himself.
  const extraction = await extractSeamanBookFields(new Uint8Array(buffer), file.type);
  const { error: updateError } = await supabase
    .from("personnel")
    .update({
      seaman_book_photo_url: publicUrl,
      ...(extraction.documentNumber != null ? { seaman_book_number: extraction.documentNumber } : {}),
      ...(extraction.issueDate != null ? { seaman_book_issue_date: extraction.issueDate } : {}),
      ...(extraction.expiryDate != null ? { seaman_book_expiry: extraction.expiryDate } : {}),
      updated_at: new Date().toISOString()
    })
    .eq("id", personnelId);
  if (updateError) return { error: `La foto se subió pero no se pudo guardar: ${updateError.message}.` };

  revalidatePath("/personnel");
  revalidatePath(`/personnel/${personnelId}/edit`);
  revalidatePath("/alerts");
  return {
    success: true,
    extracted: {
      documentNumber: extraction.documentNumber,
      issueDate: extraction.issueDate,
      expiryDate: extraction.expiryDate,
      fullNameOnDocument: extraction.fullNameOnDocument
    },
    extractionWarning: extraction.notes ?? undefined
  };
}
