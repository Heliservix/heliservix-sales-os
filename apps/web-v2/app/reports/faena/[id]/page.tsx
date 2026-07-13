import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { buildFaenaReport } from "@/lib/faena-report";
import { PrintButton } from "@/app/reports/faena/[id]/print-button";

export const dynamic = "force-dynamic";

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

const ASSESSMENT_TONE: Record<string, "green" | "amber" | "blue" | "teal" | "red" | "neutral"> = {
  Excelente: "green",
  Buena: "teal",
  Regular: "amber",
  Deficiente: "red",
  "Sin datos": "neutral"
};

export default async function FaenaReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await buildFaenaReport(id);
  if (!report) notFound();

  const m = report.metrics;

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
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">HeliServiX OS — Informe de faena</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-ink">
              {report.campaignName} {report.campaignCode ? `— Marea ${report.campaignCode}` : ""}
            </h1>
            <StatusPill tone={STATUS_TONE[report.status] ?? "neutral"}>{report.status}</StatusPill>
          </div>
          <p className="mt-1 text-sm text-ink-subtle">
            {report.vesselName} · {report.helicopterRegistration ?? "Sin helicóptero asignado"} ·{" "}
            {report.startDate ?? "?"} → {report.endDate ?? "En curso"}
          </p>
        </div>

        {/* Opinión gerencial — first, since it's the executive summary */}
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

        {/* Resumen de operaciones de pesca */}
        <div className="hsv-panel mt-5 print:border-line">
          <h2 className="text-lg font-semibold text-ink">Resumen de operaciones de pesca</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Días de pesca" value={m.fishingDays != null ? m.fishingDays.toString() : "—"} />
            <Stat label="Horas voladas" value={m.hours > 0 ? m.hours.toFixed(1) : "—"} />
            <Stat label="Toneladas (final)" value={m.tonsFinal != null ? m.tonsFinal.toFixed(1) : "—"} />
            <Stat label="Ton / hora" value={m.tonsPerHour != null ? m.tonsPerHour.toFixed(2) : "—"} />
            <Stat label="Ton / día" value={m.tonsPerDay != null ? m.tonsPerDay.toFixed(2) : "—"} />
            <Stat label="AVGAS gal/hora" value={m.galsPerHour != null ? m.galsPerHour.toFixed(1) : "—"} />
          </div>
          <p className="mt-4 text-sm text-ink-subtle">
            {report.vesselComparison.vsPeerTonsPerHourPct != null ? (
              <>
                Comparado con el promedio histórico de {report.vesselName} ({report.vesselComparison.peerAvgTonsPerHour?.toFixed(2)} ton/hora en{" "}
                {report.vesselComparison.peerCount} faena(s)): {report.vesselComparison.vsPeerTonsPerHourPct >= 0 ? "+" : ""}
                {report.vesselComparison.vsPeerTonsPerHourPct.toFixed(0)}%.
              </>
            ) : (
              "Sin suficientes faenas cerradas de este barco para comparar."
            )}
          </p>
        </div>

        {/* Nómina */}
        <div className="hsv-panel mt-5 print:border-line">
          <h2 className="text-lg font-semibold text-ink">Nómina de la faena</h2>
          {report.payroll.people.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {report.payroll.people.map((p) => (
                <div key={p.role} className="rounded-xl border border-line bg-canvas-muted/40 p-4">
                  <p className="text-xs font-semibold uppercase text-ink-subtle">{p.role}</p>
                  <p className="text-base font-semibold text-ink">{p.name}</p>
                  <dl className="mt-3 grid gap-1.5 text-sm">
                    <Row label="Salario prorateado" value={p.breakdown.proratedSalary} />
                    <Row label="Anticipo 80% (ton.)" value={p.breakdown.tonBonusAdvance} />
                    <Row label="Saldo (peso final)" value={p.breakdown.tonBonusRemainder} />
                    <Row label="Pago al cierre" value={p.breakdown.firstPayment} bold />
                    <Row label="Pago final" value={p.breakdown.finalPayment} bold />
                    <Row label="Total faena" value={p.breakdown.total} bold accent />
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-subtle">No hay piloto/mecánico asignado con datos de salario en Personal.</p>
          )}
          {report.payroll.totalPaid != null ? (
            <p className="mt-4 text-sm font-semibold text-ink">Total nómina de la faena: ${report.payroll.totalPaid.toFixed(2)}</p>
          ) : null}
        </div>

        {/* Efectividad del técnico */}
        <div className="hsv-panel mt-5 print:border-line">
          <h2 className="text-lg font-semibold text-ink">Efectividad del técnico en el llenado de reportes semanales</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusPill tone={ASSESSMENT_TONE[report.reportQuality.assessment] ?? "neutral"}>{report.reportQuality.assessment}</StatusPill>
            {report.reportQuality.completenessScore != null ? (
              <span className="text-sm font-semibold text-ink">{report.reportQuality.completenessScore}% de completitud</span>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Semanas reportadas" value={report.reportQuality.weeksReported.toString()} />
            <Stat label="Semanas esperadas" value={report.reportQuality.expectedWeeks?.toString() ?? "—"} />
            <Stat label="Con dato de combustible" value={report.reportQuality.fuelReportedWeeks.toString()} />
            <Stat label="Con dato de aceite" value={report.reportQuality.oilReportedWeeks.toString()} />
          </div>
          {report.reportQuality.missingWeeks.length ? (
            <p className="mt-4 text-sm text-status-red">Semanas sin reporte: {report.reportQuality.missingWeeks.join(", ")}</p>
          ) : null}
          <p className="mt-4 text-xs text-ink-subtle">
            Completitud = 50% cobertura de semanas + 30% reporte de combustible + 20% reporte de aceite, sobre las semanas realmente
            recibidas. No mide juicio sobre la persona, mide si la información llegó completa al sistema.
          </p>
        </div>

        {/* Mantenimiento */}
        <div className="hsv-panel mt-5 print:border-line">
          <h2 className="text-lg font-semibold text-ink">Mantenimiento durante la faena</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Registros de mantenimiento" value={report.maintenance.maintenanceLogsCount.toString()} />
            <Stat label="No-rutinas" value={report.maintenance.nonRoutineCount.toString()} />
            <Stat label="Cambios de filtro" value={report.maintenance.filterChangesCount.toString()} />
            <Stat label="Cambios de componentes" value={report.maintenance.componentChangesCount.toString()} />
          </div>

          {report.maintenance.openAlertsNow.length ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-ink">Alertas abiertas actualmente en este helicóptero</p>
              <ul className="mt-2 grid gap-1.5">
                {report.maintenance.openAlertsNow.map((a, i) => (
                  <li key={i} className="text-sm text-ink-subtle">
                    <StatusPill tone={a.severity === "Critical" || a.severity === "Grounding" ? "red" : "amber"}>{a.severity}</StatusPill>{" "}
                    {a.componentName ?? "—"}: {a.description ?? "Sin descripción"}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-subtle">Sin alertas abiertas actualmente en este helicóptero.</p>
          )}

          {report.maintenance.fuelAnomalies.length ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-ink">Semanas con AVGAS fuera del manual Robinson R44</p>
              <ul className="mt-2 grid gap-1.5">
                {report.maintenance.fuelAnomalies.map((a, i) => (
                  <li key={i} className="text-sm text-ink-subtle">
                    Semana {a.weekNumber ?? "?"} ({a.flightDate}): {a.actualGalPerHour.toFixed(1)} gal/hora ({a.direction === "Above" ? "por encima" : "por debajo"})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

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

function Row({ label, value, bold, accent }: { label: string; value: number | null; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-subtle">{label}</dt>
      <dd className={`hsv-technical-value ${bold ? "font-semibold" : ""} ${accent ? "text-aviation-teal" : "text-ink"}`}>
        {value != null ? `$${value.toFixed(2)}` : "—"}
      </dd>
    </div>
  );
}
