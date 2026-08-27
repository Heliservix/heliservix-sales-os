"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { uploadDataUrlImage, uploadPhotoFile } from "@/lib/media-upload";

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

// The "Descripción del trabajo requerido" box on the paper form is a
// numbered list typed by hand — digitally that's just one task per line in
// a textarea, split here into the actual checklist rows (work_order_items).
// Blank lines are dropped rather than becoming empty checklist items.
function splitTaskLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^\s*\d+[).\-]?\s*/, "").trim()) // tolerate someone pasting "1) ..." / "1. ..." lines
    .filter((line) => line.length > 0);
}

export async function createWorkOrder(formData: FormData) {
  const { data: order, error } = await supabase
    .from("work_orders")
    .insert({
      client_name: optionalText(formData, "clientName"),
      client_address: optionalText(formData, "clientAddress"),
      client_phone: optionalText(formData, "clientPhone"),
      helicopter_registration: optionalText(formData, "helicopterRegistration"),
      aircraft_type: optionalText(formData, "aircraftType"),
      aircraft_registration: optionalText(formData, "aircraftRegistration"),
      aircraft_serial: optionalText(formData, "aircraftSerial"),
      engine_type: optionalText(formData, "engineType"),
      engine_model: optionalText(formData, "engineModel"),
      engine_serial: optionalText(formData, "engineSerial"),
      estimated_hours: optionalNumber(formData, "estimatedHours"),
      material_notes: optionalText(formData, "materialNotes"),
      contract_number: optionalText(formData, "contractNumber"),
      lead_technician_id: optionalText(formData, "leadTechnicianId"),
      notes: optionalText(formData, "notes"),
      source: "User"
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // A checklist template (100hr/50hr inspection, etc.) can be cloned in as a
  // starting point instead of retyping every line — its items are inserted
  // first (keeping section_label headers), then any manually typed lines
  // from tasksText are appended after.
  const templateId = optionalText(formData, "checklistTemplateId");
  let nextPosition = 0;
  if (templateId) {
    const { data: templateItems, error: templateError } = await supabase
      .from("checklist_template_items")
      .select("position, section_label, description")
      .eq("template_id", templateId)
      .order("position", { ascending: true });
    if (templateError) throw new Error(templateError.message);

    if (templateItems?.length) {
      const { error: cloneError } = await supabase.from("work_order_items").insert(
        templateItems.map((item, index) => ({
          work_order_id: order.id,
          position: index,
          section_label: item.section_label,
          description: item.description,
          source: "User"
        }))
      );
      if (cloneError) throw new Error(cloneError.message);
      nextPosition = templateItems.length;
    }
  }

  const tasks = splitTaskLines(text(formData, "tasksText"));
  if (tasks.length) {
    const { error: itemsError } = await supabase.from("work_order_items").insert(
      tasks.map((description, index) => ({
        work_order_id: order.id,
        position: nextPosition + index,
        description,
        source: "User"
      }))
    );
    if (itemsError) throw new Error(itemsError.message);
  }

  revalidatePath("/work-orders");
  revalidatePath("/");
  redirect(`/work-orders/${order.id}`);
}

export async function updateWorkOrder(id: string, formData: FormData) {
  const { error } = await supabase
    .from("work_orders")
    .update({
      client_name: optionalText(formData, "clientName"),
      client_address: optionalText(formData, "clientAddress"),
      client_phone: optionalText(formData, "clientPhone"),
      helicopter_registration: optionalText(formData, "helicopterRegistration"),
      aircraft_type: optionalText(formData, "aircraftType"),
      aircraft_registration: optionalText(formData, "aircraftRegistration"),
      aircraft_serial: optionalText(formData, "aircraftSerial"),
      engine_type: optionalText(formData, "engineType"),
      engine_model: optionalText(formData, "engineModel"),
      engine_serial: optionalText(formData, "engineSerial"),
      estimated_hours: optionalNumber(formData, "estimatedHours"),
      material_notes: optionalText(formData, "materialNotes"),
      contract_number: optionalText(formData, "contractNumber"),
      lead_technician_id: optionalText(formData, "leadTechnicianId"),
      notes: optionalText(formData, "notes"),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  redirect(`/work-orders/${id}`);
}

// "Agregar tarea" — same incremental-add pattern as Pólizas' addPolicyPayment,
// so a técnico can keep extending the checklist as the job grows instead of
// only being able to define it once at creation.
export async function addWorkOrderItem(workOrderId: string, formData: FormData) {
  const description = text(formData, "description");
  if (!description) throw new Error("Escribe qué tarea vas a agregar.");

  const { data: existing } = await supabase
    .from("work_order_items")
    .select("position")
    .eq("work_order_id", workOrderId)
    .eq("archived", false)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("work_order_items").insert({
    work_order_id: workOrderId,
    position: nextPosition,
    description,
    source: "User"
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/work-orders/${workOrderId}`);
}

// Marks one checklist line done AND records who did it — the whole point of
// this feature ("que quede registrado quien hizo el trabajo, con nombre
// completo y licencia"). The name/license themselves aren't stored here;
// they're joined from personnel whenever this is displayed, so they always
// reflect that person's current license info.
export async function completeWorkOrderItem(itemId: string, workOrderId: string, formData: FormData) {
  const personnelId = text(formData, "personnelId");
  if (!personnelId) throw new Error("Selecciona quién hizo el trabajo.");

  const { error } = await supabase
    .from("work_order_items")
    .update({ is_complete: true, completed_by_personnel_id: personnelId, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw new Error(error.message);

  // First task checked on a fresh order silently moves it from "Abierta" to
  // "En Progreso" — small bit of bookkeeping Adolfo shouldn't have to do by
  // hand every time.
  await supabase.from("work_orders").update({ status: "En Progreso", updated_at: new Date().toISOString() }).eq("id", workOrderId).eq("status", "Abierta");

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath("/work-orders");
  revalidatePath("/");
}

export async function undoWorkOrderItem(itemId: string, workOrderId: string) {
  const { error } = await supabase
    .from("work_order_items")
    .update({ is_complete: false, completed_by_personnel_id: null, completed_at: null, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath("/work-orders");
  revalidatePath("/");
}

export async function deleteWorkOrderItem(itemId: string, workOrderId: string) {
  const { error } = await supabase.from("work_order_items").update({ archived: true }).eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/work-orders/${workOrderId}`);
}

// "Documentar con foto" — a técnico on a tablet can attach a quick photo to
// any checklist line (evidence of the work, or of something odd worth
// noting) straight from the camera, via <input capture="environment">. Not
// tied to marking the item complete — can be added before, during, or
// after.
export async function uploadWorkOrderItemPhoto(itemId: string, workOrderId: string, formData: FormData) {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new Error("Selecciona o toma una foto.");

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `work-orders/${workOrderId}/items/${itemId}-${Date.now()}.${extension}`;
  const { url, error } = await uploadPhotoFile(path, file);
  if (error || !url) throw new Error(error ?? "No se pudo subir la foto.");

  const { error: updateError } = await supabase
    .from("work_order_items")
    .update({ photo_url: url, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/work-orders/${workOrderId}`);
}

// Optional per-línea signature (stylus) — separate from completeWorkOrderItem's
// personnel picker, which is what actually drives the license-linked
// accountability record. This is an extra, visual "firmado por" flourish
// for shops that want a literal signature on every line, not the primary
// audit trail.
export async function signWorkOrderItem(itemId: string, workOrderId: string, formData: FormData) {
  const dataUrl = text(formData, "signatureDataUrl");
  if (!dataUrl) throw new Error("Firma en el recuadro antes de guardar.");

  const path = `work-orders/${workOrderId}/items/${itemId}-signature-${Date.now()}.png`;
  const { url, error } = await uploadDataUrlImage(path, dataUrl);
  if (error || !url) throw new Error(error ?? "No se pudo guardar la firma.");

  const { error: updateError } = await supabase
    .from("work_order_items")
    .update({ signature_url: url, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/work-orders/${workOrderId}`);
}

// Digital stand-in for the paper form's "TECNICO ENCARGADO / FIRMA" box —
// the lead technician declaring their part of the job done. The signature
// (from the SignaturePad, a PNG data URL in a hidden form field) is
// optional — never blocks marking the work done if the técnico skips it.
export async function markTechnicianComplete(id: string, formData: FormData) {
  const dataUrl = text(formData, "signatureDataUrl");
  let signatureUrl: string | null = null;
  if (dataUrl) {
    const { url, error } = await uploadDataUrlImage(`work-orders/${id}/technician-signature-${Date.now()}.png`, dataUrl);
    if (error) throw new Error(error);
    signatureUrl = url;
  }

  const { error } = await supabase
    .from("work_orders")
    .update({
      status: "Completada",
      technician_completed_at: new Date().toISOString(),
      ...(signatureUrl ? { technician_signature_url: signatureUrl } : {}),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/work-orders");
  revalidatePath("/");
}

// Digital stand-in for the paper form's "GERENTE GENERAL / FIRMA" box.
// Also writes a technical_records row (record_type "Work order") so the
// closed job shows up in Registros Técnicos too — technical_records.
// record_type already had "Work order" as a valid value before this
// feature existed, so this keeps the two modules in sync instead of this
// being a second, disconnected audit trail.
export async function approveWorkOrder(id: string, formData: FormData) {
  const managerId = text(formData, "managerId");
  if (!managerId) throw new Error("Selecciona quién aprueba como Gerente General.");

  const dataUrl = text(formData, "signatureDataUrl");
  let signatureUrl: string | null = null;
  if (dataUrl) {
    const { url, error } = await uploadDataUrlImage(`work-orders/${id}/manager-signature-${Date.now()}.png`, dataUrl);
    if (error) throw new Error(error);
    signatureUrl = url;
  }

  const { data: order, error: fetchError } = await supabase
    .from("work_orders")
    .select("sequence_number, helicopter_registration, aircraft_registration, lead_technician_id, notes")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("work_orders")
    .update({
      status: "Cerrada",
      manager_approved_by: managerId,
      manager_approved_at: new Date().toISOString(),
      ...(signatureUrl ? { manager_signature_url: signatureUrl } : {}),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  let technicianName: string | null = null;
  if (order?.lead_technician_id) {
    const { data: tech } = await supabase.from("personnel").select("full_name").eq("id", order.lead_technician_id).maybeSingle();
    technicianName = tech?.full_name ?? null;
  }

  await supabase.from("technical_records").insert({
    record_type: "Work order",
    related_helicopter: order?.helicopter_registration ?? null,
    title: `Orden de trabajo OT-${String(order?.sequence_number ?? "").padStart(5, "0")}`,
    record_date: new Date().toISOString().slice(0, 10),
    technician_name: technicianName,
    notes: order?.notes ?? null,
    source: "User"
  });

  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/work-orders");
  revalidatePath("/");
  revalidatePath("/technical-records");
}

export async function updateWorkOrderStatus(id: string, formData: FormData) {
  const status = text(formData, "status");
  const { error } = await supabase.from("work_orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/work-orders");
  revalidatePath("/");
}

export async function archiveWorkOrder(id: string) {
  const { error } = await supabase.from("work_orders").update({ archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/work-orders");
  revalidatePath("/");
  redirect("/work-orders");
}
