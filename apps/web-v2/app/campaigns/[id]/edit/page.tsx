import { notFound } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updateCampaign, deleteCampaign } from "@/app/campaigns/actions";
import { campaignStatuses } from "@/app/campaigns/constants";

type EditCampaignPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const { id } = await params;
  const [{ data: campaign }, { data: helicopters }, { data: vessels }, { data: personnel }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("id", id).maybeSingle(),
    supabase.from("helicopters").select("registration").eq("archived", false).order("registration"),
    supabase.from("vessels").select("id, name").eq("archived", false).order("name"),
    supabase.from("personnel").select("id, full_name, role").eq("archived", false).eq("status", "Active").order("full_name")
  ]);
  if (!campaign) notFound();

  const pilots = (personnel ?? []).filter((p) => p.role === "Piloto");
  const mechanics = (personnel ?? []).filter((p) => p.role === "Mecánico");

  const boundUpdate = updateCampaign.bind(null, id);
  const boundDelete = deleteCampaign.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader eyebrow="Campañas" title={`Editar ${campaign.name}`} description={campaign.code ?? ""} icon={CalendarRange} />
        <Panel>
          <form action={boundUpdate} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Código de marea
              <input className="hsv-control" name="code" defaultValue={campaign.code ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Nombre
              <input className="hsv-control" name="name" defaultValue={campaign.name} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Helicóptero
              <select className="hsv-control" name="helicopterRegistration" defaultValue={campaign.helicopter_registration ?? ""}>
                <option value="">Sin asignar</option>
                {(helicopters ?? []).map((h) => (
                  <option key={h.registration} value={h.registration}>{h.registration}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Barco
              <select className="hsv-control" name="vesselId" defaultValue={campaign.vessel_id ?? ""}>
                <option value="">Sin asignar</option>
                {(vessels ?? []).map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Piloto
              <select className="hsv-control" name="pilotId" defaultValue={campaign.pilot_id ?? ""}>
                <option value="">Sin asignar</option>
                {pilots.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Mecánico
              <select className="hsv-control" name="mechanicId" defaultValue={campaign.mechanic_id ?? ""}>
                <option value="">Sin asignar</option>
                {mechanics.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha inicio
              <input className="hsv-control" type="date" name="startDate" defaultValue={campaign.start_date ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha fin
              <input className="hsv-control" type="date" name="endDate" defaultValue={campaign.end_date ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Área de operación
              <input className="hsv-control" name="operationArea" defaultValue={campaign.operation_area ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Referencia de contrato
              <input className="hsv-control" name="contractReference" defaultValue={campaign.contract_reference ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Cliente / armador
              <input className="hsv-control" name="clientFleetOwner" defaultValue={campaign.client_fleet_owner ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Estado
              <select className="hsv-control" name="status" defaultValue={campaign.status}>
                {campaignStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Días de pesca
              <input className="hsv-control" type="number" step="1" name="fishingDays" defaultValue={campaign.fishing_days ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Toneladas capturadas (estimado)
              <input className="hsv-control" type="number" step="0.01" name="tonsCapturedEstimate" defaultValue={campaign.tons_captured_estimate ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Toneladas capturadas (peso final)
              <input className="hsv-control" type="number" step="0.01" name="tonsCapturedFinal" defaultValue={campaign.tons_captured_final ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha de pesaje final
              <input className="hsv-control" type="date" name="catchWeighinDate" defaultValue={campaign.catch_weighin_date ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Anticipos entregados al piloto (USD)
              <input className="hsv-control" type="number" step="0.01" name="pilotAnticipos" defaultValue={campaign.pilot_anticipos ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Anticipos entregados al mecánico (USD)
              <input className="hsv-control" type="number" step="0.01" name="mechanicAnticipos" defaultValue={campaign.mechanic_anticipos ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" defaultValue={campaign.notes ?? ""} />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar cambios
              </button>
            </div>
          </form>
        </Panel>

        <Panel className="mt-5">
          <h2 className="text-sm font-semibold text-ink">Zona de riesgo</h2>
          <p className="mt-1 text-sm text-ink-subtle">Elimina esta campaña/faena por completo. Los reportes semanales ya importados no se borran.</p>
          <div className="mt-4">
            <form action={boundDelete}>
              <button className="hsv-danger-button" type="submit">
                Eliminar definitivamente
              </button>
            </form>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
