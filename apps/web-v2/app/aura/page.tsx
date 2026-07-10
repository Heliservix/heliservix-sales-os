import { Bot, ShoppingCart, Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { buildAuraAnalysis, type AuraPriority, type AuraTone, type ProcurementUrgency } from "@/lib/aura";

export const dynamic = "force-dynamic";

const PRIORITY_TONE: Record<AuraPriority, AuraTone> = { Critical: "red", High: "amber", Medium: "blue", Monitor: "neutral" };
const BUCKET_LABEL: Record<number, string> = { 30: "30 días", 60: "60 días", 90: "90 días", 180: "180 días", 365: "365 días" };
const URGENCY_TONE: Record<ProcurementUrgency, AuraTone> = { Immediate: "red", Soon: "amber", "Plan ahead": "blue" };
const URGENCY_LABEL: Record<ProcurementUrgency, string> = { Immediate: "Inmediato", Soon: "Pronto", "Plan ahead": "Planificar" };

export default async function AuraPage() {
  const analysis = await buildAuraAnalysis();
  const nearForecast = [
    ...analysis.maintenanceForecast[30],
    ...analysis.maintenanceForecast[60],
    ...analysis.maintenanceForecast[90]
  ].slice(0, 10);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="AURA"
          title="Recomendaciones de AURA"
          description="Motor de reglas determinístico sobre tus datos reales — sin IA externa, sin costo por uso. Cada número aquí viene de una fórmula auditable, no de un modelo de lenguaje."
          icon={Bot}
        />

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Panel className="!p-4">
            <p className="text-xs font-semibold uppercase text-ink-subtle">Salud de flota</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{analysis.fleetHealth.score}%</p>
          </Panel>
          <Panel className="!p-4">
            <p className="text-xs font-semibold uppercase text-ink-subtle">Vencimientos próximos (≤90 días)</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{nearForecast.length}</p>
          </Panel>
        </div>

        <Panel className="mb-5">
          <h2 className="text-lg font-semibold text-ink">Recomendaciones del día</h2>
          <div className="mt-4 grid gap-3">
            {analysis.executiveRecommendations.map((rec) => (
              <div key={rec.id} className="rounded-xl border border-line bg-canvas-muted/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={PRIORITY_TONE[rec.priority]}>{rec.priority}</StatusPill>
                  <span className="text-sm font-semibold text-ink">{rec.subject}</span>
                  <span className="text-xs text-ink-subtle">Confianza {rec.confidence}%</span>
                </div>
                <p className="mt-2 text-sm text-ink">{rec.recommendation}</p>
                <p className="mt-1 text-sm text-ink-subtle">{rec.operationalImpact}</p>
                <p className="mt-2 text-xs font-semibold uppercase text-ink-subtle">Acción recomendada</p>
                <p className="text-sm text-ink-muted">{rec.recommendedAction}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {rec.evidence.map((item) => (
                    <li key={item} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-subtle">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="mb-5">
          <h2 className="text-lg font-semibold text-ink">Pronóstico de mantenimiento</h2>
          <p className="mt-1 text-sm text-ink-subtle">
            Combina tendencia de horas voladas y fecha de calendario. &ldquo;Calendar&rdquo; significa que vence por fecha antes que por uso.
          </p>
          <div className="hsv-table-wrap mt-4">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Ventana</th>
                  <th className="hsv-table-th">Helicóptero</th>
                  <th className="hsv-table-th">Componente</th>
                  <th className="hsv-table-th">Vence en</th>
                  <th className="hsv-table-th">Por</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {nearForecast.map((item) => (
                  <tr key={item.componentId} className="hsv-table-row">
                    <td className="hsv-table-cell">{BUCKET_LABEL[item.bucket]}</td>
                    <td className="hsv-table-cell font-semibold text-ink">{item.helicopterRegistration}</td>
                    <td className="hsv-table-cell text-ink-muted">{item.componentName}</td>
                    <td className="hsv-table-cell hsv-technical-value">{item.dueInDays} días</td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={item.dueBasis === "Calendar" ? "amber" : item.dueBasis === "Expired" ? "red" : "neutral"}>
                        {item.dueBasis === "Hours" ? "Horas" : item.dueBasis === "Calendar" ? "Calendario" : item.dueBasis === "Expired" ? "Vencido" : "Horas y calendario"}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
                {!nearForecast.length ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={5}>
                      Nada pronosticado dentro de 90 días.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="mb-5">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-ink-muted" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Trabajos por helicóptero</h2>
          </div>
          <p className="mt-1 text-sm text-ink-subtle">
            Alertas abiertas y vencimientos dentro de 180 días, agrupados por aeronave — qué hacer en cada máquina, no en la flota
            en general.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {analysis.workByHelicopter.map((plan) => (
              <div key={plan.registration} className="rounded-xl border border-line bg-canvas-muted/30 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{plan.registration}</p>
                  <p className="text-xs text-ink-subtle">{plan.model}</p>
                </div>
                <ul className="mt-3 grid gap-2">
                  {plan.items.map((item) => (
                    <li key={`${item.label}-${item.detail}`} className="flex items-start justify-between gap-3 rounded-lg bg-white p-2.5">
                      <div>
                        <p className="text-sm font-semibold text-ink">{item.label}</p>
                        <p className="text-xs text-ink-subtle">{item.detail}</p>
                      </div>
                      <StatusPill tone={item.tone}>{item.type === "Alert" ? "Alerta" : "Pronóstico"}</StatusPill>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!analysis.workByHelicopter.length ? <p className="hsv-empty-state">Ninguna aeronave tiene trabajo pendiente detectado.</p> : null}
          </div>
        </Panel>

        <Panel className="mb-5">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-ink-muted" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Recomendaciones de compra</h2>
          </div>
          <p className="mt-1 text-sm text-ink-subtle">
            Repuestos que vas a necesitar según el pronóstico de vencimiento, cruzado con la bodega de cada barco y los pedidos
            ya en curso — para no comprar dos veces algo que ya tienes o ya pediste, ni quedarte parado esperando un componente
            sin P/N registrado.
          </p>
          <div className="hsv-table-wrap mt-4">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Urgencia</th>
                  <th className="hsv-table-th">Helicóptero</th>
                  <th className="hsv-table-th">Componente</th>
                  <th className="hsv-table-th">P/N</th>
                  <th className="hsv-table-th">Necesario en</th>
                  <th className="hsv-table-th">Por</th>
                  <th className="hsv-table-th">Cobertura</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {analysis.procurementRecommendations.map((item) => (
                  <tr key={`${item.helicopterRegistration}-${item.partNumber}-${item.serialNumber}`} className="hsv-table-row">
                    <td className="hsv-table-cell">
                      <StatusPill tone={URGENCY_TONE[item.urgency]}>{URGENCY_LABEL[item.urgency]}</StatusPill>
                    </td>
                    <td className="hsv-table-cell font-semibold text-ink">{item.helicopterRegistration}</td>
                    <td className="hsv-table-cell text-ink-muted">{item.componentName}</td>
                    <td className="hsv-table-cell hsv-technical-value">{item.partNumber || "—"}</td>
                    <td className="hsv-table-cell hsv-technical-value">{item.dueInDays} días</td>
                    <td className="hsv-table-cell text-ink-muted">
                      {item.dueBasis === "Hours" ? "Horas" : item.dueBasis === "Calendar" ? "Calendario" : item.dueBasis === "Expired" ? "Vencido" : "Horas y calendario"}
                    </td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={item.coverage === "En stock" ? "green" : item.coverage === "Pedido en curso" ? "blue" : "amber"}>
                        {item.coverage}
                      </StatusPill>
                      {item.coverage === "En stock" && <p className="mt-0.5 text-xs text-ink-subtle">{item.stockOnHand} en bodega</p>}
                      {item.coverage === "Pedido en curso" && <p className="mt-0.5 text-xs text-ink-subtle">{item.openOrderQuantity} pedido(s)</p>}
                    </td>
                  </tr>
                ))}
                {!analysis.procurementRecommendations.length ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={7}>
                      Nada que comprar con anticipación por ahora (nada vence dentro de 180 días).
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-5 lg:grid-cols-3">
          {[analysis.answers.expiresNext, analysis.answers.inspect, analysis.answers.highestRisk].map((answer) => (
            <Panel key={answer.title}>
              <h3 className="text-base font-semibold text-ink">{answer.title}</h3>
              <p className="mt-2 text-sm text-ink-subtle">{answer.summary}</p>
              <div className="mt-4 grid gap-2">
                {answer.records.map((record) => (
                  <div key={`${record.label}-${record.detail}`} className="rounded-lg border border-line bg-canvas-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{record.label}</p>
                      <StatusPill tone={record.tone}>{record.tone === "red" ? "Urgente" : record.tone === "amber" ? "Atención" : "Info"}</StatusPill>
                    </div>
                    <p className="mt-1 text-xs text-ink-subtle">{record.detail}</p>
                  </div>
                ))}
                {!answer.records.length ? <p className="hsv-empty-state">Sin resultados por ahora.</p> : null}
              </div>
            </Panel>
          ))}
        </div>

        <Panel className="mt-5">
          <p className="text-xs text-ink-subtle">
            AURA ya cruza Inventario, Compras y Cumplimiento en las recomendaciones de arriba. Registros Técnicos es solo
            almacenamiento de documentos y no alimenta el puntaje. Campañas alimenta el historial de horas por faena, visible en
            cada campaña.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
