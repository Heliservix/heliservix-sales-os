import Link from "next/link";
import { BarChart3, CalendarRange } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { fetchFaenaData, computeFaenaMetrics, computeVesselSummaries } from "@/lib/faena-metrics";

export const dynamic = "force-dynamic";

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export default async function CampaignsSummaryPage() {
  const { campaigns, flightLogs, error } = await fetchFaenaData();

  const rows = computeFaenaMetrics(campaigns, flightLogs);

  // Per-vessel roll-up — this is the "which vessel is faster / catches more per
  // flight hour" comparison the office actually wants, not just a per-faena list.
  // Shared with AURA's operations analysis (lib/aura.ts) so both use the same math.
  const vesselSummaries = computeVesselSummaries(rows);

  const bestTonsPerHour = vesselSummaries.filter((v) => v.tonsPerHour != null).sort((a, b) => (b.tonsPerHour ?? 0) - (a.tonsPerHour ?? 0))[0];
  const bestTonsPerDay = vesselSummaries.filter((v) => v.tonsPerDay != null).sort((a, b) => (b.tonsPerDay ?? 0) - (a.tonsPerDay ?? 0))[0];

  // Annual AVGAS: every flight_log with a date, summed by year — independent
  // of campaign linkage, so it still counts weeks that were imported before a
  // faena/campaign existed for them.
  const logsWithDate = flightLogs.filter((log) => log.flight_date);
  const years = Array.from(new Set(logsWithDate.map((log) => log.flight_date.slice(0, 4)))).sort().reverse();
  const annualFuel = years.map((year) => {
    const yearLogs = logsWithDate.filter((log) => log.flight_date.slice(0, 4) === year);
    const totalHours = yearLogs.reduce((sum, log) => sum + Number(log.flight_hours), 0);
    const totalFuel = yearLogs.reduce((sum, log) => sum + Number(log.fuel_consumption_gals ?? 0), 0);
    const reportedWeeks = yearLogs.filter((log) => log.fuel_consumption_gals != null).length;
    return {
      year,
      totalHours,
      totalFuel,
      reportedWeeks,
      totalWeeks: yearLogs.length,
      galsPerHour: totalFuel > 0 && totalHours > 0 ? totalFuel / totalHours : null
    };
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Operaciones"
          title="Resumen de Faenas"
          description="Comparación de operaciones por faena y por barco: días de pesca vs. horas voladas, toneladas capturadas y consumo de combustible."
          icon={BarChart3}
        />

        {error ? <div className="hsv-error-banner">No se pudo conectar con la base de datos: {error}.</div> : null}

        <Panel className="mb-5">
          <h2 className="mb-4 text-lg font-semibold text-ink">Comparación por barco</h2>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-canvas-muted p-3">
              <p className="text-xs font-semibold uppercase text-ink-subtle">Pesca más rápido (ton/día)</p>
              <p className="mt-1 text-lg font-bold text-ink">
                {bestTonsPerDay ? `${bestTonsPerDay.name} — ${bestTonsPerDay.tonsPerDay?.toFixed(2)} ton/día` : "Sin datos suficientes"}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-canvas-muted p-3">
              <p className="text-xs font-semibold uppercase text-ink-subtle">Más eficiente por hora de vuelo (ton/hora)</p>
              <p className="mt-1 text-lg font-bold text-ink">
                {bestTonsPerHour ? `${bestTonsPerHour.name} — ${bestTonsPerHour.tonsPerHour?.toFixed(2)} ton/hora` : "Sin datos suficientes"}
              </p>
            </div>
          </div>
          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Barco</th>
                  <th className="hsv-table-th">Faenas</th>
                  <th className="hsv-table-th">Días de pesca</th>
                  <th className="hsv-table-th">Horas voladas</th>
                  <th className="hsv-table-th">Toneladas (final)</th>
                  <th className="hsv-table-th">Ton / hora</th>
                  <th className="hsv-table-th">Ton / día</th>
                  <th className="hsv-table-th">AVGAS gal/hora</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {vesselSummaries.map((vessel) => (
                  <tr key={vessel.name} className="hsv-table-row">
                    <td className="hsv-table-cell font-semibold text-ink">{vessel.name}</td>
                    <td className="hsv-table-cell text-ink-muted">{vessel.faenas}</td>
                    <td className="hsv-table-cell hsv-technical-value">{vessel.totalDays > 0 ? round(vessel.totalDays, 1) : "—"}</td>
                    <td className="hsv-table-cell hsv-technical-value">{vessel.totalHours > 0 ? round(vessel.totalHours, 1) : "—"}</td>
                    <td className="hsv-table-cell hsv-technical-value">{vessel.totalTons > 0 ? round(vessel.totalTons, 1) : "—"}</td>
                    <td className="hsv-table-cell hsv-technical-value">{vessel.tonsPerHour != null ? vessel.tonsPerHour.toFixed(2) : "—"}</td>
                    <td className="hsv-table-cell hsv-technical-value">{vessel.tonsPerDay != null ? vessel.tonsPerDay.toFixed(2) : "—"}</td>
                    <td className="hsv-table-cell hsv-technical-value">{vessel.galsPerHour != null ? vessel.galsPerHour.toFixed(1) : "—"}</td>
                  </tr>
                ))}
                {!vesselSummaries.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={8}>
                      No hay faenas registradas todavía.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="mb-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Detalle por faena</h2>
            <p className="text-xs text-ink-subtle">Toneladas y días de pesca se ingresan manualmente al cerrar cada faena.</p>
          </div>
          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Marea</th>
                  <th className="hsv-table-th">Barco</th>
                  <th className="hsv-table-th">Helicóptero</th>
                  <th className="hsv-table-th">Estado</th>
                  <th className="hsv-table-th">Días de pesca</th>
                  <th className="hsv-table-th">Horas voladas</th>
                  <th className="hsv-table-th">Toneladas (final)</th>
                  <th className="hsv-table-th">Ton / hora</th>
                  <th className="hsv-table-th">Ton / día</th>
                  <th className="hsv-table-th">AVGAS (gal)</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {rows.map((row) => (
                  <tr key={row.campaign.id} className="hsv-table-row">
                    <td className="hsv-table-cell hsv-technical-value">
                      <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/campaigns/${row.campaign.id}`}>
                        {row.campaign.code || "—"}
                      </Link>
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{row.campaign.vessels?.name ?? "—"}</td>
                    <td className="hsv-table-cell text-ink-muted">{row.campaign.helicopter_registration ?? "—"}</td>
                    <td className="hsv-table-cell text-ink-muted">{row.campaign.status}</td>
                    <td className="hsv-table-cell hsv-technical-value">{row.fishingDays ?? "—"}</td>
                    <td className="hsv-table-cell hsv-technical-value">{row.hours > 0 ? round(row.hours, 1) : "—"}</td>
                    <td className="hsv-table-cell hsv-technical-value">{row.tonsFinal ?? "—"}</td>
                    <td className="hsv-table-cell hsv-technical-value">{row.tonsPerHour != null ? row.tonsPerHour.toFixed(2) : "—"}</td>
                    <td className="hsv-table-cell hsv-technical-value">{row.tonsPerDay != null ? row.tonsPerDay.toFixed(2) : "—"}</td>
                    <td className="hsv-table-cell hsv-technical-value">
                      {row.fuel > 0 ? `${round(row.fuel, 1)} (${row.fuelWeeksReported}/${row.weeksTotal} sem.)` : "—"}
                    </td>
                  </tr>
                ))}
                {!rows.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={10}>
                      No hay faenas registradas todavía.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-ink-muted" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Consumo de AVGAS anual</h2>
          </div>
          <p className="mb-4 text-xs text-ink-subtle">
            Suma del combustible autorreportado en cada reporte semanal ({"‘"}Consumo combustible{"’"}) contra las horas voladas
            registradas ese mismo año, para todas las aeronaves. El galón/hora sirve para comparar consumo real entre años o detectar
            reportes incompletos.
          </p>
          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Año</th>
                  <th className="hsv-table-th">Horas voladas</th>
                  <th className="hsv-table-th">AVGAS reportado (gal)</th>
                  <th className="hsv-table-th">Gal / hora</th>
                  <th className="hsv-table-th">Cobertura de reporte</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {annualFuel.map((year) => (
                  <tr key={year.year} className="hsv-table-row">
                    <td className="hsv-table-cell font-semibold text-ink">{year.year}</td>
                    <td className="hsv-table-cell hsv-technical-value">{round(year.totalHours, 1)}</td>
                    <td className="hsv-table-cell hsv-technical-value">{round(year.totalFuel, 1)}</td>
                    <td className="hsv-table-cell hsv-technical-value">{year.galsPerHour != null ? year.galsPerHour.toFixed(1) : "—"}</td>
                    <td className="hsv-table-cell text-ink-muted">
                      {year.reportedWeeks} de {year.totalWeeks} semanas con dato de combustible
                    </td>
                  </tr>
                ))}
                {!annualFuel.length ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={5}>
                      No hay registros de vuelo todavía.
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
