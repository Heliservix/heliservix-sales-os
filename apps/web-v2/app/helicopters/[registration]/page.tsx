import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plane, Plus, Trash2, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { deleteHelicopter } from "@/app/helicopters/actions";

type HelicopterDetailPageProps = {
  params: Promise<{ registration: string }>;
};

export default async function HelicopterDetailPage({ params }: HelicopterDetailPageProps) {
  const { registration } = await params;
  const { data: helicopter } = await supabase
    .from("helicopters")
    .select("*, vessels(name)")
    .eq("registration", registration)
    .maybeSingle();

  if (!helicopter) notFound();

  const { data: components } = await supabase
    .from("components")
    .select("id, component_name, part_number, serial_number, remaining_hours, remaining_percentage, status")
    .eq("helicopter_registration", registration)
    .neq("status", "Removed")
    .order("remaining_hours", { ascending: true });

  const boundDelete = deleteHelicopter.bind(null, registration);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader eyebrow="Flota" title={`Aeronave ${helicopter.registration}`} description={helicopter.model} icon={Plane} />

        <Panel className="mb-5">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Estado</p>
                <StatusPill tone={helicopter.status === "Grounded" ? "red" : helicopter.status === "Maintenance" ? "amber" : "green"}>
                  {helicopter.status}
                </StatusPill>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Horómetro</p>
                <p className="hsv-technical-value text-sm font-semibold text-ink">{Number(helicopter.current_hourmeter).toFixed(1)} hrs</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Barco asignado</p>
                <p className="text-sm font-semibold text-ink">{helicopter.vessels?.name ?? "Sin asignar"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Serie</p>
                <p className="hsv-technical-value text-sm text-ink-muted">{helicopter.serial_number || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Empresa propietaria</p>
                <p className="text-sm text-ink-muted">{helicopter.owner_company || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">País / operación</p>
                <p className="text-sm text-ink-muted">{helicopter.operation_area || "N/A"}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link className="hsv-secondary-button" href={`/helicopters/${helicopter.registration}/edit`}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Editar
              </Link>
              <form action={boundDelete}>
                <button className="hsv-danger-button" type="submit">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Eliminar
                </button>
              </form>
            </div>
          </div>
          {helicopter.notes ? <p className="mt-5 text-sm leading-6 text-ink-subtle">{helicopter.notes}</p> : null}
        </Panel>

        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Componentes</h2>
            <div className="flex flex-wrap gap-3">
              <Link className="hsv-secondary-button" href={`/helicopters/${registration}/components/new`}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Agregar componente
              </Link>
              <Link className="hsv-secondary-button" href="/helicopters/import">
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                Importar / actualizar desde Excel
              </Link>
            </div>
          </div>
          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Componente</th>
                  <th className="hsv-table-th">P/N</th>
                  <th className="hsv-table-th">S/N</th>
                  <th className="hsv-table-th">Remanente</th>
                  <th className="hsv-table-th">%</th>
                  <th className="hsv-table-th">Estado</th>
                  <th className="hsv-table-th" />
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {(components ?? []).map((component) => (
                  <tr key={component.id} className="hsv-table-row">
                    <td className="hsv-table-cell font-semibold text-ink">{component.component_name}</td>
                    <td className="hsv-table-cell text-ink-muted">{component.part_number}</td>
                    <td className="hsv-table-cell text-ink-muted">{component.serial_number}</td>
                    <td className="hsv-table-cell hsv-technical-value">{Number(component.remaining_hours).toFixed(1)} hrs</td>
                    <td className="hsv-table-cell hsv-technical-value">{Number(component.remaining_percentage).toFixed(1)}%</td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={component.status === "OK" ? "green" : component.status === "Monitor" ? "amber" : "red"}>
                        {component.status}
                      </StatusPill>
                    </td>
                    <td className="hsv-table-cell">
                      <Link
                        className="inline-flex items-center gap-1 text-sm font-semibold text-aviation-teal hover:underline"
                        href={`/helicopters/${registration}/components/${component.id}/edit`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
                {!components?.length ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={7}>
                      Esta aeronave todavía no tiene componentes registrados. Usa &ldquo;Agregar componente&rdquo; o &ldquo;Importar / actualizar desde Excel&rdquo; arriba.
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
