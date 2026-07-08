import {
  calculateCampaignStatus,
  calculateComplianceStatus,
  getLowStockStatus
} from "@/lib/fleet-ops";
import type {
  Campaign,
  ComponentStatus,
  ComplianceItem,
  FleetStore,
  Helicopter,
  HelicopterComponent,
  InventoryItem,
  MaintenanceAlert,
  PurchaseRequest,
  TechnicalRecord
} from "@/types/fleet";

export type CopilotQuestionId =
  | "expires-next"
  | "inspect"
  | "highest-risk"
  | "low-inventory";

export type CopilotReportId =
  | "management-summary"
  | "fleet-status"
  | "maintenance-status"
  | "component-due"
  | "inventory-status"
  | "campaign-readiness";

export type CopilotInsight = {
  title: string;
  value: string;
  detail: string;
  tone: "green" | "amber" | "blue" | "teal" | "red" | "neutral";
};

export type HelicopterRisk = {
  registration: string;
  model: string;
  score: number;
  status: Helicopter["status"];
  criticalComponents: number;
  expiredComponents: number;
  openAlerts: number;
  lowInventory: number;
  activeCampaign?: string;
  recommendation: string;
};

export type CopilotAnswer = {
  title: string;
  summary: string;
  records: Array<{
    label: string;
    detail: string;
    tone: "green" | "amber" | "blue" | "teal" | "red" | "neutral";
  }>;
};

export type CopilotReport = {
  id: CopilotReportId;
  title: string;
  subtitle: string;
  sections: Array<{
    heading: string;
    lines: string[];
  }>;
};

export type AuraPriority = "Critical" | "High" | "Medium" | "Monitor";

export type AuraRecommendation = {
  id: string;
  priority: AuraPriority;
  subject: string;
  recommendation: string;
  evidence: string[];
  operationalImpact: string;
  financialImpact: string;
  recommendedAction: string;
  confidence: number;
  domain: "Fleet" | "Maintenance" | "Inventory" | "Campaigns" | "Compliance" | "Purchasing" | "Technical Records";
  sourceRecords: string[];
};

export type AuraAircraftHealthScore = {
  registration: string;
  score: number;
  drivers: string[];
  evidence: string[];
};

export type AuraMissionReadinessScore = {
  registration: string;
  score: number;
  campaign?: string;
  drivers: string[];
  evidence: string[];
};

export type AuraForecastBucket = 30 | 60 | 90 | 180 | 365;

export type AuraMaintenanceForecastItem = {
  bucket: AuraForecastBucket;
  componentId: string;
  helicopterRegistration: string;
  componentName: string;
  dueBasis: "Hours" | "Calendar" | "Hours and Calendar" | "Expired";
  dueInDays: number;
  remainingHours: number;
  remainingCalendarDays: number;
  confidence: number;
  evidence: string[];
};

export type AuraInventoryRisk = {
  itemId: string;
  itemName: string;
  partNumber: string;
  stockStatus: string;
  procurementUrgency: "Immediate" | "Soon" | "Monitor";
  operationalImpact: string;
  confidence: number;
  evidence: string[];
};

export type AuraIntegrationReadiness = {
  source: "FAA" | "Manufacturer" | "Service Bulletin" | "Airworthiness Directive";
  status: "Future-ready placeholder";
  requiredLinkFields: string[];
};

export type AuraIntelligence = {
  fleetHealth: {
    score: number;
    aircraft: AuraAircraftHealthScore[];
  };
  missionReadiness: {
    score: number;
    aircraft: AuraMissionReadinessScore[];
  };
  maintenanceForecast: Record<AuraForecastBucket, AuraMaintenanceForecastItem[]>;
  inventoryRisks: AuraInventoryRisk[];
  executiveRecommendations: AuraRecommendation[];
  integrationReadiness: AuraIntegrationReadiness[];
};

export type CopilotAnalysis = {
  insights: CopilotInsight[];
  importedHelicopters: Helicopter[];
  importedComponents: HelicopterComponent[];
  activeComponents: HelicopterComponent[];
  expiringComponents: HelicopterComponent[];
  lowInventory: Array<InventoryItem & { stockStatus: string }>;
  openAlerts: MaintenanceAlert[];
  activeCampaigns: Campaign[];
  helicopterRisks: HelicopterRisk[];
  answers: Record<CopilotQuestionId, CopilotAnswer>;
  reports: CopilotReport[];
  aura: AuraIntelligence;
};

const active = <T extends { archived?: boolean }>(records: T[]) => records.filter((record) => !record.archived);

export function buildCopilotAnalysis(store: FleetStore): CopilotAnalysis {
  const helicopters = active(store.helicopters);
  const activeComponents = active(store.components).filter((component) => component.status !== "Removed");
  const importedHelicopters = helicopters.filter((helicopter) => helicopter.source === "User");
  const importedComponents = activeComponents.filter((component) => component.source === "User");
  const openAlerts = store.maintenanceAlerts.filter((alert) => alert.status !== "Resolved");
  const activeCampaigns = active(store.campaigns).filter((campaign) =>
    ["Active", "Approved", "Readiness Review", "Planned"].includes(calculateCampaignStatus(campaign))
  );
  const lowInventory = active(store.inventoryItems)
    .map((item) => ({ ...item, stockStatus: getLowStockStatus(item) }))
    .filter((item) => item.stockStatus !== "OK");
  const expiringComponents = [...activeComponents]
    .filter((component) => component.status !== "OK")
    .sort(compareComponentExposure);
  const helicopterRisks = helicopters
    .map((helicopter) => buildHelicopterRisk(store, helicopter, activeComponents, openAlerts, lowInventory, activeCampaigns))
    .sort((left, right) => right.score - left.score || left.registration.localeCompare(right.registration));
  const aura = buildAuraIntelligence({
    store,
    helicopters,
    components: activeComponents,
    openAlerts,
    activeCampaigns,
    lowInventory,
    purchases: active(store.purchaseRequests),
    technicalRecords: active(store.technicalRecords),
    complianceItems: active(store.complianceItems)
  });

  const insights: CopilotInsight[] = [
    {
      title: "Imported helicopters",
      value: String(importedHelicopters.length),
      detail: importedHelicopters.length
        ? "User-entered or imported aircraft records available for review."
        : "No user-imported helicopter records found yet.",
      tone: importedHelicopters.length ? "green" : "amber"
    },
    {
      title: "Maintenance exposure",
      value: String(expiringComponents.length),
      detail: "Components outside OK status across local fleet data.",
      tone: expiringComponents.some((component) => ["Critical", "Expired"].includes(component.status)) ? "red" : expiringComponents.length ? "amber" : "green"
    },
    {
      title: "Inventory risks",
      value: String(lowInventory.length),
      detail: "Items that are low, out of stock, expired, or expiring soon.",
      tone: lowInventory.length ? "amber" : "green"
    },
    {
      title: "Campaign readiness",
      value: String(activeCampaigns.length),
      detail: "Active, planned, approved, or readiness-review campaigns.",
      tone: activeCampaigns.length ? "blue" : "neutral"
    }
  ];

  const answers: Record<CopilotQuestionId, CopilotAnswer> = {
    "expires-next": answerExpiresNext(expiringComponents),
    inspect: answerInspect(openAlerts, expiringComponents, lowInventory, store),
    "highest-risk": answerHighestRisk(helicopterRisks),
    "low-inventory": answerLowInventory(lowInventory)
  };

  return {
    insights,
    importedHelicopters,
    importedComponents,
    activeComponents,
    expiringComponents,
    lowInventory,
    openAlerts,
    activeCampaigns,
    helicopterRisks,
    aura,
    answers,
    reports: buildReports({
      helicopters,
      activeComponents,
      expiringComponents,
      lowInventory,
      openAlerts,
      activeCampaigns,
      helicopterRisks,
      importedHelicopters,
      importedComponents
    })
  };
}

function compareComponentExposure(left: HelicopterComponent, right: HelicopterComponent) {
  const statusRank = (status: ComponentStatus) => status === "Expired" ? 0 : status === "Critical" ? 1 : status === "Monitor" ? 2 : 3;
  return statusRank(left.status) - statusRank(right.status)
    || left.remainingCalendarDays - right.remainingCalendarDays
    || left.remainingHours - right.remainingHours;
}

function buildAuraIntelligence(input: {
  store: FleetStore;
  helicopters: Helicopter[];
  components: HelicopterComponent[];
  openAlerts: MaintenanceAlert[];
  activeCampaigns: Campaign[];
  lowInventory: Array<InventoryItem & { stockStatus: string }>;
  purchases: PurchaseRequest[];
  technicalRecords: TechnicalRecord[];
  complianceItems: ComplianceItem[];
}): AuraIntelligence {
  const fleetHealth = buildFleetHealthEngine(input);
  const missionReadiness = buildMissionReadinessEngine(input);
  const maintenanceForecast = buildMaintenanceForecastEngine(input.store, input.components);
  const inventoryRisks = buildInventoryRiskEngine(input.lowInventory, input.purchases);
  const executiveRecommendations = buildExecutiveRecommendationEngine({
    ...input,
    fleetHealth,
    missionReadiness,
    maintenanceForecast,
    inventoryRisks
  });

  return {
    fleetHealth,
    missionReadiness,
    maintenanceForecast,
    inventoryRisks,
    executiveRecommendations,
    integrationReadiness: [
      { source: "FAA", status: "Future-ready placeholder", requiredLinkFields: ["authority", "referenceNumber", "applicability", "relatedHelicopter", "relatedComponentId"] },
      { source: "Manufacturer", status: "Future-ready placeholder", requiredLinkFields: ["source", "model", "partNumber", "serialNumber", "effectiveDate"] },
      { source: "Service Bulletin", status: "Future-ready placeholder", requiredLinkFields: ["referenceNumber", "complianceType", "applicability", "dueDate", "status"] },
      { source: "Airworthiness Directive", status: "Future-ready placeholder", requiredLinkFields: ["authority", "referenceNumber", "effectiveDate", "dueDate", "relatedComponentId"] }
    ]
  };
}

function buildFleetHealthEngine(input: {
  helicopters: Helicopter[];
  components: HelicopterComponent[];
  openAlerts: MaintenanceAlert[];
  technicalRecords: TechnicalRecord[];
  complianceItems: ComplianceItem[];
}) {
  const aircraft = input.helicopters.map((helicopter) => {
    const aircraftComponents = input.components.filter((component) => component.helicopterRegistration === helicopter.registration);
    const aircraftAlerts = input.openAlerts.filter((alert) => alert.helicopterRegistration === helicopter.registration);
    const aircraftCompliance = input.complianceItems.filter((item) => item.relatedHelicopter === helicopter.registration);
    const aircraftRecords = input.technicalRecords.filter((record) => record.relatedHelicopter === helicopter.registration);
    const expired = aircraftComponents.filter((component) => component.status === "Expired");
    const critical = aircraftComponents.filter((component) => component.status === "Critical");
    const monitor = aircraftComponents.filter((component) => component.status === "Monitor");
    const calendarCritical = aircraftComponents.filter((component) => component.remainingCalendarDays <= 90);
    const overdueCompliance = aircraftCompliance.filter((item) => calculateComplianceStatus(item) === "Overdue");
    const openCompliance = aircraftCompliance.filter((item) => !["Complied", "Not applicable"].includes(calculateComplianceStatus(item)));
    const missingTechnicalRecords = aircraftComponents.filter((component) =>
      !input.technicalRecords.some((record) => record.relatedComponentId === component.id || record.relatedHelicopter === helicopter.registration)
    ).length;
    const penalties = [
      expired.length * 22,
      critical.length * 15,
      monitor.length * 5,
      calendarCritical.length * 4,
      aircraftAlerts.filter((alert) => ["Critical", "Grounding"].includes(alert.severity)).length * 10,
      aircraftAlerts.filter((alert) => alert.severity === "Monitor").length * 4,
      overdueCompliance.length * 12,
      openCompliance.length * 4,
      aircraftRecords.length ? 0 : 8,
      Math.min(missingTechnicalRecords, 4) * 2,
      helicopter.status === "Grounded" ? 28 : helicopter.status === "Maintenance" ? 16 : 0
    ];
    const score = clampScore(100 - penalties.reduce((sum, penalty) => sum + penalty, 0));
    const drivers = [
      expired.length ? `${expired.length} expired component${expired.length === 1 ? "" : "s"}` : "",
      critical.length ? `${critical.length} critical component${critical.length === 1 ? "" : "s"}` : "",
      overdueCompliance.length ? `${overdueCompliance.length} overdue compliance item${overdueCompliance.length === 1 ? "" : "s"}` : "",
      aircraftRecords.length ? "" : "No linked technical records"
    ].filter(Boolean);

    return {
      registration: helicopter.registration,
      score,
      drivers: drivers.length ? drivers : ["No major local health driver detected"],
      evidence: [
        `${aircraftComponents.length} active component record${aircraftComponents.length === 1 ? "" : "s"}`,
        `${aircraftAlerts.length} open maintenance alert${aircraftAlerts.length === 1 ? "" : "s"}`,
        `${openCompliance.length} open compliance item${openCompliance.length === 1 ? "" : "s"}`,
        `${aircraftRecords.length} linked technical record${aircraftRecords.length === 1 ? "" : "s"}`
      ]
    };
  }).sort((left, right) => left.score - right.score || left.registration.localeCompare(right.registration));

  return {
    score: aircraft.length ? Math.round(aircraft.reduce((sum, item) => sum + item.score, 0) / aircraft.length) : 0,
    aircraft
  };
}

function buildMissionReadinessEngine(input: {
  helicopters: Helicopter[];
  components: HelicopterComponent[];
  openAlerts: MaintenanceAlert[];
  activeCampaigns: Campaign[];
  lowInventory: Array<InventoryItem & { stockStatus: string }>;
  complianceItems: ComplianceItem[];
}) {
  const aircraft = input.helicopters.map((helicopter) => {
    const campaign = input.activeCampaigns.find((item) => item.helicopterRegistration === helicopter.registration);
    const aircraftComponents = input.components.filter((component) => component.helicopterRegistration === helicopter.registration);
    const blockingComponents = aircraftComponents.filter((component) => ["Critical", "Expired"].includes(component.status));
    const aircraftAlerts = input.openAlerts.filter((alert) => alert.helicopterRegistration === helicopter.registration && ["Critical", "Grounding"].includes(alert.severity));
    const inventoryRisks = input.lowInventory.filter((item) => item.relatedHelicopter === helicopter.registration);
    const complianceRisks = input.complianceItems.filter((item) =>
      item.relatedHelicopter === helicopter.registration && ["Overdue", "Applicable", "In progress", "Not reviewed"].includes(calculateComplianceStatus(item))
    );
    const crewPenalty = campaign ? (campaign.pilot ? 0 : 8) + (campaign.mechanic ? 0 : 8) : 0;
    const assignmentPenalty = campaign ? 0 : helicopter.status === "Assigned" || helicopter.status === "In Campaign" ? 6 : 0;
    const score = clampScore(
      100 -
      blockingComponents.length * 18 -
      aircraftAlerts.length * 12 -
      inventoryRisks.length * 7 -
      complianceRisks.length * 5 -
      crewPenalty -
      assignmentPenalty -
      (helicopter.status === "Grounded" ? 35 : helicopter.status === "Maintenance" ? 20 : 0)
    );
    const drivers = [
      blockingComponents.length ? `${blockingComponents.length} blocking component${blockingComponents.length === 1 ? "" : "s"}` : "",
      inventoryRisks.length ? `${inventoryRisks.length} inventory readiness risk${inventoryRisks.length === 1 ? "" : "s"}` : "",
      complianceRisks.length ? `${complianceRisks.length} compliance readiness item${complianceRisks.length === 1 ? "" : "s"}` : "",
      crewPenalty ? "Crew assignment placeholder incomplete" : ""
    ].filter(Boolean);

    return {
      registration: helicopter.registration,
      score,
      campaign: campaign?.name,
      drivers: drivers.length ? drivers : ["Mission readiness clear in local data"],
      evidence: [
        `Aircraft status ${helicopter.status}`,
        campaign ? `Campaign ${campaign.code} / ${campaign.status}` : "No active campaign assignment",
        `${inventoryRisks.length} linked inventory risk${inventoryRisks.length === 1 ? "" : "s"}`,
        `${complianceRisks.length} compliance readiness item${complianceRisks.length === 1 ? "" : "s"}`
      ]
    };
  }).sort((left, right) => left.score - right.score || left.registration.localeCompare(right.registration));

  return {
    score: aircraft.length ? Math.round(aircraft.reduce((sum, item) => sum + item.score, 0) / aircraft.length) : 0,
    aircraft
  };
}

function buildMaintenanceForecastEngine(store: FleetStore, components: HelicopterComponent[]): Record<AuraForecastBucket, AuraMaintenanceForecastItem[]> {
  const buckets: AuraForecastBucket[] = [30, 60, 90, 180, 365];
  const forecast: Record<AuraForecastBucket, AuraMaintenanceForecastItem[]> = {
    30: [],
    60: [],
    90: [],
    180: [],
    365: []
  };
  components.forEach((component) => {
    const monthlyTrend = monthlyFlightHourTrend(store, component.helicopterRegistration);
    const daysByHours = component.remainingHours <= 0
      ? 0
      : monthlyTrend > 0
        ? Math.ceil(component.remainingHours / (monthlyTrend / 30))
        : Number.POSITIVE_INFINITY;
    const calendarDays = component.remainingCalendarDays <= 0 ? 0 : component.remainingCalendarDays;
    const dueInDays = Math.min(daysByHours, calendarDays || Number.POSITIVE_INFINITY);
    if (!Number.isFinite(dueInDays) || dueInDays > 365) return;
    const bucket = buckets.find((item) => dueInDays <= item);
    if (!bucket) return;
    const dueBasis = component.remainingHours <= 0 || component.remainingCalendarDays <= 0
      ? "Expired"
      : daysByHours === calendarDays
        ? "Hours and Calendar"
        : daysByHours < calendarDays || !calendarDays
          ? "Hours"
          : "Calendar";
    forecast[bucket].push({
      bucket,
      componentId: component.id,
      helicopterRegistration: component.helicopterRegistration,
      componentName: component.componentName,
      dueBasis,
      dueInDays,
      remainingHours: component.remainingHours,
      remainingCalendarDays: component.remainingCalendarDays,
      confidence: monthlyTrend > 0 || component.remainingCalendarDays > 0 ? 86 : 62,
      evidence: [
        `${component.remainingHours.toFixed(1)} remaining hours`,
        `${component.remainingCalendarDays} remaining calendar days`,
        `${monthlyTrend.toFixed(1)} monthly flight-hour trend`
      ]
    });
  });
  buckets.forEach((bucket) => {
    forecast[bucket] = forecast[bucket].sort((left, right) => left.dueInDays - right.dueInDays || left.helicopterRegistration.localeCompare(right.helicopterRegistration));
  });
  return forecast;
}

function buildInventoryRiskEngine(items: Array<InventoryItem & { stockStatus: string }>, purchases: PurchaseRequest[]): AuraInventoryRisk[] {
  return items.map((item) => {
    const openPurchases = purchases.filter((purchase) =>
      !["Stored", "Installed", "Consumed", "Closed"].includes(purchase.status) &&
      (purchase.partNumber && item.partNumber && normalizeKey(purchase.partNumber) === normalizeKey(item.partNumber) || normalizeKey(purchase.itemName) === normalizeKey(item.itemName))
    );
    const urgency: AuraInventoryRisk["procurementUrgency"] = item.stockStatus === "Out of stock" || item.stockStatus === "Expired"
      ? "Immediate"
      : item.stockStatus === "Low stock" || item.stockStatus === "Expiring soon"
        ? "Soon"
        : "Monitor";
    return {
      itemId: item.id,
      itemName: item.itemName,
      partNumber: item.partNumber,
      stockStatus: item.stockStatus,
      procurementUrgency: urgency,
      operationalImpact: urgency === "Immediate"
        ? "Maintenance task or dispatch readiness may be blocked."
        : urgency === "Soon"
          ? "Maintenance readiness may be constrained if usage increases."
          : "Monitor stock position.",
      confidence: openPurchases.length ? 88 : 76,
      evidence: [
        `${item.quantity} ${item.unitOfMeasure} on hand`,
        `Minimum stock ${item.minimumStock}`,
        `Status ${item.stockStatus}`,
        `${openPurchases.length} open purchasing record${openPurchases.length === 1 ? "" : "s"} found`
      ]
    };
  }).sort((left, right) => urgencyRank(left.procurementUrgency) - urgencyRank(right.procurementUrgency) || right.confidence - left.confidence);
}

function buildExecutiveRecommendationEngine(input: {
  fleetHealth: AuraIntelligence["fleetHealth"];
  missionReadiness: AuraIntelligence["missionReadiness"];
  maintenanceForecast: AuraIntelligence["maintenanceForecast"];
  inventoryRisks: AuraInventoryRisk[];
  openAlerts: MaintenanceAlert[];
  activeCampaigns: Campaign[];
  complianceItems: ComplianceItem[];
  technicalRecords: TechnicalRecord[];
  purchases: PurchaseRequest[];
}): AuraRecommendation[] {
  const recommendations: AuraRecommendation[] = [];
  const lowestHealth = input.fleetHealth.aircraft[0];
  const lowestReadiness = input.missionReadiness.aircraft[0];
  const urgentForecast = input.maintenanceForecast[30][0] ?? input.maintenanceForecast[60][0];
  const immediateInventory = input.inventoryRisks.find((item) => item.procurementUrgency === "Immediate") ?? input.inventoryRisks[0];
  const overdueCompliance = input.complianceItems.filter((item) => calculateComplianceStatus(item) === "Overdue");
  const openPurchases = input.purchases.filter((purchase) => !["Stored", "Installed", "Consumed", "Closed"].includes(purchase.status));

  if (lowestHealth && lowestHealth.score < 75) {
    recommendations.push({
      id: `fleet-health-${lowestHealth.registration}`,
      priority: lowestHealth.score < 55 ? "Critical" : "High",
      subject: `${lowestHealth.registration} Fleet Health`,
      recommendation: "Review aircraft health before approving dispatch.",
      evidence: lowestHealth.evidence,
      operationalImpact: "Aircraft availability may be reduced by maintenance, compliance, or technical-record exposure.",
      financialImpact: "Unplanned downtime can affect campaign margin and maintenance reserve timing.",
      recommendedAction: "Open aircraft profile and assign maintenance review.",
      confidence: confidenceFromEvidence(lowestHealth.evidence, 92),
      domain: "Fleet",
      sourceRecords: [lowestHealth.registration]
    });
  }

  if (lowestReadiness && lowestReadiness.score < 80) {
    recommendations.push({
      id: `mission-readiness-${lowestReadiness.registration}`,
      priority: lowestReadiness.score < 60 ? "Critical" : "High",
      subject: `${lowestReadiness.registration} Mission Readiness`,
      recommendation: "Resolve readiness blockers before campaign commitment.",
      evidence: lowestReadiness.evidence,
      operationalImpact: "Campaign start or vessel deployment may be delayed.",
      financialImpact: "Delay risk can affect utilization and contract performance.",
      recommendedAction: "Review aircraft, inventory, crew placeholder, compliance, and campaign assignment.",
      confidence: confidenceFromEvidence(lowestReadiness.evidence, 90),
      domain: "Campaigns",
      sourceRecords: [lowestReadiness.registration, lowestReadiness.campaign ?? "No active campaign"]
    });
  }

  if (urgentForecast) {
    recommendations.push({
      id: `forecast-${urgentForecast.componentId}`,
      priority: urgentForecast.bucket <= 30 ? "Critical" : "High",
      subject: `${urgentForecast.helicopterRegistration} ${urgentForecast.componentName}`,
      recommendation: "Request maintenance planning or quotation now.",
      evidence: urgentForecast.evidence,
      operationalImpact: `${urgentForecast.componentName} is forecast due within ${urgentForecast.bucket} days by ${urgentForecast.dueBasis}.`,
      financialImpact: "Maintenance reserve and procurement timing should be confirmed.",
      recommendedAction: "Review component detail, technical records, and purchasing status.",
      confidence: urgentForecast.confidence,
      domain: "Maintenance",
      sourceRecords: [urgentForecast.componentId, urgentForecast.helicopterRegistration]
    });
  }

  if (immediateInventory) {
    recommendations.push({
      id: `inventory-${immediateInventory.itemId}`,
      priority: immediateInventory.procurementUrgency === "Immediate" ? "High" : "Medium",
      subject: `${immediateInventory.itemName} Inventory`,
      recommendation: "Review stock position and procurement urgency.",
      evidence: immediateInventory.evidence,
      operationalImpact: immediateInventory.operationalImpact,
      financialImpact: "Shortage may create rush freight, vessel transfer, or downtime cost exposure.",
      recommendedAction: "Confirm demand, purchase status, and vessel transfer options.",
      confidence: immediateInventory.confidence,
      domain: "Inventory",
      sourceRecords: [immediateInventory.itemId]
    });
  }

  if (overdueCompliance.length) {
    recommendations.push({
      id: "compliance-overdue",
      priority: "Critical",
      subject: "Overdue Compliance",
      recommendation: "Resolve overdue compliance before release or campaign approval.",
      evidence: overdueCompliance.slice(0, 3).map((item) => `${item.authority} ${item.referenceNumber}: ${item.title}`),
      operationalImpact: "Compliance exposure may block aircraft or campaign readiness.",
      financialImpact: "Non-compliance can create grounding, delay, or corrective-action cost.",
      recommendedAction: "Review compliance item, applicability, and linked technical records.",
      confidence: 94,
      domain: "Compliance",
      sourceRecords: overdueCompliance.map((item) => item.id)
    });
  }

  if (openPurchases.length && recommendations.length < 5) {
    recommendations.push({
      id: "purchasing-open-readiness",
      priority: "Monitor",
      subject: "Purchasing Readiness",
      recommendation: "Track open purchasing items tied to maintenance readiness.",
      evidence: openPurchases.slice(0, 3).map((purchase) => `${purchase.itemName}: ${purchase.status}, ${purchase.quantity} units, ${purchase.currency} ${purchase.unitCost.toFixed(2)}`),
      operationalImpact: "Open purchases may affect maintenance completion if parts are not received or stored.",
      financialImpact: "Open procurement affects cash timing and maintenance reserve planning.",
      recommendedAction: "Review purchase status and receiving plan.",
      confidence: 82,
      domain: "Purchasing",
      sourceRecords: openPurchases.map((purchase) => purchase.id)
    });
  }

  if (!input.technicalRecords.length && recommendations.length < 5) {
    recommendations.push({
      id: "technical-records-missing",
      priority: "Medium",
      subject: "Technical Records",
      recommendation: "Attach technical evidence for operational records.",
      evidence: ["No active technical records found in local data."],
      operationalImpact: "Maintenance and compliance review lacks document evidence.",
      financialImpact: "Missing records can delay approvals, resale review, or warranty/procurement support.",
      recommendedAction: "Attach logbook pages, certificates, invoices, or release-to-service evidence.",
      confidence: 78,
      domain: "Technical Records",
      sourceRecords: ["technicalRecords"]
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: "aura-monitor-baseline",
      priority: "Monitor",
      subject: "Operational Baseline",
      recommendation: "Continue monitoring fleet, maintenance, inventory, compliance, purchasing, and technical records.",
      evidence: [
        `Fleet health ${input.fleetHealth.score}%`,
        `Mission readiness ${input.missionReadiness.score}%`,
        `${input.openAlerts.length} open maintenance alert${input.openAlerts.length === 1 ? "" : "s"}`,
        `${input.activeCampaigns.length} active or planned campaign${input.activeCampaigns.length === 1 ? "" : "s"}`
      ],
      operationalImpact: "No immediate blocker was detected in local data.",
      financialImpact: "No urgent cost exposure was detected from current local records.",
      recommendedAction: "Maintain daily operational review cadence.",
      confidence: 86,
      domain: "Fleet",
      sourceRecords: ["FleetStore"]
    });
  }

  return recommendations
    .sort((left, right) => priorityRank(left.priority) - priorityRank(right.priority) || right.confidence - left.confidence)
    .slice(0, 5);
}

function buildHelicopterRisk(
  store: FleetStore,
  helicopter: Helicopter,
  components: HelicopterComponent[],
  alerts: MaintenanceAlert[],
  inventory: Array<InventoryItem & { stockStatus: string }>,
  campaigns: Campaign[]
): HelicopterRisk {
  const aircraftComponents = components.filter((component) => component.helicopterRegistration === helicopter.registration);
  const expiredComponents = aircraftComponents.filter((component) => component.status === "Expired").length;
  const criticalComponents = aircraftComponents.filter((component) => component.status === "Critical").length;
  const monitorComponents = aircraftComponents.filter((component) => component.status === "Monitor").length;
  const openAlerts = alerts.filter((alert) => alert.helicopterRegistration === helicopter.registration).length;
  const lowInventory = inventory.filter((item) => item.relatedHelicopter === helicopter.registration).length;
  const complianceOpen = store.complianceItems.filter((item) =>
    item.relatedHelicopter === helicopter.registration && !["Complied", "Not applicable"].includes(calculateComplianceStatus(item))
  ).length;
  const activeCampaign = campaigns.find((campaign) => campaign.helicopterRegistration === helicopter.registration);
  const statusScore = helicopter.status === "Grounded" ? 25 : helicopter.status === "Maintenance" ? 18 : helicopter.status === "In Campaign" ? 5 : 0;
  const score = expiredComponents * 45 + criticalComponents * 30 + monitorComponents * 12 + openAlerts * 8 + lowInventory * 5 + complianceOpen * 6 + statusScore;

  return {
    registration: helicopter.registration,
    model: helicopter.model,
    score,
    status: helicopter.status,
    criticalComponents,
    expiredComponents,
    openAlerts,
    lowInventory,
    activeCampaign: activeCampaign?.name,
    recommendation: score > 0
      ? "Review component status, alerts, inventory support, and dispatch readiness before release."
      : "No immediate local maintenance risk detected."
  };
}

function answerExpiresNext(components: HelicopterComponent[]): CopilotAnswer {
  const records = components.slice(0, 6).map((component) => ({
    label: `${component.helicopterRegistration} / ${component.componentName}`,
    detail: `${component.status}: ${component.remainingHours.toFixed(1)} hours, ${component.remainingCalendarDays} days, calendar limit ${component.calendarLimitDate || "not set"}.`,
    tone: component.status === "Expired" ? "red" as const : component.status === "Critical" ? "red" as const : "amber" as const
  }));

  return {
    title: "What expires next?",
    summary: records.length
      ? "The next exposure is based on local component status, remaining hours, and remaining calendar days."
      : "No non-OK active components are currently visible in local data.",
    records
  };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function monthlyFlightHourTrend(store: FleetStore, helicopterRegistration: string) {
  const cutoff = Date.now() - 90 * 86400000;
  const hours = store.flightLogs
    .filter((log) => log.helicopterRegistration === helicopterRegistration && !Number.isNaN(new Date(log.flightDate).getTime()) && new Date(log.flightDate).getTime() >= cutoff)
    .reduce((sum, log) => sum + log.flightHours, 0);
  return hours > 0 ? hours / 3 : 25;
}

function normalizeKey(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function urgencyRank(value: AuraInventoryRisk["procurementUrgency"]) {
  if (value === "Immediate") return 0;
  if (value === "Soon") return 1;
  return 2;
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

function answerInspect(
  alerts: MaintenanceAlert[],
  components: HelicopterComponent[],
  inventory: Array<InventoryItem & { stockStatus: string }>,
  store: FleetStore
): CopilotAnswer {
  const alertRecords = alerts.slice(0, 3).map((alert) => ({
    label: `${alert.helicopterRegistration} / ${alert.componentName}`,
    detail: `${alert.severity} alert: ${alert.description}`,
    tone: alert.severity === "Critical" || alert.severity === "Grounding" ? "red" as const : "amber" as const
  }));
  const componentRecords = components.slice(0, 3).map((component) => ({
    label: `${component.helicopterRegistration} / ${component.componentName}`,
    detail: `${component.status}: inspect hour, calendar, logbook, and supporting documents.`,
    tone: component.status === "Monitor" ? "amber" as const : "red" as const
  }));
  const complianceRecords = store.complianceItems
    .filter((item) => !["Complied", "Not applicable"].includes(calculateComplianceStatus(item)))
    .slice(0, 2)
    .map((item) => ({
      label: `${item.relatedHelicopter || "Fleet"} / ${item.referenceNumber}`,
      detail: `${calculateComplianceStatus(item)}: ${item.title}`,
      tone: calculateComplianceStatus(item) === "Overdue" ? "red" as const : "blue" as const
    }));
  const inventoryRecords = inventory.slice(0, 2).map((item) => ({
    label: `${item.itemName} / ${item.partNumber}`,
    detail: `${item.stockStatus}: ${item.quantity} ${item.unitOfMeasure} at ${item.storageLocation}.`,
    tone: item.stockStatus === "Out of stock" || item.stockStatus === "Expired" ? "red" as const : "amber" as const
  }));

  const records = [...alertRecords, ...componentRecords, ...complianceRecords, ...inventoryRecords].slice(0, 8);
  return {
    title: "What should I inspect?",
    summary: records.length
      ? "Prioritize open alerts, critical or expired components, unresolved compliance items, and inventory constraints."
      : "No immediate inspection priority was found in local data.",
    records
  };
}

function answerHighestRisk(risks: HelicopterRisk[]): CopilotAnswer {
  const topRisk = risks[0];
  return {
    title: "Which helicopter has highest maintenance risk?",
    summary: topRisk && topRisk.score > 0
      ? `${topRisk.registration} has the highest local risk score. This is decision support only and requires maintenance review.`
      : "No helicopter has a non-zero local risk score.",
    records: risks.slice(0, 5).map((risk) => ({
      label: `${risk.registration} / ${risk.model}`,
      detail: `Risk score ${risk.score}. ${risk.expiredComponents} expired, ${risk.criticalComponents} critical, ${risk.openAlerts} open alerts, ${risk.lowInventory} inventory risks. ${risk.recommendation}`,
      tone: risk.score >= 60 ? "red" : risk.score > 0 ? "amber" : "green"
    }))
  };
}

function answerLowInventory(items: Array<InventoryItem & { stockStatus: string }>): CopilotAnswer {
  return {
    title: "Which inventory is low?",
    summary: items.length
      ? "Low inventory is calculated from quantity, minimum stock, and expiration dates in local vessel inventory records."
      : "No low or expiring inventory items are visible in local data.",
    records: items.slice(0, 8).map((item) => ({
      label: `${item.itemName} / ${item.partNumber}`,
      detail: `${item.stockStatus}: ${item.quantity} ${item.unitOfMeasure}, minimum ${item.minimumStock}, location ${item.storageLocation}.`,
      tone: item.stockStatus === "Out of stock" || item.stockStatus === "Expired" ? "red" : "amber"
    }))
  };
}

function buildReports(input: {
  helicopters: Helicopter[];
  activeComponents: HelicopterComponent[];
  expiringComponents: HelicopterComponent[];
  lowInventory: Array<InventoryItem & { stockStatus: string }>;
  openAlerts: MaintenanceAlert[];
  activeCampaigns: Campaign[];
  helicopterRisks: HelicopterRisk[];
  importedHelicopters: Helicopter[];
  importedComponents: HelicopterComponent[];
}): CopilotReport[] {
  const operationalHelicopters = input.helicopters.filter((helicopter) => !["Grounded", "Retired"].includes(helicopter.status)).length;
  const highestRisk = input.helicopterRisks[0];
  const reports: CopilotReport[] = [
    {
      id: "management-summary",
      title: "Management Summary",
      subtitle: "Local operational snapshot for management review.",
      sections: [
        {
          heading: "Executive view",
          lines: [
            `${operationalHelicopters} of ${input.helicopters.length} helicopters are operational or assignable in local data.`,
            `${input.expiringComponents.length} components require monitoring, critical action, or expiry review.`,
            `${input.lowInventory.length} inventory items require stock or expiration review.`,
            highestRisk ? `${highestRisk.registration} currently carries the highest local maintenance risk score (${highestRisk.score}).` : "No helicopter risk ranking is available."
          ]
        },
        {
          heading: "Data basis",
          lines: [
            `${input.importedHelicopters.length} user-entered/imported helicopter records.`,
            `${input.importedComponents.length} user-entered/imported component records.`,
            "Demo records remain interface-testing data and must not be treated as operational truth."
          ]
        }
      ]
    },
    {
      id: "fleet-status",
      title: "Fleet Status Report",
      subtitle: "Aircraft status and assignment readiness.",
      sections: [
        {
          heading: "Fleet",
          lines: input.helicopterRisks.slice(0, 8).map((risk) =>
            `${risk.registration}: ${risk.status}, risk ${risk.score}, campaign ${risk.activeCampaign || "none"}, ${risk.openAlerts} open alerts.`
          )
        }
      ]
    },
    {
      id: "maintenance-status",
      title: "Maintenance Report",
      subtitle: "Open alerts and component exposure.",
      sections: [
        {
          heading: "Maintenance priorities",
          lines: input.expiringComponents.slice(0, 8).map((component) =>
            `${component.helicopterRegistration} ${component.componentName}: ${component.status}, ${component.remainingHours.toFixed(1)} hours and ${component.remainingCalendarDays} days remaining.`
          )
        },
        {
          heading: "Alerts",
          lines: input.openAlerts.slice(0, 8).map((alert) =>
            `${alert.helicopterRegistration} ${alert.componentName}: ${alert.severity} / ${alert.alertType}.`
          )
        }
      ]
    },
    {
      id: "component-due",
      title: "Component Due Report",
      subtitle: "Next component exposure by hour and calendar.",
      sections: [
        {
          heading: "Due components",
          lines: input.expiringComponents.slice(0, 10).map((component) =>
            `${component.helicopterRegistration} ${component.componentName}: ${component.status}, ${component.remainingPercentage.toFixed(1)}% remaining, calendar ${component.calendarLimitDate || "not set"}.`
          )
        }
      ]
    },
    {
      id: "inventory-status",
      title: "Vessel Inventory Report",
      subtitle: "Local vessel stock constraints.",
      sections: [
        {
          heading: "Inventory risks",
          lines: input.lowInventory.slice(0, 10).map((item) =>
            `${item.itemName} (${item.partNumber}): ${item.stockStatus}, ${item.quantity} ${item.unitOfMeasure}, minimum ${item.minimumStock}, location ${item.storageLocation}.`
          )
        }
      ]
    },
    {
      id: "campaign-readiness",
      title: "Campaign Readiness Report",
      subtitle: "Campaigns linked to aircraft and operational readiness.",
      sections: [
        {
          heading: "Campaigns",
          lines: input.activeCampaigns.slice(0, 10).map((campaign) =>
            `${campaign.code} ${campaign.name}: ${calculateCampaignStatus(campaign)}, vessel ${campaign.vesselName || "unassigned"}, helicopter ${campaign.helicopterRegistration || "unassigned"}.`
          )
        }
      ]
    }
  ];

  return reports.map((report) => ({
    ...report,
    sections: report.sections.map((section) => ({
      ...section,
      lines: section.lines.length ? section.lines : ["No local records available for this section."]
    }))
  }));
}
