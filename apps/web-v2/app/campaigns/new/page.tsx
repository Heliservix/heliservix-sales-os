import { CalendarRange } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { createCampaign } from "@/app/campaigns/actions";
import { campaignStatuses } from "@/app/campaigns/constants";

export default async function NewCampaignPage() {
  const [{ data: helicopters }, { data: vessels }] = await Promise.all([
    supabase.from("helicopters").select("registration").eq("archived", false).order("registration"),
    supabase.from("vessels").select("id, name").eq("archived", false).order("name")
  ]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Campañas"
          title="Crear campaña / faena"
          description="Asigna un helicóptero a un barco por un período determinado. El código debe coincidir con la 'Marea' que reportan los técnicos para que los reportes semanales se vinculen automáticamente."
          icon={CalendarRange}
        />
        <Panel>
          <form action={createCampaign} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Código de marea
              <input className="hsv-control" name="code" placeholder="M02-2026" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Nombre
              <input className="hsv-control" name="name" placeholder="Marea M02-2026 — Caroní 2" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Helicóptero
              <select className="hsv-control" name="helicopterRegistration" defaultValue="">
                <option value="">Sin asignar</option>
                {(helicopters ?? []).map((h) => (
                  <option key={h.registration} value={h.registration}>{h.registration}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Barco
              <select className="hsv-control" name="vesselId" defaultValue="">
                <option value="">Sin asignar</option>
                {(vessels ?? []).map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Piloto
              <input className="hsv-control" name="pilot" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Mecánico
              <input className="hsv-control" name="mechanic" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha inicio
              <input className="hsv-control" type="date" name="startDate" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha fin
              <input className="hsv-control" type="date" name="endDate" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Área de operación
              <input className="hsv-control" name="operationArea" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Referencia de contrato
              <input className="hsv-control" name="contractReference" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Cliente / armador
              <input className="hsv-control" name="clientFleetOwner" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Estado
              <select className="hsv-control" name="status" defaultValue="Active">
                {campaignStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Crear campaña / faena
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
