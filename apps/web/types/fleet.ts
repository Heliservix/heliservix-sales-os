import type { LucideIcon } from "lucide-react";

export type HelicopterStatus =
  | "Available"
  | "Assigned"
  | "In Campaign"
  | "Maintenance"
  | "Grounded"
  | "Retired";

export type ComponentStatus = "OK" | "Monitor" | "Critical" | "Expired";

export type AlertSeverity = "Info" | "Monitor" | "Critical" | "Grounding";

export type AlertStatus = "Open" | "Acknowledged" | "In Progress" | "Resolved";

export type ForecastConfidence = "High" | "Medium" | "Low";

export type VesselStatus = "Demo" | "Prospect" | "Active" | "Inactive" | "Archived";

export type Helicopter = {
  registration: string;
  model: string;
  serialNumber: string;
  manufactureYear: string;
  currentHourmeter: number;
  status: HelicopterStatus;
  ownerCompany: string;
  assignedVessel?: string;
  operationArea: string;
  base: string;
  notes: string;
  readiness: number;
  nextDueComponent: string;
  nextDueHours: number;
};

export type Vessel = {
  id: string;
  name: string;
  owner: string;
  homePort: string;
  capacityTons: number;
  campaign: string;
  country: string;
  assignedHelicopter?: string;
  status: VesselStatus;
  notes: string;
};

export type ComponentCategory = {
  id: string;
  name: string;
  description: string;
};

export type HelicopterComponent = {
  id: string;
  helicopterRegistration: string;
  category: string;
  componentName: string;
  partNumber: string;
  serialNumber: string;
  position: string;
  installationDate: string;
  tsnHours: number;
  tsoHours: number;
  lifeLimitHours: number;
  remainingHours: number;
  calendarLimitDate: string;
  remainingCalendarDays: number;
  remainingPercentage: number;
  status: ComponentStatus;
  notes: string;
  documents: number;
};

export type FlightLog = {
  id: string;
  helicopterRegistration: string;
  vesselName: string;
  campaign: string;
  flightDate: string;
  pilot: string;
  mechanic: string;
  hobbsStart: number;
  hobbsEnd: number;
  flightHours: number;
  notes: string;
  approvalStatus: "Draft" | "Submitted" | "Approved";
};

export type MaintenanceAlert = {
  id: string;
  helicopterRegistration: string;
  componentId?: string;
  componentName: string;
  alertType: string;
  severity: AlertSeverity;
  triggerBasis: "Hours" | "Calendar" | "Data" | "Forecast";
  remainingHours?: number;
  remainingCalendarDays?: number;
  dueDate?: string;
  assignedTo: string;
  status: AlertStatus;
  description: string;
};

export type MaintenanceForecast = {
  id: string;
  helicopterRegistration: string;
  horizon: string;
  monthlyHourTrend: number;
  componentName: string;
  estimatedDueDate: string;
  estimatedDueHours: number;
  exposure: string;
  reserveRequired: string;
  procurementTiming: string;
  confidence: ForecastConfidence;
};

export type ReplacementEvent = {
  id: string;
  helicopterRegistration: string;
  removedComponent: string;
  installedComponent: string;
  removalDate: string;
  installationDate: string;
  removalHourmeter: number;
  installationHourmeter: number;
  reason: string;
  approvedBy: string;
};

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "green" | "amber" | "blue" | "teal" | "red" | "neutral";
  icon: LucideIcon;
};
