import Link from "next/link";
import { AlertTriangle, Boxes } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type InventoryRow = {
  id: string;
  item_name: string;
  item_type: string;
  part_number: string | null;
  quantity: number;
  minimum_stock: number;
  unit_of_measure: string | null;
  related_helicopter: string | null;
  vessel_id: string | null;
  vessels: { id: string; name: string } | null;
};

export default async function InventoryRollupPage() {
  const [{ data: items, error }, { data: vessels }] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("id, item_name, item_type, part_number, quantity, minimum_stock, unit_of_measure, related_helicopter, vessel_id, vessels(id, name)")
      .eq("archived", false)
      .order("item_name"),
    supabase.from("vessels").select("id, name").eq("archived", false).order("name")
  ]);

  const list = ((items ?? []) as unknown as InventoryRow[]);
  const lowStock = list.filter((item) => Number(item.quantity) < Number(item.minimum_stock));

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Cadena de suministro"
          title="Inventario — resumen de flota"
          description="Vista consolidada de todas las bodegas. Cada barco tiene su propia bodega — entra a un barco para registrar movimientos."
          icon={Boxes}
        />

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Barcos con bodega</p>
            <p className="mt-1 text-2xl font-bold text-ink">{vessels?.length ?? 0}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Ítems totales</p>
            <p className="mt-1 text-2xl font-bold text-ink">{list.length}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Bajo mínimo (todos los barcos)</p>
            <p className={`mt-1 text-2xl font-bold ${lowStock.length > 0 ? "text-status-red" : "text-ink"}`}>{lowStock.length}</p>
          </Panel>
        </div>

        <Panel className="mb-5">
          <div className="mb-4 flex items-center gap-2">
            <Boxes className="h-5 w-5 text-ink-muted" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Barcos</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {(vessels ?? []).map((vessel) => (
              <Link key={vessel.id} className="hsv-secondary-button" href={`/vessels/${vessel.id}/inventory`}>
                Bodega — {vessel.name}
              </Link>
            ))}
            {!vessels?.length ? <p className="text-sm text-ink-subtle">Todavía no hay barcos registrados.</p> : null}
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-status-red" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Bajo mínimo de stock</h2>
          </div>

          {error ? <div className="hsv-error-banner">No se pudo conectar con la base de datos: {error.message}.</div> : null}

          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Ítem</th>
                  <th className="hsv-table-th">Barco</th>
                  <th className="hsv-table-th">P/N</th>
                  <th className="hsv-table-th">Helicóptero</th>
                  <th className="hsv-table-th">Cantidad</th>
                  <th className="hsv-table-th">Mínimo</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {lowStock.map((item) => (
                  <tr key={item.id} className="hsv-table-row">
                    <td className="hsv-table-cell font-semibold text-ink">{item.item_name}</td>
                    <td className="hsv-table-cell text-ink-muted">
                      {item.vessels ? (
                        <Link className="hover:text-aviation-teal" href={`/vessels/${item.vessels.id}/inventory`}>
                          {item.vessels.name}
                        </Link>
                      ) : (
                        "Sin barco"
                      )}
                    </td>
                    <td className="hsv-table-cell hsv-technical-value">{item.part_number || "—"}</td>
                    <td className="hsv-table-cell text-ink-muted">{item.related_helicopter || "—"}</td>
                    <td className="hsv-table-cell hsv-technical-value font-semibold text-status-red">
                      {Number(item.quantity)} {item.unit_of_measure}
                    </td>
                    <td className="hsv-table-cell hsv-technical-value text-ink-muted">{Number(item.minimum_stock)}</td>
                  </tr>
                ))}
                {!lowStock.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={6}>
                      Ningún ítem está bajo su mínimo de stock en este momento.
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
