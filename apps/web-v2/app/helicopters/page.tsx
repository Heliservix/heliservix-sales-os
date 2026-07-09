import Link from "next/link";
import { Plane, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type HelicopterRow = {
  registration: string;
  model: string;
  current_hourmeter: number;
  status: string;
  assigned_vessel_id: string | null;
  vessels: { name: string } | null;
};

export default async function HelicoptersPage() {
  const { data, error } = await supabase
    .from("helicopters")
    .select("registration, model, current_hourmeter, status, assigned_vessel_id, vessels(name)")
    .eq("archived", false)
    .order("registration");

  const helicopters = (data ?? []) as unknown as HelicopterRow[];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Flota"
          title="Helicópteros"
          description="Matrícula, modelo, horómetro y estado — datos reales de Supabase, no de un archivo en tu navegador."
          icon={Plane}
        />
        <Panel>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Helicópteros</h2>
              <p className="mt-1 text-sm text-ink-subtle">{helicopters.length} registro{helicopters.length === 1 ? "" : "s"}</p>
            </div>
            <Link className="hsv-primary-button" href="/helicopters/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Crear helicóptero
            </Link>
          </div>

          {error ? (
            <div className="hsv-error-banner">
              No se pudo conectar con la base de datos: {error.message}. Verifica que corriste{" "}
              <code className="hsv-technical-value">infra/database/schema.sql</code> en el SQL Editor de Supabase.
            </div>
          ) : null}

          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Matrícula</th>
                  <th className="hsv-table-th">Modelo</th>
                  <th className="hsv-table-th">Horómetro</th>
                  <th className="hsv-table-th">Estado</th>
                  <th className="hsv-table-th">Barco asignado</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {helicopters.map((helicopter) => (
                  <tr key={helicopter.registration} className="hsv-table-row">
                    <td className="hsv-table-cell">
                      <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/helicopters/${helicopter.registration}`}>
                        {helicopter.registration}
                      </Link>
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{helicopter.model}</td>
                    <td className="hsv-table-cell hsv-technical-value">{Number(helicopter.current_hourmeter).toFixed(1)}</td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={helicopter.status === "Grounded" ? "red" : helicopter.status === "Maintenance" ? "amber" : "teal"}>
                        {helicopter.status}
                      </StatusPill>
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{helicopter.vessels?.name ?? "Sin asignar"}</td>
                  </tr>
                ))}
                {!helicopters.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={5}>
                      Todavía no hay helicópteros. Crea el primero con el botón de arriba.
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
