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
