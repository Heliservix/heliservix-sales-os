import { notFound } from "next/navigation";
import { Boxes } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updateInventoryItem, archiveInventoryItem, deleteInventoryItem } from "@/app/vessels/[id]/inventory/actions";
import { inventoryItemTypes } from "@/app/vessels/[id]/inventory/constants";

type EditInventoryItemPageProps = {
  params: Promise<{ id: string; itemId: string }>;
};

export default async function EditInventoryItemPage({ params }: EditInventoryItemPageProps) {
  const { id, itemId } = await params;
  const [{ data: vessel }, { data: item }, { data: helicopters }] = await Promise.all([
    supabase.from("vessels").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("inventory_items").select("*").eq("id", itemId).maybeSingle(),
    supabase.from("helicopters").select("registration").eq("archived", false).order("registration")
  ]);
  if (!vessel || !item || item.vessel_id !== id) notFound();

  const boundUpdate = updateInventoryItem.bind(null, id, itemId);
  const boundArchive = archiveInventoryItem.bind(null, id, itemId);
  const boundDelete = deleteInventoryItem.bind(null, id, itemId);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow={`Bodega — ${vessel.name}`}
          title={`Editar ${item.item_name}`}
          description={`Cantidad actual: ${Number(item.quantity)} ${item.unit_of_measure ?? ""}`}
          icon={Boxes}
        />

        <Panel className="mb-5">
          <p className="text-xs text-ink-subtle">
            La cantidad no se edita aquí directamente — se ajusta registrando un movimiento (Recibido, Usado, Instalado, etc.) desde
            la lista de la bodega, para dejar siempre un historial de por qué cambió.
          </p>
        </Panel>

        <Panel>
          <form action={boundUpdate} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Nombre del ítem
              <input className="hsv-control" name="itemName" defaultValue={item.item_name} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Tipo
              <select className="hsv-control" name="itemType" defaultValue={item.item_type}>
                {inventoryItemTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Helicóptero relacionado
              <select className="hsv-control" name="relatedHelicopter" defaultValue={item.related_helicopter ?? ""}>
                <option value="">Sin asignar (stock general del barco)</option>
                {(helicopters ?? []).map((h) => (
                  <option key={h.registration} value={h.registration}>{h.registration}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              P/N
              <input className="hsv-control" name="partNumber" defaultValue={item.part_number ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              S/N
              <input className="hsv-control" name="serialNumber" defaultValue={item.serial_number ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Lote / Batch
              <input className="hsv-control" name="lotBatch" defaultValue={item.lot_batch ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Unidad de medida
              <input className="hsv-control" name="unitOfMeasure" defaultValue={item.unit_of_measure ?? "ea"} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Mínimo de stock
              <input className="hsv-control" type="number" step="0.01" name="minimumStock" defaultValue={item.minimum_stock} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Ubicación en bodega
              <input className="hsv-control" name="storageLocation" defaultValue={item.storage_location ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Condición
              <input className="hsv-control" name="condition" defaultValue={item.condition ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha de vencimiento
              <input className="hsv-control" type="date" name="expirationDate" defaultValue={item.expiration_date ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" defaultValue={item.notes ?? ""} />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar cambios
              </button>
            </div>
          </form>
        </Panel>

        <Panel className="mt-5">
          <h2 className="text-sm font-semibold text-ink">Zona de riesgo</h2>
          <p className="mt-1 text-sm text-ink-subtle">
            &ldquo;Quitar&rdquo; lo saca de la lista activa pero conserva su historial de movimientos (recomendado).
            &ldquo;Eliminar&rdquo; lo borra por completo — solo para errores de carga.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={boundArchive}>
              <button className="hsv-secondary-button" type="submit">
                Quitar de la bodega
              </button>
            </form>
            <form action={boundDelete}>
              <button className="hsv-danger-button" type="submit">
                Eliminar definitivamente
              </button>
            </form>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
