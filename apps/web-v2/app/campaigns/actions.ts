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

function optionalNumber(form: FormData, key: string) {
  const value = text(form, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// pilot_id/mechanic_id (FK to personnel) are the source of truth going
// forward, but campaigns.pilot/mechanic stay as plain text too — several
// pages (campaign detail, AURA evidence strings) already read those text
// columns directly. Rather than touch every read site, copy the selected
// person's name into the text column on every save so it never goes stale.
async function resolvePersonName(id: string | null): Promise<string | null> {
  if (!id) return null;
  const { data } = await supabase.from("personnel").select("full_name").eq("id", id).maybeSingle();
  return data?.full_name ?? null;
}

export async function createCampaign(formData: FormData) {
  const name = text(formData, "name");
  if (!name) throw new Error("El nombre de la campaña/faena es obligatorio.");

  const pilotId = optionalText(formData, "pilotId");
  const mechanicId = optionalText(formData, "mechanicId");
  const [pilotName, mechanicName] = await Promise.all([resolvePersonName(pilotId), resolvePersonName(mechanicId)]);

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      code: optionalText(formData, "code"),
      name,
      client_fleet_owner: optionalText(formData, "clientFleetOwner"),
      vessel_id: optionalText(formData, "vesselId"),
      helicopter_registration: optionalRegistration(formData, "helicopterRegistration"),
      pilot_id: pilotId,
      mechanic_id: mechanicId,
      pilot: pilotName,
      mechanic: mechanicName,
      start_date: optionalText(formData, "startDate"),
      end_date: optionalText(formData, "endDate"),
      operation_area: optionalText(formData, "operationArea"),
      contract_reference: optionalText(formData, "contractReference"),
      status: text(formData, "status") || "Draft",
      tons_captured_estimate: optionalNumber(formData, "tonsCapturedEstimate"),
      tons_captured_final: optionalNumber(formData, "tonsCapturedFinal"),
      fishing_days: optionalNumber(formData, "fishingDays"),
      catch_weighin_date: optionalText(formData, "catchWeighinDate"),
      pilot_anticipos: optionalNumber(formData, "pilotAnticipos"),
      mechanic_anticipos: optionalNumber(formData, "mechanicAnticipos"),
      total_flight_hours: optionalNumber(formData, "totalFlightHours"),
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

  const pilotId = optionalText(formData, "pilotId");
  const mechanicId = optionalText(formData, "mechanicId");
  const [pilotName, mechanicName] = await Promise.all([resolvePersonName(pilotId), resolvePersonName(mechanicId)]);

  const { error } = await supabase
    .from("campaigns")
    .update({
      code: optionalText(formData, "code"),
      name,
      client_fleet_owner: optionalText(formData, "clientFleetOwner"),
      vessel_id: optionalText(formData, "vesselId"),
      helicopter_registration: optionalRegistration(formData, "helicopterRegistration"),
      pilot_id: pilotId,
      mechanic_id: mechanicId,
      pilot: pilotName,
      mechanic: mechanicName,
      start_date: optionalText(formData, "startDate"),
      end_date: optionalText(formData, "endDate"),
      operation_area: optionalText(formData, "operationArea"),
      contract_reference: optionalText(formData, "contractReference"),
      status: text(formData, "status") || "Draft",
      tons_captured_estimate: optionalNumber(formData, "tonsCapturedEstimate"),
      tons_captured_final: optionalNumber(formData, "tonsCapturedFinal"),
      fishing_days: optionalNumber(formData, "fishingDays"),
      catch_weighin_date: optionalText(formData, "catchWeighinDate"),
      pilot_anticipos: optionalNumber(formData, "pilotAnticipos"),
      mechanic_anticipos: optionalNumber(formData, "mechanicAnticipos"),
      total_flight_hours: optionalNumber(formData, "totalFlightHours"),
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
