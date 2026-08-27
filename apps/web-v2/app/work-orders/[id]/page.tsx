import Link from "next/link";
import { notFound } from "next/navigation";
import { Wrench, CheckCircle2, Circle, Download } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import {
  addWorkOrderItem,
  completeWorkOrderItem,
  undoWorkOrderItem,
  deleteWorkOrderItem,
  markTechnicianComplete,
  approveWorkOrder,
  updateWorkOrderStatus,
  archiveWorkOrder
} from "@/app/work-orders/actions";
import { workOrderStatuses } from "@/app/work-orders/constants";
import { PrintButton } from "@/app/reports/faena/[id]/print-button";
import { WorkOrderPrintSheet } from "@/app/work-orders/print-sheet";

export const dynamic = "force-dynamic";

type WorkOrderDetailProps = { params: Promise<{ id: string }> };

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "teal" | "red" | "neutral"> = {
  Abierta: "amber",
  "En Progreso": "blue",
  Completada: "teal",
  Cerrada: "green"
};

export default async function WorkOrderDetailPage({ params }: WorkOrderDetailProps) {
  const { id } = await params;

  const [{ data: order }, { data: itemData }, { data: personnelData }] = await Promise.all([
    supabase.from("work_orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("work_order_items").select("*").eq("work_order_id", id).eq("archived", false).order("position", { ascending: true }),
    supabase.from("personnel").select("id, full_name, role, license_number, license_type").eq("archived", false).order("full_name")
  ]);

  if (!order) notFound();

  const items = itemData ?? [];
  const personnel = personnelData ?? [];
  const personnelById = new Map(personnel.map((p) => [p.id, p]));
  const mechanics = personnel.filter((p) => p.role === "Mecánico");

  const doneCount = items.filter((i) => i.is_complete).length;
  const totalCount = items.length;
  const progressPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const leadTechnician = order.lead_technician_id ? personnelById.get(order.lead_technician_id) : null;
  const manager = order.manager_approved_by ? personnelById.get(order.manager_approved_by) : null;

  const boundArchive = archiveWorkOrder.bind(null, id);
  const boundAddItem = addWorkOrderItem.bind(null, id);
  const boundMarkTechComplete = markTechnicianComplete.bind(null, id);
  const boundApprove = approveWorkOrder.bind(null, id);
  const boundStatus = updateWorkOrderStatus.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <WorkOrderPrintSheet order={order} items={items} personnelById={personnelById} />
        <div className="print:hidden">
        <SectionHeader
          eyebrow="Mantenimiento"
          title={`Orden OT-${String(order.sequence_number).padStart(5, "0")}`}
          description="Formulario HS-06 digital. Marca cada tarea a medida que la termines — queda registrado tu nombre y tu N° de licencia."
          icon={Wrench}
        />

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <StatusPill tone={STATUS_TONE[order.status] ?? "neutral"}>{order.status}</StatusPill>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Link className="hsv-secondary-button !px-3 !py-1.5 text-xs" href={`/work-orders/${id}/edit`}>
              Editar datos
            </Link>
            <form action={boundStatus} className="flex items-center gap-2">
              <select className="hsv-control !w-auto !py-1.5 text-xs" name="status" defaultValue={order.status}>
                {workOrderStatuses.map((s) => (
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
            <a className="hsv-secondary-button !px-3 !py-1.5 text-xs" href={`/work-orders/${id}/export`}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar
            </a>
          </div>
        </div>

        <Panel className="mb-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Cliente</p>
              <p className="text-sm text-ink">{order.client_name || "—"}</p>
              <p className="text-xs text-ink-subtle">{[order.client_address, order.client_phone].filter(Boolean).join(" · ") || ""}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Aeronave</p>
              <p className="text-sm text-ink">
                {order.helicopter_registration ? (
                  <Link className="text-aviation-teal hover:underline" href={`/helicopters/${order.helicopter_registration}`}>
                    {order.helicopter_registration}
                  </Link>
                ) : (
                  order.aircraft_registration || "—"
                )}{" "}
                {order.aircraft_type ? `· ${order.aircraft_type}` : ""}
              </p>
              <p className="text-xs text-ink-subtle">S/N {order.aircraft_serial || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Motor</p>
              <p className="text-sm text-ink">{[order.engine_type, order.engine_model].filter(Boolean).join(" ") || "—"}</p>
              <p className="text-xs text-ink-subtle">S/N {order.engine_serial || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Técnico encargado</p>
              <p className="text-sm text-ink">
                {leadTechnician ? `${leadTechnician.full_name}${leadTechnician.license_number ? ` (Lic. ${leadTechnician.license_number})` : ""}` : "Sin asignar"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Horas estimadas / Material / Contrato</p>
              <p className="text-sm text-ink">
                {order.estimated_hours != null ? `${order.estimated_hours} hrs` : "—"} · {order.material_notes || "—"} · {order.contract_number || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Abierta</p>
              <p className="text-sm text-ink">{order.opened_at}</p>
            </div>
          </div>
          {order.notes ? <p className="mt-3 rounded-md border border-line bg-canvas-muted/40 p-3 text-xs text-ink-subtle">{order.notes}</p> : null}
        </Panel>

        <Panel className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Checklist de trabajo</h2>
            <p className="text-xs text-ink-subtle">
              {doneCount} / {totalCount} completadas ({progressPct}%)
            </p>
          </div>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-canvas-muted">
            <div className="h-full rounded-full bg-aviation-teal transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="grid gap-2">
            {items.map((item, index) => {
              const completedBy = item.completed_by_personnel_id ? personnelById.get(item.completed_by_personnel_id) : null;
              const boundComplete = completeWorkOrderItem.bind(null, item.id, id);
              const boundUndo = undoWorkOrderItem.bind(null, item.id, id);
              const boundDelete = deleteWorkOrderItem.bind(null, item.id, id);
              const showSectionHeader = item.section_label && item.section_label !== items[index - 1]?.section_label;
              return (
                <div key={item.id}>
                  {showSectionHeader ? (
                    <p className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-ink-subtle first:mt-0">{item.section_label}</p>
                  ) : null}
                  <div className={`rounded-md border p-3 ${item.is_complete ? "border-status-green/30 bg-status-green/5" : "border-line"}`}>
                  <div className="flex items-start gap-3">
                    {item.is_complete ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-green" aria-hidden="true" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-ink-subtle" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${item.is_complete ? "text-ink-muted line-through" : "font-semibold text-ink"}`}>{item.description}</p>
                      {item.is_complete ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-xs text-ink-subtle">
                            Hecho por {completedBy?.full_name ?? "—"}
                            {completedBy?.license_number ? ` (Lic. ${completedBy.license_number})` : ""} el{" "}
                            {item.completed_at ? new Date(item.completed_at).toLocaleString("es-PA") : ""}
                          </p>
                          <form action={boundUndo} className="print:hidden">
                            <button className="hsv-ghost-button !px-2 !py-0.5 text-[11px]" type="submit">
                              Deshacer
                            </button>
                          </form>
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-2 print:hidden">
                          <form action={boundComplete} className="flex flex-wrap items-center gap-2">
                            <select className="hsv-control !w-auto !py-1 text-xs" name="personnelId" required defaultValue="">
                              <option value="" disabled>
                                ¿Quién hizo este trabajo?
                              </option>
                              {personnel.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.full_name}
                                  {p.license_number ? ` (Lic. ${p.license_number})` : ""}
                                </option>
                              ))}
                            </select>
                            <button className="hsv-secondary-button !px-2 !py-1 text-xs" type="submit">
                              Marcar hecho
                            </button>
                          </form>
                          <form action={boundDelete}>
                            <button className="hsv-ghost-button !px-2 !py-1 text-[11px] text-status-red" type="submit">
                              Quitar
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              );
            })}
            {!items.length ? <p className="hsv-empty-state">Esta orden todavía no tiene tareas — agrega la primera abajo.</p> : null}
          </div>

          <form action={boundAddItem} className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row print:hidden">
            <input className="hsv-control flex-1" name="description" placeholder="Nueva tarea, ej. Cambio de filtro de aceite" required />
            <button className="hsv-secondary-button" type="submit">
              Agregar tarea
            </button>
          </form>
        </Panel>

        <Panel>
          <h2 className="mb-3 text-sm font-semibold text-ink">Firmas (Formulario HS-06)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Técnico encargado</p>
              {order.technician_completed_at ? (
                <p className="mt-1 text-sm text-status-green">
                  Trabajo terminado el {new Date(order.technician_completed_at).toLocaleString("es-PA")}
                </p>
              ) : (
                <form action={boundMarkTechComplete} className="mt-2 print:hidden">
                  <button className="hsv-secondary-button" type="submit">
                    Marcar mi trabajo como terminado
                  </button>
                </form>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Gerente General — Heliser Vix Inc.</p>
              {order.manager_approved_at ? (
                <p className="mt-1 text-sm text-status-green">
                  Aprobado por {manager?.full_name ?? "—"} el {new Date(order.manager_approved_at).toLocaleString("es-PA")}
                </p>
              ) : (
                <form action={boundApprove} className="mt-2 flex flex-wrap items-center gap-2 print:hidden">
                  <select className="hsv-control !w-auto" name="managerId" required defaultValue="">
                    <option value="" disabled>
                      Selecciona quién aprueba
                    </option>
                    {personnel.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                  <button className="hsv-primary-button" type="submit">
                    Aprobar y cerrar orden
                  </button>
                </form>
              )}
            </div>
          </div>
        </Panel>

        <Panel className="mt-5 print:hidden">
          <h2 className="text-sm font-semibold text-ink">Zona de riesgo</h2>
          <p className="mt-1 text-sm text-ink-subtle">Archivar quita esta orden de la lista principal, pero conserva su historial.</p>
          <div className="mt-4">
            <form action={boundArchive}>
              <button className="hsv-danger-button" type="submit">
                Archivar orden
              </button>
            </form>
          </div>
        </Panel>
        </div>
      </div>
    </AppShell>
  );
}
