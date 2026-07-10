import { Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { logHangarMaintenance } from "@/app/maintenance/actions";

export default async function NewHangarMaintenancePage() {
  const { data: helicopters } = await supabase
    .from("helicopters")
    .select("registration, model")
    .eq("archived", false)
    .order("registration");

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Mantenimiento"
          title="Registrar mantenimiento en hangar"
          description="Para revisiones y correcciones que no están en el manual de mantenimiento y que hoy solo quedan en los libros. Esto no reemplaza el reporte semanal — es para trabajo en tierra."
          icon={Wrench}
        />
        <Panel>
          <form action={logHangarMaintenance} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Helicóptero
              <select className="hsv-control" name="registration" required defaultValue="">
                <option value="" disabled>
                  Selecciona…
                </option>
                {(helicopters ?? []).map((h) => (
                  <option key={h.registration} value={h.registration}>
                    {h.registration} — {h.model}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha
              <input className="hsv-control" type="date" name="logDate" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Tipo
              <input className="hsv-control" name="maintenanceType" list="maintenance-types" defaultValue="No Rutina" />
              <datalist id="maintenance-types">
                <option value="No Rutina" />
                <option value="25 HRS" />
                <option value="50 HRS" />
                <option value="100 HRS" />
                <option value="Reparación" />
                <option value="Inspección" />
              </datalist>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Horómetro
              <input className="hsv-control" type="number" step="0.1" name="hourmeter" placeholder="1962.2" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Técnico
              <input className="hsv-control" name="technician" />
            </label>
            <div />
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Novedad / descripción
              <textarea className="hsv-textarea" name="description" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Gestión / acción tomada
              <textarea className="hsv-textarea" name="actionTaken" />
            </label>

            <div className="sm:col-span-2">
              <h3 className="text-sm font-semibold text-ink">¿Incluyó cambio de componente?</h3>
              <p className="mt-1 text-xs text-ink-subtle">
                Déjalo vacío si no aplica. Si lo llenas, queda registrado para revisión — no actualiza Control de Componentes
                automáticamente, eso lo confirmas tú desde la ficha del componente.
              </p>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              P/N removido
              <input className="hsv-control" name="removedPartNumber" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              S/N removido
              <input className="hsv-control" name="removedSerialNumber" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              P/N instalado
              <input className="hsv-control" name="installedPartNumber" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              S/N instalado
              <input className="hsv-control" name="installedSerialNumber" />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" />
            </label>

            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
