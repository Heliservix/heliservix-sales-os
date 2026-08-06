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
    coverageType: string | null;
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
//
// helicopterRegistrations is a list, not a single value: real Anexo
// documents from this insurer cover several aircraft under one shared PILOTS
// clause and one shared vigencia (e.g. one "Anexo 2026-2027.pdf" covering
// HP-1768/1769/1770/1782/1783 across 3 policy numbers). The PDF is only
// uploaded once; one insurance_policies row is created per selected aircraft,
// all pointing at that same file and sharing the same auto-extracted terms —
// since policy_number can differ per aircraft in a multi-policy Anexo, that
// field is exactly the kind of thing requirements_reviewed=false is meant to
// flag for a human to double-check per row.
export async function uploadPolicy(helicopterRegistrations: string[], _prevState: UploadPolicyState, formData: FormData): Promise<UploadPolicyState> {
  if (!helicopterRegistrations.length) {
    return { error: "Selecciona al menos un helicóptero." };
  }
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

  const path = `${helicopterRegistrations[0]}/${Date.now()}.pdf`;
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

  const { error: insertError } = await supabase.from("insurance_policies").insert(
    helicopterRegistrations.map((helicopterRegistration) => ({
      helicopter_registration: helicopterRegistration,
      policy_number: analysis.policyNumber,
      coverage_type: analysis.coverageType,
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
    }))
  );
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
      coverageType: analysis.coverageType,
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

export type AttachAnexoState = {
  error?: string;
  success?: boolean;
  summary?: {
    coverageType: string | null;
    minPilotHoursTotal: number | null;
    minPilotHoursType: number | null;
  };
};

// A real policy from this insurer is actually TWO separate PDFs: the
// Spanish declarations page (uploaded first, via uploadPolicy — has policy
// number/vigencia/prima) and a separate English "Anexo" (has the PILOTS
// experience clause and USES/coverage description). Discovered this after
// Adolfo uploaded only the declarations pages for his first 6 real policy
// rows and the pilot-hours fields stayed blank — not a bug in the reader,
// the information genuinely wasn't in the PDF he'd attached. This lets him
// add the Anexo to an EXISTING policy afterward instead of re-uploading
// everything from scratch. Deliberately only merges the fields the Anexo is
// actually the authority on (coverage/hours/requirements text) — it does
// NOT touch policy_number/dates/premium, since those already came from the
// more reliable declarations page and a multi-aircraft Anexo's policy
// number is ambiguous per aircraft (see lib/insurance-policy-analysis.ts).
export async function attachPolicyAnexo(policyId: string, _prevState: AttachAnexoState, formData: FormData): Promise<AttachAnexoState> {
  const file = formData.get("anexoFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona el PDF del Anexo." };
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

  const path = `${policyId}/anexo-${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage.from(POLICIES_BUCKET).upload(path, file, {
    contentType: "application/pdf",
    upsert: true
  });
  if (uploadError) {
    return { error: `No se pudo subir el PDF: ${uploadError.message}.` };
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(POLICIES_BUCKET).getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("insurance_policies")
    .update({
      anexo_url: publicUrl,
      // Only overwrite these if the Anexo actually found something —
      // never blank out a field the declarations page (or a human edit)
      // already filled in with a null from an Anexo that didn't mention it.
      ...(analysis.coverageType != null ? { coverage_type: analysis.coverageType } : {}),
      ...(analysis.minPilotHoursTotal != null ? { min_pilot_hours_total: analysis.minPilotHoursTotal } : {}),
      ...(analysis.minPilotHoursType != null ? { min_pilot_hours_type: analysis.minPilotHoursType } : {}),
      ...(analysis.requirementsSummary != null ? { requirements_summary: analysis.requirementsSummary } : {}),
      requirements_reviewed: false,
      updated_at: new Date().toISOString()
    })
    .eq("id", policyId);
  if (updateError) {
    return { error: `El PDF se subió pero no se pudo guardar: ${updateError.message}.` };
  }

  revalidatePath("/policies");
  revalidatePath("/alerts");
  return {
    success: true,
    summary: {
      coverageType: analysis.coverageType,
      minPilotHoursTotal: analysis.minPilotHoursTotal,
      minPilotHoursType: analysis.minPilotHoursType
    }
  };
}

// Re-runs the analyzer against the PDF already stored for this policy,
// without asking Adolfo to re-upload it. Added because the analyzer got
// real fixes (English-language pilot-hours patterns, coverage-type
// detection, a Panama declarations-page table-reordering quirk) AFTER he'd
// already uploaded his first real policies — this lets those existing rows
// pick up the corrected extraction instead of being stuck with whatever the
// analyzer found (or didn't find) the first time. Same fetch-by-URL pattern
// as lib/bulletin-verification.ts's fetchPdfText.
export async function reanalyzePolicy(id: string) {
  const { data: policy, error: fetchError } = await supabase
    .from("insurance_policies")
    .select("attachment_placeholder")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!policy?.attachment_placeholder) throw new Error("Esta póliza no tiene un PDF guardado para volver a analizar.");

  const response = await fetch(policy.attachment_placeholder, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`No se pudo descargar el PDF guardado (respondió ${response.status}).`);
  const buffer = await response.arrayBuffer();

  let extractedText = "";
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    extractedText = result.text ?? "";
  } finally {
    await parser.destroy();
  }

  const analysis = analyzePolicyText(extractedText);

  const { error: updateError } = await supabase
    .from("insurance_policies")
    .update({
      policy_number: analysis.policyNumber,
      coverage_type: analysis.coverageType,
      start_date: analysis.startDate,
      end_date: analysis.endDate,
      premium_amount: analysis.premiumAmount,
      currency: analysis.currency ?? "USD",
      min_pilot_hours_total: analysis.minPilotHoursTotal,
      min_pilot_hours_type: analysis.minPilotHoursType,
      requirements_summary: analysis.requirementsSummary,
      requirements_reviewed: false,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/policies");
  revalidatePath("/alerts");
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
