import { notFound } from "next/navigation";
import { Boxes } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { createInventoryItem } from "@/app/vessels/[id]/inventory/actions";
import { inventoryItemTypes } from "@/app/vessels/[id]/inventory/constants";

type NewInventoryItemPageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewInventoryItemPage({ params }: NewInventoryItemPageProps) {
  const { id } = await params;
  const [{ data: vessel }, { data: helicopters }] = await Promise.all([
    supabase.from("vessels").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("helicopters").select("registration").eq("archived", false).order("registration")
  ]);
  if (!vessel) notFound();

  const boundCreate = createInventoryItem.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow={`Bodega — ${vessel.name}`}
          title="Agregar ítem a la bodega"
          description="Componentes, consumibles, aceites, filtros o herramientas asignados a este barco."
          icon={Boxes}
        />
        <Panel>
          <form action={boundCreate} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Nombre del ítem
              <input className="hsv-control" name="itemName" placeholder="Filtro de aceite" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Tipo
              <select className="hsv-control" name="itemType" defaultValue="Other">
                {inventoryItemTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Helicóptero relacionado
              <select className="hsv-control" name="relatedHelicopter" defaultValue="">
                <option value="">Sin asignar (stock general del barco)</option>
                {(helicopters ?? []).map((h) => (
                  <option key={h.registration} value={h.registration}>{h.registration}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              P/N
              <input className="hsv-control" name="partNumber" placeholder="C006-7" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              S/N
              <input className="hsv-control" name="serialNumber" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Lote / Batch
              <input className="hsv-control" name="lotBatch" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Unidad de medida
              <input className="hsv-control" name="unitOfMeasure" defaultValue="ea" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Cantidad inicial
              <input className="hsv-control" type="number" step="0.01" name="quantity" defaultValue={0} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Mínimo de stock
              <input className="hsv-control" type="number" step="0.01" name="minimumStock" defaultValue={0} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Ubicación en bodega
              <input className="hsv-control" name="storageLocation" placeholder="Estante A-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Condición
              <input className="hsv-control" name="condition" placeholder="Nuevo / Overhaul / Usado" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha de vencimiento
              <input className="hsv-control" type="date" name="expirationDate" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar ítem
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
