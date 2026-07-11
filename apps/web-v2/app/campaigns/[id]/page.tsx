import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, Pencil, Trash2, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { archiveCampaign } from "@/app/campaigns/actions";
import { calculatePayroll } from "@/lib/payroll";

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
      .select("id, flight_date, week_number, marea_code, hobbs_start, hobbs_end, flight_hours, fuel_consumption_gals")
      .eq("campaign_id", id)
      .order("flight_date", { ascending: true }),
    campaign.code && campaign.helicopter_registration
      ? supabase
          .from("flight_logs")
          .select("id, flight_date, week_number, marea_code, hobbs_start, hobbs_end, flight_hours, fuel_consumption_gals")
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
  const totalFuelGals = flightLogs.reduce((sum, log) => sum + Number(log.fuel_consumption_gals ?? 0), 0);
  const tonsFinal = campaign.tons_captured_final != null ? Number(campaign.tons_captured_final) : null;
  const tonsEstimate = campaign.tons_captured_estimate != null ? Number(campaign.tons_captured_estimate) : null;
  const fishingDays = campaign.fishing_days != null ? Number(campaign.fishing_days) : null;
  const tonsPerHour = tonsFinal != null && totalHours > 0 ? tonsFinal / totalHours : null;
  const tonsPerDay = tonsFinal != null && fishingDays != null && fishingDays > 0 ? tonsFinal / fishingDays : null;
  const galsPerHour = totalFuelGals > 0 && totalHours > 0 ? totalFuelGals / totalHours : null;
  const boundArchive = archiveCampaign.bind(null, id);

  const [{ data: pilotPerson }, { data: mechanicPerson }] = await Promise.all([
    campaign.pilot_id
      ? supabase.from("personnel").select("full_name, monthly_salary, rate_per_ton").eq("id", campaign.pilot_id).maybeSingle()
      : Promise.resolve({ data: null }),
    campaign.mechanic_id
      ? supabase.from("personnel").select("full_name, monthly_salary, rate_per_ton").eq("id", campaign.mechanic_id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const payrollRows = [
    pilotPerson
      ? {
          role: "Piloto",
          name: pilotPerson.full_name,
          breakdown: calculatePayroll({
            monthlySalary: pilotPerson.monthly_salary != null ? Number(pilotPerson.monthly_salary) : null,
            ratePerTon: pilotPerson.rate_per_ton != null ? Number(pilotPerson.rate_per_ton) : null,
            fishingDays,
            tonsCapturedEstimate: tonsEstimate,
            tonsCapturedFinal: tonsFinal,
            extraAdvance: campaign.pilot_anticipos != null ? Number(campaign.pilot_anticipos) : null
          })
        }
      : null,
    mechanicPerson
      ? {
          role: "Mecánico",
          name: mechanicPerson.full_name,
          breakdown: calculatePayroll({
            monthlySalary: mechanicPerson.monthly_salary != null ? Number(mechanicPerson.monthly_salary) : null,
            ratePerTon: mechanicPerson.rate_per_ton != null ? Number(mechanicPerson.rate_per_ton) : null,
            fishingDays,
            tonsCapturedEstimate: tonsEstimate,
            tonsCapturedFinal: tonsFinal,
            extraAdvance: campaign.mechanic_anticipos != null ? Number(campaign.mechanic_anticipos) : null
          })
        }
      : null
  ].filter((row): row is NonNullable<typeof row> => row != null);

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

        <Panel className="mb-5">
          <h2 className="mb-4 text-lg font-semibold text-ink">Resumen de captura</h2>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Días de pesca</p>
              <p className="hsv-technical-value mt-1 text-xl font-bold text-ink">{fishingDays ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Toneladas (estimado)</p>
              <p className="hsv-technical-value mt-1 text-xl font-bold text-ink">
                {campaign.tons_captured_estimate != null ? Number(campaign.tons_captured_estimate).toFixed(1) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Toneladas (peso final)</p>
              <p className="hsv-technical-value mt-1 text-xl font-bold text-ink">{tonsFinal != null ? tonsFinal.toFixed(1) : "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Toneladas / hora volada</p>
              <p className="hsv-technical-value mt-1 text-xl font-bold text-ink">{tonsPerHour != null ? tonsPerHour.toFixed(2) : "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">Toneladas / día de pesca</p>
              <p className="hsv-technical-value mt-1 text-xl font-bold text-ink">{tonsPerDay != null ? tonsPerDay.toFixed(2) : "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-subtle">AVGAS (gal/hora)</p>
              <p className="hsv-technical-value mt-1 text-xl font-bold text-ink">{galsPerHour != null ? galsPerHour.toFixed(1) : "—"}</p>
            </div>
          </div>
          {tonsFinal == null || fishingDays == null ? (
            <p className="mt-4 text-xs text-ink-subtle">
              Faltan datos para completar la comparación — agrega toneladas capturadas y/o días de pesca desde &ldquo;Editar&rdquo;.
            </p>
          ) : null}
        </Panel>

        <Panel className="mb-5">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-ink-muted" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Nómina de la faena</h2>
          </div>
          {payrollRows.length ? (
            <div className="hsv-table-wrap">
              <table className="hsv-table">
                <thead className="hsv-table-head">
                  <tr>
                    <th className="hsv-table-th">Rol</th>
                    <th className="hsv-table-th">Nombre</th>
                    <th className="hsv-table-th">Salario prorateado</th>
                    <th className="hsv-table-th">Anticipo 80% (aprox.)</th>
                    <th className="hsv-table-th">Saldo 20% (peso final)</th>
                    <th className="hsv-table-th">Anticipos extra</th>
                    <th className="hsv-table-th">Pago al cierre</th>
                    <th className="hsv-table-th">Pago final</th>
                    <th className="hsv-table-th">Total faena</th>
                  </tr>
                </thead>
                <tbody className="hsv-table-body">
                  {payrollRows.map((row) => (
                    <tr key={row.role} className="hsv-table-row">
                      <td className="hsv-table-cell text-ink-muted">{row.role}</td>
                      <td className="hsv-table-cell font-semibold text-ink">{row.name}</td>
                      <td className="hsv-table-cell hsv-technical-value">
                        {row.breakdown.proratedSalary != null ? `$${row.breakdown.proratedSalary.toFixed(2)}` : "—"}
                      </td>
                      <td className="hsv-table-cell hsv-technical-value">
                        {row.breakdown.tonBonusAdvance != null ? `$${row.breakdown.tonBonusAdvance.toFixed(2)}` : "—"}
                      </td>
                      <td className="hsv-table-cell hsv-technical-value">
                        {row.breakdown.tonBonusRemainder != null ? `$${row.breakdown.tonBonusRemainder.toFixed(2)}` : "—"}
                      </td>
                      <td className="hsv-table-cell hsv-technical-value">
                        {row.breakdown.extraAdvance ? `$${row.breakdown.extraAdvance.toFixed(2)}` : "—"}
                      </td>
                      <td className="hsv-table-cell hsv-technical-value font-semibold text-ink">
                        {row.breakdown.firstPayment != null ? `$${row.breakdown.firstPayment.toFixed(2)}` : "—"}
                      </td>
                      <td className="hsv-table-cell hsv-technical-value font-semibold text-ink">
                        {row.breakdown.finalPayment != null ? `$${row.breakdown.finalPayment.toFixed(2)}` : "—"}
                      </td>
                      <td className="hsv-table-cell hsv-technical-value font-semibold text-ink">
                        {row.breakdown.total != null ? `$${row.breakdown.total.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-ink-subtle">
              Asigna un piloto y/o mecánico desde &ldquo;Editar&rdquo; (con su salario y tarifa por tonelada en Personal) para ver el cálculo de nómina.
            </p>
          )}
          <p className="mt-4 text-xs text-ink-subtle">
            Salario prorateado = salario mensual ÷ 30 × días de pesca. El bono por tonelada se paga en dos partes: 80% sobre lo capturado
            aproximado (pago al cierre de la faena) y el saldo una vez llega el pesaje final de la planta — no un 20% fijo del total, sino
            lo que falte para completar el bono calculado sobre el peso final.
          </p>
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
