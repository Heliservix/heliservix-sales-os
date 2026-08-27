import { Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { createWorkOrder } from "@/app/work-orders/actions";
import { WorkOrderAircraftFields, type WorkOrderHelicopterOption } from "@/app/work-orders/aircraft-fields";

export default async function NewWorkOrderPage() {
  const [{ data: helicopters }, { data: mechanics }, { data: templates }, { data: engines }] = await Promise.all([
    supabase.from("helicopters").select("registration, model, serial_number, owner_company").eq("archived", false).order("registration"),
    supabase.from("personnel").select("id, full_name").eq("archived", false).eq("role", "Mecánico").order("full_name"),
    supabase.from("checklist_templates").select("id, name, aircraft_model").eq("archived", false).order("name"),
    supabase.from("components").select("helicopter_registration, part_number, serial_number").ilike("component_name", "ENGINE").eq("archived", false)
  ]);

  const engineByRegistration = new Map((engines ?? []).map((e) => [e.helicopter_registration, e]));
  const helicopterOptions: WorkOrderHelicopterOption[] = (helicopters ?? []).map((h) => ({
    registration: h.registration,
    model: h.model,
    serialNumber: h.serial_number,
    ownerCompany: h.owner_company,
    engineModel: engineByRegistration.get(h.registration)?.part_number ?? null,
    engineSerial: engineByRegistration.get(h.registration)?.serial_number ?? null
  }));

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
            <WorkOrderAircraftFields
              helicopters={helicopterOptions}
              defaults={{
                helicopterRegistration: "",
                clientName: "",
                clientPhone: "",
                clientAddress: "",
                aircraftType: "",
                aircraftRegistration: "",
                aircraftSerial: "",
                engineType: "",
                engineModel: "",
                engineSerial: ""
              }}
            />

            <div className="sm:col-span-2 border-t border-line pt-4">
              <h2 className="text-sm font-semibold text-ink">Trabajo</h2>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Checklist de inspección (opcional)
              <select className="hsv-control" name="checklistTemplateId" defaultValue="">
                <option value="">Ninguno — solo escribir tareas abajo</option>
                {(templates ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal text-ink-subtle">
                Si eliges un checklist (ej. inspección de 100 hrs), sus líneas se agregan automáticamente a la orden — no hace falta escribirlas a mano.
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Tareas adicionales — una por línea
              <textarea
                className="hsv-textarea"
                name="tasksText"
                rows={5}
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
