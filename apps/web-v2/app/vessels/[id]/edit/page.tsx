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
