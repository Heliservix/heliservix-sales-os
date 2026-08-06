import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { HelicopterBadge } from "@/components/aircraft/helicopter-badge";
import { buildMaintenanceReport, FORECAST_BASIS_LABEL } from "@/lib/maintenance-report";
import { PrintButton } from "@/app/reports/faena/[id]/print-button";

export const dynamic = "force-dynamic";

const HELICOPTER_STATUS_TONE: Record<string, "green" | "amber" | "blue" | "teal" | "red" | "neutral"> = {
  Available: "teal",
  Assigned: "blue",
  "In Campaign": "green",
  Maintenance: "amber",
  Grounded: "red",
  Retired: "neutral"
};

const COMPONENT_STATUS_TONE: Record<string, "green" | "amber" | "red"> = {
  OK: "green",
  Monitor: "amber",
  Critical: "red",
  Expired: "red"
};

export default async function MaintenanceReportPage({ params }: { params: Promise<{ registration: string }> }) {
  const { registration } = await params;
  const report = await buildMaintenanceReport(registration);
  if (!report) notFound();

  return (
    <div className="min-h-screen bg-canvas-muted px-4 py-8 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center justify-between print:hidden">
          <Link href="/reports" className="hsv-ghost-button -ml-2.5">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a Reportes
          </Link>
          <PrintButton />
        </div>

        <div className="hsv-panel print:border-none print:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">HeliServiX OS — Informe de mantenimiento</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <HelicopterBadge registration={report.registration} photoUrl={report.photoUrl} size="lg" showLabel={false} />
              <h1 className="text-2xl font-semibold text-ink">
                {report.registration} — {report.model}
              </h1>
            </div>
            <StatusPill tone={HELICOPTER_STATUS_TONE[report.status] ?? "neutral"}>{report.status}</StatusPill>
          </div>
          <p className="mt-1 text-sm text-ink-subtle">
            Serie {report.serialNumber || "N/A"} · Fabricación {report.manufactureYear || "N/A"} · Horómetro{" "}
            {report.currentHourmeter.toFixed(1)} hrs · Última revisión {report.lastReviewDate ?? "N/A"}
          </p>
        </div>

        {/* Opinión gerencial */}
        <div className="hsv-panel mt-5 border-aviation-teal/25 bg-aviation-teal/5 print:border-line print:bg-white">
          <h2 className="text-lg font-semibold text-ink">Opinión gerencial</h2>
          <div className="mt-3 grid gap-2.5">
            {report.managementOpinion.map((p, i) => (
              <p key={i} className="text-sm leading-6 text-ink">
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* Salud de la aeronave */}
        <div className="hsv-panel mt-5 print:border-line">
          <h2 className="text-lg font-semibold text-ink">Salud de la aeronave</h2>
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <ScoreGauge score={report.healthScore} label="Salud" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">Factores</p>
              <ul className="mt-1 grid gap-1">
                {report.healthDrivers.map((d, i) => (
                  <li key={i} className="text-sm text-ink-subtle">
                    · {d}
                  </li>
                ))}
              </ul>
              {report.healthEvidence.length ? (
                <p className="mt-2 text-xs text-ink-subtle">{report.healthEvidence.join(" · ")}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Componentes */}
        <div className="hsv-panel mt-5 print:border-line">
          <h2 className="text-lg font-semibold text-ink">Componentes</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Activos" value={report.components.total.toString()} />
            <Stat label="Monitoreo" value={report.components.monitor.toString()} />
            <Stat label="Críticos" value={report.components.critical.toString()} />
            <Stat label="Vencidos" value={report.components.expired.toString()} />
          </div>
          {report.components.list.length ? (
            <div className="hsv-table-wrap mt-4">
              <table className="hsv-table">
                <thead className="hsv-table-head">
                  <tr>
                    <th className="hsv-table-th">Componente</th>
                    <th className="hsv-table-th">P/N · S/N</th>
                    <th className="hsv-table-th">Remanente</th>
                    <th className="hsv-table-th">Vence calendario</th>
                    <th className="hsv-table-th">Estado</th>
                  </tr>
                </thead>
                <tbody className="hsv-table-body">
                  {report.components.list.map((c) => (
                    <tr key={c.id} className="hsv-table-row">
                      <td className="hsv-table-cell font-semibold text-ink">{c.componentName}</td>
                      <td className="hsv-table-cell text-ink-muted">
                        {c.partNumber} · {c.serialNumber}
                      </td>
                      <td className="hsv-table-cell hsv-technical-value">
                        {c.remainingHours.toFixed(1)} hrs ({c.remainingPercentage.toFixed(1)}%)
                      </td>
                      <td className="hsv-table-cell text-ink-muted">
                        {c.calendarLimitDate ?? "Sin límite"}
                        {c.remainingCalendarDays != null ? ` · ${c.remainingCalendarDays} días` : ""}
                      </td>
                      <td className="hsv-table-cell">
                        <StatusPill tone={COMPONENT_STATUS_TONE[c.status] ?? "neutral"}>{c.status}</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-subtle">Todos los componentes activos están en estado OK.</p>
          )}
        </div>

        {/* Pronóstico de mantenimiento */}
        <div className="hsv-panel mt-5 print:border-line">
          <h2 className="text-lg font-semibold text-ink">Pronóstico de mantenimiento (365 días)</h2>
          {report.forecast.length ? (
            <div className="hsv-table-wrap mt-4">
              <table className="hsv-table">
                <thead className="hsv-table-head">
                  <tr>
                    <th className="hsv-table-th">Componente</th>
                    <th className="hsv-table-th">Vence en</th>
                    <th className="hsv-table-th">Motivo</th>
                  </tr>
                </thead>
                <tbody className="hsv-table-body">
                  {report.forecast.map((f) => (
                    <tr key={f.componentId} className="hsv-table-row">
                      <td className="hsv-table-cell font-semibold text-ink">{f.componentName}</td>
                      <td className="hsv-table-cell hsv-technical-value">{f.dueInDays} días</td>
                      <td className="hsv-table-cell text-ink-muted">{FORECAST_BASIS_LABEL[f.dueBasis]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-subtle">No hay vencimientos previstos dentro de los próximos 365 días.</p>
          )}
        </div>

        {/* Alertas abiertas */}
        <div className="hsv-panel mt-5 print:border-line">
          <h2 className="text-lg font-semibold text-ink">Alertas de mantenimiento abiertas</h2>
          {report.openAlerts.length ? (
            <ul className="mt-3 grid gap-1.5">
              {report.openAlerts.map((a, i) => (
                <li key={i} className="text-sm text-ink-subtle">
                  <StatusPill tone={a.severity === "Critical" || a.severity === "Grounding" ? "red" : "amber"}>{a.severity}</StatusPill>{" "}
                  {a.componentName ?? a.alertType}: {a.description ?? "Sin descripción"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-subtle">Sin alertas abiertas actualmente.</p>
          )}
        </div>

        {/* Cumplimiento */}
        <div className="hsv-panel mt-5 print:border-line">
          <h2 className="text-lg font-semibold text-ink">Cumplimiento (AD / SB / requisitos)</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Ítems aplicables" value={report.compliance.items.length.toString()} />
            <Stat label="Vencidos" value={report.compliance.overdueCount.toString()} />
            <Stat label="Sin revisar" value={report.compliance.unreviewedCount.toString()} />
          </div>
          {report.compliance.items.length ? (
            <ul className="mt-4 grid gap-1.5">
              {report.compliance.items.map((item, i) => (
                <li key={i} className="text-sm text-ink-subtle">
                  <StatusPill tone={item.overdue ? "red" : item.status === "Not reviewed" ? "amber" : "neutral"}>{item.status}</StatusPill>{" "}
                  {item.authority} {item.complianceType} {item.referenceNumber ?? ""} — {item.title}
                  {item.fleetWide ? " (aplica a toda la flota)" : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-subtle">No hay ítems de cumplimiento cargados para esta aeronave.</p>
          )}
        </div>

        {/* Recomendaciones de AURA relacionadas */}
        {report.relatedRecommendations.length ? (
          <div className="hsv-panel mt-5 print:border-line">
            <h2 className="text-lg font-semibold text-ink">Recomendaciones de AURA para esta aeronave</h2>
            <ul className="mt-3 grid gap-2">
              {report.relatedRecommendations.map((r, i) => (
                <li key={i} className="rounded-lg border border-line bg-canvas-muted/30 p-3 text-sm text-ink">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Advertencias */}
        <div className="hsv-panel mt-5 print:border-line">
          <h2 className="text-lg font-semibold text-ink">Advertencias y datos faltantes</h2>
          <ul className="mt-3 grid gap-2">
            {report.advisories.map((a, i) => (
              <li key={i} className="rounded-lg border border-line bg-canvas-muted/30 p-3 text-sm text-ink">
                {a}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-5 text-center text-xs text-ink-subtle print:mt-8">
          Generado automáticamente por HeliServiX OS a partir de datos reales. No sustituye el juicio del administrador.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-ink-subtle">{label}</p>
      <p className="hsv-technical-value mt-1 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}
