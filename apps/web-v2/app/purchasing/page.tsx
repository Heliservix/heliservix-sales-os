import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updatePurchaseRequestStatus } from "@/app/purchasing/actions";
import { purchaseRequestStatuses, openPurchaseRequestStatuses } from "@/app/purchasing/constants";

export const dynamic = "force-dynamic";

type PurchaseRequestRow = {
  id: string;
  supplier: string;
  item_name: string;
  part_number: string | null;
  quantity: number;
  unit_cost: number;
  currency: string;
  related_helicopter: string | null;
  related_maintenance_event: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  vessels: { id: string; name: string } | null;
};

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "teal" | "red" | "neutral"> = {
  Requested: "amber",
  Quoted: "blue",
  Approved: "blue",
  Ordered: "teal",
  Received: "teal",
  "Shipped to vessel": "teal",
  Stored: "green",
  Installed: "green",
  Consumed: "neutral",
  Closed: "neutral"
};

export default async function PurchasingPage() {
  const { data, error } = await supabase
    .from("purchase_requests")
    .select(
      "id, supplier, item_name, part_number, quantity, unit_cost, currency, related_helicopter, related_maintenance_event, status, notes, created_at, vessels:related_vessel_id(id, name)"
    )
    .eq("archived", false)
    .order("created_at", { ascending: false });

  const requests = ((data ?? []) as unknown as PurchaseRequestRow[]);
  const open = requests.filter((r) => (openPurchaseRequestStatuses as readonly string[]).includes(r.status));
  const urgent = open.filter((r) => /urgen/i.test(r.notes ?? ""));

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Cadena de suministro"
          title="Compras"
          description="Pedidos generados desde el reporte semanal (hoja PEDIDOS) y pedidos manuales. AURA usa este estado para no recomendar comprar algo que ya está en camino."
          icon={ShoppingCart}
        />

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Pedidos abiertos</p>
            <p className="mt-1 text-2xl font-bold text-ink">{open.length}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Marcados urgentes</p>
            <p className={`mt-1 text-2xl font-bold ${urgent.length > 0 ? "text-status-red" : "text-ink"}`}>{urgent.length}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Total registrados</p>
            <p className="mt-1 text-2xl font-bold text-ink">{requests.length}</p>
          </Panel>
        </div>

        <Panel>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-ink-muted" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Pedidos</h2>
            </div>
            <Link className="hsv-primary-button" href="/purchasing/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Crear pedido manual
            </Link>
          </div>

          {error ? <div className="hsv-error-banner">No se pudo conectar con la base de datos: {error.message}.</div> : null}

          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Ítem</th>
                  <th className="hsv-table-th">P/N</th>
                  <th className="hsv-table-th">Cantidad</th>
                  <th className="hsv-table-th">Proveedor</th>
                  <th className="hsv-table-th">Helicóptero</th>
                  <th className="hsv-table-th">Barco / Marea</th>
                  <th className="hsv-table-th">Notas</th>
                  <th className="hsv-table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {requests.map((request) => {
                  const boundUpdate = updatePurchaseRequestStatus.bind(null, request.id);
                  const isUrgent = /urgen/i.test(request.notes ?? "");
                  return (
                    <tr key={request.id} className="hsv-table-row">
                      <td className="hsv-table-cell font-semibold text-ink">{request.item_name}</td>
                      <td className="hsv-table-cell hsv-technical-value">{request.part_number || "—"}</td>
                      <td className="hsv-table-cell hsv-technical-value">{Number(request.quantity)}</td>
                      <td className="hsv-table-cell text-ink-muted">{request.supplier}</td>
                      <td className="hsv-table-cell text-ink-muted">
                        {request.related_helicopter ? (
                          <Link className="hover:text-aviation-teal" href={`/helicopters/${request.related_helicopter}`}>
                            {request.related_helicopter}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="hsv-table-cell text-ink-muted">
                        {[request.vessels?.name, request.related_maintenance_event].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="hsv-table-cell text-ink-muted">
                        {isUrgent ? <span className="mr-1 font-semibold text-status-red">URGENTE ·</span> : null}
                        {request.notes || "—"}
                      </td>
                      <td className="hsv-table-cell">
                        <form action={boundUpdate} className="flex items-center gap-2">
                          <StatusPill tone={STATUS_TONE[request.status] ?? "neutral"}>{request.status}</StatusPill>
                          <select className="hsv-control !w-auto !py-1 text-xs" name="status" defaultValue={request.status}>
                            {purchaseRequestStatuses.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          <button className="hsv-secondary-button !px-2 !py-1 text-xs" type="submit">
                            Actualizar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {!requests.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={8}>
                      Todavía no hay pedidos. Se crean automáticamente al importar la hoja &ldquo;PEDIDOS&rdquo; del reporte
                      semanal, o puedes crear uno manual.
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
