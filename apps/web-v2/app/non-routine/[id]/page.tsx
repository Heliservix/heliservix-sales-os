import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertOctagon, Download } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import {
  recordCorrectiveAction,
  closeNonRoutineReport,
  updateNonRoutineStatus,
  archiveNonRoutineReport,
  addComponentChange,
  deleteComponentChange
} from "@/app/non-routine/actions";
import { nonRoutineStatuses } from "@/app/non-routine/constants";
import { PrintButton } from "@/app/reports/faena/[id]/print-button";
import { NonRoutinePrintSheet } from "@/app/non-routine/print-sheet";

export const dynamic = "force-dynamic";

type NonRoutineDetailProps = { params: Promise<{ id: string }> };

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "teal" | "red" | "neutral"> = {
  Abierta: "amber",
  Corregida: "blue",
  Cerrada: "green"
};

export default async function NonRoutineDetailPage({ params }: NonRoutineDetailProps) {
  const { id } = await params;

  const [{ data: report }, { data: componentData }, { data: personnelData }, { data: workOrderData }] = await Promise.all([
    supabase.from("non_routine_reports").select("*").eq("id", id).maybeSingle(),
    supabase.from("non_routine_component_changes").select("*").eq("non_routine_report_id", id).order("created_at", { ascending: true }),
    supabase.from("personnel").select("id, full_name, license_number, license_type").eq("archived", false).order("full_name"),
    supabase.from("work_orders").select("id, sequence_number")
  ]);

  if (!report) notFound();

  const components = componentData ?? [];
  const personnel = personnelData ?? [];
  const personnelById = new Map(personnel.map((p) => [p.id, p]));
  const workOrdersById = new Map((workOrderData ?? []).map((o) => [o.id, o.sequence_number]));

  const openedBy = report.opened_by_personnel_id ? personnelById.get(report.opened_by_personnel_id) : null;
  const correctedBy = report.corrected_by_personnel_id ? personnelById.get(report.corrected_by_personnel_id) : null;
  const inspector = report.inspector_personnel_id ? personnelById.get(report.inspector_personnel_id) : null;

  const boundArchive = archiveNonRoutineReport.bind(null, id);
  const boundStatus = updateNonRoutineStatus.bind(null, id);
  const boundCorrective = recordCorrectiveAction.bind(null, id);
  const boundClose = closeNonRoutineReport.bind(null, id);
  const boundAddComponent = addComponentChange.bind(null, id);
  const relatedOrderCode = report.work_order_id ? `OT-${String(workOrdersById.get(report.work_order_id) ?? "").padStart(5, "0")}` : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <NonRoutinePrintSheet report={report} components={components} personnelById={personnelById} relatedOrderCode={relatedOrderCode} />
        <div className="print:hidden">
        <SectionHeader
          eyebrow="Mantenimiento"
          title={`Reporte No Rutina NR-${String(report.sequence_number).padStart(5, "0")}`}
          description="Formulario AS-09 digital. Registra la acción correctiva y luego el cierre por inspección — cada paso queda atribuido a una persona específica."
          icon={AlertOctagon}
        />

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <StatusPill tone={STATUS_TONE[report.status] ?? "neutral"}>{report.status}</StatusPill>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Link className="hsv-secondary-button !px-3 !py-1.5 text-xs" href={`/non-routine/${id}/edit`}>
              Editar datos
            </Link>
            <form action={boundStatus} className="flex items-center gap-2">
              <select className="hsv-control !w-auto !py-1.5 text-xs" name="status" defaultValue={report.status}>
                {nonRoutineStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button className="hsv-ghost-button !px-2 !py-1 text-xs" type="submit">
                Cambiar estado
              </button>
            </form>
            <PrintButton />
            <a className="hsv-secondary-button !px-3 !py-1.5 text-xs" href={`/non-routine/${id}/export`}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar
            </a>
          </div>
        </div>

        <Panel className="mb-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Aeronave</p>
              <p className="text-sm text-ink">
                {report.helicopter_registration ? (
                  <Link className="text-aviation-teal hover:underline" href={`/helicopters/${report.helicopter_registration}`}>
                    {report.helicopter_registration}
                  </Link>
                ) : (
                  report.aircraft_model || "—"
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Orden de trabajo relacionada</p>
              <p className="text-sm text-ink">
                {report.work_order_id ? (
                  <Link className="text-aviation-teal hover:underline" href={`/work-orders/${report.work_order_id}`}>
                    OT-{String(workOrdersById.get(report.work_order_id) ?? "").padStart(5, "0")}
                  </Link>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Horas totales / Fecha</p>
              <p className="text-sm text-ink">
                {report.total_time_hours != null ? `${report.total_time_hours} hrs` : "—"} · {report.report_date}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Encontrado por</p>
              <p className="text-sm text-ink">
                {openedBy ? `${openedBy.full_name}${openedBy.license_number ? ` (Lic. ${openedBy.license_number})` : ""}` : "Sin asignar"}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase text-ink-subtle">Discrepancia</p>
            <p className="mt-1 rounded-md border border-line bg-canvas-muted/40 p-3 text-sm text-ink">{report.discrepancy}</p>
          </div>
          {report.manual_reference ? (
            <p className="mt-2 text-xs text-ink-subtle">Referencia: {report.manual_reference}</p>
          ) : null}
          {report.notes ? <p className="mt-2 text-xs text-ink-subtle">{report.notes}</p> : null}
        </Panel>

        <Panel className="mb-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">Acción correctiva</h2>
          {report.corrective_action ? (
            <div>
              <p className="rounded-md border border-line bg-canvas-muted/40 p-3 text-sm text-ink">{report.corrective_action}</p>
              <p className="mt-2 text-xs text-ink-subtle">
                Corregido por {correctedBy?.full_name ?? "—"}
                {correctedBy?.license_number ? ` (Lic. ${correctedBy.license_number})` : ""}
              </p>
            </div>
          ) : (
            <form action={boundCorrective} className="grid gap-3 print:hidden">
              <textarea className="hsv-textarea" name="correctiveAction" rows={3} required placeholder="Describe qué se hizo para corregir la discrepancia" />
              <div className="flex flex-wrap items-center gap-2">
                <select className="hsv-control !w-auto" name="correctedByPersonnelId" required defaultValue="">
                  <option value="" disabled>
                    ¿Quién hizo la corrección?
                  </option>
                  {personnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                      {p.license_number ? ` (Lic. ${p.license_number})` : ""}
                    </option>
                  ))}
                </select>
                <button className="hsv-secondary-button" type="submit">
                  Guardar corrección
                </button>
              </div>
            </form>
          )}
        </Panel>

        <Panel className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Control de Componente (opcional)</h2>
          </div>
          <div className="grid gap-2">
            {components.map((c) => {
              const boundDelete = deleteComponentChange.bind(null, c.id, id);
              return (
                <div key={c.id} className="rounded-md border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{c.description}</p>
                      <p className="text-xs text-ink-subtle">
                        {c.part_number ? `P/N ${c.part_number} · ` : ""}
                        {c.serial_removed ? `S/N removido ${c.serial_removed}` : "S/N removido —"} ·{" "}
                        {c.serial_installed ? `S/N instalado ${c.serial_installed}` : "S/N instalado —"}
                      </p>
                    </div>
                    <form action={boundDelete} className="print:hidden">
                      <button className="hsv-ghost-button !px-2 !py-1 text-[11px] text-status-red" type="submit">
                        Quitar
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
            {!components.length ? <p className="hsv-empty-state">Sin cambios de componente registrados en este reporte.</p> : null}
          </div>

          <form action={boundAddComponent} className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-2 print:hidden">
            <input className="hsv-control sm:col-span-2" name="description" placeholder="Componente, ej. Bomba de combustible" required />
            <input className="hsv-control" name="partNumber" placeholder="P/N" />
            <input className="hsv-control" name="serialRemoved" placeholder="S/N removido" />
            <input className="hsv-control" name="serialInstalled" placeholder="S/N instalado" />
            <div>
              <button className="hsv-secondary-button" type="submit">
                Agregar componente
              </button>
            </div>
          </form>
        </Panel>

        <Panel>
          <h2 className="mb-3 text-sm font-semibold text-ink">Cierre por inspección</h2>
          {report.status === "Cerrada" ? (
            <p className="text-sm text-status-green">
              Cerrado por {inspector?.full_name ?? "—"} el {report.completed_at}
            </p>
          ) : !report.corrective_action ? (
            <p className="text-sm text-ink-subtle">Registra primero la acción correctiva antes de poder cerrar el reporte.</p>
          ) : (
            <form action={boundClose} className="flex flex-wrap items-center gap-2 print:hidden">
              <select className="hsv-control !w-auto" name="inspectorPersonnelId" required defaultValue="">
                <option value="" disabled>
                  Selecciona quién inspecciona y cierra
                </option>
                {personnel.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
              <button className="hsv-primary-button" type="submit">
                Cerrar reporte
              </button>
            </form>
          )}
        </Panel>

        <Panel className="mt-5 print:hidden">
          <h2 className="text-sm font-semibold text-ink">Zona de riesgo</h2>
          <p className="mt-1 text-sm text-ink-subtle">Archivar quita este reporte de la lista principal, pero conserva su historial.</p>
          <div className="mt-4">
            <form action={boundArchive}>
              <button className="hsv-danger-button" type="submit">
                Archivar reporte
              </button>
            </form>
          </div>
        </Panel>
        </div>
      </div>
    </AppShell>
  );
}
