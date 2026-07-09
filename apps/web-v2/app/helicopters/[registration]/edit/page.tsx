import { notFound } from "next/navigation";
import { Plane } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/fleet/page-header";
import { supabase } from "@/lib/supabase";
import { helicopterStatuses, updateHelicopter } from "@/app/helicopters/actions";

type EditHelicopterPageProps = {
  params: Promise<{ registration: string }>;
};

export default async function EditHelicopterPage({ params }: EditHelicopterPageProps) {
  const { registration } = await params;
  const { data: helicopter } = await supabase.from("helicopters").select("*").eq("registration", registration).maybeSingle();
  if (!helicopter) notFound();

  const boundUpdate = updateHelicopter.bind(null, registration);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow="Flota" title={`Editar ${helicopter.registration}`} description={helicopter.model} icon={Plane} />
        <Panel>
          <form action={boundUpdate} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Modelo
              <input className="hsv-control" name="model" defaultValue={helicopter.model} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Número de serie
              <input className="hsv-control" name="serialNumber" defaultValue={helicopter.serial_number ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Año de fabricación
              <input className="hsv-control" name="manufactureYear" defaultValue={helicopter.manufacture_year ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Horómetro actual
              <input className="hsv-control" name="currentHourmeter" type="number" step="0.1" defaultValue={helicopter.current_hourmeter} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Estado
              <select className="hsv-control" name="status" defaultValue={helicopter.status}>
                {helicopterStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Empresa propietaria
              <input className="hsv-control" name="ownerCompany" defaultValue={helicopter.owner_company ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              País / área de operación
              <input className="hsv-control" name="operationArea" defaultValue={helicopter.operation_area ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" defaultValue={helicopter.notes ?? ""} />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">Guardar cambios</button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
