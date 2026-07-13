import Link from "next/link";
import { Anchor, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type VesselRow = {
  id: string;
  name: string;
  owner: string | null;
  country: string | null;
  home_port: string | null;
  status: string;
  helicopters: { registration: string }[] | null;
};

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "neutral"> = {
  Active: "green",
  Prospect: "blue",
  Inactive: "amber",
  Archived: "neutral"
};

export default async function VesselsPage() {
  const { data, error } = await supabase
    .from("vessels")
    .select("id, name, owner, country, home_port, status, helicopters(registration)")
    .eq("archived", false)
    .order("name");

  const vessels = (data ?? []) as unknown as VesselRow[];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Flota"
          title="Barcos"
          description="Cada barco atunero tiene su propia bodega y helicóptero asignado durante la marea. Esta es la base para el inventario por barco."
          icon={Anchor}
        />
        <Panel>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Barcos</h2>
              <p className="mt-1 text-sm text-ink-subtle">{vessels.length} registro{vessels.length === 1 ? "" : "s"}</p>
            </div>
            <Link className="hsv-primary-button" href="/vessels/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Crear barco
            </Link>
          </div>

          {error ? (
            <div className="hsv-error-banner">No se pudo conectar con la base de datos: {error.message}.</div>
          ) : null}

          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Nombre</th>
                  <th className="hsv-table-th">Propietario</th>
                  <th className="hsv-table-th">País / puerto base</th>
                  <th className="hsv-table-th">Helicóptero asignado</th>
                  <th className="hsv-table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {vessels.map((vessel) => (
                  <tr key={vessel.id} className="hsv-table-row">
                    <td className="hsv-table-cell">
                      <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/vessels/${vessel.id}`}>
                        {vessel.name}
                      </Link>
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{vessel.owner ?? "—"}</td>
                    <td className="hsv-table-cell text-ink-muted">
                      {[vessel.country, vessel.home_port].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="hsv-table-cell text-ink-muted">
                      {vessel.helicopters?.length ? vessel.helicopters.map((h) => h.registration).join(", ") : "Sin asignar"}
                    </td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={STATUS_TONE[vessel.status] ?? "neutral"}>{vessel.status}</StatusPill>
                    </td>
                  </tr>
                ))}
                {!vessels.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={5}>
                      Todavía no hay barcos. Crea el primero con el botón de arriba.
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
