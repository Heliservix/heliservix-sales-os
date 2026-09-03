import Link from "next/link";
import { ArrowLeftRight, Camera, PenLine, Plus, Replace, Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ComponentChangesPageProps = {
  searchParams: Promise<{ registration?: string; type?: string }>;
};

type ComponentChangeRow = {
  id: string;
  swap_type: "Transfer" | "Replacement";
  helicopter_registration: string;
  to_helicopter_registration: string | null;
  installed_component_name: string | null;
  installed_part_number: string | null;
  installed_serial_number: string | null;
  removed_component_name: string | null;
  installation_date: string | null;
  removal_date: string | null;
  reason: string | null;
  technician: string | null;
  technician_signature_url: string | null;
  photo_url: string | null;
  created_at: string;
};

export default async function ComponentChangesPage({ searchParams }: ComponentChangesPageProps) {
  const { registration: selectedRegistration, type: selectedType } = await searchParams;

  let query = supabase
    .from("component_changes")
    .select(
      "id, swap_type, helicopter_registration, to_helicopter_registration, installed_component_name, installed_part_number, installed_serial_number, removed_component_name, installation_date, removal_date, reason, technician, technician_signature_url, photo_url, created_at"
    )
    .order("created_at", { ascending: false });

  if (selectedRegistration) {
    query = query.or(`helicopter_registration.eq.${selectedRegistration},to_helicopter_registration.eq.${selectedRegistration}`);
  }
  if (selectedType) query = query.eq("swap_type", selectedType);

  const [{ data, error }, { data: helicopterData }] = await Promise.all([
    query,
    supabase.from("helicopters").select("registration").eq("archived", false).order("registration")
  ]);

  const changes = (data ?? []) as ComponentChangeRow[];
  const helicopters = (helicopterData ?? []) as { registration: string }[];
  const hasFilters = Boolean(selectedRegistration || selectedType);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Mantenimiento"
          title="Cambios de Componentes"
          description="Transferir una pieza de un helicóptero a otro, o cambiarla por una nueva — cada cambio actualiza Control de Componentes automáticamente y queda firmado por el técnico, con foto si aplica."
          icon={Wrench}
        />

        <div className="mb-5 flex flex-wrap gap-2">
          <Link className="hsv-primary-button" href="/component-changes/transfer/new">
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            Transferir entre helicópteros
          </Link>
          <Link className="hsv-primary-button" href="/component-changes/replace/new">
            <Replace className="h-4 w-4" aria-hidden="true" />
            Cambiar por componente nuevo
          </Link>
        </div>

        <Panel>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-ink-muted" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Historial de cambios</h2>
            </div>
          </div>

          <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-canvas-muted p-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-ink-subtle">Helicóptero</label>
              <select name="registration" defaultValue={selectedRegistration ?? ""} className="hsv-control !py-1.5 text-sm">
                <option value="">Todos</option>
                {helicopters.map((h) => (
                  <option key={h.registration} value={h.registration}>
                    {h.registration}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-ink-subtle">Tipo</label>
              <select name="type" defaultValue={selectedType ?? ""} className="hsv-control !py-1.5 text-sm">
                <option value="">Todos</option>
                <option value="Transfer">Transferencia</option>
                <option value="Replacement">Cambio por nuevo</option>
              </select>
            </div>
            <button type="submit" className="hsv-secondary-button !py-1.5 text-sm">
              Filtrar
            </button>
            {hasFilters ? (
              <Link href="/component-changes" className="text-sm font-semibold text-aviation-teal hover:underline">
                Quitar filtros
              </Link>
            ) : null}
          </form>

          {error ? <div className="hsv-error-banner">No se pudo conectar con la base de datos: {error.message}.</div> : null}

          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Fecha</th>
                  <th className="hsv-table-th">Tipo</th>
                  <th className="hsv-table-th">Componente</th>
                  <th className="hsv-table-th">Helicóptero</th>
                  <th className="hsv-table-th">Motivo</th>
                  <th className="hsv-table-th">Técnico</th>
                  <th className="hsv-table-th">Evidencia</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {changes.map((c) => (
                  <tr key={c.id} className="hsv-table-row align-top">
                    <td className="hsv-table-cell text-ink-muted">{(c.installation_date ?? c.created_at)?.slice(0, 10)}</td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={c.swap_type === "Transfer" ? "blue" : "teal"}>
                        {c.swap_type === "Transfer" ? "Transferencia" : "Cambio por nuevo"}
                      </StatusPill>
                    </td>
                    <td className="hsv-table-cell">
                      <p className="font-semibold text-ink">{c.installed_component_name ?? "—"}</p>
                      <p className="mt-0.5 text-xs text-ink-subtle">
                        P/N {c.installed_part_number || "—"} · S/N {c.installed_serial_number || "—"}
                      </p>
                      {c.swap_type === "Replacement" && c.removed_component_name ? (
                        <p className="mt-0.5 text-xs text-ink-subtle">Removido: {c.removed_component_name}</p>
                      ) : null}
                    </td>
                    <td className="hsv-table-cell text-ink-muted">
                      {c.swap_type === "Transfer" ? (
                        <span className="inline-flex items-center gap-1">
                          <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/helicopters/${c.helicopter_registration}`}>
                            {c.helicopter_registration}
                          </Link>
                          <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
                          <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/helicopters/${c.to_helicopter_registration}`}>
                            {c.to_helicopter_registration}
                          </Link>
                        </span>
                      ) : (
                        <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/helicopters/${c.helicopter_registration}`}>
                          {c.helicopter_registration}
                        </Link>
                      )}
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{c.reason || "—"}</td>
                    <td className="hsv-table-cell text-ink-muted">{c.technician || "—"}</td>
                    <td className="hsv-table-cell">
                      <div className="flex items-center gap-2">
                        {c.photo_url ? (
                          <a href={c.photo_url} target="_blank" rel="noreferrer" className="hsv-ghost-button !px-2 !py-1 text-[11px]">
                            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                            Foto
                          </a>
                        ) : null}
                        {c.technician_signature_url ? (
                          <a href={c.technician_signature_url} target="_blank" rel="noreferrer" className="hsv-ghost-button !px-2 !py-1 text-[11px]">
                            <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                            Firma
                          </a>
                        ) : null}
                        {!c.photo_url && !c.technician_signature_url ? <span className="text-ink-subtle">—</span> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!changes.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={7}>
                      {hasFilters ? "No hay cambios con este filtro." : "Todavía no hay cambios de componentes registrados."}
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
