import Link from "next/link";
import { AlertTriangle, CalendarClock, ShieldAlert, TrendingUp, Wrench, Bot } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { HorizontalBarChart, type BarChartDatum } from "@/components/charts/bar-chart";
import { supabase } from "@/lib/supabase";
import { updateAlertStatus } from "@/app/alerts/actions";
import { buildMaintenanceSchedule, type ScheduledInspection } from "@/lib/maintenance-schedule";
import { buildAuraAnalysis, type AuraForecastBucket } from "@/lib/aura";
import { getPersonnelDocumentStatuses, daysUntil as daysUntilDoc, documentTone, type PersonnelDocumentRow } from "@/lib/personnel-compliance";
import { getSessionUser } from "@/lib/auth";

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

type AlertsPageProps = {
  searchParams: Promise<{ registration?: string }>;
};

type PolicyAlertKind = "Póliza" | "Pago" | "Documento";

type PolicyAlertRow = {
  key: string;
  kind: PolicyAlertKind;
  subject: string; // helicopter registration or person's name
  label: string; // what's due (e.g. "Vigencia", "Cuota", "Licencia")
  dueDate: string;
  daysUntil: number;
  tone: "red" | "amber";
  href: string;
};

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const { registration: selectedRegistration } = await searchParams;

  const session = await getSessionUser();
  // Un Mecánico ve este módulo para atacar mantenimiento — no necesita, y
  // Adolfo pidió explícitamente que no vea, nada económico (vigencias de
  // pólizas, montos de cuotas). Los admins siguen viendo todo.
  const isMechanicViewer = Boolean(session && !session.isAdmin && session.personnelRole === "Mecánico");

  const [{ data, error }, schedule, { data: helicopters }, auraAnalysis, { data: policyData }, { data: paymentData }, { data: personnelData }] =
    await Promise.all([
      supabase
        .from("maintenance_alerts")
        .select(
          "id, helicopter_registration, component_name, alert_type, severity, trigger_basis, remaining_hours, remaining_calendar_days, due_date, status, description, helicopters(model)"
        )
        .neq("status", "Resolved")
        .order("created_at", { ascending: true }),
      buildMaintenanceSchedule(),
      supabase.from("helicopters").select("registration").eq("archived", false).order("registration"),
      buildAuraAnalysis(),
      supabase.from("insurance_policies").select("id, helicopter_registration, end_date, status").eq("archived", false),
      supabase.from("insurance_payments").select("id, policy_id, due_date, amount, currency, status").neq("status", "Paid"),
      supabase
        .from("personnel")
        .select(
          "id, full_name, role, license_expiry, medical_certificate_expiry, recurrency_expiry, flight_check_expiry, passport_expiry, seaman_book_expiry"
        )
        .eq("archived", false)
    ]);

  // Pólizas/pagos/documentos por vencer o vencidos — mismo criterio que
  // /policies y /personnel (< 0 días = vencido, <= 60 días = por vencer),
  // reunidos aquí junto con el resto de las alertas del sistema (Adolfo pidió
  // que quedaran "junto con las demás alertas" en vez de una página aparte).
  const policyAlerts: PolicyAlertRow[] = [];

  for (const policy of policyData ?? []) {
    if (policy.status !== "Active" || !policy.end_date) continue;
    const days = daysUntilDoc(policy.end_date);
    const tone = documentTone(days);
    if (tone === "green") continue;
    policyAlerts.push({
      key: `policy-${policy.id}`,
      kind: "Póliza",
      subject: policy.helicopter_registration ?? "Sin helicóptero",
      label: "Vigencia",
      dueDate: policy.end_date,
      daysUntil: days,
      tone,
      href: "/policies"
    });
  }

  const policyById = new Map((policyData ?? []).map((p) => [p.id, p]));
  for (const payment of paymentData ?? []) {
    const days = daysUntilDoc(payment.due_date);
    const tone = documentTone(days);
    if (tone === "green") continue;
    const policy = policyById.get(payment.policy_id);
    policyAlerts.push({
      key: `payment-${payment.id}`,
      kind: "Pago",
      subject: policy?.helicopter_registration ?? "Sin helicóptero",
      label: `Cuota $${Number(payment.amount).toLocaleString("en-US")} ${payment.currency}`,
      dueDate: payment.due_date,
      daysUntil: days,
      tone,
      href: "/policies"
    });
  }

  for (const person of (personnelData ?? []) as PersonnelDocumentRow[]) {
    for (const doc of getPersonnelDocumentStatuses(person)) {
      if (doc.tone === "green") continue;
      policyAlerts.push({
        key: `personnel-${person.id}-${doc.key}`,
        kind: "Documento",
        subject: `${person.full_name} (${person.role})`,
        label: doc.label,
        dueDate: doc.expiry,
        daysUntil: doc.daysUntil,
        tone: doc.tone,
        href: `/personnel/${person.id}/edit`
      });
    }
  }

  policyAlerts.sort((a, b) => a.daysUntil - b.daysUntil);
  const policyAlertsRed = policyAlerts.filter((a) => a.tone === "red").length;

  // AURA's forecast (lib/aura.ts) combines hours AND calendar, looking
  // forward — unlike the alerts above, which only exist once something has
  // ALREADY crossed a threshold. Showing both here means a técnico doesn't
  // have to separately visit /aura to see what's coming before it fires.
  const forecastBuckets: AuraForecastBucket[] = [30, 60, 90];
  const nearForecastAll = forecastBuckets.flatMap((bucket) => auraAnalysis.maintenanceForecast[bucket]);
  const nearForecast = (
    selectedRegistration ? nearForecastAll.filter((item) => item.helicopterRegistration === selectedRegistration) : nearForecastAll
  ).slice(0, 12);
  const BUCKET_LABEL: Record<number, string> = { 30: "30 días", 60: "60 días", 90: "90 días" };
  const FORECAST_BASIS_LABEL: Record<string, string> = {
    Hours: "Horas",
    Calendar: "Calendario",
    Expired: "Vencido",
    "Hours and Calendar": "Horas y calendario"
  };

  const allAlerts = ((data ?? []) as unknown as AlertRow[]).sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const alerts = selectedRegistration ? allAlerts.filter((a) => a.helicopter_registration === selectedRegistration) : allAlerts;
  const filteredSchedule = selectedRegistration
    ? schedule.filter((item) => item.helicopterRegistration === selectedRegistration)
    : schedule;

  const groundingCount = alerts.filter((a) => a.severity === "Grounding").length;
  const criticalCount = alerts.filter((a) => a.severity === "Critical").length;
  const monitorCount = alerts.filter((a) => a.severity === "Monitor").length;

  const alertsByHelicopter = new Map<string, number>();
  for (const alert of allAlerts) {
    alertsByHelicopter.set(alert.helicopter_registration, (alertsByHelicopter.get(alert.helicopter_registration) ?? 0) + 1);
  }
  const alertsByHelicopterBars: BarChartDatum[] = Array.from(alertsByHelicopter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value, tone: value >= 3 ? "red" : value >= 1 ? "amber" : "neutral" }));

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Mantenimiento"
          title="Plan de Mantenimiento"
          description="Alertas generadas automáticamente cuando un componente entra en Monitor, Critical o Expired. Se abren, actualizan y cierran solas — esta vista es para decidir qué atacar primero."
          icon={AlertTriangle}
        />

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Link href="/maintenance/new" className="hsv-primary-button">
            <Wrench className="h-4 w-4" aria-hidden="true" />
            Registrar mantenimiento en hangar
          </Link>
          <Link href="/aura" className="hsv-secondary-button">
            <Bot className="h-4 w-4" aria-hidden="true" />
            Consejos de AURA
          </Link>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Link
            href="/alerts"
            className={
              !selectedRegistration
                ? "rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white"
                : "rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-muted hover:border-aviation-teal hover:text-ink"
            }
          >
            Todos
          </Link>
          {(helicopters ?? []).map((h) => (
            <Link
              key={h.registration}
              href={`/alerts?registration=${h.registration}`}
              className={
                selectedRegistration === h.registration
                  ? "rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white"
                  : "rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-muted hover:border-aviation-teal hover:text-ink"
              }
            >
              {h.registration}
            </Link>
          ))}
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            <p className="text-xs font-semibold uppercase text-ink-subtle">Alertas abiertas por helicóptero</p>
            <div className="mt-3">
              <HorizontalBarChart data={alertsByHelicopterBars} />
            </div>
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
                      {selectedRegistration
                        ? `${selectedRegistration} no tiene alertas abiertas.`
                        : "No hay alertas abiertas. La flota está dentro de sus límites."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        {!isMechanicViewer ? (
          <Panel className="mt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-ink-muted" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-ink">Pólizas y documentos del personal</h2>
              </div>
              {policyAlertsRed > 0 ? <StatusPill tone="red">{policyAlertsRed} vencido(s)</StatusPill> : null}
            </div>
            <p className="mb-4 text-sm text-ink-subtle">
              Vigencia de pólizas, cuotas pendientes y documentos de pilotos/mecánicos (licencia, médico, recurrencia, chequeo de
              vuelo, pasaporte) que ya vencieron o vencen dentro de 60 días.
            </p>
            <div className="hsv-table-wrap">
              <table className="hsv-table">
                <thead className="hsv-table-head">
                  <tr>
                    <th className="hsv-table-th">Tipo</th>
                    <th className="hsv-table-th">Quién / Qué</th>
                    <th className="hsv-table-th">Detalle</th>
                    <th className="hsv-table-th">Vence</th>
                    <th className="hsv-table-th">Estado</th>
                  </tr>
                </thead>
                <tbody className="hsv-table-body">
                  {policyAlerts.map((alert) => (
                    <tr key={alert.key} className="hsv-table-row">
                      <td className="hsv-table-cell text-ink-muted">{alert.kind}</td>
                      <td className="hsv-table-cell">
                        <Link className="font-semibold text-ink hover:text-aviation-teal" href={alert.href}>
                          {alert.subject}
                        </Link>
                      </td>
                      <td className="hsv-table-cell text-ink-muted">{alert.label}</td>
                      <td className="hsv-table-cell hsv-technical-value">{alert.dueDate}</td>
                      <td className="hsv-table-cell">
                        <StatusPill tone={alert.tone}>
                          {alert.daysUntil < 0 ? `vencido hace ${Math.abs(alert.daysUntil)} días` : `${alert.daysUntil} días`}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                  {!policyAlerts.length ? (
                    <tr>
                      <td className="hsv-empty-state" colSpan={5}>
                        Nada vencido ni por vencer en pólizas o documentos del personal.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : null}

        <Panel className="mt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-ink-muted" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Lo que se viene (pronóstico de AURA, 30-90 días)</h2>
            </div>
            <Link className="text-sm font-semibold text-aviation-teal hover:underline" href="/aura">
              Ver pronóstico completo (hasta 365 días) →
            </Link>
          </div>
          <p className="mb-4 text-sm text-ink-subtle">
            Esto todavía NO son alertas — es lo que AURA proyecta que va a vencer pronto, combinando la tendencia de horas
            voladas y la fecha de calendario de cada componente. Sirve para planear antes de que algo pase a la tabla de
            arriba.
          </p>
          <div className="hsv-table-wrap">
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
                    <td className="hsv-table-cell">{BUCKET_LABEL[item.bucket] ?? `${item.bucket} días`}</td>
                    <td className="hsv-table-cell font-semibold text-ink">{item.helicopterRegistration}</td>
                    <td className="hsv-table-cell text-ink-muted">{item.componentName}</td>
                    <td className="hsv-table-cell hsv-technical-value">{item.dueInDays} días</td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={item.dueBasis === "Calendar" ? "amber" : item.dueBasis === "Expired" ? "red" : "neutral"}>
                        {FORECAST_BASIS_LABEL[item.dueBasis] ?? item.dueBasis}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
                {!nearForecast.length ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={5}>
                      {selectedRegistration
                        ? `${selectedRegistration} no tiene nada pronosticado dentro de 90 días.`
                        : "Nada pronosticado dentro de 90 días para toda la flota."}
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
                {filteredSchedule.map((item) => (
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
                {!filteredSchedule.length ? (
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
