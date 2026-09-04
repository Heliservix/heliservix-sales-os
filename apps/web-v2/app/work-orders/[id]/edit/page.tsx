import { notFound } from "next/navigation";
import { Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updateWorkOrder } from "@/app/work-orders/actions";
import { WorkOrderAircraftFields, type WorkOrderHelicopterOption } from "@/app/work-orders/aircraft-fields";
import { getTechnicianScope } from "@/lib/technician-scope";

type EditWorkOrderPageProps = { params: Promise<{ id: string }> };

export default async function EditWorkOrderPage({ params }: EditWorkOrderPageProps) {
  const { id } = await params;
  const { scopedRegistration } = await getTechnicianScope();
  const [{ data: order }, { data: helicopterData }, { data: mechanics }, { data: engines }] = await Promise.all([
    supabase.from("work_orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("helicopters").select("registration, model, serial_number, owner_company").eq("archived", false).order("registration"),
    supabase.from("personnel").select("id, full_name").eq("archived", false).eq("role", "Mecánico").order("full_name"),
    supabase.from("components").select("helicopter_registration, part_number, serial_number").ilike("component_name", "ENGINE").eq("archived", false)
  ]);
  if (!order) notFound();
  if (scopedRegistration && order.helicopter_registration !== scopedRegistration) notFound();

  const helicopters = scopedRegistration ? (helicopterData ?? []).filter((h) => h.registration === scopedRegistration) : (helicopterData ?? []);
  const engineByRegistration = new Map((engines ?? []).map((e) => [e.helicopter_registration, e]));
  const helicopterOptions: WorkOrderHelicopterOption[] = (helicopters ?? []).map((h) => ({
    registration: h.registration,
    model: h.model,
    serialNumber: h.serial_number,
    ownerCompany: h.owner_company,
    engineModel: engineByRegistration.get(h.registration)?.part_number ?? null,
    engineSerial: engineByRegistration.get(h.registration)?.serial_number ?? null
  }));

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
            <WorkOrderAircraftFields
              helicopters={helicopterOptions}
              defaults={{
                helicopterRegistration: order.helicopter_registration ?? "",
                clientName: order.client_name ?? "",
                clientPhone: order.client_phone ?? "",
                clientAddress: order.client_address ?? "",
                aircraftType: order.aircraft_type ?? "",
                aircraftRegistration: order.aircraft_registration ?? "",
                aircraftSerial: order.aircraft_serial ?? "",
                engineType: order.engine_type ?? "",
                engineModel: order.engine_model ?? "",
                engineSerial: order.engine_serial ?? ""
              }}
            />
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
