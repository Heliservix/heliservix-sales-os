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

// Aug 2026, Adolfo: "si algun tecnico hace una equivocacion pueda borrarlos y
// que automaticamente se vuelvan ajustar los tiempos de los componentes y
// corrijan todos los datos posibles". trg_apply_flight_log only fires on
// INSERT (there is no DB-level reverse trigger for a delete), so this
// function does the undo itself, in the same shape the trigger applied it:
//
//   1. Add the same flight_hours back to remaining_hours (capped at
//      life_limit_hours when the component has one) for every component
//      that is CURRENTLY active on this aircraft, and subtract it back out
//      of tso_hours. This mirrors the trigger's own "whatever's active right
//      now" population — if a component was swapped between this flight's
//      date and today, the reversal won't retroactively re-target the old
//      component either, same limitation the forward trigger already has.
//   2. Roll back helicopters.current_hourmeter ONLY when it's provably safe:
//      current_hourmeter still equals this exact log's hobbs_end (i.e. this
//      was the flight that last pushed it there) AND no other remaining log
//      reaches that high. Otherwise current_hourmeter is left untouched
//      rather than risk lowering it below a later reading or a legitimate
//      manually-entered baseline (current_hourmeter has no separate "manual
//      floor" column — it's a single ratcheted value, so a full-history undo
//      isn't safely derivable).
//
// Not auto-reversed: maintenance_logs / technical_records rows the same
// weekly-report upload may have also created (routine inspections, No
// Rutina events, filter changes) and any inventory/stock_movements or
// purchase_requests it triggered. There is no reliable foreign key from
// those tables back to a specific flight_logs row (only fuzzy date/type/
// hourmeter matching), and inventory/purchase rows may have already been
// acted on independently — auto-deleting those risks silently destroying
// unrelated data. The UI tells the técnico to check that same date's
// maintenance log / technical records by hand if they also look duplicated.
export async function deleteFlightLog(campaignId: string, flightLogId: string) {
  const { data: log, error: fetchError } = await supabase
    .from("flight_logs")
    .select("helicopter_registration, flight_hours, hobbs_end")
    .eq("id", flightLogId)
    .maybeSingle();
  if (fetchError) throw new Error(`No se pudo leer el reporte antes de borrarlo: ${fetchError.message}`);
  if (!log) throw new Error("Este reporte ya no existe.");

  const { error: deleteError } = await supabase.from("flight_logs").delete().eq("id", flightLogId);
  if (deleteError) throw new Error(`No se pudo eliminar el reporte: ${deleteError.message}`);

  const flightHours = Number(log.flight_hours);
  const helicopterRegistration = log.helicopter_registration;

  if (flightHours > 0 && helicopterRegistration) {
    const { data: components } = await supabase
      .from("components")
      .select("id, remaining_hours, tso_hours, life_limit_hours")
      .eq("helicopter_registration", helicopterRegistration)
      .neq("status", "Removed")
      .eq("archived", false);

    for (const component of components ?? []) {
      const restored = Number(component.remaining_hours) + flightHours;
      const lifeLimit = Number(component.life_limit_hours);
      const restoredRemaining = lifeLimit > 0 ? Math.min(restored, lifeLimit) : restored;
      await supabase
        .from("components")
        .update({
          remaining_hours: restoredRemaining,
          tso_hours: Math.max(0, Number(component.tso_hours) - flightHours),
          updated_at: new Date().toISOString()
        })
        .eq("id", component.id);
    }

    const { data: helicopter } = await supabase
      .from("helicopters")
      .select("current_hourmeter")
      .eq("registration", helicopterRegistration)
      .maybeSingle();

    if (helicopter && Number(helicopter.current_hourmeter) === Number(log.hobbs_end)) {
      const { data: remainingLogs } = await supabase
        .from("flight_logs")
        .select("hobbs_end")
        .eq("helicopter_registration", helicopterRegistration);
      const nextHighest = (remainingLogs ?? []).reduce((max, r) => Math.max(max, Number(r.hobbs_end)), 0);
      await supabase
        .from("helicopters")
        .update({ current_hourmeter: nextHighest, updated_at: new Date().toISOString() })
        .eq("registration", helicopterRegistration);
    }
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns/resumen");
  revalidatePath("/aura");
  revalidatePath("/reports");
  revalidatePath("/helicopters");
  if (helicopterRegistration) revalidatePath(`/helicopters/${helicopterRegistration}`);
}
