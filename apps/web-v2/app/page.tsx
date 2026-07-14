import Link from "next/link";
import { Bot, Gauge, Plane, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { DonutChart, type DonutSlice } from "@/components/charts/donut-chart";
import { HorizontalBarChart, type BarChartDatum } from "@/components/charts/bar-chart";
import { TrendLineChart, type TrendPoint } from "@/components/charts/trend-line-chart";
import { supabase } from "@/lib/supabase";
import { buildAuraAnalysis } from "@/lib/aura";

export const dynamic = "force-dynamic";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Builds the last `months` calendar months (oldest first) as {label, value}
 * points, summing `amount(row)` for every row whose `dateField` falls in
 * that month. Used for both the flight-hours and tons-captured trends below
 * so the two charts read from real historical dates instead of a synthetic
 * snapshot table (which doesn't exist — see lib/aura.ts's comment on why
 * campaigns.total_flight_hours is informational-only, not a time series). */
function monthlyTrend<T>(rows: T[], dateField: (row: T) => string | null, amount: (row: T) => number, months = 12): TrendPoint[] {
  const now = new Date();
  const buckets: { year: number; month: number; total: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ year: d.getFullYear(), month: d.getMonth(), total: 0 });
  }

  for (const row of rows) {
    const raw = dateField(row);
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth());
    if (bucket) bucket.total += amount(row);
  }

  return buckets.map((b) => ({ label: MONTH_LABELS[b.month], value: Math.round(b.total * 10) / 10 }));
}

const FLEET_STATUS_TONE: Record<string, DonutSlice["tone"]> = {
  Available: "green",
  Assigned: "teal",
  "In Campaign": "teal",
  Maintenance: "amber",
  Grounded: "red",
  Retired: "neutral"
};

const SEVERITY_TONE: Record<string, BarChartDatum["tone"]> = {
  Info: "neutral",
  Monitor: "amber",
  Critical: "red",
  Grounding: "red"
};

export default async function DashboardPage() {
  const [
    { count: helicopterCount },
    { count: openAlertCount },
    { data: criticalAlerts },
    { data: fleetStatusRows },
    { data: openAlertsBySeverity },
    { data: flightLogTrendRows },
    { data: catchTrendRows },
    auraAnalysis
  ] = await Promise.all([
    supabase.from("helicopters").select("*", { count: "exact", head: true }).eq("archived", false),
    supabase.from("maintenance_alerts").select("*", { count: "exact", head: true }).neq("status", "Resolved"),
    supabase
      .from("maintenance_alerts")
      .select("id, helicopter_registration, component_name, severity, description")
      .in("severity", ["Critical", "Grounding"])
      .neq("status", "Resolved")
      .limit(5),
    supabase.from("helicopters").select("status").eq("archived", false),
    supabase.from("maintenance_alerts").select("severity").neq("status", "Resolved"),
    supabase.from("flight_logs").select("flight_date, flight_hours"),
    // Deliberately no archived=false filter: "Archivar" is how the office
    // closes out a finished faena, and a finished faena is exactly the one
    // with real tons_captured_final data. Filtering it out here silently
    // dropped every completed faena's tons from the trend the moment it was
    // closed (real bug found 2026-07-14 — see lib/faena-metrics.ts for the
    // matching fix on the Resumen de Faenas page).
    supabase.from("campaigns").select("catch_weighin_date, tons_captured_final, start_date, total_flight_hours"),
    buildAuraAnalysis()
  ]);

  const flightHoursFromLogs = monthlyTrend(
    flightLogTrendRows ?? [],
    (row) => row.flight_date,
    (row) => Number(row.flight_hours)
  );
  // Faenas that started before this system tracked weekly flight_logs (or
  // whose first weeks were never uploaded) have their hours recorded as a
  // manual campaigns.total_flight_hours baseline instead — see the comment
  // on that column in infra/database/schema.sql. It always ADDS to whatever
  // flight_logs exist, so it's added here too (keyed to the faena's start
  // month), or the fleet-wide monthly total silently undercounts every faena
  // that predates live weekly reporting.
  const flightHoursFromBaseline = monthlyTrend(
    catchTrendRows ?? [],
    (row) => row.start_date,
    (row) => Number(row.total_flight_hours ?? 0)
  );
  const flightHoursTrend: TrendPoint[] = flightHoursFromLogs.map((point, i) => ({
    label: point.label,
    value: Math.round((point.value + (flightHoursFromBaseline[i]?.value ?? 0)) * 10) / 10
  }));
  const catchTrend = monthlyTrend(
    catchTrendRows ?? [],
    (row) => row.catch_weighin_date,
    (row) => Number(row.tons_captured_final ?? 0)
  );

  const topRecommendation = auraAnalysis.executiveRecommendations[0];

  const fleetStatusCounts = new Map<string, number>();
  for (const row of fleetStatusRows ?? []) {
    fleetStatusCounts.set(row.status, (fleetStatusCounts.get(row.status) ?? 0) + 1);
  }
  const fleetStatusSlices: DonutSlice[] = Array.from(fleetStatusCounts.entries()).map(([label, value]) => ({
    label,
    value,
    tone: FLEET_STATUS_TONE[label] ?? "neutral"
  }));

  const severityCounts = new Map<string, number>();
  for (const row of openAlertsBySeverity ?? []) {
    severityCounts.set(row.severity, (severityCounts.get(row.severity) ?? 0) + 1);
  }
  const severityOrder = ["Grounding", "Critical", "Monitor", "Info"];
  const severityBars: BarChartDatum[] = severityOrder
    .filter((severity) => severityCounts.has(severity))
    .map((severity) => ({ label: severity, value: severityCounts.get(severity) ?? 0, tone: SEVERITY_TONE[severity] ?? "neutral" }));

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-6">
          <Panel className="overflow-hidden bg-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-4 w-fit">
                  <BrandLockup variant="compact" />
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">Centro de Operaciones</h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-ink-muted">
                  Conectado en vivo a la base de datos real de HeliServiX OS. Este número no puede duplicarse: viene directo de Supabase.
                </p>
              </div>
              <div className="rounded-xl border border-line bg-canvas-muted/55 p-4">
                <StatusPill tone={openAlertCount ? "amber" : "green"}>{openAlertCount ? "Atención requerida" : "Operacional"}</StatusPill>
                <p className="mt-3 text-sm leading-6 text-ink-subtle">Panamá · Ecuador</p>
              </div>
            </div>
          </Panel>

          <section className="grid gap-4 sm:grid-cols-2">
            <Panel>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-canvas-muted text-ink">
                  <Plane className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-ink-muted">Helicópteros activos</p>
                  <p className="text-2xl font-semibold text-ink">{helicopterCount ?? 0}</p>
                </div>
              </div>
            </Panel>
            <Panel>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-canvas-muted text-ink">
                  <Gauge className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-ink-muted">Alertas de mantenimiento abiertas</p>
                  <p className="text-2xl font-semibold text-ink">{openAlertCount ?? 0}</p>
                </div>
              </div>
            </Panel>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Panel>
              <h3 className="text-sm font-semibold text-ink">Salud de flota</h3>
              <div className="mt-4">
                <ScoreGauge score={auraAnalysis.fleetHealth.score} label="Motor de reglas local" size={112} />
              </div>
            </Panel>
            <Panel>
              <h3 className="text-sm font-semibold text-ink">Estado de la flota</h3>
              <div className="mt-4">
                <DonutChart slices={fleetStatusSlices} size={112} centerLabel="helicópteros" />
              </div>
            </Panel>
            <Panel>
              <h3 className="text-sm font-semibold text-ink">Alertas abiertas por severidad</h3>
              <div className="mt-4">
                <HorizontalBarChart data={severityBars} />
              </div>
            </Panel>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-ink">Horas voladas por mes (flota completa)</h3>
              </div>
              <div className="mt-3">
                <TrendLineChart data={flightHoursTrend} tone="teal" valueSuffix=" hrs" />
              </div>
            </Panel>
            <Panel>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-ink">Toneladas capturadas por mes (fecha de pesaje final)</h3>
              </div>
              <div className="mt-3">
                <TrendLineChart data={catchTrend} tone="green" valueSuffix=" ton" />
              </div>
            </Panel>
          </section>

          <Panel className="border-aviation-teal/25 bg-aviation-teal/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-aviation-teal" aria-hidden="true" />
                <h3 className="text-base font-semibold text-ink">AURA — recomendación del día</h3>
              </div>
              <Link className="text-sm font-semibold text-aviation-teal hover:underline" href="/aura">
                Ver todo en AURA →
              </Link>
            </div>
            {topRecommendation ? (
              <div className="mt-4 rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={topRecommendation.priority === "Critical" ? "red" : topRecommendation.priority === "High" ? "amber" : "blue"}>
                    {topRecommendation.priority}
                  </StatusPill>
                  <span className="text-sm font-semibold text-ink">{topRecommendation.subject}</span>
                </div>
                <p className="mt-2 text-sm text-ink-subtle">{topRecommendation.recommendation}</p>
              </div>
            ) : (
              <p className="mt-4 hsv-empty-state">Sin recomendaciones por ahora.</p>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">Alertas críticas</h3>
              <Link className="text-sm font-semibold text-aviation-teal hover:underline" href="/alerts">
                Ver plan de mantenimiento →
              </Link>
            </div>
            <div className="mt-4 grid gap-3">
              {(criticalAlerts ?? []).map((alert) => (
                <div key={alert.id} className="rounded-xl border border-aviation-red/20 bg-aviation-red/5 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="red">{alert.severity}</StatusPill>
                    <StatusPill tone="neutral">{alert.helicopter_registration}</StatusPill>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink">{alert.component_name}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-subtle">{alert.description}</p>
                </div>
              ))}
              {!criticalAlerts?.length ? <p className="hsv-empty-state">Sin alertas críticas abiertas.</p> : null}
            </div>
          </Panel>

          <Panel>
            <h3 className="text-base font-semibold text-ink">Siguiente paso</h3>
            <p className="mt-2 text-sm leading-6 text-ink-subtle">
              Sube el reporte semanal de cada barco los lunes para mantener horas y componentes al día.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="hsv-primary-button" href="/helicopters">
                Ver flota
              </Link>
              <Link className="hsv-secondary-button" href="/reports/import">
                Importar reporte semanal
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
