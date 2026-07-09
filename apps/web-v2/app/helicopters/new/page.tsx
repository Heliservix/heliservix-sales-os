import { Plane } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { createHelicopter, helicopterStatuses } from "@/app/helicopters/actions";

export default function NewHelicopterPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Flota"
          title="Crear helicóptero"
          description="Se guarda directo en la base de datos: matrícula única, sin duplicados posibles."
          icon={Plane}
        />
        <Panel>
          <form action={createHelicopter} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Matrícula
              <input className="hsv-control" name="registration" placeholder="HP1804" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Modelo
              <input className="hsv-control" name="model" placeholder="Robinson R44 Clipper I" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Número de serie
              <input className="hsv-control" name="serialNumber" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Año de fabricación
              <input className="hsv-control" name="manufactureYear" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Horómetro actual
              <input className="hsv-control" name="currentHourmeter" type="number" step="0.1" defaultValue={0} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Estado
              <select className="hsv-control" name="status" defaultValue="Available">
                {helicopterStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Empresa propietaria
              <input className="hsv-control" name="ownerCompany" placeholder="Heliservix" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              País / área de operación
              <input className="hsv-control" name="operationArea" placeholder="Panamá" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">Guardar helicóptero</button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
