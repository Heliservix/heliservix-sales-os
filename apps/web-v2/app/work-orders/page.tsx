import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { openWorkOrderStatuses } from "@/app/work-orders/constants";
import { getTechnicianScope } from "@/lib/technician-scope";

export const dynamic = "force-dynamic";

type WorkOrderRow = {
  id: string;
  sequence_number: number;
  client_name: string | null;
  helicopter_registration: string | null;
  aircraft_registration: string | null;
  status: string;
  opened_at: string;
  lead_technician_id: string | null;
};

type ItemRow = { work_order_id: string; is_complete: boolean };

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "teal" | "red" | "neutral"> = {
  Abierta: "amber",
  "En Progreso": "blue",
  Completada: "teal",
  Cerrada: "green"
};

export default async function WorkOrdersPage() {
  const { scopedRegistration } = await getTechnicianScope();

  const [{ data, error }, { data: itemData }, { data: personnelData }] = await Promise.all([
    (() => {
      let query = supabase
        .from("work_orders")
        .select("id, sequence_number, client_name, helicopter_registration, aircraft_registration, status, opened_at, lead_technician_id")
        .eq("archived", false);
      if (scopedRegistration) query = query.eq("helicopter_registration", scopedRegistration);
      return query.order("created_at", { ascending: false });
    })(),
    supabase.from("work_order_items").select("work_order_id, is_complete").eq("archived", false),
    supabase.from("personnel").select("id, full_name")
  ]);

  const orders = (data ?? []) as WorkOrderRow[];
  const orderIds = new Set(orders.map((o) => o.id));
  // Cuando está acotado, "orders" ya salió filtrado por aeronave desde la
  // consulta — se filtran también los ítems para que "tareas pendientes" no
  // cuente trabajo de otras órdenes que el técnico ni puede ver.
  const items = scopedRegistration
    ? ((itemData ?? []) as ItemRow[]).filter((i) => orderIds.has(i.work_order_id))
    : ((itemData ?? []) as ItemRow[]);
  const personnelById = new Map((personnelData ?? []).map((p) => [p.id, p.full_name]));

  const progressByOrder = new Map<string, { done: number; total: number }>();
  for (const item of items) {
    const entry = progressByOrder.get(item.work_order_id) ?? { done: 0, total: 0 };
    entry.total += 1;
    if (item.is_complete) entry.done += 1;
    progressByOrder.set(item.work_order_id, entry);
  }

  const openCount = orders.filter((o) => (openWorkOrderStatuses as readonly string[]).includes(o.status)).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px]">
        <SectionHeader
          eyebrow="Mantenimiento"
          title="Órdenes de Trabajo"
          description='Formulario HS-06 digitalizado — crea la orden, arma el checklist de tareas, y cada técnico marca lo suyo a medida que avanza. Queda registrado quién hizo cada trabajo.'
          icon={Wrench}
        />

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Órdenes abiertas</p>
            <p className="mt-1 text-2xl font-bold text-ink">{openCount}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Total registradas</p>
            <p className="mt-1 text-2xl font-bold text-ink">{orders.length}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Tareas pendientes (todas las órdenes)</p>
            <p className="mt-1 text-2xl font-bold text-ink">{items.filter((i) => !i.is_complete).length}</p>
          </Panel>
        </div>

        <Panel>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-ink-muted" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Órdenes</h2>
            </div>
            <Link className="hsv-primary-button" href="/work-orders/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Crear Orden de Reparación
            </Link>
          </div>

          {error ? <div className="hsv-error-banner">No se pudo conectar con la base de datos: {error.message}.</div> : null}

          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">N° Orden</th>
                  <th className="hsv-table-th">Cliente</th>
                  <th className="hsv-table-th">Aeronave</th>
                  <th className="hsv-table-th">Técnico encargado</th>
                  <th className="hsv-table-th">Progreso</th>
                  <th className="hsv-table-th">Abierta</th>
                  <th className="hsv-table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {orders.map((order) => {
                  const progress = progressByOrder.get(order.id);
                  return (
                    <tr key={order.id} className="hsv-table-row">
                      <td className="hsv-table-cell hsv-technical-value">
                        <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/work-orders/${order.id}`}>
                          OT-{String(order.sequence_number).padStart(5, "0")}
                        </Link>
                      </td>
                      <td className="hsv-table-cell text-ink-muted">{order.client_name || "—"}</td>
                      <td className="hsv-table-cell text-ink-muted">
                        {order.helicopter_registration ? (
                          <Link className="hover:text-aviation-teal" href={`/helicopters/${order.helicopter_registration}`}>
                            {order.helicopter_registration}
                          </Link>
                        ) : (
                          order.aircraft_registration || "—"
                        )}
                      </td>
                      <td className="hsv-table-cell text-ink-muted">
                        {order.lead_technician_id ? personnelById.get(order.lead_technician_id) ?? "—" : "—"}
                      </td>
                      <td className="hsv-table-cell hsv-technical-value">
                        {progress ? `${progress.done} / ${progress.total} tareas` : "Sin tareas"}
                      </td>
                      <td className="hsv-table-cell text-ink-muted">{order.opened_at}</td>
                      <td className="hsv-table-cell">
                        <StatusPill tone={STATUS_TONE[order.status] ?? "neutral"}>{order.status}</StatusPill>
                      </td>
                    </tr>
                  );
                })}
                {!orders.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={7}>
                      Todavía no hay órdenes de trabajo — crea la primera arriba.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
