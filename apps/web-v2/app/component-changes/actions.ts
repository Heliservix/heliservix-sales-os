"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { uploadDataUrlImage, uploadPhotoFile } from "@/lib/media-upload";
import { defaultCalendarLimitDate } from "@/lib/component-calendar";

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

// Flujo 1 — Transferir: la MISMA pieza física se mueve de un helicóptero a
// otro. Se actualiza helicopter_registration en la fila existente de
// components (mismo id) — TSN, TSO, horas remanentes y límite de calendario
// viajan con ella sin tocarse, que es justo la trazabilidad que Adolfo pidió.
export async function transferComponent(formData: FormData) {
  const componentId = text(formData, "componentId");
  const toRegistration = text(formData, "toRegistration");
  const technicianId = text(formData, "technicianId");
  const reason = optionalText(formData, "reason");
  const notes = optionalText(formData, "notes");

  if (!componentId) throw new Error("Selecciona el componente a mover.");
  if (!toRegistration) throw new Error("Selecciona el helicóptero destino.");
  if (!technicianId) throw new Error("Selecciona qué técnico hace el cambio.");

  const { data: component, error: fetchError } = await supabase
    .from("components")
    .select("id, helicopter_registration, component_name, part_number, serial_number, status")
    .eq("id", componentId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!component) throw new Error("Ese componente ya no existe.");
  if (component.status === "Removed") throw new Error("Ese componente ya está marcado como removido.");

  const fromRegistration = component.helicopter_registration;
  if (fromRegistration === toRegistration) {
    throw new Error("El helicóptero destino debe ser diferente al de origen.");
  }

  const { data: destination, error: destError } = await supabase
    .from("helicopters")
    .select("registration, current_hourmeter")
    .eq("registration", toRegistration)
    .maybeSingle();
  if (destError) throw new Error(destError.message);
  if (!destination) throw new Error("No se encontró el helicóptero destino.");

  const { error: updateError } = await supabase
    .from("components")
    .update({ helicopter_registration: toRegistration, updated_at: new Date().toISOString() })
    .eq("id", componentId);
  if (updateError) {
    if (updateError.code === "23505") {
      throw new Error(`${toRegistration} ya tiene un componente con el mismo P/N + S/N. Revisa antes de mover este.`);
    }
    throw new Error(updateError.message);
  }

  const { data: technician } = await supabase.from("personnel").select("full_name").eq("id", technicianId).maybeSingle();

  const { data: swap, error: swapError } = await supabase
    .from("component_changes")
    .insert({
      helicopter_registration: fromRegistration,
      to_helicopter_registration: toRegistration,
      swap_type: "Transfer",
      component_id: componentId,
      removed_component_id: null,
      installed_component_name: component.component_name,
      installed_part_number: component.part_number,
      installed_serial_number: component.serial_number,
      removed_component_name: null,
      installation_date: new Date().toISOString().slice(0, 10),
      removal_date: null,
      reason,
      technician: technician?.full_name ?? null,
      technician_id: technicianId,
      hourmeter_at_change: destination.current_hourmeter,
      notes,
      source: "User"
    })
    .select("id")
    .single();
  if (swapError) throw new Error(swapError.message);

  await uploadEvidence(swap.id, formData);

  await supabase.from("technical_records").insert({
    record_type: "Component change",
    related_helicopter: toRegistration,
    related_component_id: componentId,
    title: `Transferencia — ${component.component_name} (${fromRegistration} → ${toRegistration})`,
    record_date: new Date().toISOString().slice(0, 10),
    document_number: null,
    technician_name: technician?.full_name ?? null,
    notes: reason,
    source: "User"
  });

  revalidateEverywhere([fromRegistration, toRegistration]);
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
