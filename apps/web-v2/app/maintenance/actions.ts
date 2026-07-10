"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optionalText(form: FormData, key: string) {
  const value = text(form, key);
  return value || null;
}

function optionalNumber(form: FormData, key: string) {
  const raw = text(form, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Logs a hangar/ground maintenance event that isn't tied to a weekly faena
 * report — the "revisiones y correcciones que no están en el manual" that
 * would otherwise only live in the paper logbooks. Never touches the live
 * components table directly: if a component was swapped, it's recorded in
 * component_changes for the maintenance chief to confirm and apply in
 * Control de Componentes (same conservative pattern as the weekly-report
 * importer's auto-detected changes). */
export async function logHangarMaintenance(formData: FormData) {
  const registration = text(formData, "registration");
  if (!registration) throw new Error("Selecciona un helicóptero.");

  const logDate = text(formData, "logDate") || new Date().toISOString().slice(0, 10);
  const maintenanceType = text(formData, "maintenanceType") || "No Rutina";
  const hourmeter = optionalNumber(formData, "hourmeter");

  const { error: logError } = await supabase.from("maintenance_logs").insert({
    helicopter_registration: registration,
    log_date: logDate,
    maintenance_type: maintenanceType,
    hourmeter,
    description: optionalText(formData, "description"),
    technician: optionalText(formData, "technician"),
    action_taken: optionalText(formData, "actionTaken"),
    notes: optionalText(formData, "notes"),
    source: "User"
  });

  if (logError) throw new Error(logError.message);

  const removedPartNumber = optionalText(formData, "removedPartNumber");
  const removedSerialNumber = optionalText(formData, "removedSerialNumber");
  const installedPartNumber = optionalText(formData, "installedPartNumber");
  const installedSerialNumber = optionalText(formData, "installedSerialNumber");
  const includesComponentChange = Boolean(removedPartNumber || removedSerialNumber || installedPartNumber || installedSerialNumber);

  if (includesComponentChange) {
    let removedComponentId: string | null = null;
    let removedComponentName: string | null = null;

    if (removedPartNumber || removedSerialNumber) {
      let query = supabase.from("components").select("id, component_name").eq("helicopter_registration", registration);
      if (removedPartNumber) query = query.eq("part_number", removedPartNumber);
      if (removedSerialNumber) query = query.eq("serial_number", removedSerialNumber);
      const { data: match } = await query.maybeSingle();
      if (match) {
        removedComponentId = match.id;
        removedComponentName = match.component_name;
      }
    }

    const { error: changeError } = await supabase.from("component_changes").insert({
      helicopter_registration: registration,
      removed_component_id: removedComponentId,
      removed_component_name: removedComponentName,
      installed_part_number: installedPartNumber,
      installed_serial_number: installedSerialNumber,
      removal_date: logDate,
      installation_date: logDate,
      reason: optionalText(formData, "description") ?? "Mantenimiento en hangar",
      technician: optionalText(formData, "technician"),
      notes: removedComponentId
        ? null
        : "No se encontró el componente removido en Control de Componentes por P/N + S/N; verificar y actualizar manualmente.",
      source: "User"
    });

    if (changeError) throw new Error(`Se guardó el registro de mantenimiento pero falló el cambio de componente: ${changeError.message}`);
  }

  revalidatePath("/alerts");
  revalidatePath(`/helicopters/${registration}`);
  redirect(`/helicopters/${registration}`);
}
