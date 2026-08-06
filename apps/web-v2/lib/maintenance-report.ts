// Per-helicopter maintenance report — the mantenimiento equivalent of
// lib/faena-report.ts. Same design: deterministic, template-based prose over
// real numbers (no external LLM call), meant to be printed/saved as PDF for
// one aircraft — health score, component status, near-term forecast, open
// alerts, compliance status, and a synthesized management opinion, all on
// one page.
//
// Reuses buildAuraAnalysis() rather than recomputing the health score or
// forecast locally, so the numbers on this report always match what's shown
// on the dashboard, /aura, and /alerts for the same aircraft — one engine,
// many views.
import { supabase } from "@/lib/supabase";
import { buildAuraAnalysis, type AuraMaintenanceForecastItem } from "@/lib/aura";

export type MaintenanceReportComponent = {
  id: string;
  componentName: string;
  partNumber: string;
  serialNumber: string;
  status: "OK" | "Monitor" | "Critical" | "Expired";
  remainingHours: number;
  remainingPercentage: number;
  remainingCalendarDays: number | null;
  calendarLimitDate: string | null;
};

export type MaintenanceReportAlert = {
  componentName: string | null;
  severity: "Info" | "Monitor" | "Critical" | "Grounding";
  alertType: string;
  description: string | null;
};

export type MaintenanceReportComplianceItem = {
  title: string;
  authority: string;
  complianceType: string;
  referenceNumber: string | null;
  dueDate: string | null;
  dueHours: number | null;
  status: string;
  overdue: boolean;
  fleetWide: boolean;
};

export type MaintenanceReportForecastItem = Omit<AuraMaintenanceForecastItem, "helicopterRegistration">;

export type MaintenanceReport = {
  registration: string;
  model: string;
  status: string;
  serialNumber: string | null;
  manufactureYear: string | null;
  lastReviewDate: string | null;
  currentHourmeter: number;
  photoUrl: string | null;
  healthScore: number;
  healthDrivers: string[];
  healthEvidence: string[];
  components: {
    total: number;
    ok: number;
    monitor: number;
    critical: number;
    expired: number;
    list: MaintenanceReportComponent[];
  };
  forecast: MaintenanceReportForecastItem[];
  openAlerts: MaintenanceReportAlert[];
  compliance: {
    items: MaintenanceReportComplianceItem[];
    overdueCount: number;
    unreviewedCount: number;
  };
  relatedRecommendations: string[];
  advisories: string[];
  managementOpinion: string[];
};

const FORECAST_BASIS_LABEL: Record<AuraMaintenanceForecastItem["dueBasis"], string> = {
  Hours: "por horas",
  Calendar: "por calendario",
  Expired: "vencido",
  "Hours and Calendar": "por horas y calendario"
};

export async function buildMaintenanceReport(registration: string): Promise<MaintenanceReport | null> {
  const { data: helicopter } = await supabase
    .from("helicopters")
    .select("registration, model, status, serial_number, manufacture_year, last_review_date, current_hourmeter, photo_url")
    .eq("registration", registration)
    .maybeSingle();
  if (!helicopter) return null;

  const [{ data: components }, { data: alerts }, { data: complianceItems }, auraAnalysis] = await Promise.all([
    supabase
      .from("components")
      .select(
        "id, component_name, part_number, serial_number, status, remaining_hours, remaining_percentage, remaining_calendar_days, calendar_limit_date"
      )
      .eq("helicopter_registration", registration)
      .neq("status", "Removed"),
    supabase
      .from("maintenance_alerts")
      .select("component_name, severity, alert_type, description")
      .eq("helicopter_registration", registration)
      .neq("status", "Resolved"),
    // Compliance items either scoped to this exact aircraft, or fleet-wide
    // (related_helicopter left blank on purpose — e.g. a manual revision or
    // operational requirement that applies to every registration).
    supabase
      .from("compliance_items")
      .select("title, authority, compliance_type, reference_number, due_date, due_hours, status, related_helicopter")
      .eq("archived", false)
      .or(`related_helicopter.eq.${registration},related_helicopter.is.null`),
    buildAuraAnalysis()
  ]);

  const rawComponents = (components ?? []) as {
    id: string;
    component_name: string;
    part_number: string;
    serial_number: string;
    status: "OK" | "Monitor" | "Critical" | "Expired";
    remaining_hours: number;
    remaining_percentage: number;
    remaining_calendar_days: number | null;
    calendar_limit_date: string | null;
  }[];
  const componentRows: MaintenanceReportComponent[] = rawComponents.map((c) => ({
    id: c.id,
    componentName: c.component_name,
    partNumber: c.part_number,
    serialNumber: c.serial_number,
    status: c.status,
    remainingHours: c.remaining_hours,
    remainingPercentage: c.remaining_percentage,
    remainingCalendarDays: c.remaining_calendar_days,
    calendarLimitDate: c.calendar_limit_date
  }));
  const rawAlerts = (alerts ?? []) as {
    component_name: string | null;
    severity: "Info" | "Monitor" | "Critical" | "Grounding";
    alert_type: string;
    description: string | null;
  }[];
  const alertRows: MaintenanceReportAlert[] = rawAlerts.map((a) => ({
    componentName: a.component_name,
    severity: a.severity,
    alertType: a.alert_type,
    description: a.description
  }));
  const complianceRows = (complianceItems ?? []) as {
    title: string;
    authority: string;
    compliance_type: string;
    reference_number: string | null;
    due_date: string | null;
    due_hours: number | null;
    status: string;
    related_helicopter: string | null;
  }[];

  const currentHourmeter = Number(helicopter.current_hourmeter);
  const today = new Date().toISOString().slice(0, 10);
  const isOpenCompliance = (status: string) => status !== "Complied" && status !== "Not applicable";
  const complianceListItems: MaintenanceReportComplianceItem[] = complianceRows.map((item) => {
    const dateOverdue = item.due_date != null && item.due_date < today;
    const hoursOverdue = item.due_hours != null && currentHourmeter >= item.due_hours;
    return {
      title: item.title,
      authority: item.authority,
      complianceType: item.compliance_type,
      referenceNumber: item.reference_number,
      dueDate: item.due_date,
      dueHours: item.due_hours,
      status: item.status,
      overdue: isOpenCompliance(item.status) && (dateOverdue || hoursOverdue),
      fleetWide: item.related_helicopter == null
    };
  });
  const overdueCount = complianceListItems.filter((i) => i.overdue).length;
  const unreviewedCount = complianceListItems.filter((i) => i.status === "Not reviewed").length;

  const aircraftHealth = auraAnalysis.fleetHealth.aircraft.find((a) => a.registration === registration);
  const healthScore = aircraftHealth?.score ?? 100;
  const healthDrivers = aircraftHealth?.drivers ?? ["Sin factor de riesgo relevante detectado"];
  const healthEvidence = aircraftHealth?.evidence ?? [];

  const forecast: MaintenanceReportForecastItem[] = ([30, 60, 90, 180, 365] as const)
    .flatMap((bucket) => auraAnalysis.maintenanceForecast[bucket])
    .filter((item) => item.helicopterRegistration === registration)
    .map(({ helicopterRegistration: _drop, ...rest }) => rest)
    .sort((a, b) => a.dueInDays - b.dueInDays);

  const componentIds = new Set(componentRows.map((c) => c.id));
  const relatedRecommendations = auraAnalysis.executiveRecommendations
    .filter((rec) => rec.sourceRecords.some((id) => id === registration || componentIds.has(id)))
    .map((rec) => `${rec.subject}: ${rec.recommendation}`);

  const expiredComponents = componentRows.filter((c) => c.status === "Expired");
  const criticalComponents = componentRows.filter((c) => c.status === "Critical");
  const monitorComponents = componentRows.filter((c) => c.status === "Monitor");
  const groundingAlerts = alertRows.filter((a) => a.severity === "Grounding");

  const advisories: string[] = [];
  if (expiredComponents.length) {
    advisories.push(
      `${expiredComponents.length} componente(s) vencido(s) (por horas o calendario) — no se debería operar la aeronave hasta reemplazarlos.`
    );
  }
  if (criticalComponents.length) {
    advisories.push(`${criticalComponents.length} componente(s) en estado crítico (menos del 10% de vida remanente) — planificar reemplazo de inmediato.`);
  }
  if (groundingAlerts.length) {
    advisories.push(`${groundingAlerts.length} alerta(s) de tipo "Grounding" abierta(s) — la aeronave no debería volar hasta resolverlas.`);
  }
  if (overdueCount) {
    advisories.push(`${overdueCount} ítem(s) de cumplimiento (AD/SB/requisito) vencido(s) sin marcarse como cumplidos.`);
  }
  if (unreviewedCount) {
    advisories.push(`${unreviewedCount} publicación(es) de cumplimiento sin revisar todavía contra esta aeronave.`);
  }
  if (!advisories.length) {
    advisories.push("No se detectaron banderas de mantenimiento ni de cumplimiento para esta aeronave.");
  }

  const managementOpinion: string[] = [];
  managementOpinion.push(
    `Salud de esta aeronave: ${healthScore}% — ${healthDrivers.join("; ")}.`
  );
  managementOpinion.push(
    `Componentes: ${componentRows.length} activo(s) — ${expiredComponents.length} vencido(s), ${criticalComponents.length} crítico(s), ${monitorComponents.length} en monitoreo.`
  );
  managementOpinion.push(
    alertRows.length
      ? `${alertRows.length} alerta(s) de mantenimiento abierta(s) (${alertRows.filter((a) => a.severity === "Critical" || a.severity === "Grounding").length} crítica(s)/en tierra).`
      : "No hay alertas de mantenimiento abiertas actualmente."
  );
  managementOpinion.push(
    overdueCount
      ? `${overdueCount} ítem(s) de cumplimiento vencido(s) — requieren atención inmediata.`
      : "Sin ítems de cumplimiento vencidos para esta aeronave."
  );
  if (forecast.length) {
    const next = forecast[0];
    managementOpinion.push(
      `Próximo vencimiento previsto: ${next.componentName} en ${next.dueInDays} día(s) (${FORECAST_BASIS_LABEL[next.dueBasis]}).`
    );
  } else {
    managementOpinion.push("No hay vencimientos previstos dentro de los próximos 365 días.");
  }
  managementOpinion.push(
    expiredComponents.length || criticalComponents.length || overdueCount || groundingAlerts.length
      ? "Recomendación: resolver los puntos críticos señalados antes de la próxima asignación operativa."
      : "Recomendación: continuar con el plan de mantenimiento actual — no se detectan señales de alerta relevantes."
  );

  return {
    registration: helicopter.registration,
    model: helicopter.model,
    status: helicopter.status,
    serialNumber: helicopter.serial_number,
    manufactureYear: helicopter.manufacture_year,
    lastReviewDate: helicopter.last_review_date,
    currentHourmeter,
    photoUrl: helicopter.photo_url,
    healthScore,
    healthDrivers,
    healthEvidence,
    components: {
      total: componentRows.length,
      ok: componentRows.filter((c) => c.status === "OK").length,
      monitor: monitorComponents.length,
      critical: criticalComponents.length,
      expired: expiredComponents.length,
      list: componentRows
        .filter((c) => c.status !== "OK")
        .sort((a, b) => a.remainingPercentage - b.remainingPercentage)
    },
    forecast,
    openAlerts: alertRows,
    compliance: { items: complianceListItems, overdueCount, unreviewedCount },
    relatedRecommendations,
    advisories,
    managementOpinion
  };
}

export { FORECAST_BASIS_LABEL };
