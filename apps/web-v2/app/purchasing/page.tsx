import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updatePurchaseRequestStatus, updatePurchaseRequestPriority } from "@/app/purchasing/actions";
import { purchaseRequestStatuses, openPurchaseRequestStatuses } from "@/app/purchasing/constants";

export const dynamic = "force-dynamic";

type PurchasingPageProps = {
  searchParams: Promise<{ registration?: string; campaign?: string }>;
};

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
  lead_time_days: number | null;
  priority: string | null;
  notes: string | null;
  created_at: string;
  vessels: { id: string; name: string } | null;
  campaigns: { id: string; code: string | null; name: string } | null;
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

export default async function PurchasingPage({ searchParams }: PurchasingPageProps) {
  const { registration: selectedRegistration, campaign: selectedCampaignId } = await searchParams;

  let query = supabase
    .from("purchase_requests")
    .select(
      "id, supplier, item_name, part_number, quantity, unit_cost, currency, related_helicopter, related_maintenance_event, status, lead_time_days, priority, notes, created_at, vessels:related_vessel_id(id, name), campaigns:related_campaign_id(id, code, name)"
    )
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (selectedRegistration) query = query.eq("related_helicopter", selectedRegistration);
  if (selectedCampaignId) query = query.eq("related_campaign_id", selectedCampaignId);

  const [{ data, error }, { data: helicopterData }, { data: campaignData }] = await Promise.all([
    query,
    supabase.from("helicopters").select("registration").eq("archived", false).order("registration"),
    supabase
      .from("campaigns")
      .select("id, code, name, vessels:vessel_id(name)")
      .eq("archived", false)
      .order("start_date", { ascending: false })
  ]);

  const requests = ((data ?? []) as unknown as PurchaseRequestRow[]);
  const helicopters = (helicopterData ?? []) as { registration: string }[];
  const campaignOptions = (campaignData ?? []) as unknown as { id: string; code: string | null; name: string; vessels: { name: string } | null }[];
  const hasFilters = Boolean(selectedRegistration || selectedCampaignId);
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
            <div className="flex flex-wrap gap-2">
              <Link className="hsv-primary-button" href="/purchasing/new">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Crear pedido manual
              </Link>
              <Link className="hsv-secondary-button" href="/invoices/new">
                Subir factura
              </Link>
            </div>
          </div>

          <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-canvas-muted p-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-ink-subtle">Helicóptero</label>
              <select name="registration" defaultValue={selectedRegistration ?? ""} className="hsv-control !py-1.5 text-sm">
                <option value="">Todos</option>
                {helicopters.map((h) => (
                  <option key={h.registration} value={h.registration}>
                    {h.registration}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-ink-subtle">Faena</label>
              <select name="campaign" defaultValue={selectedCampaignId ?? ""} className="hsv-control !py-1.5 text-sm">
                <option value="">Todas</option>
                {campaignOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.code || c.name) + (c.vessels?.name ? ` — ${c.vessels.name}` : "")}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="hsv-secondary-button !py-1.5 text-sm">
              Filtrar
            </button>
            {hasFilters ? (
              <Link href="/purchasing" className="text-sm font-semibold text-aviation-teal hover:underline">
                Quitar filtros
              </Link>
            ) : null}
          </form>

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
                  <th className="hsv-table-th">Lead time / Prioridad</th>
                  <th className="hsv-table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {requests.map((request) => {
                  const boundUpdate = updatePurchaseRequestStatus.bind(null, request.id);
                  const boundPriority = updatePurchaseRequestPriority.bind(null, request.id);
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
                        {request.campaigns ? (
                          <>
                            <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/campaigns/${request.campaigns.id}`}>
                              {request.campaigns.code || request.campaigns.name}
                            </Link>
                            {request.vessels?.name ? <p className="mt-0.5 text-xs text-ink-subtle">{request.vessels.name}</p> : null}
                          </>
                        ) : (
                          [request.vessels?.name, request.related_maintenance_event].filter(Boolean).join(" · ") || "—"
                        )}
                      </td>
                      <td className="hsv-table-cell text-ink-muted">
                        {isUrgent ? <span className="mr-1 font-semibold text-status-red">URGENTE ·</span> : null}
                        {request.notes || "—"}
                      </td>
                      <td className="hsv-table-cell">
                        <form action={boundPriority} className="flex flex-col gap-1">
                          <input
                            className="hsv-control !w-28 !py-1 text-xs"
                            type="number"
                            step="1"
                            name="leadTimeDays"
                            placeholder="Días"
                            defaultValue={request.lead_time_days ?? ""}
                          />
                          <input
                            className="hsv-control !w-28 !py-1 text-xs"
                            name="priority"
                            placeholder="Prioridad"
                            defaultValue={request.priority ?? ""}
                          />
                          <button className="hsv-ghost-button !px-2 !py-0.5 text-[11px]" type="submit">
                            Guardar
                          </button>
                        </form>
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
                    <td className="hsv-empty-state" colSpan={9}>
                      {hasFilters
                        ? "No hay pedidos con este filtro."
                        : 'Todavía no hay pedidos. Se crean automáticamente al importar la hoja "PEDIDOS" del reporte semanal, o puedes crear uno manual.'}
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
