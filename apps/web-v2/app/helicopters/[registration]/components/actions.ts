"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

/** Days between today and an ISO date, or null if there's no date (no calendar limit). */
function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${isoDate}T00:00:00Z`).getTime();
  return Math.round((target - todayUtc) / 86400000);
}

function componentFieldsFromForm(formData: FormData) {
  const calendarLimitDate = optionalDate(formData, "calendarLimitDate");
  return {
    component_name: text(formData, "componentName"),
    part_number: text(formData, "partNumber"),
    serial_number: text(formData, "serialNumber"),
    category: optionalText(formData, "category"),
    position: optionalText(formData, "position"),
    installation_date: optionalDate(formData, "installationDate"),
    tsn_hours: number(formData, "tsnHours"),
    tso_hours: number(formData, "tsoHours"),
    life_limit_hours: number(formData, "lifeLimitHours"),
    remaining_hours: number(formData, "remainingHours"),
    calendar_limit_date: calendarLimitDate,
    remaining_calendar_days: daysUntil(calendarLimitDate),
    notes: optionalText(formData, "notes")
    // status and remaining_percentage are intentionally NOT set here — the
    // trg_recalculate_component_fields trigger recomputes both from the hour/
    // calendar fields above on every insert/update, so the UI never has to
    // agree with the database on what "Critical" means.
  };
}

export async function createComponent(registration: string, formData: FormData) {
  const fields = componentFieldsFromForm(formData);
  if (!fields.component_name || !fields.part_number) {
    throw new Error("Componente y P/N son obligatorios.");
  }

  const { error } = await supabase.from("components").insert({
    helicopter_registration: registration,
    ...fields,
    source: "User"
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Ya existe un componente con ese P/N + S/N en ${registration}. Edítalo en vez de crear uno nuevo.`);
    }
    throw new Error(error.message);
  }

  revalidatePath(`/helicopters/${registration}`);
  redirect(`/helicopters/${registration}`);
}

export async function updateComponent(registration: string, componentId: string, formData: FormData) {
  const fields = componentFieldsFromForm(formData);
  if (!fields.component_name || !fields.part_number) {
    throw new Error("Componente y P/N son obligatorios.");
  }

  const { error } = await supabase.from("components").update(fields).eq("id", componentId);

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe otro componente con ese P/N + S/N en este helicóptero.");
    }
    throw new Error(error.message);
  }

  revalidatePath(`/helicopters/${registration}`);
  redirect(`/helicopters/${registration}`);
}

/** Soft-remove: keeps the row (and its history) but takes it out of the active list. */
export async function markComponentRemoved(registration: string, componentId: string) {
  const { error } = await supabase.from("components").update({ status: "Removed" }).eq("id", componentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/helicopters/${registration}`);
}

/** Hard delete — for genuine data-entry mistakes (duplicates, typos), not real removals. */
export async function deleteComponent(registration: string, componentId: string) {
  const { error } = await supabase.from("components").delete().eq("id", componentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/helicopters/${registration}`);
}
