import {
  components,
  flightLogs,
  helicopters,
  maintenanceAlerts,
  replacementEvents,
  vessels
} from "@/lib/fleet-data";
import type {
  Campaign,
  CampaignStatus,
  ComplianceAlert,
  ComplianceItem,
  ComplianceStatus,
  ComponentStatus,
  DigitalTwinSummary,
  FleetStore,
  HelicopterComponent,
  InventoryItem,
  MaintenanceAlert,
  MaintenanceTimelineEvent,
  PurchaseStatus
} from "@/types/fleet";

export const fleetStorageKey = "hsv-os-fleet-0.2";

export function generateId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function calculateRemainingPercentage(remainingHours: number, lifeLimitHours: number) {
  if (lifeLimitHours <= 0) return 0;
  return Math.max(0, Math.min(100, (remainingHours / lifeLimitHours) * 100));
}

export function calculateComponentStatus(input: {
  remainingHours: number;
  remainingCalendarDays: number;
  remainingPercentage: number;
  status?: ComponentStatus;
}): ComponentStatus {
  if (input.status === "Removed") return "Removed";
  if (input.remainingHours <= 0 || input.remainingCalendarDays <= 0 || input.remainingPercentage <= 0) return "Expired";
  if (input.remainingPercentage < 10) return "Critical";
  if (input.remainingPercentage <= 25) return "Monitor";
  return "OK";
}

export function deductFlightHoursFromComponents(componentsToUpdate: HelicopterComponent[], flightHours: number) {
  return componentsToUpdate.map((component) => {
    if (component.status === "Removed" || component.archived) return component;
    const remainingHours = Math.max(0, component.remainingHours - flightHours);
    const tsoHours = component.tsoHours + flightHours;
    const remainingPercentage = calculateRemainingPercentage(remainingHours, component.lifeLimitHours);
    const status = calculateComponentStatus({
      remainingHours,
      remainingCalendarDays: component.remainingCalendarDays,
      remainingPercentage
    });

    return {
      ...component,
      remainingHours,
      tsoHours,
      remainingPercentage,
      status
    };
  });
}

export function createAlertsForComponents(componentsToCheck: HelicopterComponent[]) {
  return componentsToCheck
    .filter((component) => ["Monitor", "Critical", "Expired"].includes(component.status))
    .map<MaintenanceAlert>((component) => {
      const severity = component.status === "Expired" ? "Grounding" : component.status === "Critical" ? "Critical" : "Monitor";
      return {
        id: generateId("alert"),
        helicopterRegistration: component.helicopterRegistration,
        componentId: component.id,
        componentName: component.componentName,
        alertType: `${component.status} component threshold`,
        severity,
        triggerBasis: component.remainingHours <= 0 ? "Hours" : component.remainingCalendarDays <= 0 ? "Calendar" : "Forecast",
        remainingHours: component.remainingHours,
        remainingCalendarDays: component.remainingCalendarDays,
        dueDate: component.calendarLimitDate,
        assignedTo: "Maintenance Chief",
        status: "Open",
        description: `${component.componentName} is ${component.status}. Review hour, calendar, and evidence records before dispatch.`,
        source: "User"
      };
    });
}

export function getLowStockStatus(item: InventoryItem) {
  if (item.quantity <= 0) return "Out of stock";
  if (item.quantity <= item.minimumStock) return "Low stock";
  if (item.expirationDate) {
    const days = Math.ceil((new Date(item.expirationDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return "Expired";
    if (days <= 30) return "Expiring soon";
  }
  return "OK";
}

export function purchaseStatusTone(status: PurchaseStatus) {
  if (["Closed", "Stored", "Installed", "Consumed"].includes(status)) return "green" as const;
  if (["Approved", "Ordered", "Received", "Shipped to vessel"].includes(status)) return "blue" as const;
  if (status === "Quoted") return "teal" as const;
  return "amber" as const;
}

export function calculateCampaignStatus(campaign: Campaign): CampaignStatus {
  if (campaign.status === "Archived" || campaign.status === "Cancelled" || campaign.status === "Completed") return campaign.status;
  const today = new Date().toISOString().slice(0, 10);
  if (campaign.startDate && campaign.endDate && campaign.startDate <= today && campaign.endDate >= today) return "Active";
  if (campaign.startDate && campaign.startDate > today) return "Planned";
  if (campaign.endDate && campaign.endDate < today) return "Completed";
  return campaign.status || "Draft";
}

export function campaignStatusTone(status: CampaignStatus) {
  if (status === "Active" || status === "Approved") return "green" as const;
  if (status === "Planned" || status === "Readiness Review") return "blue" as const;
  if (status === "Suspended") return "amber" as const;
  if (status === "Cancelled" || status === "Archived") return "red" as const;
  return "neutral" as const;
}

export function calculateComplianceStatus(item: ComplianceItem): ComplianceStatus {
  if (item.status === "Complied" || item.status === "Not applicable") return item.status;
  if (item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10)) return "Overdue";
  return item.status;
}

export function complianceStatusTone(status: ComplianceStatus) {
  if (status === "Complied" || status === "Not applicable") return "green" as const;
  if (status === "Applicable" || status === "In progress") return "blue" as const;
  if (status === "Overdue") return "red" as const;
  return "amber" as const;
}

export function createComplianceAlert(item: ComplianceItem): ComplianceAlert | undefined {
  const status = calculateComplianceStatus(item);
  if (status === "Complied" || status === "Not applicable") return undefined;
  return {
    id: generateId("comp-alert"),
    complianceItemId: item.id,
    relatedHelicopter: item.relatedHelicopter,
    relatedComponentId: item.relatedComponentId,
    severity: status === "Overdue" ? "Critical" : status === "Applicable" ? "Monitor" : "Info",
    status: "Open",
    dueDate: item.dueDate,
    description: `${item.referenceNumber || item.title} requires applicability review or compliance action before operational release.`,
    source: item.source ?? "User"
  };
}

export function technicalRecordLinkingSummary(store: FleetStore, entity: {
  helicopterRegistration?: string;
  campaignId?: string;
  componentId?: string;
  purchaseId?: string;
}) {
  return store.technicalRecords.filter((record) => {
    if (entity.helicopterRegistration && record.relatedHelicopter === entity.helicopterRegistration) return true;
    if (entity.campaignId && record.relatedCampaignId === entity.campaignId) return true;
    if (entity.componentId && record.relatedComponentId === entity.componentId) return true;
    if (entity.purchaseId && record.relatedPurchaseId === entity.purchaseId) return true;
    return false;
  });
}

export function generateMaintenanceTimeline(store: FleetStore, helicopterRegistration: string): MaintenanceTimelineEvent[] {
  const replacementEvents: MaintenanceTimelineEvent[] = store.replacementEvents
    .filter((event) => event.helicopterRegistration === helicopterRegistration)
    .flatMap((event) => [
      {
        id: `${event.id}-removal`,
        helicopterRegistration,
        eventType: "Removal" as const,
        eventDate: event.removalDate,
        title: `Removed ${event.removedComponent}`,
        description: event.reason,
        severity: "Info" as const,
        sourceEntityType: "replacement",
        sourceEntityId: event.id,
        source: event.source ?? "Demo"
      },
      {
        id: `${event.id}-installation`,
        helicopterRegistration,
        eventType: "Installation" as const,
        eventDate: event.installationDate,
        title: `Installed ${event.installedComponent}`,
        description: event.notes || event.reason,
        severity: "Info" as const,
        sourceEntityType: "replacement",
        sourceEntityId: event.id,
        source: event.source ?? "Demo"
      }
    ]);

  const maintenanceEvents: MaintenanceTimelineEvent[] = store.maintenanceLogs
    .filter((event) => event.helicopterRegistration === helicopterRegistration)
    .map((event) => ({
      id: event.id,
      helicopterRegistration,
      eventType: event.maintenanceType.toLowerCase().includes("annual") ? "Annual" : event.maintenanceType.toLowerCase().includes("overhaul") ? "Overhaul" : "Inspection",
      eventDate: event.date,
      title: event.maintenanceType,
      description: event.actionTaken || event.description,
      severity: "Info",
      sourceEntityType: "maintenance-log",
      sourceEntityId: event.id,
      source: event.source ?? "Demo"
    }));

  const complianceEvents: MaintenanceTimelineEvent[] = store.complianceItems
    .filter((item) => item.relatedHelicopter === helicopterRegistration)
    .map((item) => ({
      id: item.id,
      helicopterRegistration,
      eventType: "SB/AD Compliance",
      eventDate: item.dueDate || item.effectiveDate,
      title: `${item.complianceType} ${item.referenceNumber}`,
      description: item.title,
      severity: calculateComplianceStatus(item) === "Overdue" ? "Critical" : "Monitor",
      sourceEntityType: "compliance",
      sourceEntityId: item.id,
      forecasted: item.status !== "Complied",
      source: item.source ?? "Demo"
    }));

  const forecastedDueEvents: MaintenanceTimelineEvent[] = store.components
    .filter((component) => component.helicopterRegistration === helicopterRegistration && component.status !== "OK" && component.status !== "Removed")
    .map((component) => ({
      id: `${component.id}-forecast`,
      helicopterRegistration,
      eventType: "Forecasted Due Event",
      eventDate: component.calendarLimitDate,
      title: `${component.componentName} due exposure`,
      description: `${component.remainingHours.toFixed(1)} hours and ${component.remainingCalendarDays} calendar days remaining.`,
      severity: component.status === "Expired" || component.status === "Critical" ? "Critical" : "Monitor",
      sourceEntityType: "component",
      sourceEntityId: component.id,
      forecasted: true,
      source: component.source ?? "Demo"
    }));

  return [...replacementEvents, ...maintenanceEvents, ...complianceEvents, ...forecastedDueEvents]
    .sort((a, b) => (b.eventDate || "").localeCompare(a.eventDate || ""));
}

export function calculateDigitalTwinSummary(store: FleetStore, helicopterRegistration: string): DigitalTwinSummary | undefined {
  const helicopter = store.helicopters.find((item) => item.registration === helicopterRegistration && !item.archived);
  if (!helicopter) return undefined;
  const assignedVessel = store.vessels.find((item) => item.name === helicopter.assignedVessel || item.assignedHelicopter === helicopter.registration);
  const activeCampaign = store.campaigns.find((campaign) =>
    !campaign.archived &&
    campaign.helicopterRegistration === helicopter.registration &&
    ["Active", "Approved", "Readiness Review", "Planned"].includes(calculateCampaignStatus(campaign))
  );
  const installed = store.components.filter((component) => component.helicopterRegistration === helicopter.registration && !component.archived && component.status !== "Removed");
  const flightLogsForHelicopter = store.flightLogs.filter((log) => log.helicopterRegistration === helicopter.registration);
  const openAlerts = store.maintenanceAlerts.filter((alert) => alert.helicopterRegistration === helicopter.registration && alert.status !== "Resolved").length;
  const complianceOpenCount = store.complianceItems.filter((item) =>
    item.relatedHelicopter === helicopter.registration && !["Complied", "Not applicable"].includes(calculateComplianceStatus(item))
  ).length;
  const timeline = generateMaintenanceTimeline(store, helicopter.registration);

  return {
    helicopter,
    activeCampaign,
    assignedVessel,
    installedComponents: installed.length,
    criticalComponents: installed.filter((component) => ["Critical", "Expired"].includes(component.status)).length,
    openAlerts,
    forecastedDueItems: timeline.filter((event) => event.forecasted).length,
    totalFlightHours: flightLogsForHelicopter.reduce((sum, log) => sum + log.flightHours, 0),
    campaignCount: store.campaigns.filter((campaign) => campaign.helicopterRegistration === helicopter.registration).length,
    technicalRecordCount: technicalRecordLinkingSummary(store, { helicopterRegistration: helicopter.registration }).length,
    complianceOpenCount,
    timeline
  };
}

export function initialFleetStore(): FleetStore {
  return {
    helicopters: helicopters.map((record) => ({ ...record, source: "Demo" })),
    vessels: vessels.map((record) => ({ ...record, source: "Demo" })),
    components: components.map((record) => ({ ...record, source: "Demo" })),
    flightLogs: flightLogs.map((record) => ({ ...record, source: "Demo" })),
    maintenanceAlerts: maintenanceAlerts.map((record) => ({ ...record, source: "Demo" })),
    replacementEvents: replacementEvents.map((record) => ({ ...record, source: "Demo" })),
    maintenanceLogs: [
      {
        id: "mlog-demo-001",
        helicopterRegistration: "HP1804",
        date: "2026-07-07",
        maintenanceType: "Demo inspection",
        description: "Demo maintenance log for interface testing.",
        technician: "Demo Maintenance Chief",
        relatedComponentId: "cmp-hp1804-mrgb",
        actionTaken: "Reviewed demo component status.",
        evidencePlaceholder: "Demo logbook page placeholder",
        notes: "Replace with real HeliServiX maintenance entries.",
        source: "Demo"
      }
    ],
    componentChanges: [],
    inventoryItems: [
      {
        id: "inv-demo-001",
        vesselId: "demo-vessel-a",
        storageLocation: "Demo Bodega A",
        itemType: "Filter",
        itemName: "Demo Filter",
        partNumber: "DEMO-FILTER",
        quantity: 2,
        unitOfMeasure: "ea",
        minimumStock: 3,
        condition: "Serviceable",
        relatedHelicopter: "HP1804",
        notes: "Neutral demo inventory item for interface testing.",
        source: "Demo"
      }
    ],
    stockMovements: [],
    purchaseRequests: [
      {
        id: "po-demo-001",
        supplier: "Demo Supplier",
        itemName: "Demo Oil",
        partNumber: "DEMO-OIL",
        quantity: 6,
        unitCost: 0,
        currency: "USD",
        relatedHelicopter: "HP1804",
        relatedVessel: "demo-vessel-a",
        relatedCampaign: "Demo Campaign A",
        status: "Requested",
        attachmentsPlaceholder: "Supplier quote placeholder",
        notes: "Demo purchasing request. Not an accounting record.",
        source: "Demo"
      }
    ],
    campaigns: [
      {
        id: "camp-demo-001",
        code: "DEMO-CAMP-001",
        name: "Demo Campaign A",
        clientFleetOwner: "Demo Fleet Owner",
        vesselId: "demo-vessel-a",
        vesselName: "Demo Vessel A",
        helicopterRegistration: "HP1804",
        pilot: "Demo Pilot",
        mechanic: "Demo Mechanic",
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        operationArea: "Demo Panama operation area",
        contractReference: "DEMO-CONTRACT-001",
        status: "Active",
        notes: "Neutral demo campaign for interface testing. Replace with real HeliServiX campaign records before operational use.",
        source: "Demo"
      },
      {
        id: "camp-demo-002",
        code: "DEMO-CAMP-002",
        name: "Demo Campaign B",
        clientFleetOwner: "Demo Fleet Owner",
        vesselId: "demo-vessel-b",
        vesselName: "Demo Vessel B",
        helicopterRegistration: "HP1769",
        pilot: "Demo Pilot",
        mechanic: "Demo Mechanic",
        startDate: "2026-08-01",
        endDate: "2026-08-30",
        operationArea: "Demo Ecuador operation area",
        contractReference: "DEMO-CONTRACT-002",
        status: "Planned",
        notes: "Neutral demo campaign. Do not use as real vessel or helicopter assignment.",
        source: "Demo"
      }
    ],
    technicalRecords: [
      {
        id: "tech-demo-001",
        recordType: "Logbook page",
        relatedHelicopter: "HP1804",
        relatedComponentId: "cmp-hp1804-mrgb",
        relatedMaintenanceEvent: "mlog-demo-001",
        relatedCampaignId: "camp-demo-001",
        relatedPurchaseId: "po-demo-001",
        title: "Demo logbook evidence",
        recordDate: "2026-07-07",
        documentNumber: "DEMO-LOG-001",
        notes: "Demo technical record showing how evidence will link across helicopter, component, campaign, purchase, and maintenance context.",
        attachmentPlaceholder: "Demo attachment placeholder",
        source: "Demo"
      },
      {
        id: "tech-demo-002",
        recordType: "Certificate",
        relatedHelicopter: "HP1769",
        relatedComponentId: "cmp-hp1769-sump",
        relatedCampaignId: "camp-demo-002",
        title: "Demo component certificate",
        recordDate: "2026-07-05",
        documentNumber: "DEMO-CERT-001",
        notes: "Neutral certificate placeholder for technical-record UI validation.",
        attachmentPlaceholder: "Certificate placeholder",
        source: "Demo"
      }
    ],
    complianceItems: [
      {
        id: "comp-demo-001",
        authority: "Robinson",
        complianceType: "SB",
        referenceNumber: "DEMO-SB-001",
        title: "Demo service bulletin applicability review",
        effectiveDate: "2026-07-01",
        dueDate: "2026-08-15",
        applicability: "Demo R44 applicability check. Replace with reviewed manufacturer or regulatory source.",
        relatedHelicopter: "HP1804",
        relatedComponentId: "cmp-hp1804-mrgb",
        status: "Applicable",
        notes: "Demo compliance item for interface testing only.",
        attachmentPlaceholder: "Service bulletin placeholder",
        source: "Demo"
      },
      {
        id: "comp-demo-002",
        authority: "AAC Panama",
        complianceType: "Operational Requirement",
        referenceNumber: "DEMO-AAC-001",
        title: "Demo operating-area document review",
        effectiveDate: "2026-07-01",
        dueDate: "2026-07-20",
        applicability: "Demo requirement tied to Panama campaign readiness.",
        relatedHelicopter: "HP1804",
        status: "In progress",
        notes: "Neutral demo regulatory readiness item.",
        attachmentPlaceholder: "AAC placeholder",
        source: "Demo"
      }
    ],
    complianceAlerts: [
      {
        id: "comp-alert-demo-001",
        complianceItemId: "comp-demo-001",
        relatedHelicopter: "HP1804",
        relatedComponentId: "cmp-hp1804-mrgb",
        relatedCampaignId: "camp-demo-001",
        severity: "Monitor",
        status: "Open",
        dueDate: "2026-08-15",
        description: "Demo compliance alert. Review applicability before campaign readiness approval.",
        source: "Demo"
      }
    ]
  };
}
