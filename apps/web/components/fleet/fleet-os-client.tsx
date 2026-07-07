"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Anchor,
  Boxes,
  ClipboardList,
  Gauge,
  Plane,
  ShoppingCart,
  UserRoundCog,
  Wrench
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/fleet/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { useI18n } from "@/components/i18n/i18n-provider";
import {
  calculateComponentStatus,
  calculateRemainingPercentage,
  createAlertsForComponents,
  deductFlightHoursFromComponents,
  fleetStorageKey,
  generateId,
  getLowStockStatus,
  initialFleetStore,
  purchaseStatusTone
} from "@/lib/fleet-ops";
import { componentCategories, demoDataPolicy } from "@/lib/fleet-data";
import type {
  ComponentChange,
  ComponentStatus,
  CrewPortalRole,
  FleetStore,
  FlightLog,
  Helicopter,
  HelicopterComponent,
  InventoryItem,
  MaintenanceLogEntry,
  PurchaseRequest,
  StockMovement,
  Vessel
} from "@/types/fleet";

type FleetOSClientProps = {
  view:
    | "dashboard"
    | "helicopters"
    | "helicopter-detail"
    | "helicopter-form"
    | "vessels"
    | "vessel-detail"
    | "vessel-form"
    | "components"
    | "component-detail"
    | "component-form"
    | "flight-log"
    | "flight-log-form"
    | "crew-portal"
    | "inventory"
    | "purchasing"
    | "alerts"
    | "forecast";
  recordId?: string;
  mode?: "create" | "edit";
};

const inputClass =
  "h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted";
const textareaClass =
  "min-h-28 rounded-md border border-line bg-white px-3 py-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted";

const active = <T extends { archived?: boolean }>(records: T[]) => records.filter((record) => !record.archived);
const num = (value: FormDataEntryValue | null) => Number(value || 0);
const text = (form: FormData, key: string) => String(form.get(key) ?? "");

export function FleetOSClient({ view, recordId, mode = "create" }: FleetOSClientProps) {
  const { tx } = useI18n();
  const [store, setStore] = useState<FleetStore>(() => {
    if (typeof window === "undefined") return initialFleetStore();
    const raw = window.localStorage.getItem(fleetStorageKey);
    return raw ? { ...initialFleetStore(), ...JSON.parse(raw) } : initialFleetStore();
  });
  const [message, setMessage] = useState("");
  const [crewRole, setCrewRole] = useState<CrewPortalRole>("Maintenance Chief View");
  const [editingInventoryId, setEditingInventoryId] = useState<string | undefined>();
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | undefined>();

  useEffect(() => {
    window.localStorage.setItem(fleetStorageKey, JSON.stringify(store));
  }, [store]);

  const helicopters = useMemo(() => active(store.helicopters), [store.helicopters]);
  const vessels = useMemo(() => active(store.vessels), [store.vessels]);
  const components = useMemo(() => active(store.components), [store.components]);
  const inventoryItems = useMemo(() => active(store.inventoryItems), [store.inventoryItems]);
  const purchaseRequests = useMemo(() => active(store.purchaseRequests), [store.purchaseRequests]);

  function updateStore(updater: (current: FleetStore) => FleetStore, success: string) {
    setStore((current) => updater(current));
    setMessage(success);
  }

  function archiveRecord(collection: keyof FleetStore, idKey: string, id: string) {
    updateStore(
      (current) => ({
        ...current,
        [collection]: (current[collection] as Array<Record<string, unknown>>).map((record) =>
          record[idKey] === id ? { ...record, archived: true } : record
        )
      }),
      tx("Record archived locally.")
    );
  }

  function saveHelicopter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const registration = text(form, "registration").trim().toUpperCase();
    const record: Helicopter = {
      registration,
      model: text(form, "model"),
      serialNumber: text(form, "serialNumber"),
      manufactureYear: text(form, "manufactureYear"),
      currentHourmeter: num(form.get("currentHourmeter")),
      status: text(form, "status") as Helicopter["status"],
      ownerCompany: text(form, "ownerCompany"),
      assignedVessel: text(form, "assignedVessel"),
      operationArea: text(form, "operationArea"),
      base: text(form, "operationArea"),
      notes: text(form, "notes"),
      readiness: 100,
      nextDueComponent: "Pending component review",
      nextDueHours: 0,
      source: "User"
    };

    updateStore(
      (current) => ({
        ...current,
        helicopters:
          mode === "edit"
            ? current.helicopters.map((item) => (item.registration === recordId ? record : item))
            : [...current.helicopters, record]
      }),
      tx("Helicopter saved to local Fleet state.")
    );
  }

  function saveVessel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = mode === "edit" && recordId ? recordId : generateId("vessel");
    const record: Vessel = {
      id,
      name: text(form, "name"),
      owner: text(form, "owner"),
      country: text(form, "country"),
      homePort: text(form, "homePort"),
      capacityTons: num(form.get("capacityTons")),
      campaign: text(form, "campaign"),
      assignedHelicopter: text(form, "assignedHelicopter"),
      status: text(form, "status") as Vessel["status"],
      notes: text(form, "notes"),
      source: "User"
    };

    updateStore(
      (current) => ({
        ...current,
        vessels: mode === "edit" ? current.vessels.map((item) => (item.id === id ? record : item)) : [...current.vessels, record],
        helicopters: current.helicopters.map((helicopter) =>
          helicopter.registration === record.assignedHelicopter ? { ...helicopter, assignedVessel: record.name } : helicopter
        )
      }),
      tx("Vessel saved and assignment synchronized locally.")
    );
  }

  function saveComponent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const remainingHours = num(form.get("remainingHours"));
    const lifeLimitHours = num(form.get("lifeLimitHours"));
    const remainingCalendarDays = num(form.get("remainingCalendarDays"));
    const remainingPercentage = calculateRemainingPercentage(remainingHours, lifeLimitHours);
    const status = calculateComponentStatus({ remainingHours, remainingCalendarDays, remainingPercentage });
    const id = mode === "edit" && recordId ? recordId : generateId("cmp");
    const record: HelicopterComponent = {
      id,
      helicopterRegistration: text(form, "helicopterRegistration"),
      category: text(form, "category"),
      componentName: text(form, "componentName"),
      partNumber: text(form, "partNumber"),
      serialNumber: text(form, "serialNumber"),
      position: text(form, "position"),
      installationDate: text(form, "installationDate"),
      tsnHours: num(form.get("tsnHours")),
      tsoHours: num(form.get("tsoHours")),
      lifeLimitHours,
      remainingHours,
      calendarLimitDate: text(form, "calendarLimitDate"),
      remainingCalendarDays,
      remainingPercentage,
      status,
      notes: text(form, "notes"),
      documents: 0,
      source: "User"
    };

    updateStore(
      (current) => ({
        ...current,
        components:
          mode === "edit" ? current.components.map((item) => (item.id === id ? record : item)) : [...current.components, record],
        maintenanceAlerts: [...current.maintenanceAlerts, ...createAlertsForComponents([record])]
      }),
      tx("Component saved and status recalculated locally.")
    );
  }

  function saveFlightLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const hobbsStart = num(form.get("hobbsStart"));
    const hobbsEnd = num(form.get("hobbsEnd"));
    const flightHours = Math.max(0, hobbsEnd - hobbsStart);
    const helicopterRegistration = text(form, "helicopterRegistration");
    const vesselName = text(form, "vesselName");
    const vessel = vessels.find((item) => item.name === vesselName);
    const id = mode === "edit" && recordId ? recordId : generateId("fl");
    const log: FlightLog = {
      id,
      helicopterRegistration,
      vesselName,
      campaign: vessel?.campaign ?? text(form, "campaign"),
      flightDate: text(form, "flightDate"),
      pilot: text(form, "pilot"),
      mechanic: text(form, "mechanic"),
      hobbsStart,
      hobbsEnd,
      flightHours,
      notes: text(form, "notes"),
      approvalStatus: "Approved",
      source: "User"
    };

    updateStore((current) => {
      const previousLog = current.flightLogs.find((item) => item.id === id);
      const hourDelta = previousLog ? flightHours - previousLog.flightHours : flightHours;
      const recalculatedComponents = deductFlightHoursFromComponents(
        current.components.filter((component) => component.helicopterRegistration === helicopterRegistration),
        hourDelta
      );
      const recalculatedIds = new Set(recalculatedComponents.map((component) => component.id));
      const nextComponents = current.components.map((component) => recalculatedIds.has(component.id) ? recalculatedComponents.find((item) => item.id === component.id)! : component);

      return {
        ...current,
        flightLogs: mode === "edit" ? current.flightLogs.map((item) => (item.id === id ? log : item)) : [...current.flightLogs, log],
        helicopters: current.helicopters.map((helicopter) =>
          helicopter.registration === helicopterRegistration ? { ...helicopter, currentHourmeter: hobbsEnd } : helicopter
        ),
        components: nextComponents,
        maintenanceAlerts: [...current.maintenanceAlerts, ...createAlertsForComponents(recalculatedComponents)]
      };
    }, tx("Flight log saved, hourmeter updated, components recalculated, and alerts refreshed."));
  }

  function saveMaintenanceLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entry: MaintenanceLogEntry = {
      id: generateId("mlog"),
      helicopterRegistration: text(form, "helicopterRegistration"),
      date: text(form, "date"),
      maintenanceType: text(form, "maintenanceType"),
      description: text(form, "description"),
      technician: text(form, "technician"),
      relatedComponentId: text(form, "relatedComponentId"),
      actionTaken: text(form, "actionTaken"),
      evidencePlaceholder: text(form, "evidencePlaceholder"),
      notes: text(form, "notes"),
      source: "User"
    };
    updateStore((current) => ({ ...current, maintenanceLogs: [...current.maintenanceLogs, entry] }), tx("Maintenance log saved locally."));
  }

  function saveComponentChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const removedComponentId = text(form, "removedComponentId");
    const helicopterRegistration = text(form, "helicopterRegistration");
    const installedName = text(form, "installedComponentName");
    const change: ComponentChange = {
      id: generateId("chg"),
      helicopterRegistration,
      removedComponentId,
      removedComponentName: components.find((item) => item.id === removedComponentId)?.componentName ?? "None",
      installedComponentName: installedName,
      installedPartNumber: text(form, "installedPartNumber"),
      installedSerialNumber: text(form, "installedSerialNumber"),
      removalDate: text(form, "removalDate"),
      installationDate: text(form, "installationDate"),
      reason: text(form, "reason"),
      technician: text(form, "technician"),
      supportingDocumentPlaceholder: text(form, "supportingDocumentPlaceholder"),
      notes: text(form, "notes"),
      source: "User"
    };
    const installed: HelicopterComponent = {
      id: generateId("cmp"),
      helicopterRegistration,
      category: text(form, "category"),
      componentName: installedName,
      partNumber: change.installedPartNumber,
      serialNumber: change.installedSerialNumber,
      position: text(form, "position"),
      installationDate: change.installationDate,
      tsnHours: 0,
      tsoHours: 0,
      lifeLimitHours: num(form.get("lifeLimitHours")),
      remainingHours: num(form.get("lifeLimitHours")),
      calendarLimitDate: text(form, "calendarLimitDate"),
      remainingCalendarDays: num(form.get("remainingCalendarDays")),
      remainingPercentage: 100,
      status: "OK",
      notes: change.notes,
      documents: change.supportingDocumentPlaceholder ? 1 : 0,
      source: "User"
    };

    updateStore((current) => ({
      ...current,
      componentChanges: [...current.componentChanges, change],
      components: [
        ...current.components.map((component) =>
          component.id === removedComponentId ? { ...component, status: "Removed" as ComponentStatus, archived: true } : component
        ),
        installed
      ],
      replacementEvents: [
        ...current.replacementEvents,
        {
          id: generateId("rep"),
          helicopterRegistration,
          removedComponent: change.removedComponentName,
          installedComponent: `${installed.componentName} / ${installed.serialNumber}`,
          removalDate: change.removalDate,
          installationDate: change.installationDate,
          removalHourmeter: 0,
          installationHourmeter: 0,
          reason: change.reason,
          approvedBy: change.technician,
          notes: change.supportingDocumentPlaceholder,
          source: "User"
        }
      ],
      maintenanceAlerts: [...current.maintenanceAlerts, ...createAlertsForComponents([installed])]
    }), tx("Component change saved, replacement history updated, and alerts recalculated."));
  }

  function saveInventoryItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = editingInventoryId ?? generateId("inv");
    const item: InventoryItem = {
      id,
      vesselId: text(form, "vesselId"),
      storageLocation: text(form, "storageLocation"),
      itemType: text(form, "itemType") as InventoryItem["itemType"],
      itemName: text(form, "itemName"),
      partNumber: text(form, "partNumber"),
      serialNumber: text(form, "serialNumber"),
      lotBatch: text(form, "lotBatch"),
      quantity: num(form.get("quantity")),
      unitOfMeasure: text(form, "unitOfMeasure"),
      minimumStock: num(form.get("minimumStock")),
      condition: text(form, "condition"),
      expirationDate: text(form, "expirationDate"),
      relatedHelicopter: text(form, "relatedHelicopter"),
      notes: text(form, "notes"),
      source: "User"
    };
    updateStore((current) => ({
      ...current,
      inventoryItems: editingInventoryId ? current.inventoryItems.map((record) => record.id === id ? item : record) : [...current.inventoryItems, item]
    }), tx("Inventory item saved locally."));
    setEditingInventoryId(undefined);
  }

  function saveStockMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const itemId = text(form, "inventoryItemId");
    const movementType = text(form, "movementType") as StockMovement["movementType"];
    const quantity = num(form.get("quantity"));
    const movement: StockMovement = {
      id: generateId("mov"),
      inventoryItemId: itemId,
      movementType,
      fromLocation: text(form, "fromLocation"),
      toLocation: text(form, "toLocation"),
      quantity,
      date: text(form, "date"),
      relatedMaintenanceEvent: text(form, "relatedMaintenanceEvent"),
      notes: text(form, "notes"),
      source: "User"
    };
    const subtract = ["Used", "Installed", "Consumed", "Transferred"].includes(movementType);
    updateStore((current) => ({
      ...current,
      stockMovements: [...current.stockMovements, movement],
      inventoryItems: current.inventoryItems.map((item) =>
        item.id === itemId ? { ...item, quantity: subtract ? Math.max(0, item.quantity - quantity) : item.quantity + quantity } : item
      )
    }), tx("Stock movement recorded and quantity updated locally."));
  }

  function savePurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = editingPurchaseId ?? generateId("pr");
    const request: PurchaseRequest = {
      id,
      supplier: text(form, "supplier"),
      itemName: text(form, "itemName"),
      partNumber: text(form, "partNumber"),
      quantity: num(form.get("quantity")),
      unitCost: num(form.get("unitCost")),
      currency: text(form, "currency"),
      relatedHelicopter: text(form, "relatedHelicopter"),
      relatedVessel: text(form, "relatedVessel"),
      relatedCampaign: text(form, "relatedCampaign"),
      relatedMaintenanceEvent: text(form, "relatedMaintenanceEvent"),
      status: text(form, "status") as PurchaseRequest["status"],
      attachmentsPlaceholder: text(form, "attachmentsPlaceholder"),
      notes: text(form, "notes"),
      source: "User"
    };
    updateStore((current) => ({
      ...current,
      purchaseRequests: editingPurchaseId ? current.purchaseRequests.map((record) => record.id === id ? request : record) : [...current.purchaseRequests, request]
    }), tx("Purchase request saved locally."));
    setEditingPurchaseId(undefined);
  }

  const header = getHeader(view, mode);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <PageHeader {...header} />
        {message ? (
          <div className="mb-5 rounded-lg border border-aviation-green/25 bg-aviation-green/10 px-4 py-3 text-sm font-medium text-aviation-green">
            {message}
          </div>
        ) : null}
        {renderView()}
      </div>
    </AppShell>
  );

  function renderView() {
    if (view === "dashboard") return renderDashboard();
    if (view === "helicopters") return renderHelicopters();
    if (view === "helicopter-detail") return renderHelicopterDetail(recordId);
    if (view === "helicopter-form") return renderHelicopterForm(recordId);
    if (view === "vessels") return renderVessels();
    if (view === "vessel-detail") return renderVesselDetail(recordId);
    if (view === "vessel-form") return renderVesselForm(recordId);
    if (view === "components") return renderComponents();
    if (view === "component-detail") return renderComponentDetail(recordId);
    if (view === "component-form") return renderComponentForm(recordId);
    if (view === "flight-log") return renderFlightLog();
    if (view === "flight-log-form") return renderFlightLogForm(recordId);
    if (view === "crew-portal") return renderCrewPortal();
    if (view === "inventory") return renderInventory();
    if (view === "purchasing") return renderPurchasing();
    if (view === "alerts") return renderAlerts();
    return renderForecast();
  }

  function renderDashboard() {
    const openAlerts = store.maintenanceAlerts.filter((alert) => alert.status !== "Resolved").length;
    return (
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Helicopters" value={String(helicopters.length)} tone="teal" detail="Local fleet records" />
          <Metric label="Campaigns" value={String(store.campaigns.length)} tone="blue" detail="Deployment operating records" />
          <Metric label="Alerts" value={String(openAlerts)} tone="amber" detail="Generated maintenance alerts" />
          <Metric label="Technical Records" value={String(store.technicalRecords.length)} tone="green" detail="Linked evidence records" />
        </section>
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">{tx("HSV OS 0.4 Bilingual Core + Aircraft Operations Center MVP")}</h2>
              <p className="mt-1 text-sm text-ink-subtle">{demoDataPolicy}</p>
            </div>
            <StatusPill tone="amber">localStorage only</StatusPill>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Campaigns", "/campaigns"],
              ["Aircraft Operations Center", "/digital-twin"],
              ["Fleet CRUD", "/helicopters"],
              ["Crew Portal", "/crew-portal"],
              ["Vessel Inventory", "/inventory"],
              ["Purchasing", "/purchasing"],
              ["Technical Records", "/technical-records"],
              ["Compliance", "/compliance"]
            ].map(([label, href]) => (
              <Link key={href} className="rounded-lg border border-line bg-canvas-muted/58 p-4 text-sm font-semibold text-ink transition hover:text-aviation-teal" href={href}>
                {label}
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    );
  }

  function renderHelicopters() {
    return (
      <Panel>
        <ListHeader title="Helicopters" href="/helicopters/new" action="Create helicopter" />
        <Table headers={["Registration", "Model", "Hourmeter", "Status", "Assigned vessel", "Source", "Actions"]}>
          {helicopters.map((helicopter) => (
            <tr key={helicopter.registration}>
              <Cell><Link className="font-semibold text-ink hover:text-aviation-teal" href={`/helicopters/${helicopter.registration}`}>{helicopter.registration}</Link></Cell>
              <Cell muted>{helicopter.model}</Cell>
              <Cell>{helicopter.currentHourmeter.toFixed(1)}</Cell>
              <Cell><StatusPill tone={helicopter.status === "Grounded" ? "red" : "teal"}>{helicopter.status}</StatusPill></Cell>
              <Cell muted>{helicopter.assignedVessel || "Unassigned"}</Cell>
              <Cell><StatusPill tone={helicopter.source === "User" ? "green" : "amber"}>{helicopter.source ?? "Demo"}</StatusPill></Cell>
              <Cell><Actions edit={`/helicopters/${helicopter.registration}/edit`} onArchive={() => archiveRecord("helicopters", "registration", helicopter.registration)} /></Cell>
            </tr>
          ))}
        </Table>
      </Panel>
    );
  }

  function renderHelicopterDetail(registration?: string) {
    const helicopter = helicopters.find((item) => item.registration === registration);
    if (!helicopter) return <Empty title="Helicopter not found" />;
    const assignedComponents = components.filter((item) => item.helicopterRegistration === helicopter.registration);
    return (
      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Hourmeter" value={helicopter.currentHourmeter.toFixed(1)} tone="blue" detail="Current local value" />
          <Metric label="Components" value={String(assignedComponents.length)} tone="teal" detail="Active assigned records" />
          <Metric label="Assigned Vessel" value={helicopter.assignedVessel || "Unassigned"} tone="amber" detail="Local assignment" />
          <Metric label="Source" value={helicopter.source ?? "Demo"} tone={helicopter.source === "User" ? "green" : "amber"} detail="Data policy marker" />
        </section>
        <Panel>
          <ListHeader title={`${helicopter.registration} details`} href={`/helicopters/${helicopter.registration}/edit`} action="Edit helicopter" />
          <p className="text-sm leading-6 text-ink-subtle">{helicopter.notes}</p>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-lg font-semibold text-ink">Assigned Components</h2>
          {renderComponentsTable(assignedComponents)}
        </Panel>
      </div>
    );
  }

  function renderHelicopterForm(registration?: string) {
    const record = helicopters.find((item) => item.registration === registration);
    return (
      <FormShell onSubmit={saveHelicopter}>
        <Field name="registration" label="Registration" defaultValue={record?.registration} />
        <Field name="model" label="Model" defaultValue={record?.model} />
        <Field name="serialNumber" label="Serial number" defaultValue={record?.serialNumber} />
        <Field name="manufactureYear" label="Year" defaultValue={record?.manufactureYear} />
        <Field name="currentHourmeter" label="Current hourmeter" defaultValue={record?.currentHourmeter} />
        <Select name="status" label="Status" defaultValue={record?.status ?? "Available"} options={["Available", "Assigned", "In Campaign", "Maintenance", "Grounded", "Retired"]} />
        <Field name="ownerCompany" label="Owner company" defaultValue={record?.ownerCompany} />
        <Select name="assignedVessel" label="Assigned vessel" defaultValue={record?.assignedVessel ?? "Unassigned"} options={["Unassigned", ...vessels.map((item) => item.name)]} />
        <Field name="operationArea" label="Country / operation area" defaultValue={record?.operationArea} />
        <TextArea name="notes" label="Notes" defaultValue={record?.notes} />
      </FormShell>
    );
  }

  function renderVessels() {
    return (
      <Panel>
        <ListHeader title="Vessels" href="/vessels/new" action="Create vessel" />
        <Table headers={["Vessel", "Owner", "Country", "Port", "Campaign", "Assigned helicopter", "Source", "Actions"]}>
          {vessels.map((vessel) => (
            <tr key={vessel.id}>
              <Cell><Link className="font-semibold text-ink hover:text-aviation-teal" href={`/vessels/${vessel.id}`}>{vessel.name}</Link></Cell>
              <Cell muted>{vessel.owner}</Cell>
              <Cell muted>{vessel.country}</Cell>
              <Cell muted>{vessel.homePort}</Cell>
              <Cell muted>{vessel.campaign}</Cell>
              <Cell muted>{vessel.assignedHelicopter || "Unassigned"}</Cell>
              <Cell><StatusPill tone={vessel.source === "User" ? "green" : "amber"}>{vessel.source ?? "Demo"}</StatusPill></Cell>
              <Cell><Actions edit={`/vessels/${vessel.id}/edit`} onArchive={() => archiveRecord("vessels", "id", vessel.id)} /></Cell>
            </tr>
          ))}
        </Table>
      </Panel>
    );
  }

  function renderVesselDetail(id?: string) {
    const vessel = vessels.find((item) => item.id === id);
    if (!vessel) return <Empty title="Vessel not found" />;
    return (
      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Capacity" value={`${vessel.capacityTons.toLocaleString()} tons`} tone="blue" detail="Local vessel field" />
          <Metric label="Campaign" value={vessel.campaign} tone="teal" detail="Current campaign" />
          <Metric label="Helicopter" value={vessel.assignedHelicopter || "Unassigned"} tone="amber" detail="Local assignment" />
          <Metric label="Status" value={vessel.status} tone="green" detail="Vessel workflow state" />
        </section>
        <Panel>
          <ListHeader title={vessel.name} href={`/vessels/${vessel.id}/edit`} action="Edit vessel" />
          <p className="text-sm leading-6 text-ink-subtle">{vessel.notes}</p>
        </Panel>
      </div>
    );
  }

  function renderVesselForm(id?: string) {
    const record = vessels.find((item) => item.id === id);
    return (
      <FormShell onSubmit={saveVessel}>
        <Field name="name" label="Vessel name" defaultValue={record?.name} />
        <Field name="owner" label="Owner company" defaultValue={record?.owner} />
        <Field name="country" label="Country" defaultValue={record?.country} />
        <Field name="homePort" label="Home port" defaultValue={record?.homePort} />
        <Field name="capacityTons" label="Capacity tons" defaultValue={record?.capacityTons} />
        <Field name="campaign" label="Current campaign" defaultValue={record?.campaign} />
        <Select name="assignedHelicopter" label="Assigned helicopter" defaultValue={record?.assignedHelicopter ?? "Unassigned"} options={["Unassigned", ...helicopters.map((item) => item.registration)]} />
        <Select name="status" label="Status" defaultValue={record?.status ?? "Prospect"} options={["Demo", "Prospect", "Active", "Inactive", "Archived"]} />
        <TextArea name="notes" label="Notes" defaultValue={record?.notes} />
      </FormShell>
    );
  }

  function renderComponents() {
    return (
      <Panel>
        <ListHeader title="Components" href="/components/new" action="Create component" />
        {renderComponentsTable(components)}
      </Panel>
    );
  }

  function renderComponentsTable(rows: HelicopterComponent[]) {
    return (
      <Table headers={["Aircraft", "Component", "P/N", "S/N", "Remaining", "%", "Status", "Source", "Actions"]}>
        {rows.map((component) => (
          <tr key={component.id}>
            <Cell>{component.helicopterRegistration}</Cell>
            <Cell><Link className="font-semibold text-ink hover:text-aviation-teal" href={`/components/${component.id}`}>{component.componentName}</Link></Cell>
            <Cell muted>{component.partNumber}</Cell>
            <Cell muted>{component.serialNumber}</Cell>
            <Cell>{component.remainingHours.toFixed(1)} hrs</Cell>
            <Cell>{component.remainingPercentage.toFixed(1)}%</Cell>
            <Cell><StatusPill tone={component.status === "OK" ? "green" : component.status === "Monitor" ? "amber" : component.status === "Removed" ? "neutral" : "red"}>{component.status}</StatusPill></Cell>
            <Cell><StatusPill tone={component.source === "User" ? "green" : "amber"}>{component.source ?? "Demo"}</StatusPill></Cell>
            <Cell><Actions edit={`/components/${component.id}/edit`} onArchive={() => archiveRecord("components", "id", component.id)} /></Cell>
          </tr>
        ))}
      </Table>
    );
  }

  function renderComponentDetail(id?: string) {
    const component = components.find((item) => item.id === id);
    if (!component) return <Empty title="Component not found" />;
    return (
      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Remaining" value={`${component.remainingHours.toFixed(1)} hrs`} tone="blue" detail="Hour-controlled balance" />
          <Metric label="Remaining %" value={`${component.remainingPercentage.toFixed(1)}%`} tone="teal" detail="Calculated locally" />
          <Metric label="Calendar" value={`${component.remainingCalendarDays} days`} tone="amber" detail={component.calendarLimitDate} />
          <Metric label="Status" value={component.status} tone={component.status === "OK" ? "green" : "red"} detail="Rule-derived state" />
        </section>
        <Panel>
          <ListHeader title={`${component.componentName} / ${component.helicopterRegistration}`} href={`/components/${component.id}/edit`} action="Edit component" />
          <p className="text-sm leading-6 text-ink-subtle">{component.notes}</p>
        </Panel>
      </div>
    );
  }

  function renderComponentForm(id?: string) {
    const record = components.find((item) => item.id === id);
    return (
      <FormShell onSubmit={saveComponent}>
        <Select name="helicopterRegistration" label="Helicopter registration" defaultValue={record?.helicopterRegistration ?? helicopters[0]?.registration} options={helicopters.map((item) => item.registration)} />
        <Select name="category" label="Component category" defaultValue={record?.category ?? "Engine"} options={componentCategories.map((item) => item.name)} />
        <Field name="componentName" label="Component name" defaultValue={record?.componentName} />
        <Field name="partNumber" label="Part number" defaultValue={record?.partNumber} />
        <Field name="serialNumber" label="Serial number" defaultValue={record?.serialNumber} />
        <Field name="position" label="Position" defaultValue={record?.position} />
        <Field name="installationDate" label="Installation date" defaultValue={record?.installationDate} />
        <Field name="tsnHours" label="TSN hours" defaultValue={record?.tsnHours} />
        <Field name="tsoHours" label="TSO hours" defaultValue={record?.tsoHours} />
        <Field name="lifeLimitHours" label="Life limit hours" defaultValue={record?.lifeLimitHours} />
        <Field name="remainingHours" label="Remaining hours" defaultValue={record?.remainingHours} />
        <Field name="calendarLimitDate" label="Calendar limit date" defaultValue={record?.calendarLimitDate} />
        <Field name="remainingCalendarDays" label="Remaining calendar days" defaultValue={record?.remainingCalendarDays} />
        <TextArea name="notes" label="Notes" defaultValue={record?.notes} />
      </FormShell>
    );
  }

  function renderFlightLog() {
    return (
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        {renderFlightLogForm()}
        <Panel>
          <h2 className="mb-4 text-lg font-semibold text-ink">Flight Logs</h2>
          <Table headers={["Aircraft", "Vessel", "Date", "Hours", "Pilot", "Actions"]}>
            {store.flightLogs.map((log) => (
              <tr key={log.id}>
                <Cell>{log.helicopterRegistration}</Cell>
                <Cell muted>{log.vesselName}</Cell>
                <Cell muted>{log.flightDate}</Cell>
                <Cell>{log.flightHours.toFixed(1)}</Cell>
                <Cell muted>{log.pilot}</Cell>
                <Cell><Link className="font-semibold text-aviation-teal" href={`/flight-log/${log.id}/edit`}>Edit</Link></Cell>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    );
  }

  function renderFlightLogForm(id?: string) {
    const record = store.flightLogs.find((item) => item.id === id);
    return (
      <FormShell onSubmit={saveFlightLog}>
        <Select name="helicopterRegistration" label="Helicopter" defaultValue={record?.helicopterRegistration ?? helicopters[0]?.registration} options={helicopters.map((item) => item.registration)} />
        <Select name="vesselName" label="Vessel / campaign" defaultValue={record?.vesselName ?? vessels[0]?.name} options={vessels.map((item) => item.name)} />
        <Field name="campaign" label="Campaign" defaultValue={record?.campaign ?? vessels[0]?.campaign} />
        <Field name="flightDate" label="Flight date" defaultValue={record?.flightDate ?? new Date().toISOString().slice(0, 10)} />
        <Field name="pilot" label="Pilot" defaultValue={record?.pilot} />
        <Field name="mechanic" label="Mechanic" defaultValue={record?.mechanic} />
        <Field name="hobbsStart" label="Hobbs start" defaultValue={record?.hobbsStart} />
        <Field name="hobbsEnd" label="Hobbs end" defaultValue={record?.hobbsEnd} />
        <TextArea name="notes" label="Notes" defaultValue={record?.notes} />
      </FormShell>
    );
  }

  function renderCrewPortal() {
    return (
      <div className="grid gap-5">
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Role Simulation</h2>
              <p className="mt-1 text-sm text-ink-subtle">No authentication yet. Toggle only changes the portal emphasis.</p>
            </div>
            <select className={inputClass} value={crewRole} onChange={(event) => setCrewRole(event.target.value as CrewPortalRole)}>
              <option>Admin View</option>
              <option>Maintenance Chief View</option>
            </select>
          </div>
        </Panel>
        <section className="grid gap-5 xl:grid-cols-2">
          {renderFlightLogForm()}
          {renderMaintenanceLogForm()}
          {renderComponentChangeForm()}
          <Panel>
            <h2 className="mb-4 text-lg font-semibold text-ink">Assigned Helicopter Status</h2>
            <div className="grid gap-3">
              {helicopters.map((helicopter) => (
                <div key={helicopter.registration} className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{helicopter.registration}</p>
                    <StatusPill tone={helicopter.status === "Grounded" ? "red" : "teal"}>{helicopter.status}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm text-ink-subtle">{helicopter.currentHourmeter.toFixed(1)} hours / {helicopter.assignedVessel || "Unassigned"}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>
        {renderAlerts()}
      </div>
    );
  }

  function renderMaintenanceLogForm() {
    return (
      <FormShell onSubmit={saveMaintenanceLog} title="Maintenance Log Entry">
        <Select name="helicopterRegistration" label="Helicopter" options={helicopters.map((item) => item.registration)} />
        <Field name="date" label="Date" defaultValue={new Date().toISOString().slice(0, 10)} />
        <Field name="maintenanceType" label="Maintenance type" />
        <Field name="technician" label="Technician / maintenance chief" />
        <Select name="relatedComponentId" label="Related component" options={["", ...components.map((item) => item.id)]} />
        <TextArea name="description" label="Description" />
        <TextArea name="actionTaken" label="Action taken" />
        <Field name="evidencePlaceholder" label="Documents/evidence placeholder" />
        <TextArea name="notes" label="Notes" />
      </FormShell>
    );
  }

  function renderComponentChangeForm() {
    return (
      <FormShell onSubmit={saveComponentChange} title="Component Change">
        <Select name="helicopterRegistration" label="Helicopter" options={helicopters.map((item) => item.registration)} />
        <Select name="removedComponentId" label="Removed component" options={["", ...components.map((item) => item.id)]} />
        <Field name="installedComponentName" label="Installed component" />
        <Select name="category" label="Category" options={componentCategories.map((item) => item.name)} />
        <Field name="installedPartNumber" label="Installed part number" />
        <Field name="installedSerialNumber" label="Installed serial number" />
        <Field name="position" label="Position" />
        <Field name="lifeLimitHours" label="Life limit hours" defaultValue="2200" />
        <Field name="calendarLimitDate" label="Calendar limit date" />
        <Field name="remainingCalendarDays" label="Remaining calendar days" defaultValue="3650" />
        <Field name="removalDate" label="Removal date" />
        <Field name="installationDate" label="Installation date" />
        <Field name="reason" label="Reason" />
        <Field name="technician" label="Technician" />
        <Field name="supportingDocumentPlaceholder" label="Supporting document placeholder" />
        <TextArea name="notes" label="Notes" />
      </FormShell>
    );
  }

  function renderInventory() {
    const editing = inventoryItems.find((item) => item.id === editingInventoryId);
    return (
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-5">
          <FormShell key={editing?.id ?? "new-inventory-item"} onSubmit={saveInventoryItem} title={editing ? "Edit Inventory Item" : "Create Inventory Item"}>
            <Select name="vesselId" label="Vessel" defaultValue={editing?.vesselId ?? vessels[0]?.id} options={vessels.map((item) => item.id)} />
            <Field name="storageLocation" label="Bodega / storage location" defaultValue={editing?.storageLocation} />
            <Select name="itemType" label="Item type" defaultValue={editing?.itemType ?? "Component"} options={["Component", "Hardware", "Consumable", "Oil", "Filter", "Tool", "Kit", "Other"]} />
            <Field name="itemName" label="Item name" defaultValue={editing?.itemName} />
            <Field name="partNumber" label="Part number" defaultValue={editing?.partNumber} />
            <Field name="serialNumber" label="Serial number" defaultValue={editing?.serialNumber} />
            <Field name="lotBatch" label="Lot / batch" defaultValue={editing?.lotBatch} />
            <Field name="quantity" label="Quantity" defaultValue={editing?.quantity} />
            <Field name="unitOfMeasure" label="Unit of measure" defaultValue={editing?.unitOfMeasure ?? "ea"} />
            <Field name="minimumStock" label="Minimum stock" defaultValue={editing?.minimumStock} />
            <Field name="condition" label="Condition" defaultValue={editing?.condition ?? "Serviceable"} />
            <Field name="expirationDate" label="Expiration date" defaultValue={editing?.expirationDate} />
            <Select name="relatedHelicopter" label="Related helicopter" defaultValue={editing?.relatedHelicopter ?? ""} options={["", ...helicopters.map((item) => item.registration)]} />
            <TextArea name="notes" label="Notes" defaultValue={editing?.notes} />
          </FormShell>
          <FormShell onSubmit={saveStockMovement} title="Record Stock Movement">
            <Select name="inventoryItemId" label="Inventory item" options={inventoryItems.map((item) => item.id)} />
            <Select name="movementType" label="Movement type" options={["Received", "Transferred", "Used", "Installed", "Consumed", "Adjusted"]} />
            <Field name="fromLocation" label="From location" />
            <Field name="toLocation" label="To location" />
            <Field name="quantity" label="Quantity" />
            <Field name="date" label="Date" defaultValue={new Date().toISOString().slice(0, 10)} />
            <Field name="relatedMaintenanceEvent" label="Related maintenance event" />
            <TextArea name="notes" label="Notes" />
          </FormShell>
        </div>
        <Panel>
          <h2 className="mb-4 text-lg font-semibold text-ink">Vessel Inventory</h2>
          <Table headers={["Item", "Vessel", "Location", "Qty", "Min", "Status", "Actions"]}>
            {inventoryItems.map((item) => (
              <tr key={item.id}>
                <Cell>{item.itemName}</Cell>
                <Cell muted>{vessels.find((vessel) => vessel.id === item.vesselId)?.name ?? item.vesselId}</Cell>
                <Cell muted>{item.storageLocation}</Cell>
                <Cell>{item.quantity} {item.unitOfMeasure}</Cell>
                <Cell>{item.minimumStock}</Cell>
                <Cell><StatusPill tone={getLowStockStatus(item) === "OK" ? "green" : "amber"}>{getLowStockStatus(item)}</StatusPill></Cell>
                <Cell><button className="font-semibold text-aviation-teal" onClick={() => setEditingInventoryId(item.id)} type="button">Edit</button></Cell>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    );
  }

  function renderPurchasing() {
    const editing = purchaseRequests.find((item) => item.id === editingPurchaseId);
    return (
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <FormShell key={editing?.id ?? "new-purchase-request"} onSubmit={savePurchase} title={editing ? "Edit Purchase Request" : "Create Purchase Request"}>
          <Field name="supplier" label="Supplier" defaultValue={editing?.supplier} />
          <Field name="itemName" label="Item name" defaultValue={editing?.itemName} />
          <Field name="partNumber" label="Part number" defaultValue={editing?.partNumber} />
          <Field name="quantity" label="Quantity" defaultValue={editing?.quantity} />
          <Field name="unitCost" label="Unit cost" defaultValue={editing?.unitCost} />
          <Field name="currency" label="Currency" defaultValue={editing?.currency ?? "USD"} />
          <Select name="relatedHelicopter" label="Related helicopter" defaultValue={editing?.relatedHelicopter ?? ""} options={["", ...helicopters.map((item) => item.registration)]} />
          <Select name="relatedVessel" label="Related vessel" defaultValue={editing?.relatedVessel ?? ""} options={["", ...vessels.map((item) => item.id)]} />
          <Field name="relatedCampaign" label="Related campaign" defaultValue={editing?.relatedCampaign} />
          <Field name="relatedMaintenanceEvent" label="Related maintenance event" defaultValue={editing?.relatedMaintenanceEvent} />
          <Select name="status" label="Status" defaultValue={editing?.status ?? "Requested"} options={["Requested", "Quoted", "Approved", "Ordered", "Received", "Shipped to vessel", "Stored", "Installed", "Consumed", "Closed"]} />
          <Field name="attachmentsPlaceholder" label="Attachments placeholder" defaultValue={editing?.attachmentsPlaceholder} />
          <TextArea name="notes" label="Notes" defaultValue={editing?.notes} />
        </FormShell>
        <Panel>
          <h2 className="mb-4 text-lg font-semibold text-ink">Purchase Requests</h2>
          <Table headers={["Supplier", "Item", "Qty", "Cost", "Status", "Actions"]}>
            {purchaseRequests.map((request) => (
              <tr key={request.id}>
                <Cell>{request.supplier}</Cell>
                <Cell muted>{request.itemName}</Cell>
                <Cell>{request.quantity}</Cell>
                <Cell>{request.currency} {request.unitCost.toFixed(2)}</Cell>
                <Cell><StatusPill tone={purchaseStatusTone(request.status)}>{request.status}</StatusPill></Cell>
                <Cell><button className="font-semibold text-aviation-teal" onClick={() => setEditingPurchaseId(request.id)} type="button">Edit</button></Cell>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    );
  }

  function renderAlerts() {
    return (
      <Panel>
        <h2 className="mb-4 text-lg font-semibold text-ink">Maintenance Alerts</h2>
        <div className="grid gap-3">
          {store.maintenanceAlerts.map((alert) => (
            <div key={alert.id} className="rounded-lg border border-line bg-canvas-muted/58 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={alert.severity === "Info" ? "blue" : alert.severity === "Monitor" ? "amber" : "red"}>{alert.severity}</StatusPill>
                <StatusPill tone="neutral">{alert.helicopterRegistration}</StatusPill>
                <StatusPill tone={alert.source === "User" ? "green" : "amber"}>{alert.source ?? "Demo"}</StatusPill>
              </div>
              <p className="mt-3 text-sm font-semibold text-ink">{alert.componentName}</p>
              <p className="mt-2 text-sm leading-6 text-ink-subtle">{alert.description}</p>
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  function renderForecast() {
    return (
      <Panel>
        <h2 className="text-lg font-semibold text-ink">Maintenance Forecast</h2>
        <p className="mt-2 text-sm text-ink-subtle">0.2 keeps forecast display local. Backend forecasting remains deferred.</p>
        <div className="mt-5 grid gap-3">
          {components
            .filter((component) => component.status !== "OK")
            .map((component) => (
              <div key={component.id} className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                <p className="text-sm font-semibold text-ink">{component.helicopterRegistration} / {component.componentName}</p>
                <p className="mt-2 text-sm text-ink-subtle">{component.remainingHours.toFixed(1)} hours and {component.remainingCalendarDays} calendar days remaining.</p>
              </div>
            ))}
        </div>
      </Panel>
    );
  }
}

function getHeader(view: FleetOSClientProps["view"], mode: string) {
  const common = { status: "HSV OS 0.4 / localStorage MVP" };
  if (view === "dashboard") return { eyebrow: "HSV OS 0.4 Operations", title: "Campaigns, fleet, and Aircraft Operations Center MVP with bilingual local persistence.", description: "Campaigns, Aircraft Operations Center, Fleet CRUD, flight-hour recalculation, records, compliance, inventory, and purchasing without backend services.", icon: Plane, ...common };
  if (view.includes("helicopter")) return { eyebrow: "Fleet CRUD", title: mode === "edit" ? "Edit helicopter record." : view === "helicopter-form" ? "Create helicopter record." : "Manage helicopter registry records.", description: "All records are demo or user-entered local data until imported into a future backend.", icon: Plane, ...common };
  if (view.includes("vessel")) return { eyebrow: "Vessel CRUD", title: mode === "edit" ? "Edit vessel record." : view === "vessel-form" ? "Create vessel record." : "Manage vessel records and helicopter assignments.", description: "Assign helicopters to vessels using local mock state only.", icon: Anchor, ...common };
  if (view.includes("component")) return { eyebrow: "Component CRUD", title: mode === "edit" ? "Edit component record." : view === "component-form" ? "Create component record." : "Manage controlled component records.", description: "Component remaining life and status are calculated in the frontend MVP.", icon: Wrench, ...common };
  if (view.includes("flight")) return { eyebrow: "Flight Hour Logging", title: "Register flight hours and update local component life.", description: "Saving a flight log updates hourmeter, deducts component hours, recalculates status, and creates alerts locally.", icon: ClipboardList, ...common };
  if (view === "crew-portal") return { eyebrow: "Maintenance Crew Portal", title: "Restricted-style maintenance workspace simulation.", description: "Maintenance Chief View focuses on flight hours, maintenance logs, component changes, evidence placeholders, alerts, and aircraft status.", icon: UserRoundCog, ...common };
  if (view === "inventory") return { eyebrow: "Vessel Inventory", title: "Track vessel stock, bodegas, movements, and maintenance usage.", description: "Inventory balances are local and demo-only, with low-stock detection and movement history.", icon: Boxes, ...common };
  if (view === "purchasing") return { eyebrow: "Purchasing", title: "Track operational purchase requests without accounting.", description: "Purchasing status and attachments are local placeholders. Full accounting is deferred.", icon: ShoppingCart, ...common };
  if (view === "alerts") return { eyebrow: "Maintenance Alerts", title: "Review generated maintenance alerts.", description: "Alerts come from demo seed data and local component recalculation.", icon: AlertTriangle, ...common };
  return { eyebrow: "Forecast", title: "Local maintenance exposure preview.", description: "Backend forecasting is deferred to a later version.", icon: Gauge, ...common };
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "green" | "amber" | "blue" | "teal" | "red" | "neutral" }) {
  const { tx } = useI18n();
  return (
    <Panel>
      <StatusPill tone={tone}>{tx(label)}</StatusPill>
      <p className="mt-4 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm text-ink-subtle">{tx(detail)}</p>
    </Panel>
  );
}

function ListHeader({ title, href, action }: { title: string; href: string; action: string }) {
  const { tx } = useI18n();
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-semibold text-ink">{tx(title)}</h2>
      <Link className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-control transition hover:opacity-92 dark:bg-white dark:text-ink" href={href}>
        {tx(action)}
      </Link>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  const { tx } = useI18n();
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
        <thead className="bg-canvas-muted text-xs uppercase text-ink-subtle">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-semibold">{tx(header)}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line bg-white/52 dark:bg-canvas-muted/36">{children}</tbody>
      </table>
    </div>
  );
}

function Cell({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <td className={["px-4 py-3", muted ? "text-ink-muted" : "font-medium text-ink"].join(" ")}>{children}</td>;
}

function Actions({ edit, onArchive }: { edit: string; onArchive: () => void }) {
  const { tx } = useI18n();
  return (
    <div className="flex gap-3">
      <Link className="font-semibold text-aviation-teal hover:text-ink" href={edit}>{tx("Edit")}</Link>
      <button className="font-semibold text-aviation-red hover:text-ink" onClick={onArchive} type="button">{tx("Archive")}</button>
    </div>
  );
}

function FormShell({ children, onSubmit, title }: { children: React.ReactNode; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; title?: string }) {
  const { tx } = useI18n();
  return (
    <Panel>
      {title ? <h2 className="mb-5 text-lg font-semibold text-ink">{tx(title)}</h2> : null}
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-subtle">{tx("Frontend-only localStorage save. No backend or database is connected.")}</p>
          <button className="h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-control transition hover:opacity-92 dark:bg-white dark:text-ink" type="submit">
            {tx("Save locally")}
          </button>
        </div>
      </form>
    </Panel>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | number }) {
  const { tx } = useI18n();
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {tx(label)}
      <input className={inputClass} name={name} defaultValue={defaultValue ?? ""} />
    </label>
  );
}

function TextArea({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  const { tx } = useI18n();
  return (
    <label className="grid gap-2 text-sm font-medium text-ink sm:col-span-2">
      {tx(label)}
      <textarea className={textareaClass} name={name} defaultValue={defaultValue ?? ""} />
    </label>
  );
}

function Select({ name, label, options, defaultValue }: { name: string; label: string; options: string[]; defaultValue?: string }) {
  const { tx } = useI18n();
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {tx(label)}
      <select className={inputClass} name={name} defaultValue={defaultValue ?? options[0] ?? ""}>
        {options.map((option) => <option key={option} value={option}>{option ? tx(option) : tx("None")}</option>)}
      </select>
    </label>
  );
}

function Empty({ title }: { title: string }) {
  const { tx } = useI18n();
  return (
    <Panel>
      <p className="text-sm font-semibold text-ink">{tx(title)}</p>
      <p className="mt-2 text-sm text-ink-subtle">{tx("The local record was not found. It may have been archived or removed from localStorage.")}</p>
    </Panel>
  );
}
