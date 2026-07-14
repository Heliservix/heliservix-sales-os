"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

// Fixes the exact class of error found in the Caroní M02-2026 import: a
// weekly report gets linked to the wrong faena (wrong marea code typed
// inside the report, or an ambiguous vessel/helicopter match). Reassigning
// just moves the existing row to the correct campaign/marea/vessel — it
// does NOT re-insert into flight_logs, so trg_apply_flight_log never fires
// again and no hours get double-deducted. This is the SAFE fix for a
// mislabeled report.
export async function reassignFlightLog(flightLogId: string, formData: FormData) {
  const newCampaignId = String(formData.get("newCampaignId") ?? "").trim();
  if (!newCampaignId) throw new Error("Selecciona la faena correcta antes de mover el reporte.");

  const { data: log } = await supabase.from("flight_logs").select("campaign_id").eq("id", flightLogId).maybeSingle();

  const { data: newCampaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, code, vessel_id")
    .eq("id", newCampaignId)
    .maybeSingle();
  if (campaignError || !newCampaign) throw new Error("No se encontró la faena de destino.");

  const { error } = await supabase
    .from("flight_logs")
    .update({ campaign_id: newCampaign.id, marea_code: newCampaign.code, vessel_id: newCampaign.vessel_id })
    .eq("id", flightLogId);
  if (error) throw new Error(`No se pudo reasignar el reporte: ${error.message}`);

  revalidatePath(`/campaigns/${newCampaign.id}`);
  if (log?.campaign_id) revalidatePath(`/campaigns/${log.campaign_id}`);
  revalidatePath("/campaigns/resumen");
  revalidatePath("/aura");
  revalidatePath("/reports");
}

// Deliberately does NOT touch helicopters.current_hourmeter or
// components.remaining_hours/tso_hours — there is no reverse trigger for a
// flight_logs delete (trg_apply_flight_log only fires on INSERT), so those
// deductions stay applied even after the row is gone. Only use this for a
// genuine duplicate report that should never have existed; if real hours
// were wrongly deducted, that needs a separate manual correction (ask
// Claude, same as the Caroní fix) — the campaign detail page's warning
// dialog says this before submitting.
export async function deleteFlightLog(campaignId: string, flightLogId: string) {
  const { error } = await supabase.from("flight_logs").delete().eq("id", flightLogId);
  if (error) throw new Error(`No se pudo eliminar el reporte: ${error.message}`);

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns/resumen");
  revalidatePath("/aura");
  revalidatePath("/reports");
}
