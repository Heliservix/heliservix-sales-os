import { Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { createWorkOrder } from "@/app/work-orders/actions";

export default async function NewWorkOrderPage() {
  const [{ data: helicopters }, { data: mechanics }] = await Promise.all([
    supabase.from("helicopters").select("registration, model").eq("archived", false).order("registration"),
    supabase.from("personnel").select("id, full_name").eq("archived", false).eq("role", "Mecánico").order("full_name")
  ]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Mantenimiento"
          title="Crear Orden de Reparación"
          description='Mismos campos del Formulario HS-06 en papel. Escribe cada tarea en una línea aparte abajo — cada línea se convierte en un ítem del checklist que el técnico puede ir marcando.'
          icon={Wrench}
        />
        <Panel>
          <form action={createWorkOrder} className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h2 className="text-sm font-semibold text-ink">Cliente</h2>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Cliente
              <input className="hsv-control" name="clientName" placeholder="Ej. Heliser Vix Inc." />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Teléfono
              <input className="hsv-control" name="clientPhone" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Dirección
              <input className="hsv-control" name="clientAddress" />
            </label>

            <div className="sm:col-span-2 border-t border-line pt-4">
              <h2 className="text-sm font-semibold text-ink">Aeronave</h2>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Helicóptero de la flota (opcional)
              <select className="hsv-control" name="helicopterRegistration" defaultValue="">
                <option value="">Externo / no está en la flota</option>
                {(helicopters ?? []).map((h) => (
                  <option key={h.registration} value={h.registration}>
                    {h.registration} — {h.model}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Aeronave (tipo)
              <input className="hsv-control" name="aircraftType" placeholder="Ej. Robinson R44" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Matrícula
              <input className="hsv-control" name="aircraftRegistration" placeholder="Ej. HP-1804" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              S/N aeronave
              <input className="hsv-control" name="aircraftSerial" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Motor
              <input className="hsv-control" name="engineType" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Modelo (motor)
              <input className="hsv-control" name="engineModel" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              S/N motor
              <input className="hsv-control" name="engineSerial" />
            </label>

            <div className="sm:col-span-2 border-t border-line pt-4">
              <h2 className="text-sm font-semibold text-ink">Trabajo</h2>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Descripción del trabajo requerido — una tarea por línea
              <textarea
                className="hsv-textarea"
                name="tasksText"
                rows={7}
                placeholder={"Ej.\nCambio de aceite motor\nInspección de tren de aterrizaje\nRevisión de rotor de cola"}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Técnico encargado
              <select className="hsv-control" name="leadTechnicianId" defaultValue="">
                <option value="">Sin asignar todavía</option>
                {(mechanics ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Horas estimadas
              <input className="hsv-control" type="number" step="0.5" name="estimatedHours" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Material
              <input className="hsv-control" name="materialNotes" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Contrato N°
              <input className="hsv-control" name="contractNumber" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" />
            </label>

            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Crear orden
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
