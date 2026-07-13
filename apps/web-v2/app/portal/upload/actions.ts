"use server";

import { getSessionUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { importWeeklyReport, type WeeklyImportState } from "@/app/reports/import/actions";
import { sendReportUploadedEmail } from "@/lib/email";

// Thin wrapper around the existing office importer (app/reports/import/actions.ts)
// so the parsing/business-rule logic (flight hours, component deduction,
// inventory sync, etc.) is defined in exactly one place. This wrapper adds
// what's specific to the técnico portal: confirming the logged-in person is
// actually assigned to the faena they picked, and emailing Adolfo once the
// import succeeds.
export async function submitTechnicianWeeklyReport(
  _prevState: WeeklyImportState,
  formData: FormData
): Promise<WeeklyImportState> {
  const user = await getSessionUser();
  if (!user || user.isAdmin || !user.personnelId) {
    return { status: "error", message: "No se pudo identificar tu usuario. Cierra sesión, vuelve a entrar e inténtalo de nuevo." };
  }

  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!campaignId) {
    return { status: "error", message: "Selecciona la faena antes de subir el archivo." };
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, name, code, pilot_id, mechanic_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError || !campaign) {
    return { status: "error", message: "No se encontró la faena seleccionada. Vuelve a intentarlo." };
  }
  if (campaign.pilot_id !== user.personnelId && campaign.mechanic_id !== user.personnelId) {
    return { status: "error", message: "Esa faena no está asignada a tu usuario." };
  }

  const result = await importWeeklyReport({ status: "idle", message: "" }, formData);

  if (result.status === "success") {
    await sendReportUploadedEmail({
      technicianName: user.personnelName ?? user.email,
      campaignName: campaign.name,
      summaryMessage: result.message
    });
  }

  return result;
}
