import { getSessionUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { UploadWizard } from "@/app/portal/upload/upload-wizard";

export const dynamic = "force-dynamic";

type AssignedCampaign = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  vessels: { name: string } | null;
};

export default async function PortalUploadPage() {
  const user = await getSessionUser();

  if (!user?.personnelId) {
    // The layout already shows the "cuenta no vinculada" message for this
    // case — nothing to render here.
    return null;
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name, code, status, vessels(name)")
    .or(`pilot_id.eq.${user.personnelId},mechanic_id.eq.${user.personnelId}`)
    .eq("archived", false)
    .order("start_date", { ascending: false });

  const campaigns = (data ?? []) as unknown as AssignedCampaign[];

  if (error) {
    return (
      <div className="hsv-error-banner">No se pudieron cargar tus faenas: {error.message}</div>
    );
  }

  if (!campaigns.length) {
    return (
      <div className="hsv-panel text-center">
        <p className="font-semibold text-ink">Todavía no tienes ninguna faena asignada</p>
        <p className="mt-2 text-sm text-ink-subtle">
          Pide a Adolfo que te asigne a la faena correspondiente en el sistema antes de subir tu reporte.
        </p>
      </div>
    );
  }

  return <UploadWizard campaigns={campaigns} technicianName={user.personnelName ?? user.email} />;
}
