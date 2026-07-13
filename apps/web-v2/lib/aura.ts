import { supabase } from "@/lib/supabase";

// AURA is the same deterministic decision-support engine originally built in
// apps/web/lib/copilot.ts, ported to read the real Supabase tables instead of
// the old localStorage FleetStore. It is NOT an LLM — every number here is a
// plain, auditable formula over real records (component hours/calendar dates,
// alerts, flight logs). That was a deliberate choice then and still holds:
// conservative, source-referenced, no autonomous mutation. If a real language
// model gets wired in later, it should sit ON TOP of these numbers (to explain
// them in prose), not replace them.
//
// Every module referenced by the original engine (Campaigns, Inventory,
// Purchasing, Compliance) is now built in web-v2 and feeds real signals here:
// Inventory + Purchasing drive the procurement coverage below (stock on hand +
// open orders by part number), Compliance drives the overdue-AD/SB executive
// recommendation. Technical Records is document storage only and doesn't feed
// scoring. The formulas still treat "no data" as "no penalty," so nothing
// breaks if a table is empty.

type HelicopterRow = {
  registration: string;
  model: string;
  status: string;
  current_hourmeter: number;
};

type ComponentRow = {
  id: string;
  helicopter_registration: string;
  component_name: string;
  part_number: string;
  serial_number: string;
  status: "OK" | "Monitor" | "Critical" | "Expired" | "Removed";
  remaining_hours: number;
  remaining_percentage: number;
  remaining_calendar_days: number | null;
  calendar_limit_date: string | null;
  life_limit_hours: number;
};

type AlertRow = {
  id: string;
  helicopter_registration: string;
  component_name: string | null;
  severity: "Info" | "Monitor" | "Critical" | "Grounding";
  alert_type: string;
  description: string | null;
  status: string;
};

type FlightLogRow = {
  helicopter_registration: string;
  flight_date: string;
  flight_hours: number;
};

type InventoryItemRow = {
  part_number: string | null;
  item_name: string;
  quantity: number;
};

type PurchaseRequestRow = {
  part_number: string | null;
  item_name: string;
  quantity: number;
  status: string;
};

type ComplianceItemRow = {
  id: string;
  title: string;
  authority: string;
  compliance_type: string;
  reference_number: string | null;
  due_date: string | null;
  due_hours: number | null;
  related_helicopter: string | null;
  status: string;
};

// Statuses on purchase_requests that still represent "on its way, not yet
// available to install" — mirrors app/purchasing/constants.ts.
const OPEN_PURCHASE_STATUSES = new Set(["Requested", "Quoted", "Approved", "Ordered", "Received", "Shipped to vessel"]);

export type AuraTone = "green" | "amber" | "blue" | "teal" | "red" | "neutral";

export type AuraAircraftScore = {
  registration: string;
  score: number;
  drivers: string[];
  evidence: string[];
};

export type AuraForecastBucket = 30 | 60 | 90 | 180 | 365;

export type AuraMaintenanceForecastItem = {
  bucket: AuraForecastBucket;
  componentId: string;
  helicopterRegistration: string;
  componentName: string;
  partNumber: string;
  serialNumber: string;
  dueBasis: "Hours" | "Calendar" | "Hours and Calendar" | "Expired";
  dueInDays: number;
  remainingHours: number;
  remainingCalendarDays: number | null;
  confidence: number;
  evidence: string[];
};

export type HelicopterWorkItem = {
  type: "Alert" | "Forecast";
  label: string;
  detail: string;
  tone: AuraTone;
  dueInDays: number | null;
};

export type HelicopterWorkPlan = {
  registration: string;
  model: string;
  items: HelicopterWorkItem[];
};

export type ProcurementUrgency = "Immediate" | "Soon" | "Plan ahead";

export type ProcurementCoverage = "En stock" | "Pedido en curso" | "Sin cobertura";

export type ProcurementRecommendation = {
  helicopterRegistration: string;
  componentName: string;
  partNumber: string;
  serialNumber: string;
  dueInDays: number;
  dueBasis: AuraMaintenanceForecastItem["dueBasis"];
  urgency: ProcurementUrgency;
  coverage: ProcurementCoverage;
  stockOnHand: number;
  openOrderQuantity: number;
};

export type AuraPriority = "Critical" | "High" | "Medium" | "Monitor";

export type AuraRecommendation = {
  id: string;
  priority: AuraPriority;
  subject: string;
  recommendation: string;
  evidence: string[];
  operationalImpact: string;
  recommendedAction: string;
  confidence: number;
  domain: "Fleet" | "Maintenance";
  sourceRecords: string[];
};

export type HelicopterRisk = {
  registration: string;
  model: string;
  score: number;
  status: string;
  criticalComponents: number;
  expiredComponents: number;
  openAlerts: number;
  recommendation: string;
};

export type AuraAnswer = {
  title: string;
  summary: string;
  records: Array<{ label: string; detail: string; tone: AuraTone }>;
};

export type AuraAnalysis = {
  fleetHealth: { score: number; aircraft: AuraAircraftScore[] };
  maintenanceForecast: Record<AuraForecastBucket, AuraMaintenanceForecastItem[]>;
  executiveRecommendations: AuraRecommendation[];
  helicopterRisks: HelicopterRisk[];
  workByHelicopter: HelicopterWorkPlan[];
  procurementRecommendations: ProcurementRecommendation[];
  answers: {
    expiresNext: AuraAnswer;
    inspect: AuraAnswer;
    highestRisk: AuraAnswer;
  };
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function priorityRank(value: AuraPriority) {
  if (value === "Critical") return 0;
  if (value === "High") return 1;
  if (value === "Medium") return 2;
  return 3;
}

function confidenceFromEvidence(evidence: string[], base: number) {
  return Math.max(55, Math.min(99, base - Math.max(0, 4 - evidence.length) * 5));
}

function monthlyFlightHourTrend(flightLogs: FlightLogRow[], helicopterRegistration: string) {
  const cutoff = Date.now() - 90 * 86400000;
  const hours = flightLogs
    .filter(
      (log) =>
        log.helicopter_registration === helicopterRegistration &&
        !Number.isNaN(new Date(log.flight_date).getTime()) &&
        new Date(log.flight_date).getTime() >= cutoff
    )
    .reduce((sum, log) => sum + Number(log.flight_hours), 0);
  return hours > 0 ? hours / 3 : 25;
}

function compareComponentExposure(left: ComponentRow, right: ComponentRow) {
  const statusRank = (status: ComponentRow["status"]) =>
    status === "Expired" ? 0 : status === "Critical" ? 1 : status === "Monitor" ? 2 : 3;
  return (
    statusRank(left.status) - statusRank(right.status) ||
    (left.remaining_calendar_days ?? Number.POSITIVE_INFINITY) - (right.remaining_calendar_days ?? Number.POSITIVE_INFINITY) ||
    left.remaining_hours - right.remaining_hours
  );
}

function buildFleetHealthEngine(helicopters: HelicopterRow[], components: ComponentRow[], openAlerts: AlertRow[]) {
  const aircraft = helicopters
    .map((helicopter) => {
      const aircraftComponents = components.filter((c) => c.helicopter_registration === helicopter.registration);
      const aircraftAlerts = openAlerts.filter((a) => a.helicopter_registration === helicopter.registration);
      const expired = aircraftComponents.filter((c) => c.status === "Expired");
      const critical = aircraftComponents.filter((c) => c.status === "Critical");
      const monitor = aircraftComponents.filter((c) => c.status === "Monitor");
      const calendarCritical = aircraftComponents.filter((c) => c.remaining_calendar_days != null && c.remaining_calendar_days <= 90);
      const penalties = [
        expired.length * 22,
        critical.length * 15,
        monitor.length * 5,
        calendarCritical.length * 4,
        aircraftAlerts.filter((a) => ["Critical", "Grounding"].includes(a.severity)).length * 10,
        aircraftAlerts.filter((a) => a.severity === "Monitor").length * 4,
        helicopter.status === "Grounded" ? 28 : helicopter.status === "Maintenance" ? 16 : 0
      ];
      const score = clampScore(100 - penalties.reduce((sum, p) => sum + p, 0));
      const drivers = [
        expired.length ? `${expired.length} componente${expired.length === 1 ? "" : "s"} vencido${expired.length === 1 ? "" : "s"}` : "",
        critical.length ? `${critical.length} componente${critical.length === 1 ? "" : "s"} crítico${critical.length === 1 ? "" : "s"}` : "",
        calendarCritical.length ? `${calendarCritical.length} venciendo por calendario (<90 días)` : ""
      ].filter(Boolean);

      return {
        registration: helicopter.registration,
        score,
        drivers: drivers.length ? drivers : ["Sin factor de riesgo relevante detectado"],
        evidence: [
          `${aircraftComponents.length} componente${aircraftComponents.length === 1 ? "" : "s"} activo${aircraftComponents.length === 1 ? "" : "s"}`,
          `${aircraftAlerts.length} alerta${aircraftAlerts.length === 1 ? "" : "s"} de mantenimiento abierta${aircraftAlerts.length === 1 ? "" : "s"}`
        ]
      };
    })
    .sort((left, right) => left.score - right.score || left.registration.localeCompare(right.registration));

  return {
    score: aircraft.length ? Math.round(aircraft.reduce((sum, a) => sum + a.score, 0) / aircraft.length) : 0,
    aircraft
  };
}

function buildMaintenanceForecastEngine(
  components: ComponentRow[],
  flightLogs: FlightLogRow[]
): Record<AuraForecastBucket, AuraMaintenanceForecastItem[]> {
  const buckets: AuraForecastBucket[] = [30, 60, 90, 180, 365];
  const forecast: Record<AuraForecastBucket, AuraMaintenanceForecastItem[]> = { 30: [], 60: [], 90: [], 180: [], 365: [] };

  components.forEach((component) => {
    const monthlyTrend = monthlyFlightHourTrend(flightLogs, component.helicopter_registration);
    const daysByHours =
      component.remaining_hours <= 0
        ? 0
        : monthlyTrend > 0
          ? Math.ceil(component.remaining_hours / (monthlyTrend / 30))
          : Number.POSITIVE_INFINITY;
    const calendarDays = component.remaining_calendar_days == null ? Number.POSITIVE_INFINITY : Math.max(0, component.remaining_calendar_days);
    const dueInDays = Math.min(daysByHours, calendarDays);
    if (!Number.isFinite(dueInDays) || dueInDays > 365) return;

    const bucket = buckets.find((b) => dueInDays <= b);
    if (!bucket) return;

    const dueBasis: AuraMaintenanceForecastItem["dueBasis"] =
      component.remaining_hours <= 0 || (component.remaining_calendar_days != null && component.remaining_calendar_days <= 0)
        ? "Expired"
        : daysByHours === calendarDays
          ? "Hours and Calendar"
          : daysByHours < calendarDays
            ? "Hours"
            : "Calendar";

    forecast[bucket].push({
      bucket,
      componentId: component.id,
      helicopterRegistration: component.helicopter_registration,
      componentName: component.component_name,
      partNumber: component.part_number,
      serialNumber: component.serial_number,
      dueBasis,
      dueInDays,
      remainingHours: component.remaining_hours,
      remainingCalendarDays: component.remaining_calendar_days,
      confidence: monthlyTrend > 0 || (component.remaining_calendar_days ?? 0) > 0 ? 86 : 62,
      evidence: [
        `${component.remaining_hours.toFixed(1)} horas remanentes`,
        component.remaining_calendar_days != null ? `${component.remaining_calendar_days} días de calendario remanentes` : "Sin límite de calendario",
        `Tendencia de ${monthlyTrend.toFixed(1)} hrs/mes`
      ]
    });
  });

  buckets.forEach((bucket) => {
    forecast[bucket] = forecast[bucket].sort(
      (left, right) => left.dueInDays - right.dueInDays || left.helicopterRegistration.localeCompare(right.helicopterRegistration)
    );
  });

  return forecast;
}

function buildExecutiveRecommendationEngine(input: {
  fleetHealth: ReturnType<typeof buildFleetHealthEngine>;
  maintenanceForecast: Record<AuraForecastBucket, AuraMaintenanceForecastItem[]>;
  openAlerts: AlertRow[];
  complianceItems: ComplianceItemRow[];
  helicopters: HelicopterRow[];
}): AuraRecommendation[] {
  const recommendations: AuraRecommendation[] = [];
  const lowestHealth = input.fleetHealth.aircraft[0];
  const urgentForecast = input.maintenanceForecast[30][0] ?? input.maintenanceForecast[60][0];
  const calendarDrivenSoon = [...input.maintenanceForecast[30], ...input.maintenanceForecast[60], ...input.maintenanceForecast[90]].filter(
    (item) => item.dueBasis === "Calendar"
  );

  if (lowestHealth && lowestHealth.score < 75) {
    recommendations.push({
      id: `fleet-health-${lowestHealth.registration}`,
      priority: lowestHealth.score < 55 ? "Critical" : "High",
      subject: `Salud de flota — ${lowestHealth.registration}`,
      recommendation: "Revisar la aeronave antes de aprobar despacho.",
      evidence: lowestHealth.evidence,
      operationalImpact: "La disponibilidad puede verse reducida por exposición de mantenimiento o alertas abiertas.",
      recommendedAction: "Abrir el perfil de la aeronave y asignar revisión de mantenimiento.",
      confidence: confidenceFromEvidence(lowestHealth.evidence, 92),
      domain: "Fleet",
      sourceRecords: [lowestHealth.registration]
    });
  }

  if (calendarDrivenSoon.length) {
    const item = calendarDrivenSoon[0];
    recommendations.push({
      id: `calendar-${item.componentId}`,
      priority: item.bucket <= 30 ? "Critical" : item.bucket <= 60 ? "High" : "Medium",
      subject: `${item.helicopterRegistration} ${item.componentName} — vence por calendario`,
      recommendation: `Vence por calendario en ${item.dueInDays} días aunque le quedan ${item.remainingHours.toFixed(1)} horas. Planificar el reemplazo por fecha, no por uso.`,
      evidence: item.evidence,
      operationalImpact: "El componente puede quedar inoperativo por vencimiento de calendario sin haber agotado su vida útil en horas.",
      recommendedAction: "Coordinar disponibilidad de repuesto y ventana de mantenimiento antes de la fecha límite.",
      confidence: item.confidence,
      domain: "Maintenance",
      sourceRecords: [item.componentId, item.helicopterRegistration]
    });
  }

  if (urgentForecast && !calendarDrivenSoon.some((item) => item.componentId === urgentForecast.componentId)) {
    recommendations.push({
      id: `forecast-${urgentForecast.componentId}`,
      priority: urgentForecast.bucket <= 30 ? "Critical" : "High",
      subject: `${urgentForecast.helicopterRegistration} ${urgentForecast.componentName}`,
      recommendation: "Solicitar planificación de mantenimiento o cotización ahora.",
      evidence: urgentForecast.evidence,
      operationalImpact: `Se pronostica vencimiento dentro de ${urgentForecast.bucket} días, por ${urgentForecast.dueBasis === "Hours" ? "horas" : urgentForecast.dueBasis === "Calendar" ? "calendario" : urgentForecast.dueBasis}.`,
      recommendedAction: "Revisar el detalle del componente y estado de compras.",
      confidence: urgentForecast.confidence,
      domain: "Maintenance",
      sourceRecords: [urgentForecast.componentId, urgentForecast.helicopterRegistration]
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const hourmeterByRegistration = new Map(input.helicopters.map((h) => [h.registration, h.current_hourmeter]));
  const isOpenCompliance = (item: ComplianceItemRow) => item.status !== "Complied" && item.status !== "Not applicable";
  const overdueCompliance = input.complianceItems.filter((item) => {
    if (!isOpenCompliance(item)) return false;
    const dateOverdue = item.due_date != null && item.due_date < today;
    const currentHourmeter = item.related_helicopter ? hourmeterByRegistration.get(item.related_helicopter) : undefined;
    const hoursOverdue = item.due_hours != null && currentHourmeter != null && currentHourmeter >= item.due_hours;
    return dateOverdue || hoursOverdue;
  });
  if (overdueCompliance.length) {
    recommendations.push({
      id: "compliance-overdue",
      priority: "Critical",
      subject: "Cumplimiento vencido (AD / SB / requisitos)",
      recommendation: `${overdueCompliance.length} ítem(s) de cumplimiento pasaron su fecha límite o su horómetro objetivo sin marcarse como cumplidos.`,
      evidence: overdueCompliance.slice(0, 3).map((item) => {
        const currentHourmeter = item.related_helicopter ? hourmeterByRegistration.get(item.related_helicopter) : undefined;
        const basis =
          item.due_date != null && item.due_date < today
            ? `venció ${item.due_date}`
            : `venció a las ${item.due_hours} hrs (actual ${currentHourmeter?.toFixed(1)} hrs)`;
        return `${item.related_helicopter ?? "Toda la flota"} — ${item.compliance_type} ${item.title} (${basis})`;
      }),
      operationalImpact: "Operar sin cumplir una AD/SB vigente puede dejar la aeronave fuera de condición de aeronavegabilidad.",
      recommendedAction: "Revisar el módulo de Cumplimiento y actualizar el estado tras verificar o ejecutar la acción requerida.",
      confidence: 93,
      domain: "Maintenance",
      sourceRecords: overdueCompliance.map((item) => item.id)
    });
  }

  // Bulletins/ADs/SLs loaded (manually or via the Robinson sync) but not yet
  // checked against a specific aircraft's serial number. Distinct from
  // "compliance-overdue" above: nothing here has a confirmed due date/hours
  // yet, so it can't be "overdue" — it's "unknown, go find out." Surfaced on
  // its own so it doesn't silently sit at the bottom of the Cumplimiento list
  // forever once due_date/due_hours are both null.
  const unreviewedCompliance = input.complianceItems.filter((item) => item.status === "Not reviewed");
  if (unreviewedCompliance.length) {
    recommendations.push({
      id: "compliance-unreviewed",
      priority: "High",
      subject: "Publicaciones sin revisar (AD / SB / SL)",
      recommendation: `${unreviewedCompliance.length} publicación(es) de cumplimiento están cargadas pero todavía no se confirmó si aplican a alguna de tus aeronaves.`,
      evidence: unreviewedCompliance
        .slice(0, 4)
        .map((item) => `${item.authority} ${item.compliance_type} ${item.reference_number ?? ""} — ${item.title}`.replace(/\s+/g, " ").trim()),
      operationalImpact: "Mientras no se revise cada publicación contra el número de serie de cada aeronave, no se puede confirmar si un requisito de aeronavegabilidad está pendiente.",
      recommendedAction: "Abrir Cumplimiento, revisar el PDF de cada ítem 'Not reviewed' y marcarlo como Aplicable (con fecha o vencimiento por horas) o No aplicable.",
      confidence: 80,
      domain: "Maintenance",
      sourceRecords: unreviewedCompliance.map((item) => item.id)
    });
  }

  const groundingAlerts = input.openAlerts.filter((a) => a.severity === "Grounding");
  if (groundingAlerts.length) {
    recommendations.push({
      id: "grounding-alerts",
      priority: "Critical",
      subject: "Alertas en tierra (Grounding)",
      recommendation: "Resolver antes de autorizar vuelo.",
      evidence: groundingAlerts.slice(0, 3).map((a) => `${a.helicopter_registration} ${a.component_name ?? ""}: ${a.description ?? a.alert_type}`),
      operationalImpact: "La aeronave no debería operar hasta resolver estos componentes vencidos.",
      recommendedAction: "Revisar el Plan de Mantenimiento y actualizar el estado tras la intervención.",
      confidence: 95,
      domain: "Maintenance",
      sourceRecords: groundingAlerts.map((a) => a.id)
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: "aura-monitor-baseline",
      priority: "Monitor",
      subject: "Línea base operacional",
      recommendation: "Continuar monitoreando flota, mantenimiento y alertas.",
      evidence: [`Salud de flota ${input.fleetHealth.score}%`, `${input.openAlerts.length} alerta(s) abierta(s)`],
      operationalImpact: "No se detectó ningún bloqueo inmediato en los datos actuales.",
      recommendedAction: "Mantener la revisión operacional diaria.",
      confidence: 86,
      domain: "Fleet",
      sourceRecords: []
    });
  }

  return recommendations.sort((left, right) => priorityRank(left.priority) - priorityRank(right.priority) || right.confidence - left.confidence).slice(0, 5);
}

function buildHelicopterRisk(helicopter: HelicopterRow, components: ComponentRow[], alerts: AlertRow[]): HelicopterRisk {
  const aircraftComponents = components.filter((c) => c.helicopter_registration === helicopter.registration);
  const expiredComponents = aircraftComponents.filter((c) => c.status === "Expired").length;
  const criticalComponents = aircraftComponents.filter((c) => c.status === "Critical").length;
  const monitorComponents = aircraftComponents.filter((c) => c.status === "Monitor").length;
  const openAlerts = alerts.filter((a) => a.helicopter_registration === helicopter.registration).length;
  const statusScore = helicopter.status === "Grounded" ? 25 : helicopter.status === "Maintenance" ? 18 : helicopter.status === "In Campaign" ? 5 : 0;
  const score = expiredComponents * 45 + criticalComponents * 30 + monitorComponents * 12 + openAlerts * 8 + statusScore;

  return {
    registration: helicopter.registration,
    model: helicopter.model,
    score,
    status: helicopter.status,
    criticalComponents,
    expiredComponents,
    openAlerts,
    recommendation:
      score > 0
        ? "Revisar estado de componentes y alertas antes de autorizar despacho."
        : "No se detecta riesgo de mantenimiento inmediato en los datos locales."
  };
}

/** Groups open alerts and near-term forecast items per aircraft — "what do I
 * actually need to do on THIS helicopter" instead of one fleet-wide list. */
function buildWorkByHelicopter(
  helicopters: HelicopterRow[],
  alerts: AlertRow[],
  forecast: Record<AuraForecastBucket, AuraMaintenanceForecastItem[]>
): HelicopterWorkPlan[] {
  const nearTermForecast = ([30, 60, 90, 180] as AuraForecastBucket[]).flatMap((bucket) => forecast[bucket]);

  return helicopters
    .map((helicopter) => {
      const helicopterAlerts = alerts.filter((a) => a.helicopter_registration === helicopter.registration);
      const alertedComponentNames = new Set(helicopterAlerts.map((a) => a.component_name));
      const helicopterForecast = nearTermForecast.filter(
        (f) => f.helicopterRegistration === helicopter.registration && !alertedComponentNames.has(f.componentName)
      );

      const items: HelicopterWorkItem[] = [
        ...helicopterAlerts.map((a) => ({
          type: "Alert" as const,
          label: a.component_name ?? a.alert_type,
          detail: a.description ?? a.alert_type,
          tone: (a.severity === "Critical" || a.severity === "Grounding" ? "red" : "amber") as AuraTone,
          dueInDays: null
        })),
        ...helicopterForecast.map((f) => ({
          type: "Forecast" as const,
          label: f.componentName,
          detail: `Vence en ${f.dueInDays} días por ${f.dueBasis === "Hours" ? "horas" : f.dueBasis === "Calendar" ? "calendario" : f.dueBasis === "Expired" ? "vencimiento" : "horas y calendario"}.`,
          tone: (f.bucket <= 30 ? "red" : f.bucket <= 90 ? "amber" : "blue") as AuraTone,
          dueInDays: f.dueInDays
        }))
      ].sort((left, right) => (left.dueInDays ?? -1) - (right.dueInDays ?? -1));

      return { registration: helicopter.registration, model: helicopter.model, items };
    })
    .filter((plan) => plan.items.length > 0)
    .sort((left, right) => right.items.length - left.items.length);
}

/** Turns the maintenance forecast into "what to start sourcing now," grouped
 * by urgency, and cross-references the vessel inventory + open purchase
 * requests so it knows whether the part is already on hand or already on
 * order — not just when it will be needed. Matched by part number (the only
 * reliable key across components/inventory/purchasing); items without a P/N
 * on file always show "Sin cobertura" since there's nothing to match against. */
function buildProcurementRecommendations(
  forecast: Record<AuraForecastBucket, AuraMaintenanceForecastItem[]>,
  inventoryItems: InventoryItemRow[],
  purchaseRequests: PurchaseRequestRow[]
): ProcurementRecommendation[] {
  const stockByPartNumber = new Map<string, number>();
  for (const item of inventoryItems) {
    const key = (item.part_number ?? "").trim().toUpperCase();
    if (!key) continue;
    stockByPartNumber.set(key, (stockByPartNumber.get(key) ?? 0) + Number(item.quantity));
  }

  const openOrdersByPartNumber = new Map<string, number>();
  for (const request of purchaseRequests) {
    if (!OPEN_PURCHASE_STATUSES.has(request.status)) continue;
    const key = (request.part_number ?? "").trim().toUpperCase();
    if (!key) continue;
    openOrdersByPartNumber.set(key, (openOrdersByPartNumber.get(key) ?? 0) + Number(request.quantity));
  }

  const items = ([30, 60, 90, 180] as AuraForecastBucket[]).flatMap((bucket) => forecast[bucket]);
  return items
    .map((item) => {
      const key = (item.partNumber ?? "").trim().toUpperCase();
      const stockOnHand = key ? (stockByPartNumber.get(key) ?? 0) : 0;
      const openOrderQuantity = key ? (openOrdersByPartNumber.get(key) ?? 0) : 0;
      const coverage: ProcurementCoverage = stockOnHand > 0 ? "En stock" : openOrderQuantity > 0 ? "Pedido en curso" : "Sin cobertura";
      const baseUrgency: ProcurementUrgency = item.dueInDays <= 30 ? "Immediate" : item.dueInDays <= 90 ? "Soon" : "Plan ahead";
      // Already covered (in stock or on order) — don't shout "Immediate" for
      // something that's already handled, but still surface it at "Plan ahead"
      // so it stays visible for confirmation.
      const urgency: ProcurementUrgency = coverage === "Sin cobertura" ? baseUrgency : "Plan ahead";
      return {
        helicopterRegistration: item.helicopterRegistration,
        componentName: item.componentName,
        partNumber: item.partNumber,
        serialNumber: item.serialNumber,
        dueInDays: item.dueInDays,
        dueBasis: item.dueBasis,
        urgency,
        coverage,
        stockOnHand,
        openOrderQuantity
      };
    })
    .sort((left, right) => left.dueInDays - right.dueInDays);
}

function answerExpiresNext(components: ComponentRow[]): AuraAnswer {
  const sorted = [...components].filter((c) => c.status !== "OK").sort(compareComponentExposure);
  const records = sorted.slice(0, 6).map((c) => ({
    label: `${c.helicopter_registration} / ${c.component_name}`,
    detail: `${c.status}: ${c.remaining_hours.toFixed(1)} hrs, ${c.remaining_calendar_days != null ? `${c.remaining_calendar_days} días` : "sin límite de calendario"}, vence calendario ${c.calendar_limit_date ?? "N/A"}.`,
    tone: (c.status === "Expired" || c.status === "Critical" ? "red" : "amber") as AuraTone
  }));
  return {
    title: "¿Qué vence primero?",
    summary: records.length
      ? "Ordenado por estado, luego por días de calendario, luego por horas remanentes."
      : "No hay componentes fuera de OK en los datos actuales.",
    records
  };
}

function answerInspect(alerts: AlertRow[], components: ComponentRow[]): AuraAnswer {
  const alertRecords = alerts.slice(0, 4).map((a) => ({
    label: `${a.helicopter_registration} / ${a.component_name ?? a.alert_type}`,
    detail: `Alerta ${a.severity}: ${a.description ?? a.alert_type}`,
    tone: (a.severity === "Critical" || a.severity === "Grounding" ? "red" : "amber") as AuraTone
  }));
  const componentRecords = components
    .filter((c) => c.status !== "OK")
    .slice(0, 4)
    .map((c) => ({
      label: `${c.helicopter_registration} / ${c.component_name}`,
      detail: `${c.status}: revisar horas, calendario y documentación de respaldo.`,
      tone: (c.status === "Monitor" ? "amber" : "red") as AuraTone
    }));
  const records = [...alertRecords, ...componentRecords].slice(0, 8);
  return {
    title: "¿Qué debo inspeccionar?",
    summary: records.length
      ? "Prioriza alertas abiertas y componentes críticos o vencidos."
      : "No se encontró ninguna prioridad de inspección inmediata."
    ,
    records
  };
}

function answerHighestRisk(risks: HelicopterRisk[]): AuraAnswer {
  const topRisk = risks[0];
  return {
    title: "¿Qué helicóptero tiene mayor riesgo de mantenimiento?",
    summary:
      topRisk && topRisk.score > 0
        ? `${topRisk.registration} tiene el mayor puntaje de riesgo local. Esto es solo apoyo a la decisión — requiere revisión de mantenimiento.`
        : "Ningún helicóptero tiene un puntaje de riesgo mayor a cero.",
    records: risks.slice(0, 5).map((risk) => ({
      label: `${risk.registration} / ${risk.model}`,
      detail: `Riesgo ${risk.score}. ${risk.expiredComponents} vencidos, ${risk.criticalComponents} críticos, ${risk.openAlerts} alertas abiertas. ${risk.recommendation}`,
      tone: (risk.score >= 60 ? "red" : risk.score > 0 ? "amber" : "green") as AuraTone
    }))
  };
}

export async function buildAuraAnalysis(): Promise<AuraAnalysis> {
  const [
    { data: helicopters },
    { data: components },
    { data: alerts },
    { data: flightLogs },
    { data: inventoryItems },
    { data: purchaseRequests },
    { data: complianceItems }
  ] = await Promise.all([
    supabase.from("helicopters").select("registration, model, status, current_hourmeter").eq("archived", false),
    supabase
      .from("components")
      .select(
        "id, helicopter_registration, component_name, part_number, serial_number, status, remaining_hours, remaining_percentage, remaining_calendar_days, calendar_limit_date, life_limit_hours"
      )
      .neq("status", "Removed"),
    supabase.from("maintenance_alerts").select("id, helicopter_registration, component_name, severity, alert_type, description, status").neq("status", "Resolved"),
    supabase.from("flight_logs").select("helicopter_registration, flight_date, flight_hours"),
    supabase.from("inventory_items").select("part_number, item_name, quantity").eq("archived", false),
    supabase.from("purchase_requests").select("part_number, item_name, quantity, status").eq("archived", false),
    supabase
      .from("compliance_items")
      .select("id, title, authority, compliance_type, reference_number, due_date, due_hours, related_helicopter, status")
      .eq("archived", false)
  ]);

  const helicopterRows = (helicopters ?? []) as HelicopterRow[];
  const componentRows = (components ?? []) as ComponentRow[];
  const alertRows = (alerts ?? []) as AlertRow[];
  const flightLogRows = (flightLogs ?? []) as FlightLogRow[];
  const inventoryItemRows = (inventoryItems ?? []) as InventoryItemRow[];
  const purchaseRequestRows = (purchaseRequests ?? []) as PurchaseRequestRow[];
  const complianceItemRows = (complianceItems ?? []) as ComplianceItemRow[];

  const fleetHealth = buildFleetHealthEngine(helicopterRows, componentRows, alertRows);
  const maintenanceForecast = buildMaintenanceForecastEngine(componentRows, flightLogRows);
  const executiveRecommendations = buildExecutiveRecommendationEngine({
    fleetHealth,
    maintenanceForecast,
    openAlerts: alertRows,
    complianceItems: complianceItemRows,
    helicopters: helicopterRows
  });
  const helicopterRisks = helicopterRows
    .map((h) => buildHelicopterRisk(h, componentRows, alertRows))
    .sort((left, right) => right.score - left.score || left.registration.localeCompare(right.registration));
  const workByHelicopter = buildWorkByHelicopter(helicopterRows, alertRows, maintenanceForecast);
  const procurementRecommendations = buildProcurementRecommendations(maintenanceForecast, inventoryItemRows, purchaseRequestRows);

  return {
    fleetHealth,
    maintenanceForecast,
    executiveRecommendations,
    helicopterRisks,
    workByHelicopter,
    procurementRecommendations,
    answers: {
      expiresNext: answerExpiresNext(componentRows),
      inspect: answerInspect(alertRows, componentRows),
      highestRisk: answerHighestRisk(helicopterRisks)
    }
  };
}
