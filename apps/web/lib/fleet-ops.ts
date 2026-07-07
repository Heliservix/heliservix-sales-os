import {
  components,
  flightLogs,
  helicopters,
  maintenanceAlerts,
  replacementEvents,
  vessels
} from "@/lib/fleet-data";
import type {
  ComponentStatus,
  FleetStore,
  HelicopterComponent,
  InventoryItem,
  MaintenanceAlert,
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
    ]
  };
}
