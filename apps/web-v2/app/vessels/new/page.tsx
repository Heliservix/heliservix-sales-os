import { Anchor } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { createVessel } from "@/app/vessels/actions";
import { vesselStatuses } from "@/app/vessels/constants";

export default function NewVesselPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Flota"
          title="Crear barco"
          description="Registra el barco atunero. Podrás asignarle un helicóptero y llevar su bodega de inventario desde su ficha."
          icon={Anchor}
        />
        <Panel>
          <form action={createVessel} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Nombre
              <input className="hsv-control" name="name" placeholder="Caroni 2" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Propietario
              <input className="hsv-control" name="owner" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              País
              <input className="hsv-control" name="country" placeholder="Panamá" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Puerto base
              <input className="hsv-control" name="homePort" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Capacidad (toneladas)
              <input className="hsv-control" type="number" step="1" name="capacityTons" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Estado
              <select className="hsv-control" name="status" defaultValue="Active">
                {vesselStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar barco
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
