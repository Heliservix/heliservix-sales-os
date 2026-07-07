import {
  AlertTriangle,
  CalendarClock,
  Gauge,
  Plane,
  ShieldCheck,
  Wrench
} from "lucide-react";
import type {
  ComponentCategory,
  DashboardMetric,
  FlightLog,
  Helicopter,
  HelicopterComponent,
  MaintenanceAlert,
  MaintenanceForecast,
  ReplacementEvent,
  Vessel
} from "@/types/fleet";

export const helicopters: Helicopter[] = [
  {
    registration: "HP1804",
    model: "Robinson R44",
    serialNumber: "1234",
    manufactureYear: "2002",
    currentHourmeter: 1820.4,
    status: "Assigned",
    ownerCompany: "HeliServiX",
    assignedVessel: "Atunero Pacific Star",
    operationArea: "Panama / Eastern Pacific",
    base: "Panama City",
    notes: "Reference aircraft imported from component-control workbook.",
    readiness: 86,
    nextDueComponent: "MR BLADE C016-7",
    nextDueHours: 1916.5
  },
  {
    registration: "HP1782",
    model: "Robinson R44",
    serialNumber: "1182",
    manufactureYear: "2001",
    currentHourmeter: 1644.7,
    status: "Available",
    ownerCompany: "HeliServiX",
    assignedVessel: "Unassigned",
    operationArea: "Ecuador / Manta",
    base: "Manta",
    notes: "Candidate aircraft for Ecuador fleet campaign.",
    readiness: 92,
    nextDueComponent: "Tail rotor gearbox",
    nextDueHours: 420.2
  },
  {
    registration: "HP1783",
    model: "Robinson R44",
    serialNumber: "1183",
    manufactureYear: "2001",
    currentHourmeter: 1711.2,
    status: "Maintenance",
    ownerCompany: "HeliServiX",
    assignedVessel: "Unassigned",
    operationArea: "Panama",
    base: "Panama City",
    notes: "Calendar inspection planning in progress.",
    readiness: 68,
    nextDueComponent: "Hydraulic servo",
    nextDueHours: 88.4
  },
  {
    registration: "HP1768",
    model: "Robinson R44",
    serialNumber: "1168",
    manufactureYear: "2000",
    currentHourmeter: 1988.9,
    status: "Grounded",
    ownerCompany: "HeliServiX",
    assignedVessel: "Unassigned",
    operationArea: "Colombia / Pacific",
    base: "Buenaventura",
    notes: "Grounded pending component replacement and document review.",
    readiness: 41,
    nextDueComponent: "Engine overhaul",
    nextDueHours: 0
  },
  {
    registration: "HP1769",
    model: "Robinson R44",
    serialNumber: "1169",
    manufactureYear: "2000",
    currentHourmeter: 1539.5,
    status: "Available",
    ownerCompany: "HeliServiX",
    assignedVessel: "Mar Azul",
    operationArea: "Ecuador / Guayaquil",
    base: "Guayaquil",
    notes: "Strong candidate for near-term Guayaquil contract coverage.",
    readiness: 89,
    nextDueComponent: "MRGB sump",
    nextDueHours: 356.1
  }
];

export const vessels: Vessel[] = [
  {
    id: "vessel-pacific-star",
    name: "Atunero Pacific Star",
    owner: "Pacific Tuna Holdings",
    capacityTons: 1250,
    campaign: "Eastern Pacific Q3",
    country: "Panama",
    contract: "Draft annual support"
  },
  {
    id: "vessel-mar-azul",
    name: "Mar Azul",
    owner: "Manta Ocean Group",
    capacityTons: 980,
    campaign: "Guayaquil readiness",
    country: "Ecuador",
    contract: "Seasonal proposal"
  },
  {
    id: "vessel-costa-dorada",
    name: "Costa Dorada",
    owner: "Andes Pesca",
    capacityTons: 1100,
    campaign: "Manta prospecting",
    country: "Ecuador",
    contract: "Opportunity review"
  }
];

export const componentCategories: ComponentCategory[] = [
  { id: "cat-engine", name: "Engine", description: "Powerplant and overhaul-controlled items." },
  { id: "cat-main-rotor", name: "Main Rotor", description: "Blades, hubs, swashplate, and controls." },
  { id: "cat-tail-rotor", name: "Tail Rotor", description: "Tail rotor blades, gearbox, and drive elements." },
  { id: "cat-transmission", name: "Transmission", description: "MRGB, sump, housing, and gear sets." },
  { id: "cat-servo", name: "Servo", description: "Hydraulic servo and control components." }
];

export const components: HelicopterComponent[] = [
  {
    id: "cmp-hp1804-mrgb",
    helicopterRegistration: "HP1804",
    category: "Transmission",
    componentName: "MRGB",
    partNumber: "C006-7",
    serialNumber: "3188",
    position: "N/A",
    installationDate: "2019-02-18",
    tsnHours: 0,
    tsoHours: 283.5,
    lifeLimitHours: 2200,
    remainingHours: 1916.5,
    calendarLimitDate: "2031-02-18",
    remainingCalendarDays: 1688,
    remainingPercentage: 87.1,
    status: "OK",
    notes: "Imported from Control Maestro reference structure.",
    documents: 2
  },
  {
    id: "cmp-hp1804-mrblade-a",
    helicopterRegistration: "HP1804",
    category: "Main Rotor",
    componentName: "MR BLADE",
    partNumber: "C016-7",
    serialNumber: "10667",
    position: "A",
    installationDate: "2019-02-18",
    tsnHours: 0,
    tsoHours: 283.5,
    lifeLimitHours: 2200,
    remainingHours: 1916.5,
    calendarLimitDate: "2031-02-18",
    remainingCalendarDays: 1688,
    remainingPercentage: 87.1,
    status: "OK",
    notes: "Healthy remaining life by hour and calendar.",
    documents: 3
  },
  {
    id: "cmp-hp1782-trgb",
    helicopterRegistration: "HP1782",
    category: "Tail Rotor",
    componentName: "Tail rotor gearbox",
    partNumber: "C021-4",
    serialNumber: "7721",
    position: "Aft",
    installationDate: "2023-08-14",
    tsnHours: 980,
    tsoHours: 1779.8,
    lifeLimitHours: 2200,
    remainingHours: 420.2,
    calendarLimitDate: "2030-08-14",
    remainingCalendarDays: 1500,
    remainingPercentage: 19.1,
    status: "Monitor",
    notes: "Plan replacement package before high-utilization Ecuador assignment.",
    documents: 1
  },
  {
    id: "cmp-hp1783-servo",
    helicopterRegistration: "HP1783",
    category: "Servo",
    componentName: "Hydraulic servo",
    partNumber: "D212-3",
    serialNumber: "HS-8442",
    position: "Right",
    installationDate: "2021-05-09",
    tsnHours: 1490,
    tsoHours: 2111.6,
    lifeLimitHours: 2200,
    remainingHours: 88.4,
    calendarLimitDate: "2027-05-09",
    remainingCalendarDays: 306,
    remainingPercentage: 4.0,
    status: "Critical",
    notes: "Critical hour exposure blocks new campaign assignment.",
    documents: 2
  },
  {
    id: "cmp-hp1768-engine",
    helicopterRegistration: "HP1768",
    category: "Engine",
    componentName: "Engine overhaul",
    partNumber: "IO-540-AE1A5",
    serialNumber: "L-34122",
    position: "Engine",
    installationDate: "2018-11-30",
    tsnHours: 1988.9,
    tsoHours: 2200,
    lifeLimitHours: 2200,
    remainingHours: 0,
    calendarLimitDate: "2026-05-31",
    remainingCalendarDays: -37,
    remainingPercentage: 0,
    status: "Expired",
    notes: "Grounding item. Overhaul plan required before dispatch.",
    documents: 4
  },
  {
    id: "cmp-hp1769-sump",
    helicopterRegistration: "HP1769",
    category: "Transmission",
    componentName: "MRGB sump",
    partNumber: "C263-2",
    serialNumber: "7719",
    position: "N/A",
    installationDate: "2019-02-18",
    tsnHours: 0,
    tsoHours: 1843.9,
    lifeLimitHours: 2200,
    remainingHours: 356.1,
    calendarLimitDate: "2031-02-18",
    remainingCalendarDays: 1688,
    remainingPercentage: 16.2,
    status: "Monitor",
    notes: "Monitor during Guayaquil campaign planning.",
    documents: 1
  }
];

export const flightLogs: FlightLog[] = [
  {
    id: "fl-001",
    helicopterRegistration: "HP1804",
    vesselName: "Atunero Pacific Star",
    campaign: "Eastern Pacific Q3",
    flightDate: "2026-07-04",
    pilot: "Adolfo Spinali",
    mechanic: "Carlos Rivas",
    hobbsStart: 1816.2,
    hobbsEnd: 1820.4,
    flightHours: 4.2,
    notes: "Search pattern validation and vessel approach coordination.",
    approvalStatus: "Approved"
  },
  {
    id: "fl-002",
    helicopterRegistration: "HP1769",
    vesselName: "Mar Azul",
    campaign: "Guayaquil readiness",
    flightDate: "2026-07-02",
    pilot: "Miguel Ortega",
    mechanic: "Luis Moreno",
    hobbsStart: 1537,
    hobbsEnd: 1539.5,
    flightHours: 2.5,
    notes: "Owner demonstration sortie.",
    approvalStatus: "Submitted"
  }
];

export const maintenanceAlerts: MaintenanceAlert[] = [
  {
    id: "alert-001",
    helicopterRegistration: "HP1768",
    componentId: "cmp-hp1768-engine",
    componentName: "Engine overhaul",
    alertType: "Hour and calendar expired",
    severity: "Grounding",
    triggerBasis: "Hours",
    remainingHours: 0,
    remainingCalendarDays: -37,
    dueDate: "2026-05-31",
    assignedTo: "Maintenance Lead",
    status: "Open",
    description: "Engine overhaul is expired. Aircraft must remain grounded until replacement or overhaul event is approved."
  },
  {
    id: "alert-002",
    helicopterRegistration: "HP1783",
    componentId: "cmp-hp1783-servo",
    componentName: "Hydraulic servo",
    alertType: "Critical hour limit",
    severity: "Critical",
    triggerBasis: "Hours",
    remainingHours: 88.4,
    remainingCalendarDays: 306,
    dueDate: "2027-05-09",
    assignedTo: "Operations Manager",
    status: "Acknowledged",
    description: "Hydraulic servo is below 10% remaining by hours and blocks campaign assignment."
  },
  {
    id: "alert-003",
    helicopterRegistration: "HP1782",
    componentId: "cmp-hp1782-trgb",
    componentName: "Tail rotor gearbox",
    alertType: "Monitor threshold",
    severity: "Monitor",
    triggerBasis: "Hours",
    remainingHours: 420.2,
    remainingCalendarDays: 1500,
    dueDate: "2030-08-14",
    assignedTo: "Maintenance Coordinator",
    status: "In Progress",
    description: "Component is between 10% and 25% remaining. Procurement timing should be reviewed."
  },
  {
    id: "alert-004",
    helicopterRegistration: "HP1804",
    componentName: "Calendar limit source",
    alertType: "Missing component data",
    severity: "Info",
    triggerBasis: "Data",
    assignedTo: "Data Steward",
    status: "Open",
    description: "Five workbook-imported components require calendar-limit verification before final readiness confidence."
  }
];

export const maintenanceForecasts: MaintenanceForecast[] = [
  {
    id: "forecast-001",
    helicopterRegistration: "HP1768",
    horizon: "Immediate",
    monthlyHourTrend: 0,
    componentName: "Engine overhaul",
    estimatedDueDate: "Expired",
    estimatedDueHours: 0,
    exposure: "Grounding",
    reserveRequired: "$92,000",
    procurementTiming: "Immediate overhaul slot required",
    confidence: "High"
  },
  {
    id: "forecast-002",
    helicopterRegistration: "HP1783",
    horizon: "60 days",
    monthlyHourTrend: 42,
    componentName: "Hydraulic servo",
    estimatedDueDate: "2026-09-09",
    estimatedDueHours: 88.4,
    exposure: "Critical assignment risk",
    reserveRequired: "$18,400",
    procurementTiming: "Order within 14 days",
    confidence: "Medium"
  },
  {
    id: "forecast-003",
    helicopterRegistration: "HP1782",
    horizon: "180 days",
    monthlyHourTrend: 55,
    componentName: "Tail rotor gearbox",
    estimatedDueDate: "2027-02-25",
    estimatedDueHours: 420.2,
    exposure: "Monitor",
    reserveRequired: "$24,500",
    procurementTiming: "Quote package by Q4",
    confidence: "Medium"
  }
];

export const replacementEvents: ReplacementEvent[] = [
  {
    id: "rep-001",
    helicopterRegistration: "HP1804",
    removedComponent: "Legacy MRGB sump C263-1",
    installedComponent: "MRGB sump C263-2 / SN 7719",
    removalDate: "2019-02-18",
    installationDate: "2019-02-18",
    removalHourmeter: 1536.9,
    installationHourmeter: 1536.9,
    reason: "Scheduled controlled component replacement",
    approvedBy: "Maintenance Lead"
  },
  {
    id: "rep-002",
    helicopterRegistration: "HP1769",
    removedComponent: "Main rotor blade C016-6",
    installedComponent: "Main rotor blade C016-7",
    removalDate: "2024-03-20",
    installationDate: "2024-03-22",
    removalHourmeter: 1408.3,
    installationHourmeter: 1408.3,
    reason: "Life-limit replacement",
    approvedBy: "Operations Director"
  }
];

export const fleetMetrics: DashboardMetric[] = [
  {
    label: "Active Helicopters",
    value: "5",
    detail: "Across Panama, Ecuador, and Colombia operations",
    tone: "teal",
    icon: Plane
  },
  {
    label: "Fleet Readiness",
    value: "75%",
    detail: "Weighted by assignment and grounding status",
    tone: "green",
    icon: ShieldCheck
  },
  {
    label: "Open Alerts",
    value: "4",
    detail: "1 grounding, 1 critical, 1 monitor, 1 data issue",
    tone: "amber",
    icon: AlertTriangle
  },
  {
    label: "Reserve Exposure",
    value: "$134.9K",
    detail: "Forecasted maintenance reserve requirement",
    tone: "blue",
    icon: Gauge
  }
];

export const fleetActivity = [
  {
    title: "HP1768 remains grounded",
    description: "Engine overhaul is expired and requires immediate planning before dispatch.",
    time: "08:10",
    icon: Wrench,
    tone: "red" as const
  },
  {
    title: "HP1804 workbook import model validated",
    description: "Control Maestro structure mapped to component-control mock data.",
    time: "09:35",
    icon: ShieldCheck,
    tone: "teal" as const
  },
  {
    title: "HP1769 assigned to Mar Azul",
    description: "Guayaquil readiness campaign linked to vessel and seasonal proposal.",
    time: "10:20",
    icon: Plane,
    tone: "green" as const
  },
  {
    title: "Servo procurement timing flagged",
    description: "HP1783 hydraulic servo forecast suggests order within 14 days.",
    time: "11:00",
    icon: CalendarClock,
    tone: "amber" as const
  }
];

export function getHelicopter(registration: string) {
  return helicopters.find((helicopter) => helicopter.registration === registration);
}

export function getComponent(id: string) {
  return components.find((component) => component.id === id);
}

export function componentsForHelicopter(registration: string) {
  return components.filter((component) => component.helicopterRegistration === registration);
}

export function alertsForHelicopter(registration: string) {
  return maintenanceAlerts.filter((alert) => alert.helicopterRegistration === registration);
}
