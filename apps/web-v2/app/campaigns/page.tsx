import Link from "next/link";
import { BarChart3, CalendarRange, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type CampaignRow = {
  id: string;
  code: string | null;
  name: string;
  helicopter_registration: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  vessels: { id: string; name: string } | null;
};

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "teal" | "red" | "neutral"> = {
  Draft: "neutral",
  Planned: "blue",
  "Readiness Review": "blue",
  Approved: "teal",
  Active: "green",
  Suspended: "amber",
  Completed: "neutral",
  Cancelled: "red",
  Archived: "neutral"
};

export default async function CampaignsPage() {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, code, name, helicopter_registration, start_date, end_date, status, vessels:vessel_id(id, name)")
    .eq("archived", false)
    .order("start_date", { ascending: false, nullsFirst: false });

  const campaigns = ((data ?? []) as unknown as CampaignRow[]);
  const active = campaigns.filter((c) => c.status === "Active");

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Operaciones"
          title="Campañas / Faenas"
          description="Cada faena asigna un helicóptero a un barco atunero por un período determinado. Los reportes semanales importados se vinculan aquí automáticamente por código de marea."
          icon={CalendarRange}
        />

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Faenas activas</p>
            <p className="mt-1 text-2xl font-bold text-ink">{active.length}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Total registradas</p>
            <p className="mt-1 text-2xl font-bold text-ink">{campaigns.length}</p>
          </Panel>
        </div>

        <Panel>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-ink-muted" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Campañas / Faenas</h2>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link className="hsv-secondary-button" href="/campaigns/resumen">
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                Resumen de faenas
              </Link>
              <Link className="hsv-primary-button" href="/campaigns/new">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Crear campaña / faena
              </Link>
            </div>
          </div>

          {error ? <div className="hsv-error-banner">No se pudo conectar con la base de datos: {error.message}.</div> : null}

          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Marea / Código</th>
                  <th className="hsv-table-th">Nombre</th>
                  <th className="hsv-table-th">Helicóptero</th>
                  <th className="hsv-table-th">Barco</th>
                  <th className="hsv-table-th">Inicio</th>
                  <th className="hsv-table-th">Fin</th>
                  <th className="hsv-table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hsv-table-row">
                    <td className="hsv-table-cell hsv-technical-value">
                      <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/campaigns/${campaign.id}`}>
                        {campaign.code || "—"}
                      </Link>
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{campaign.name}</td>
                    <td className="hsv-table-cell text-ink-muted">
                      {campaign.helicopter_registration ? (
                        <Link className="hover:text-aviation-teal" href={`/helicopters/${campaign.helicopter_registration}`}>
                          {campaign.helicopter_registration}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{campaign.vessels?.name ?? "—"}</td>
                    <td className="hsv-table-cell text-ink-muted">{campaign.start_date || "—"}</td>
                    <td className="hsv-table-cell text-ink-muted">{campaign.end_date || "En curso"}</td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={STATUS_TONE[campaign.status] ?? "neutral"}>{campaign.status}</StatusPill>
                    </td>
                  </tr>
                ))}
                {!campaigns.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={7}>
                      Todavía no hay campañas/faenas. Se crean automáticamente al importar un reporte semanal con código de
                      marea, o puedes crear una manualmente.
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
