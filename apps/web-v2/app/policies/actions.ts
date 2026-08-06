"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
// Must be imported before "pdf-parse" itself, same requirement as
// lib/bulletin-verification.ts — otherwise pdf-parse's worker file doesn't
// get bundled correctly and this route crashes at import time on Vercel
// even though it works fine locally.
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import { supabase } from "@/lib/supabase";
import { analyzePolicyText } from "@/lib/insurance-policy-analysis";

const POLICIES_BUCKET = "insurance-policies";

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

export type UploadPolicyState = {
  error?: string;
  success?: boolean;
  summary?: {
    policyNumber: string | null;
    startDate: string | null;
    endDate: string | null;
    premiumAmount: number | null;
    minPilotHoursTotal: number | null;
    minPilotHoursType: number | null;
  };
};

// Reads the PDF's text directly from the uploaded bytes (no re-fetch needed,
// unlike lib/bulletin-verification.ts which has to fetch a remote URL) —
// then runs the best-effort analyzer and saves both the extracted fields and
// the original PDF. requirements_reviewed always starts false: Adolfo chose
// the automatic-analysis option knowing every insurer formats policies
// differently, so the app flags every fresh upload as "revisar" until
// someone confirms the numbers against the real document.
export async function uploadPolicy(helicopterRegistration: string, _prevState: UploadPolicyState, formData: FormData): Promise<UploadPolicyState> {
  const file = formData.get("policyFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona el PDF de la póliza." };
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "El archivo debe ser un PDF." };
  }
  if (file.size > 15 * 1024 * 1024) {
    return { error: "El PDF pesa más de 15 MB — usa una versión más liviana." };
  }

  const buffer = await file.arrayBuffer();

  let extractedText = "";
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      extractedText = result.text ?? "";
    } finally {
      await parser.destroy();
    }
  } catch (err) {
    return { error: `No se pudo leer el PDF: ${(err as Error).message}` };
  }

  const analysis = analyzePolicyText(extractedText);

  const path = `${helicopterRegistration}/${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage.from(POLICIES_BUCKET).upload(path, file, {
    contentType: "application/pdf",
    upsert: true
  });
  if (uploadError) {
    return {
      error: `No se pudo subir el PDF: ${uploadError.message}. Si nunca corriste el script que crea el bucket "insurance-policies" en Supabase, ese es probablemente el motivo.`
    };
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(POLICIES_BUCKET).getPublicUrl(path);

  const { error: insertError } = await supabase.from("insurance_policies").insert({
    helicopter_registration: helicopterRegistration,
    policy_number: analysis.policyNumber,
    start_date: analysis.startDate,
    end_date: analysis.endDate,
    premium_amount: analysis.premiumAmount,
    currency: analysis.currency ?? "USD",
    min_pilot_hours_total: analysis.minPilotHoursTotal,
    min_pilot_hours_type: analysis.minPilotHoursType,
    requirements_summary: analysis.requirementsSummary,
    requirements_reviewed: false,
    attachment_placeholder: publicUrl,
    status: "Active",
    source: "User"
  });
  if (insertError) {
    return {
      error: `El PDF se subió pero no se pudo guardar la póliza: ${insertError.message}. Si nunca corriste la migración de "insurance_policies" en Supabase, ese es probablemente el motivo.`
    };
  }

  revalidatePath("/policies");
  revalidatePath("/alerts");
  return {
    success: true,
    summary: {
      policyNumber: analysis.policyNumber,
      startDate: analysis.startDate,
      endDate: analysis.endDate,
      premiumAmount: analysis.premiumAmount,
      minPilotHoursTotal: analysis.minPilotHoursTotal,
      minPilotHoursType: analysis.minPilotHoursType
    }
  };
}

export async function updatePolicy(id: string, formData: FormData) {
  const { error } = await supabase
    .from("insurance_policies")
    .update({
      insurer: optionalText(formData, "insurer"),
      policy_number: optionalText(formData, "policyNumber"),
      coverage_type: optionalText(formData, "coverageType"),
      start_date: optionalText(formData, "startDate"),
      end_date: optionalText(formData, "endDate"),
      premium_amount: optionalNumber(formData, "premiumAmount"),
      currency: text(formData, "currency") || "USD",
      min_pilot_hours_total: optionalNumber(formData, "minPilotHoursTotal"),
      min_pilot_hours_type: optionalNumber(formData, "minPilotHoursType"),
      requirements_summary: optionalText(formData, "requirementsSummary"),
      requirements_reviewed: formData.get("requirementsReviewed") === "on",
      status: text(formData, "status") || "Active",
      notes: optionalText(formData, "notes"),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/policies");
  revalidatePath("/alerts");
  redirect("/policies");
}

export async function markRequirementsReviewed(id: string) {
  const { error } = await supabase
    .from("insurance_policies")
    .update({ requirements_reviewed: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/policies");
}

export async function archivePolicy(id: string) {
  const { error } = await supabase.from("insurance_policies").update({ archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/policies");
  redirect("/policies");
}

export async function addPolicyPayment(policyId: string, formData: FormData) {
  const dueDate = text(formData, "dueDate");
  const amount = optionalNumber(formData, "amount");
  if (!dueDate) throw new Error("La fecha de vencimiento del pago es obligatoria.");
  if (amount == null) throw new Error("El monto del pago es obligatorio.");

  const { error } = await supabase.from("insurance_payments").insert({
    policy_id: policyId,
    due_date: dueDate,
    amount,
    currency: text(formData, "currency") || "USD",
    notes: optionalText(formData, "notes"),
    status: "Pending",
    source: "User"
  });
  if (error) throw new Error(error.message);

  revalidatePath("/policies");
  revalidatePath("/alerts");
}

export async function markPaymentPaid(paymentId: string) {
  const { error } = await supabase
    .from("insurance_payments")
    .update({ status: "Paid", paid_date: new Date().toISOString().slice(0, 10) })
    .eq("id", paymentId);
  if (error) throw new Error(error.message);
  revalidatePath("/policies");
  revalidatePath("/alerts");
}

export async function deletePolicyPayment(paymentId: string) {
  const { error } = await supabase.from("insurance_payments").delete().eq("id", paymentId);
  if (error) throw new Error(error.message);
  revalidatePath("/policies");
  revalidatePath("/alerts");
}
