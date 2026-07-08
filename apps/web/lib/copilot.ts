import {
  calculateCampaignStatus,
  calculateComplianceStatus,
  getLowStockStatus
} from "@/lib/fleet-ops";
import type {
  Campaign,
  ComponentStatus,
  FleetStore,
  Helicopter,
  HelicopterComponent,
  InventoryItem,
  MaintenanceAlert
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
