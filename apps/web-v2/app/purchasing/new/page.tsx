import { ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { createPurchaseRequest } from "@/app/purchasing/actions";
import { purchaseRequestStatuses } from "@/app/purchasing/constants";

export default async function NewPurchaseRequestPage() {
  const [{ data: helicopters }, { data: vessels }] = await Promise.all([
    supabase.from("helicopters").select("registration").eq("archived", false).order("registration"),
    supabase.from("vessels").select("id, name").eq("archived", false).order("name")
  ]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Compras"
          title="Crear pedido manual"
          description="Para pedidos que no vienen del reporte semanal (ej. compras planificadas por AURA o de oficina)."
          icon={ShoppingCart}
        />
        <Panel>
          <form action={createPurchaseRequest} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Ítem
              <input className="hsv-control" name="itemName" placeholder="Filtro de aceite" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              P/N
              <input className="hsv-control" name="partNumber" placeholder="CH48108-1" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Cantidad
              <input className="hsv-control" type="number" step="1" name="quantity" defaultValue={1} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Proveedor
              <input className="hsv-control" name="supplier" placeholder="Pendiente de asignar" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Estado
              <select className="hsv-control" name="status" defaultValue="Requested">
                {purchaseRequestStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Costo unitario
              <input className="hsv-control" type="number" step="0.01" name="unitCost" defaultValue={0} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Moneda
              <input className="hsv-control" name="currency" defaultValue="USD" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Helicóptero relacionado
              <select className="hsv-control" name="relatedHelicopter" defaultValue="">
                <option value="">Sin asignar</option>
                {(helicopters ?? []).map((h) => (
                  <option key={h.registration} value={h.registration}>{h.registration}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Barco relacionado
              <select className="hsv-control" name="relatedVesselId" defaultValue="">
                <option value="">Sin asignar</option>
                {(vessels ?? []).map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Marea / evento relacionado
              <input className="hsv-control" name="relatedMaintenanceEvent" placeholder="M02-2026" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Crear pedido
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
