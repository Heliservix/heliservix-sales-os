import { notFound } from "next/navigation";
import { Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updateWorkOrder } from "@/app/work-orders/actions";

type EditWorkOrderPageProps = { params: Promise<{ id: string }> };

export default async function EditWorkOrderPage({ params }: EditWorkOrderPageProps) {
  const { id } = await params;
  const [{ data: order }, { data: helicopters }, { data: mechanics }] = await Promise.all([
    supabase.from("work_orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("helicopters").select("registration, model").eq("archived", false).order("registration"),
    supabase.from("personnel").select("id, full_name").eq("archived", false).eq("role", "Mecánico").order("full_name")
  ]);
  if (!order) notFound();

  const boundUpdate = updateWorkOrder.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Mantenimiento"
          title={`Editar Orden OT-${String(order.sequence_number).padStart(5, "0")}`}
          description="Corrige los datos generales de la orden. El checklist de tareas se edita desde la propia orden."
          icon={Wrench}
        />
        <Panel>
          <form action={boundUpdate} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Cliente
              <input className="hsv-control" name="clientName" defaultValue={order.client_name ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Teléfono
              <input className="hsv-control" name="clientPhone" defaultValue={order.client_phone ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Dirección
              <input className="hsv-control" name="clientAddress" defaultValue={order.client_address ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Helicóptero de la flota
              <select className="hsv-control" name="helicopterRegistration" defaultValue={order.helicopter_registration ?? ""}>
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
              <input className="hsv-control" name="aircraftType" defaultValue={order.aircraft_type ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Matrícula
              <input className="hsv-control" name="aircraftRegistration" defaultValue={order.aircraft_registration ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              S/N aeronave
              <input className="hsv-control" name="aircraftSerial" defaultValue={order.aircraft_serial ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Motor
              <input className="hsv-control" name="engineType" defaultValue={order.engine_type ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Modelo (motor)
              <input className="hsv-control" name="engineModel" defaultValue={order.engine_model ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              S/N motor
              <input className="hsv-control" name="engineSerial" defaultValue={order.engine_serial ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Técnico encargado
              <select className="hsv-control" name="leadTechnicianId" defaultValue={order.lead_technician_id ?? ""}>
                <option value="">Sin asignar</option>
                {(mechanics ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Horas estimadas
              <input className="hsv-control" type="number" step="0.5" name="estimatedHours" defaultValue={order.estimated_hours ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Material
              <input className="hsv-control" name="materialNotes" defaultValue={order.material_notes ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Contrato N°
              <input className="hsv-control" name="contractNumber" defaultValue={order.contract_number ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" defaultValue={order.notes ?? ""} />
            </label>

            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar cambios
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
