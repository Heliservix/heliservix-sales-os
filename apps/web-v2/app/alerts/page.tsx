import Link from "next/link";
import { AlertTriangle, CalendarClock, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updateAlertStatus } from "@/app/alerts/actions";
import { buildMaintenanceSchedule, type ScheduledInspection } from "@/lib/maintenance-schedule";

const SCHEDULE_TONE: Record<ScheduledInspection["status"], "red" | "amber" | "green"> = {
  Overdue: "red",
  "Due soon": "amber",
  OK: "green"
};

export const dynamic = "force-dynamic";

type AlertRow = {
  id: string;
  helicopter_registration: string;
  component_name: string | null;
  alert_type: string;
  severity: "Info" | "Monitor" | "Critical" | "Grounding";
  trigger_basis: "Hours" | "Calendar" | "Data" | "Forecast" | null;
  remaining_hours: number | null;
  remaining_calendar_days: number | null;
  due_date: string | null;
  status: "Open" | "Acknowledged" | "In Progress" | "Resolved";
  description: string | null;
  helicopters: { model: string } | null;
};

const SEVERITY_RANK: Record<AlertRow["severity"], number> = { Grounding: 0, Critical: 1, Monitor: 2, Info: 3 };
const SEVERITY_TONE: Record<AlertRow["severity"], "red" | "amber" | "blue" | "neutral"> = {
  Grounding: "red",
  Critical: "red",
  Monitor: "amber",
  Info: "blue"
};

function basisLabel(basis: AlertRow["trigger_basis"]) {
  switch (basis) {
    case "Hours":
      return "Horas";
    case "Calendar":
      return "Calendario";
    case "Forecast":
      return "Pronóstico";
    case "Data":
      return "Dato";
    default:
      return "—";
  }
}

export default async function AlertsPage() {
  const [{ data, error }, schedule] = await Promise.all([
    supabase
      .from("maintenance_alerts")
      .select(
        "id, helicopter_registration, component_name, alert_type, severity, trigger_basis, remaining_hours, remaining_calendar_days, due_date, status, description, helicopters(model)"
      )
      .neq("status", "Resolved")
      .order("created_at", { ascending: true }),
    buildMaintenanceSchedule()
  ]);

  const alerts = ((data ?? []) as unknown as AlertRow[]).sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  const groundingCount = alerts.filter((a) => a.severity === "Grounding").length;
  const criticalCount = alerts.filter((a) => a.severity === "Critical").length;
  const monitorCount = alerts.filter((a) => a.severity === "Monitor").length;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Mantenimiento"
          title="Plan de Mantenimiento"
          description="Alertas generadas automáticamente cuando un componente entra en Monitor, Critical o Expired. Se abren, actualizan y cierran solas — esta vista es para decidir qué atacar primero."
          icon={AlertTriangle}
        />

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Panel className="!p-4">
            <p className="text-xs font-semibold uppercase text-ink-subtle">En tierra (Grounding)</p>
            <p className="mt-1 text-2xl font-semibold text-aviation-red">{groundingCount}</p>
          </Panel>
          <Panel className="!p-4">
            <p className="text-xs font-semibold uppercase text-ink-subtle">Críticas</p>
            <p className="mt-1 text-2xl font-semibold text-aviation-red">{criticalCount}</p>
          </Panel>
          <Panel className="!p-4">
            <p className="text-xs font-semibold uppercase text-ink-subtle">En monitoreo</p>
            <p className="mt-1 text-2xl font-semibold text-aviation-amber">{monitorCount}</p>
          </Panel>
        </div>

        <Panel>
          {error ? (
            <div className="hsv-error-banner">
              No se pudo conectar con la base de datos: {error.message}.
            </div>
          ) : null}

          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Severidad</th>
                  <th className="hsv-table-th">Helicóptero</th>
                  <th className="hsv-table-th">Componente</th>
                  <th className="hsv-table-th">Base</th>
                  <th className="hsv-table-th">Remanente</th>
                  <th className="hsv-table-th">Fecha límite</th>
                  <th className="hsv-table-th">Estado</th>
                  <th className="hsv-table-th">Acción</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hsv-table-row">
                    <td className="hsv-table-cell">
                      <StatusPill tone={SEVERITY_TONE[alert.severity]}>{alert.severity}</StatusPill>
                    </td>
                    <td className="hsv-table-cell">
                      <p className="font-semibold text-ink">{alert.helicopter_registration}</p>
                      <p className="text-xs text-ink-subtle">{alert.helicopters?.model}</p>
                    </td>
                    <td className="hsv-table-cell">
                      <p className="text-ink">{alert.component_name ?? "—"}</p>
                      <p className="text-xs text-ink-subtle">{alert.description}</p>
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{basisLabel(alert.trigger_basis)}</td>
                    <td className="hsv-table-cell hsv-technical-value">
                      {alert.remaining_hours != null ? `${Number(alert.remaining_hours).toFixed(1)} hrs` : null}
                      {alert.remaining_hours != null && alert.remaining_calendar_days != null ? " · " : ""}
                      {alert.remaining_calendar_days != null ? `${alert.remaining_calendar_days} días` : null}
                      {alert.remaining_hours == null && alert.remaining_calendar_days == null ? "—" : null}
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{alert.due_date ?? "—"}</td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={alert.status === "Open" ? "neutral" : "blue"}>{alert.status}</StatusPill>
                    </td>
                    <td className="hsv-table-cell">
                      <form action={updateAlertStatus} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={alert.id} />
                        <select className="hsv-control !py-1 !text-xs" name="status" defaultValue={alert.status}>
                          <option value="Open">Abierta</option>
                          <option value="Acknowledged">Reconocida</option>
                          <option value="In Progress">En progreso</option>
                          <option value="Resolved">Resuelta</option>
                        </select>
                        <button className="hsv-secondary-button !px-3 !py-1 !text-xs" type="submit">
                          Guardar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {!alerts.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={8}>
                      No hay alertas abiertas. La flota está dentro de sus límites.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="mt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-ink-muted" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Inspecciones programadas (manual Robinson)</h2>
            </div>
            <Link className="hsv-secondary-button" href="/maintenance/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Registrar mantenimiento en hangar
            </Link>
          </div>
          <p className="mb-4 text-sm text-ink-subtle">
            Calculado solo de tu historial real: detecta los tipos de inspección por horas (25 HRS, 50 HRS, 100 HRS, etc.) que ya
            registraste y avisa cuándo toca la próxima según el horómetro actual de cada máquina. No depende de una lista fija —
            si cambia el ciclo, esto se ajusta solo.
          </p>
          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Helicóptero</th>
                  <th className="hsv-table-th">Inspección</th>
                  <th className="hsv-table-th">Última vez</th>
                  <th className="hsv-table-th">Próxima a</th>
                  <th className="hsv-table-th">Faltan</th>
                  <th className="hsv-table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {schedule.map((item) => (
                  <tr key={`${item.helicopterRegistration}-${item.maintenanceType}`} className="hsv-table-row">
                    <td className="hsv-table-cell font-semibold text-ink">{item.helicopterRegistration}</td>
                    <td className="hsv-table-cell text-ink-muted">{item.maintenanceType}</td>
                    <td className="hsv-table-cell hsv-technical-value">
                      {item.lastDoneAtHourmeter.toFixed(1)} hrs {item.lastDoneDate ? `(${item.lastDoneDate})` : ""}
                    </td>
                    <td className="hsv-table-cell hsv-technical-value">{item.nextDueAtHourmeter.toFixed(1)} hrs</td>
                    <td className="hsv-table-cell hsv-technical-value">
                      {item.hoursRemaining > 0 ? `${item.hoursRemaining.toFixed(1)} hrs` : `vencida hace ${Math.abs(item.hoursRemaining).toFixed(1)} hrs`}
                    </td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={SCHEDULE_TONE[item.status]}>
                        {item.status === "Overdue" ? "Vencida" : item.status === "Due soon" ? "Se acerca" : "OK"}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
                {!schedule.length ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={6}>
                      Todavía no hay suficiente historial de inspecciones por horas (25/50/100 HRS) para calcular esto. Aparece
                      solo cuando subes reportes semanales con esa información.
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
