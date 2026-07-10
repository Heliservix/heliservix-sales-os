import Link from "next/link";
import { notFound } from "next/navigation";
import { Anchor, Pencil, Plane, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { deleteVessel } from "@/app/vessels/actions";

type VesselDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VesselDetailPage({ params }: VesselDetailPageProps) {
  const { id } = await params;
  const { data: vessel } = await supabase.from("vessels").select("*").eq("id", id).maybeSingle();
  if (!vessel) notFound();

  const { data: assignedHelicopters } = await supabase
    .from("helicopters")
    .select("registration, model, current_hourmeter, status")
    .eq("assigned_vessel_id", id);

  const boundDelete = deleteVessel.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader eyebrow="Flota" title={vessel.name} description={vessel.owner ?? "Sin propietario registrado"} icon={Anchor} />

        <Panel className="mb-5">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Estado</p>
                <StatusPill tone={vessel.status === "Active" ? "green" : vessel.status === "Inactive" ? "amber" : "neutral"}>
                  {vessel.status}
                </StatusPill>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">País</p>
                <p className="text-sm text-ink-muted">{vessel.country || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Puerto base</p>
                <p className="text-sm text-ink-muted">{vessel.home_port || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Capacidad</p>
                <p className="hsv-technical-value text-sm text-ink-muted">
                  {vessel.capacity_tons != null ? `${Number(vessel.capacity_tons)} ton` : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link className="hsv-secondary-button" href={`/vessels/${id}/edit`}>
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
          {vessel.notes ? <p className="mt-5 text-sm leading-6 text-ink-subtle">{vessel.notes}</p> : null}
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <Plane className="h-5 w-5 text-ink-muted" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Helicóptero(s) asignado(s)</h2>
          </div>
          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Matrícula</th>
                  <th className="hsv-table-th">Modelo</th>
                  <th className="hsv-table-th">Horómetro</th>
                  <th className="hsv-table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {(assignedHelicopters ?? []).map((h) => (
                  <tr key={h.registration} className="hsv-table-row">
                    <td className="hsv-table-cell">
                      <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/helicopters/${h.registration}`}>
                        {h.registration}
                      </Link>
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{h.model}</td>
                    <td className="hsv-table-cell hsv-technical-value">{Number(h.current_hourmeter).toFixed(1)}</td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={h.status === "Grounded" ? "red" : h.status === "Maintenance" ? "amber" : "teal"}>
                        {h.status}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
                {!assignedHelicopters?.length ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={4}>
                      Ningún helicóptero asignado todavía. Se asigna desde la ficha de edición del helicóptero.
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
