import { notFound } from "next/navigation";
import { AlertOctagon } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updateNonRoutineReport } from "@/app/non-routine/actions";
import { NonRoutineAircraftFields, type NonRoutineHelicopterOption } from "@/app/non-routine/aircraft-fields";
import { getTechnicianScope } from "@/lib/technician-scope";

type EditNonRoutineReportPageProps = { params: Promise<{ id: string }> };

export default async function EditNonRoutineReportPage({ params }: EditNonRoutineReportPageProps) {
  const { id } = await params;
  const { scopedRegistration } = await getTechnicianScope();
  const [{ data: report }, { data: helicopterData }, { data: personnel }, { data: openWorkOrders }] = await Promise.all([
    supabase.from("non_routine_reports").select("*").eq("id", id).maybeSingle(),
    supabase.from("helicopters").select("registration, model, current_hourmeter").eq("archived", false).order("registration"),
    supabase.from("personnel").select("id, full_name").eq("archived", false).order("full_name"),
    supabase.from("work_orders").select("id, sequence_number").eq("archived", false).order("created_at", { ascending: false })
  ]);
  if (!report) notFound();
  if (scopedRegistration && report.helicopter_registration !== scopedRegistration) notFound();

  const helicopters = scopedRegistration ? (helicopterData ?? []).filter((h) => h.registration === scopedRegistration) : (helicopterData ?? []);
  const helicopterOptions: NonRoutineHelicopterOption[] = (helicopters ?? []).map((h) => ({
    registration: h.registration,
    model: h.model,
    currentHourmeter: h.current_hourmeter != null ? Number(h.current_hourmeter) : null
  }));

  const boundUpdate = updateNonRoutineReport.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Mantenimiento"
          title={`Editar Reporte NR-${String(report.sequence_number).padStart(5, "0")}`}
          description="Corrige los datos generales del reporte. La acción correctiva y el cierre se manejan desde el propio reporte."
          icon={AlertOctagon}
        />
        <Panel>
          <form action={boundUpdate} className="grid gap-5 sm:grid-cols-2">
            <NonRoutineAircraftFields
              helicopters={helicopterOptions}
              defaults={{
                helicopterRegistration: report.helicopter_registration ?? "",
                aircraftModel: report.aircraft_model ?? "",
                totalTimeHours: report.total_time_hours != null ? String(report.total_time_hours) : ""
              }}
            />
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Orden de trabajo relacionada
              <select className="hsv-control" name="workOrderId" defaultValue={report.work_order_id ?? ""}>
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
              <input className="hsv-control" type="date" name="reportDate" defaultValue={report.report_date ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Encontrado por
              <select className="hsv-control" name="openedByPersonnelId" defaultValue={report.opened_by_personnel_id ?? ""}>
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
              <textarea className="hsv-textarea" name="discrepancy" rows={4} required defaultValue={report.discrepancy ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Referencia de manual (AD/SB/manual de mantenimiento)
              <input className="hsv-control" name="manualReference" defaultValue={report.manual_reference ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" defaultValue={report.notes ?? ""} />
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
