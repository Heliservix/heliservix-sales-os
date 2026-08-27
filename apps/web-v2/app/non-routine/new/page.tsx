import { AlertOctagon } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { createNonRoutineReport } from "@/app/non-routine/actions";
import { NonRoutineAircraftFields, type NonRoutineHelicopterOption } from "@/app/non-routine/aircraft-fields";

export default async function NewNonRoutineReportPage() {
  const [{ data: helicopters }, { data: personnel }, { data: openWorkOrders }] = await Promise.all([
    supabase.from("helicopters").select("registration, model, current_hourmeter").eq("archived", false).order("registration"),
    supabase.from("personnel").select("id, full_name").eq("archived", false).order("full_name"),
    supabase.from("work_orders").select("id, sequence_number").eq("archived", false).order("created_at", { ascending: false })
  ]);

  const helicopterOptions: NonRoutineHelicopterOption[] = (helicopters ?? []).map((h) => ({
    registration: h.registration,
    model: h.model,
    currentHourmeter: h.current_hourmeter != null ? Number(h.current_hourmeter) : null
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Mantenimiento"
          title="Crear Reporte No Rutina"
          description="Formulario AS-09 en papel, digitalizado. Describe la discrepancia encontrada — la acción correctiva y el cierre se registran después, desde el propio reporte."
          icon={AlertOctagon}
        />
        <Panel>
          <form action={createNonRoutineReport} className="grid gap-5 sm:grid-cols-2">
            <NonRoutineAircraftFields
              helicopters={helicopterOptions}
              defaults={{ helicopterRegistration: "", aircraftModel: "", totalTimeHours: "" }}
            />
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Orden de trabajo relacionada (opcional)
              <select className="hsv-control" name="workOrderId" defaultValue="">
                <option value="">Ninguna</option>
                {(openWorkOrders ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    OT-{String(o.sequence_number).padStart(5, "0")}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha del reporte
              <input className="hsv-control" type="date" name="reportDate" defaultValue={new Date().toISOString().slice(0, 10)} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Encontrado por
              <select className="hsv-control" name="openedByPersonnelId" defaultValue="">
                <option value="">Sin asignar</option>
                {(personnel ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Discrepancia encontrada
              <textarea className="hsv-textarea" name="discrepancy" rows={4} required placeholder="Describe qué se encontró y en qué componente o sistema" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Referencia de manual (AD/SB/manual de mantenimiento)
              <input className="hsv-control" name="manualReference" placeholder="Ej. Lycoming SI 1080B" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" />
            </label>

            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Crear reporte
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
