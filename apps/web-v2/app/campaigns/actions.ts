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

function normalizeRegistration(value: string) {
  return value.replace(/[-\s]/g, "").toUpperCase();
}

function optionalRegistration(form: FormData, key: string) {
  const value = text(form, key);
  return value ? normalizeRegistration(value) : null;
}

export async function createCampaign(formData: FormData) {
  const name = text(formData, "name");
  if (!name) throw new Error("El nombre de la campaña/faena es obligatorio.");

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      code: optionalText(formData, "code"),
      name,
      client_fleet_owner: optionalText(formData, "clientFleetOwner"),
      vessel_id: optionalText(formData, "vesselId"),
      helicopter_registration: optionalRegistration(formData, "helicopterRegistration"),
      pilot: optionalText(formData, "pilot"),
      mechanic: optionalText(formData, "mechanic"),
      start_date: optionalText(formData, "startDate"),
      end_date: optionalText(formData, "endDate"),
      operation_area: optionalText(formData, "operationArea"),
      contract_reference: optionalText(formData, "contractReference"),
      status: text(formData, "status") || "Draft",
      notes: optionalText(formData, "notes"),
      source: "User"
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/campaigns");
  redirect(`/campaigns/${data.id}`);
}

export async function updateCampaign(id: string, formData: FormData) {
  const name = text(formData, "name");
  if (!name) throw new Error("El nombre de la campaña/faena es obligatorio.");

  const { error } = await supabase
    .from("campaigns")
    .update({
      code: optionalText(formData, "code"),
      name,
      client_fleet_owner: optionalText(formData, "clientFleetOwner"),
      vessel_id: optionalText(formData, "vesselId"),
      helicopter_registration: optionalRegistration(formData, "helicopterRegistration"),
      pilot: optionalText(formData, "pilot"),
      mechanic: optionalText(formData, "mechanic"),
      start_date: optionalText(formData, "startDate"),
      end_date: optionalText(formData, "endDate"),
      operation_area: optionalText(formData, "operationArea"),
      contract_reference: optionalText(formData, "contractReference"),
      status: text(formData, "status") || "Draft",
      notes: optionalText(formData, "notes"),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  redirect(`/campaigns/${id}`);
}

export async function archiveCampaign(id: string) {
  const { error } = await supabase.from("campaigns").update({ archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/campaigns");
  redirect("/campaigns");
}

export async function deleteCampaign(id: string) {
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/campaigns");
  redirect("/campaigns");
}
