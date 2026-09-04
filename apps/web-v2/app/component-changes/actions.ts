"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { uploadDataUrlImage, uploadPhotoFile } from "@/lib/media-upload";
import { defaultCalendarLimitDate } from "@/lib/component-calendar";
import { getTechnicianScope } from "@/lib/technician-scope";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optionalText(form: FormData, key: string) {
  const value = text(form, key);
  return value || null;
}

function number(form: FormData, key: string) {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : 0;
}

function optionalDate(form: FormData, key: string) {
  const value = text(form, key);
  return value || null;
}

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${isoDate}T00:00:00Z`).getTime();
  return Math.round((target - todayUtc) / 86400000);
}

async function uploadEvidence(swapId: string, formData: FormData) {
  let signatureUrl: string | null = null;
  let photoUrl: string | null = null;

  const signatureDataUrl = text(formData, "signatureDataUrl");
  if (signatureDataUrl) {
    const { url, error } = await uploadDataUrlImage(`component-changes/${swapId}/signature-${Date.now()}.png`, signatureDataUrl);
    if (error) throw new Error(`No se pudo guardar la firma: ${error}`);
    signatureUrl = url;
  }

  const photoFile = formData.get("photo");
  if (photoFile instanceof File && photoFile.size > 0) {
    const extension = photoFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const { url, error } = await uploadPhotoFile(`component-changes/${swapId}/photo-${Date.now()}.${extension}`, photoFile);
    if (error) throw new Error(`No se pudo subir la foto: ${error}`);
    photoUrl = url;
  }

  if (signatureUrl || photoUrl) {
    const { error } = await supabase
      .from("component_changes")
      .update({ ...(signatureUrl ? { technician_signature_url: signatureUrl } : {}), ...(photoUrl ? { photo_url: photoUrl } : {}) })
      .eq("id", swapId);
    if (error) throw new Error(error.message);
  }
}

function revalidateEverywhere(registrations: string[]) {
  revalidatePath("/component-changes");
  revalidatePath("/technical-records");
  revalidatePath("/alerts");
  revalidatePath("/aura");
  revalidatePath("/helicopters");
  for (const r of registrations) revalidatePath(`/helicopters/${r}`);
}

async function moveComponentLeg(params: {
  componentId: string;
  toRegistration: string;
  technicianId: string;
  technicianName: string | null;
  reason: string | null;
  notes: string | null;
  swapGroupId: string | null;
  // Solo se exige en la pata "de salida" que arranca transferComponent — un
  // técnico acotado solo puede mover piezas que salgan de SU helicóptero. La
  // pata de regreso de un intercambio (return leg) no pasa esto: esa pieza
  // legítimamente sale del helicóptero destino, no del suyo.
  requireFromRegistration?: string | null;
}) {
  const { data: component, error: fetchError } = await supabase
    .from("components")
    .select("id, helicopter_registration, component_name, part_number, serial_number, status")
    .eq("id", params.componentId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!component) throw new Error("Ese componente ya no existe.");
  if (component.status === "Removed") throw new Error("Ese componente ya está marcado como removido.");

  const fromRegistration = component.helicopter_registration;
  if (params.requireFromRegistration && fromRegistration !== params.requireFromRegistration) {
    throw new Error("Solo puedes mover componentes de tu helicóptero asignado.");
  }
  if (fromRegistration === params.toRegistration) {
    throw new Error(`${component.component_name} ya está en ${params.toRegistration} — no hay nada que mover ahí.`);
  }

  const { data: destination, error: destError } = await supabase
    .from("helicopters")
    .select("registration, current_hourmeter")
    .eq("registration", params.toRegistration)
    .maybeSingle();
  if (destError) throw new Error(destError.message);
  if (!destination) throw new Error("No se encontró el helicóptero destino.");

  const { error: updateError } = await supabase
    .from("components")
    .update({ helicopter_registration: params.toRegistration, updated_at: new Date().toISOString() })
    .eq("id", params.componentId);
  if (updateError) {
    if (updateError.code === "23505") {
      throw new Error(`${params.toRegistration} ya tiene un componente con el mismo P/N + S/N que ${component.component_name}. Revisa antes de mover este.`);
    }
    throw new Error(updateError.message);
  }

  const { data: swap, error: swapError } = await supabase
    .from("component_changes")
    .insert({
      helicopter_registration: fromRegistration,
      to_helicopter_registration: params.toRegistration,
      swap_type: "Transfer",
      component_id: params.componentId,
      removed_component_id: null,
      installed_component_name: component.component_name,
      installed_part_number: component.part_number,
      installed_serial_number: component.serial_number,
      removed_component_name: null,
      installation_date: new Date().toISOString().slice(0, 10),
      removal_date: null,
      reason: params.reason,
      technician: params.technicianName,
      technician_id: params.technicianId,
      hourmeter_at_change: destination.current_hourmeter,
      notes: params.notes,
      swap_group_id: params.swapGroupId,
      source: "User"
    })
    .select("id")
    .single();
  if (swapError) throw new Error(swapError.message);

  await supabase.from("technical_records").insert({
    record_type: "Component change",
    related_helicopter: params.toRegistration,
    related_component_id: params.componentId,
    title: `Transferencia — ${component.component_name} (${fromRegistration} → ${params.toRegistration})`,
    record_date: new Date().toISOString().slice(0, 10),
    document_number: null,
    technician_name: params.technicianName,
    notes: params.reason,
    source: "User"
  });

  return { swapId: swap.id as string, fromRegistration, componentName: component.component_name };
}

// Flujo 1 — Transferir: la MISMA pieza física se mueve de un helicóptero a
// otro. Se actualiza helicopter_registration en la fila existente de
// components (mismo id) — TSN, TSO, horas remanentes y límite de calendario
// viajan con ella sin tocarse, que es justo la trazabilidad que Adolfo pidió.
//
// "Componente que regresa a cambio" es opcional: si el destino ya tiene una
// pieza equivalente y esto es un intercambio real (Adolfo, Sept 2026: "del
// helicoptero A le pasa al helicoptero B, y viceversa"), esa segunda pieza
// se mueve de vuelta al origen en la MISMA acción, con ambas patas del
// intercambio agrupadas por swap_group_id. Si se deja vacío, es un
// movimiento en un solo sentido (por ejemplo, hacia un helicóptero que
// todavía no tiene esa pieza).
export async function transferComponent(formData: FormData) {
  const componentId = text(formData, "componentId");
  const toRegistration = text(formData, "toRegistration");
  const returnComponentId = optionalText(formData, "returnComponentId");
  const technicianId = text(formData, "technicianId");
  const reason = optionalText(formData, "reason");
  const notes = optionalText(formData, "notes");

  if (!componentId) throw new Error("Selecciona el componente a mover.");
  if (!toRegistration) throw new Error("Selecciona el helicóptero destino.");
  if (!technicianId) throw new Error("Selecciona qué técnico hace el cambio.");
  if (returnComponentId === componentId) {
    throw new Error("El componente que regresa a cambio no puede ser el mismo que se está moviendo.");
  }

  const { scopedRegistration } = await getTechnicianScope();

  const { data: technician } = await supabase.from("personnel").select("full_name").eq("id", technicianId).maybeSingle();
  const technicianName = technician?.full_name ?? null;
  const swapGroupId = returnComponentId ? randomUUID() : null;

  const outbound = await moveComponentLeg({
    componentId,
    toRegistration,
    technicianId,
    technicianName,
    reason,
    notes,
    swapGroupId,
    requireFromRegistration: scopedRegistration
  });

  await uploadEvidence(outbound.swapId, formData);

  if (returnComponentId) {
    // Verify the "coming back" piece actually belongs to the destination
    // aircraft BEFORE moving it — otherwise a técnico picking the wrong
    // component here would silently relocate an unrelated part.
    const { data: returnComponent } = await supabase
      .from("components")
      .select("helicopter_registration")
      .eq("id", returnComponentId)
      .maybeSingle();
    if (!returnComponent) throw new Error("El componente que regresa a cambio ya no existe.");
    if (returnComponent.helicopter_registration !== toRegistration) {
      throw new Error(`El componente que regresa a cambio debe pertenecer a ${toRegistration}, el helicóptero destino.`);
    }

    const inbound = await moveComponentLeg({
      componentId: returnComponentId,
      toRegistration: outbound.fromRegistration,
      technicianId,
      technicianName,
      reason,
      notes,
      swapGroupId
    });
    await uploadEvidence(inbound.swapId, formData);
  }

  revalidateEverywhere([outbound.fromRegistration, toRegistration]);
  redirect("/component-changes");
}

// Flujo 2 — Cambiar por componente nuevo: se retira la pieza actual
// (components.status = 'Removed', conserva su historial) y se da de alta
// una pieza nueva en el MISMO helicóptero, sin relación a ningún otro.
export async function replaceComponent(formData: FormData) {
  const oldComponentId = text(formData, "oldComponentId");
  const technicianId = text(formData, "technicianId");
  const reason = optionalText(formData, "reason");
  const notes = optionalText(formData, "notes");

  const componentName = text(formData, "componentName");
  const partNumber = text(formData, "partNumber");
  if (!oldComponentId) throw new Error("Selecciona el componente a remover.");
  if (!technicianId) throw new Error("Selecciona qué técnico hace el cambio.");
  if (!componentName || !partNumber) throw new Error("Nombre y P/N del componente nuevo son obligatorios.");

  const { data: oldComponent, error: fetchError } = await supabase
    .from("components")
    .select("id, helicopter_registration, component_name, part_number, serial_number, status")
    .eq("id", oldComponentId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!oldComponent) throw new Error("Ese componente ya no existe.");
  if (oldComponent.status === "Removed") throw new Error("Ese componente ya está marcado como removido.");

  const { scopedRegistration } = await getTechnicianScope();
  if (scopedRegistration && oldComponent.helicopter_registration !== scopedRegistration) {
    throw new Error("Solo puedes cambiar componentes de tu helicóptero asignado.");
  }

  const registration = oldComponent.helicopter_registration;

  const installationDate = optionalDate(formData, "installationDate") ?? new Date().toISOString().slice(0, 10);
  const noCalendarLimit = formData.get("noCalendarLimit") === "on";
  const manualCalendarLimitDate = optionalDate(formData, "calendarLimitDate");
  const calendarLimitDate = noCalendarLimit ? null : (manualCalendarLimitDate ?? defaultCalendarLimitDate(installationDate));

  const { data: newComponent, error: insertError } = await supabase
    .from("components")
    .insert({
      helicopter_registration: registration,
      component_name: componentName,
      part_number: partNumber,
      serial_number: optionalText(formData, "serialNumber") ?? "",
      category: optionalText(formData, "category"),
      position: optionalText(formData, "position"),
      installation_date: installationDate,
      tsn_hours: number(formData, "tsnHours"),
      tso_hours: number(formData, "tsoHours"),
      life_limit_hours: number(formData, "lifeLimitHours"),
      remaining_hours: number(formData, "remainingHours"),
      calendar_limit_date: calendarLimitDate,
      remaining_calendar_days: daysUntil(calendarLimitDate),
      notes: optionalText(formData, "componentNotes"),
      source: "User"
    })
    .select("id")
    .single();
  if (insertError) {
    if (insertError.code === "23505") {
      throw new Error(`${registration} ya tiene un componente con ese mismo P/N + S/N.`);
    }
    throw new Error(insertError.message);
  }

  const { error: removeError } = await supabase
    .from("components")
    .update({ status: "Removed", updated_at: new Date().toISOString() })
    .eq("id", oldComponentId);
  if (removeError) throw new Error(removeError.message);

  const { data: technician } = await supabase.from("personnel").select("full_name").eq("id", technicianId).maybeSingle();
  const { data: helicopter } = await supabase.from("helicopters").select("current_hourmeter").eq("registration", registration).maybeSingle();

  const { data: swap, error: swapError } = await supabase
    .from("component_changes")
    .insert({
      helicopter_registration: registration,
      to_helicopter_registration: registration,
      swap_type: "Replacement",
      component_id: newComponent.id,
      removed_component_id: oldComponentId,
      installed_component_name: componentName,
      installed_part_number: partNumber,
      installed_serial_number: optionalText(formData, "serialNumber"),
      removed_component_name: oldComponent.component_name,
      installation_date: installationDate,
      removal_date: new Date().toISOString().slice(0, 10),
      reason,
      technician: technician?.full_name ?? null,
      technician_id: technicianId,
      hourmeter_at_change: helicopter?.current_hourmeter ?? null,
      notes,
      source: "User"
    })
    .select("id")
    .single();
  if (swapError) throw new Error(swapError.message);

  await uploadEvidence(swap.id, formData);

  await supabase.from("technical_records").insert({
    record_type: "Component change",
    related_helicopter: registration,
    related_component_id: newComponent.id,
    title: `Cambio de componente — ${oldComponent.component_name} → ${componentName} (${registration})`,
    record_date: new Date().toISOString().slice(0, 10),
    document_number: null,
    technician_name: technician?.full_name ?? null,
    notes: reason,
    source: "User"
  });

  revalidateEverywhere([registration]);
  redirect("/component-changes");
}
