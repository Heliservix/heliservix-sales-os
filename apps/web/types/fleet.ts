import type { LucideIcon } from "lucide-react";

export type HelicopterStatus =
  | "Available"
  | "Assigned"
  | "In Campaign"
  | "Maintenance"
  | "Grounded"
  | "Retired";

export type ComponentStatus = "OK" | "Monitor" | "Critical" | "Expired" | "Removed";

export type AlertSeverity = "Info" | "Monitor" | "Critical" | "Grounding";

export type AlertStatus = "Open" | "Acknowledged" | "In Progress" | "Resolved";

export type ForecastConfidence = "High" | "Medium" | "Low";

export type VesselStatus = "Demo" | "Prospect" | "Active" | "Inactive" | "Archived";

export type InventoryItemType =
  | "Component"
  | "Hardware"
  | "Consumable"
  | "Oil"
  | "Filter"
  | "Tool"
  | "Kit"
  | "Other";

export type StockMovementType = "Received" | "Transferred" | "Used" | "Installed" | "Consumed" | "Adjusted";

export type PurchaseStatus =
  | "Requested"
  | "Quoted"
  | "Approved"
  | "Ordered"
  | "Received"
  | "Shipped to vessel"
  | "Stored"
  | "Installed"
  | "Consumed"
  | "Closed";

export type CrewPortalRole = "Admin View" | "Maintenance Chief View";

export type DataSource = "Demo" | "User";

export type CampaignStatus =
  | "Draft"
  | "Planned"
  | "Readiness Review"
  | "Approved"
  | "Active"
  | "Suspended"
  | "Completed"
  | "Cancelled"
  | "Archived";

export type TechnicalRecordType =
  | "8130"
  | "Logbook page"
  | "Work order"
  | "Invoice"
  | "Photo"
  | "Certificate"
  | "Release to service"
  | "Inspection"
  | "Other";

export type ComplianceAuthority = "AAC Panama" | "DGAC Ecuador" | "FAA" | "Robinson" | "Other";

export type ComplianceType =
  | "AD"
  | "SB"
  | "Service Letter"
  | "Manual Revision"
  | "Operational Requirement"
  | "Life Limit";

export type ComplianceStatus =
  | "Not reviewed"
  | "Applicable"
  | "Not applicable"
  | "In progress"
  | "Complied"
  | "Overdue";

export type TimelineEventType =
  | "Installation"
  | "Removal"
  | "Inspection"
  | "Overhaul"
  | "Annual"
  | "SB/AD Compliance"
  | "Forecasted Due Event"
  | "Flight"
  | "Campaign Assignment"
  | "Technical Record";

export type Helicopter = {
  registration: string;
  model: string;
  serialNumber: string;
  manufactureYear: string;
  manufactureDate?: string;
  lastReviewDate?: string;
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
  archived?: boolean;
  source?: "Demo" | "User";
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
  archived?: boolean;
  source?: "Demo" | "User";
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
  archived?: boolean;
  source?: "Demo" | "User";
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
  source?: "Demo" | "User";
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
  source?: "Demo" | "User";
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
  notes?: string;
  source?: "Demo" | "User";
};

export type MaintenanceLogEntry = {
  id: string;
  helicopterRegistration: string;
  date: string;
  maintenanceType: string;
  description: string;
  technician: string;
  relatedComponentId?: string;
  actionTaken: string;
  evidencePlaceholder: string;
  notes: string;
  source?: "Demo" | "User";
};

export type ComponentChange = {
  id: string;
  helicopterRegistration: string;
  removedComponentId?: string;
  removedComponentName: string;
  installedComponentName: string;
  installedPartNumber: string;
  installedSerialNumber: string;
  removalDate: string;
  installationDate: string;
  reason: string;
  technician: string;
  supportingDocumentPlaceholder: string;
  notes: string;
  source?: "Demo" | "User";
};

export type InventoryItem = {
  id: string;
  vesselId: string;
  storageLocation: string;
  itemType: InventoryItemType;
  itemName: string;
  partNumber: string;
  serialNumber?: string;
  lotBatch?: string;
  quantity: number;
  unitOfMeasure: string;
  minimumStock: number;
  condition: string;
  expirationDate?: string;
  relatedHelicopter?: string;
  notes: string;
  archived?: boolean;
  source?: "Demo" | "User";
};

export type StockMovement = {
  id: string;
  inventoryItemId: string;
  movementType: StockMovementType;
  fromLocation: string;
  toLocation: string;
  quantity: number;
  date: string;
  relatedMaintenanceEvent?: string;
  notes: string;
  source?: "Demo" | "User";
};

export type PurchaseRequest = {
  id: string;
  supplier: string;
  itemName: string;
  partNumber: string;
  quantity: number;
  unitCost: number;
  currency: string;
  relatedHelicopter?: string;
  relatedVessel?: string;
  relatedCampaign?: string;
  relatedMaintenanceEvent?: string;
  status: PurchaseStatus;
  attachmentsPlaceholder: string;
  notes: string;
  archived?: boolean;
  source?: "Demo" | "User";
};

export type Campaign = {
  id: string;
  code: string;
  name: string;
  clientFleetOwner: string;
  vesselId: string;
  vesselName: string;
  helicopterRegistration: string;
  pilot: string;
  mechanic: string;
  startDate: string;
  endDate: string;
  operationArea: string;
  contractReference: string;
  status: CampaignStatus;
  notes: string;
  archived?: boolean;
  source?: DataSource;
};

export type TechnicalRecord = {
  id: string;
  recordType: TechnicalRecordType;
  relatedHelicopter?: string;
  relatedComponentId?: string;
  relatedMaintenanceEvent?: string;
  relatedCampaignId?: string;
  relatedPurchaseId?: string;
  title: string;
  recordDate: string;
  documentNumber: string;
  notes: string;
  attachmentPlaceholder: string;
  archived?: boolean;
  source?: DataSource;
};

export type ComplianceItem = {
  id: string;
  authority: ComplianceAuthority;
  complianceType: ComplianceType;
  referenceNumber: string;
  title: string;
  effectiveDate: string;
  dueDate: string;
  applicability: string;
  relatedHelicopter?: string;
  relatedComponentId?: string;
  status: ComplianceStatus;
  notes: string;
  attachmentPlaceholder: string;
  archived?: boolean;
  source?: DataSource;
};

export type ComplianceAlert = {
  id: string;
  complianceItemId: string;
  relatedHelicopter?: string;
  relatedComponentId?: string;
  relatedCampaignId?: string;
  severity: AlertSeverity;
  status: AlertStatus;
  dueDate: string;
  description: string;
  source?: DataSource;
};

export type MaintenanceTimelineEvent = {
  id: string;
  helicopterRegistration: string;
  eventType: TimelineEventType;
  eventDate: string;
  title: string;
  description: string;
  severity: "Info" | "Monitor" | "Critical";
  sourceEntityType: string;
  sourceEntityId: string;
  forecasted?: boolean;
  source?: DataSource;
};

export type DigitalTwinSummary = {
  helicopter: Helicopter;
  activeCampaign?: Campaign;
  assignedVessel?: Vessel;
  installedComponents: number;
  criticalComponents: number;
  openAlerts: number;
  forecastedDueItems: number;
  totalFlightHours: number;
  campaignCount: number;
  technicalRecordCount: number;
  complianceOpenCount: number;
  timeline: MaintenanceTimelineEvent[];
};

export type FleetStore = {
  helicopters: Helicopter[];
  vessels: Vessel[];
  components: HelicopterComponent[];
  flightLogs: FlightLog[];
  maintenanceAlerts: MaintenanceAlert[];
  replacementEvents: ReplacementEvent[];
  maintenanceLogs: MaintenanceLogEntry[];
  componentChanges: ComponentChange[];
  inventoryItems: InventoryItem[];
  stockMovements: StockMovement[];
  purchaseRequests: PurchaseRequest[];
  campaigns: Campaign[];
  technicalRecords: TechnicalRecord[];
  complianceItems: ComplianceItem[];
  complianceAlerts: ComplianceAlert[];
};

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "green" | "amber" | "blue" | "teal" | "red" | "neutral";
  icon: LucideIcon;
};
