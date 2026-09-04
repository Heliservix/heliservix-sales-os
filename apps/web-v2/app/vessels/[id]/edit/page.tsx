import { notFound } from "next/navigation";
import { Anchor } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updateVessel } from "@/app/vessels/actions";
import { vesselStatuses } from "@/app/vessels/constants";

type EditVesselPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditVesselPage({ params }: EditVesselPageProps) {
  const { id } = await params;
  const { data: vessel } = await supabase.from("vessels").select("*").eq("id", id).maybeSingle();
  if (!vessel) notFound();

  const boundUpdate = updateVessel.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader eyebrow="Flota" title={`Editar ${vessel.name}`} description="Barco" icon={Anchor} />
        <Panel>
          <form action={boundUpdate} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Nombre
              <input className="hsv-control" name="name" defaultValue={vessel.name} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Propietario
              <input className="hsv-control" name="owner" defaultValue={vessel.owner ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              País
              <input className="hsv-control" name="country" defaultValue={vessel.country ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Puerto base
              <input className="hsv-control" name="homePort" defaultValue={vessel.home_port ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Capacidad (toneladas)
              <input className="hsv-control" type="number" step="1" name="capacityTons" defaultValue={vessel.capacity_tons ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Estado
              <select className="hsv-control" name="status" defaultValue={vessel.status}>
                {vesselStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" defaultValue={vessel.notes ?? ""} />
            </label>

            <div className="sm:col-span-2 rounded-lg border border-line bg-canvas-muted p-3">
              <p className="text-sm font-semibold text-ink">Membrete para cartas de Autorización de Pago</p>
              <p className="mt-1 text-xs text-ink-subtle">
                Estos datos se usan para generar la carta de autorización (80% / 20%) dirigida a Departamento de Nóminas
                cuando cierra una faena de este barco.
              </p>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Razón social (membrete)
              <input
                className="hsv-control"
                name="letterheadCompanyName"
                placeholder="PESQUERA CARONI, C. A"
                defaultValue={vessel.letterhead_company_name ?? ""}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Dirección / teléfonos del membrete
              <textarea className="hsv-textarea" name="letterheadAddress" rows={3} defaultValue={vessel.letterhead_address ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Ciudad de origen de la carta
              <input className="hsv-control" name="letterheadCity" defaultValue={vessel.letterhead_city ?? "Panamá"} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Teléfono adicional (opcional)
              <input className="hsv-control" name="letterheadPhone" defaultValue={vessel.letterhead_phone ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Firmantes autorizados
              <input className="hsv-control" name="letterheadSigners" defaultValue={vessel.letterhead_signers ?? ""} />
            </label>

            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar cambios
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
