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

            <div className="sm:col-span-2 rounded-lg border border-line bg-canvas-muted p-3">
              <p className="text-sm font-semibold text-ink">Membrete para cartas de Autorización de Pago</p>
              <p className="mt-1 text-xs text-ink-subtle">
                Estos datos se usan para generar la carta de autorización (80% / 20%) dirigida a Departamento de Nóminas
                cuando cierra una faena de este barco. Puedes dejarlos en blanco y completarlos después.
              </p>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Razón social (membrete)
              <input className="hsv-control" name="letterheadCompanyName" placeholder="PESQUERA CARONI, C. A" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Dirección / teléfonos del membrete
              <textarea
                className="hsv-textarea"
                name="letterheadAddress"
                rows={3}
                placeholder="Vía Ferry-Mar - Sector El Salado - Local Nº 1 - Tels.: ..."
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Ciudad de origen de la carta
              <input className="hsv-control" name="letterheadCity" placeholder="Panamá" defaultValue="Panamá" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Teléfono adicional (opcional)
              <input className="hsv-control" name="letterheadPhone" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Firmantes autorizados
              <input className="hsv-control" name="letterheadSigners" placeholder="Doménico Pinto / Domenico A. Spinali" />
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
