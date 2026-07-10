import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Boxes, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { recordStockMovement } from "@/app/vessels/[id]/inventory/actions";
import { stockMovementTypes } from "@/app/vessels/[id]/inventory/constants";

type VesselInventoryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VesselInventoryPage({ params }: VesselInventoryPageProps) {
  const { id } = await params;
  const { data: vessel } = await supabase.from("vessels").select("id, name").eq("id", id).maybeSingle();
  if (!vessel) notFound();

  const { data: items } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("vessel_id", id)
    .eq("archived", false)
    .order("item_name");

  const list = items ?? [];
  const lowStockCount = list.filter((item) => Number(item.quantity) < Number(item.minimum_stock)).length;
  const totalUnits = list.reduce((sum, item) => sum + Number(item.quantity), 0);

  const boundRecordMovement = recordStockMovement.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow={vessel.name}
          title="Bodega del barco"
          description="Inventario de componentes, consumibles y herramientas asignado a este barco."
          icon={Boxes}
        />

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Ítems en bodega</p>
            <p className="mt-1 text-2xl font-bold text-ink">{list.length}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Unidades totales</p>
            <p className="mt-1 text-2xl font-bold text-ink">{totalUnits}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Bajo mínimo</p>
            <p className={`mt-1 text-2xl font-bold ${lowStockCount > 0 ? "text-status-red" : "text-ink"}`}>{lowStockCount}</p>
          </Panel>
        </div>

        <Panel className="mb-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-ink-muted" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Ítems</h2>
            </div>
            <Link className="hsv-primary-button" href={`/vessels/${id}/inventory/new`}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar ítem
            </Link>
          </div>
          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Ítem</th>
                  <th className="hsv-table-th">Tipo</th>
                  <th className="hsv-table-th">P/N</th>
                  <th className="hsv-table-th">Cantidad</th>
                  <th className="hsv-table-th">Mínimo</th>
                  <th className="hsv-table-th">Ubicación</th>
                  <th className="hsv-table-th">Helicóptero</th>
                  <th className="hsv-table-th">Vencimiento</th>
                  <th className="hsv-table-th">Registrar movimiento</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {list.map((item) => {
                  const isLow = Number(item.quantity) < Number(item.minimum_stock);
                  return (
                    <tr key={item.id} className="hsv-table-row">
                      <td className="hsv-table-cell">
                        <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/vessels/${id}/inventory/${item.id}/edit`}>
                          {item.item_name}
                        </Link>
                        {item.serial_number ? <p className="text-xs text-ink-subtle">S/N {item.serial_number}</p> : null}
                      </td>
                      <td className="hsv-table-cell text-ink-muted">{item.item_type}</td>
                      <td className="hsv-table-cell hsv-technical-value">{item.part_number || "—"}</td>
                      <td className="hsv-table-cell">
                        <span className={`hsv-technical-value font-semibold ${isLow ? "text-status-red" : "text-ink"}`}>
                          {Number(item.quantity)} {item.unit_of_measure}
                        </span>
                        {isLow ? (
                          <span className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-status-red">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            Bajo
                          </span>
                        ) : null}
                      </td>
                      <td className="hsv-table-cell hsv-technical-value text-ink-muted">{Number(item.minimum_stock)}</td>
                      <td className="hsv-table-cell text-ink-muted">{item.storage_location || "—"}</td>
                      <td className="hsv-table-cell text-ink-muted">{item.related_helicopter || "—"}</td>
                      <td className="hsv-table-cell text-ink-muted">{item.expiration_date || "—"}</td>
                      <td className="hsv-table-cell">
                        <form action={boundRecordMovement} className="flex flex-wrap items-center gap-1.5">
                          <input type="hidden" name="inventoryItemId" value={item.id} />
                          <select className="hsv-control !w-auto !py-1 text-xs" name="movementType" defaultValue="Used">
                            {stockMovementTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          <input className="hsv-control !w-16 !py-1 text-xs" type="number" step="0.01" name="quantity" placeholder="Cant." required />
                          <button className="hsv-secondary-button !px-2 !py-1 text-xs" type="submit">
                            Aplicar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {!list.length ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={9}>
                      Todavía no hay ítems en la bodega de este barco.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <p className="text-xs leading-6 text-ink-subtle">
            Cada movimiento (Recibido, Usado, Instalado, Consumido, Transferido, Ajustado) queda registrado y ajusta automáticamente
            la cantidad disponible — así queda un historial de por qué cambió el número, igual que en la hoja{" "}
            <span className="hsv-technical-value font-semibold text-ink">CONSUMO MATERIALES</span> del reporte semanal que envían los técnicos.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
