import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { archiveCampaign } from "@/app/campaigns/actions";

type CampaignDetailPageProps = {
  params: Promise<{ id: string }>;
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

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const { data: campaign } = await supabase.from("campaigns").select("*, vessels:vessel_id(id, name)").eq("id", id).maybeSingle();
  if (!campaign) notFound();

  // Flight logs tie to a campaign two ways: the direct campaign_id FK (set on
  // import going forward), or matching marea_code + helicopter for weeks
  // imported before this module existed. Union both so history isn't lost.
  const [{ data: byCampaignId }, { data: byMareaCode }] = await Promise.all([
    supabase
      .from("flight_logs")
      .select("id, flight_date, week_number, marea_code, hobbs_start, hobbs_end, flight_hours")
      .eq("campaign_id", id)
      .order("flight_date", { ascending: true }),
    campaign.code && campaign.helicopter_registration
      ? supabase
          .from("flight_logs")
          .select("id, flight_date, week_number, marea_code, hobbs_start, hobbs_end, flight_hours")
          .eq("marea_code", campaign.code)
          .eq("helicopter_registration", campaign.helicopter_registration)
          .order("flight_date", { ascending: true })
      : Promise.resolve({ data: [] })
  ]);

  const seen = new Set<string>();
  const flightLogs = [...(byCampaignId ?? []), ...(byMareaCode ?? [])].filter((log) => {
    if (seen.has(log.id)) return false;
    seen.add(log.id);
    return true;
  });

  const totalHours = flightLogs.reduce((sum, log) => sum + Number(log.flight_hours), 0);
  const boundArchive = archiveCampaign.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Campañas"
          title={campaign.name}
          description={campaign.code ? `Marea ${campaign.code}` : "Sin código de marea"}
          icon={CalendarRange}
        />

        <Panel className="mb-5">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Estado</p>
                <StatusPill tone={STATUS_TONE[campaign.status] ?? "neutral"}>{campaign.status}</StatusPill>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Helicóptero</p>
                <p className="text-sm text-ink-muted">
                  {campaign.helicopter_registration ? (
                    <Link className="hover:text-aviation-teal" href={`/helicopters/${campaign.helicopter_registration}`}>
                      {campaign.helicopter_registration}
                    </Link>
                  ) : (
                    "Sin asignar"
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Barco</p>
                <p className="text-sm text-ink-muted">
                  {campaign.vessels ? (
                    <Link className="hover:text-aviation-teal" href={`/vessels/${campaign.vessels.id}`}>
                      {campaign.vessels.name}
                    </Link>
                  ) : (
                    "Sin asignar"
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Período</p>
                <p className="text-sm text-ink-muted">{campaign.start_date || "?"} → {campaign.end_date || "En curso"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Piloto / Mecánico</p>
                <p className="text-sm text-ink-muted">{[campaign.pilot, campaign.mechanic].filter(Boolean).join(" · ") || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-subtle">Área de operación</p>
                <p className="text-sm text-ink-muted">{campaign.operation_area || "N/A"}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link className="hsv-secondary-button" href={`/campaigns/${id}/edit`}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Editar
              </Link>
              <form action={boundArchive}>
                <button className="hsv-danger-button" type="submit">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Archivar
                </button>
              </form>
            </div>
          </div>
          {campaign.notes ? <p className="mt-5 text-sm leading-6 text-ink-subtle">{campaign.notes}</p> : null}
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Historial de horas de vuelo por faena</h2>
            <p className="text-sm text-ink-muted">
              Total: <span className="hsv-technical-value font-semibold text-ink">{totalHours.toFixed(1)} hrs</span> en{" "}
              {flightLogs.length} semana{flightLogs.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Semana</th>
                  <th className="hsv-table-th">Fecha reporte</th>
                  <th className="hsv-table-th">Horómetro inicio</th>
                  <th className="hsv-table-th">Horómetro fin</th>
                  <th className="hsv-table-th">Horas voladas</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {flightLogs.map((log) => (
                  <tr key={log.id} className="hsv-table-row">
                    <td className="hsv-table-cell font-semibold text-ink">{log.week_number ?? "—"}</td>
                    <td className="hsv-table-cell text-ink-muted">{log.flight_date}</td>
                    <td className="hsv-table-cell hsv-technical-value">{Number(log.hobbs_start).toFixed(1)}</td>
                    <td className="hsv-table-cell hsv-technical-value">{Number(log.hobbs_end).toFixed(1)}</td>
                    <td className="hsv-table-cell hsv-technical-value font-semibold text-ink">{Number(log.flight_hours).toFixed(1)}</td>
                  </tr>
                ))}
                {!flightLogs.length ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={5}>
                      Ningún reporte semanal se ha vinculado a esta faena todavía.
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
