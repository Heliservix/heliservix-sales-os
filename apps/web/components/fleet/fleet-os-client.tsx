"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Anchor,
  Archive,
  ArrowDownUp,
  Boxes,
  ClipboardList,
  FileDown,
  Gauge,
  Pencil,
  Plane,
  Plus,
  PackageMinus,
  PackagePlus,
  Repeat2,
  ShoppingCart,
  Trash2,
  UserRoundCog,
  Wrench
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/fleet/page-header";
import { AircraftMigrationCenter } from "@/components/fleet/aircraft-migration-center";
import { InventoryImportCenter } from "@/components/fleet/inventory-import-center";
import { exportInventoryPdfDocument } from "@/lib/inventory-report-import";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { useI18n } from "@/components/i18n/i18n-provider";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { getTimeGreetingKey } from "@/lib/brand";
import { buildCopilotAnalysis, type AuraRecommendation } from "@/lib/copilot";
import {
  calculateComponentStatus,
  calculateRemainingPercentage,
  applyFlightLogRules,
  applyPurchaseInventoryRules,
  applyStockMovementRules,
  fleetStorageKey,
  generateId,
  getForecastComponents,
  getLowStockStatus,
  initialFleetStore,
  purchaseStatusTone,
  recalculateComponent,
  reconcileMaintenanceAlerts
} from "@/lib/fleet-ops";
import { componentCategories, demoDataPolicy } from "@/lib/fleet-data";
import { prepareStableCrudRows, useDeferredLocalStorageState } from "@/lib/performance";
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
  "hsv-control";
const textareaClass =
  "hsv-textarea";

const active = <T extends { archived?: boolean }>(records: T[]) => records.filter((record) => !record.archived);
const num = (value: FormDataEntryValue | null) => Number(value || 0);
const text = (form: FormData, key: string) => String(form.get(key) ?? "");

export function FleetOSClient({ view, recordId, mode = "create" }: FleetOSClientProps) {
  const { t, tx } = useI18n();
  const [store, setStore, isReady] = useDeferredLocalStorageState<FleetStore>(fleetStorageKey, {
    initialValue: initialFleetStore,
    merge: (value) => ({ ...initialFleetStore(), ...value })
  });
  const [message, setMessage] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [listFilter, setListFilter] = useState("All");
  const [sortKey, setSortKey] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [crewRole, setCrewRole] = useState<CrewPortalRole>("Maintenance Chief View");
  const [editingInventoryId, setEditingInventoryId] = useState<string | undefined>();
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | undefined>();
  const [selectedInventoryVesselId, setSelectedInventoryVesselId] = useState("");
  const [selectedInventoryBodega, setSelectedInventoryBodega] = useState("");
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("All");
  const [inventoryAircraftFilter, setInventoryAircraftFilter] = useState("All");
  const [inventoryStockStatusFilter, setInventoryStockStatusFilter] = useState("All");
  const [inventoryWorkspaceMode, setInventoryWorkspaceMode] = useState<"item" | "movement">("item");
  const [inventoryMovementPreset, setInventoryMovementPreset] = useState<StockMovement["movementType"]>("Received");

  const helicopters = useMemo(() => active(store.helicopters), [store.helicopters]);
  const vessels = useMemo(() => active(store.vessels), [store.vessels]);
  const components = useMemo(() => active(store.components), [store.components]);
  const inventoryItems = useMemo(() => active(store.inventoryItems), [store.inventoryItems]);
  const purchaseRequests = useMemo(() => active(store.purchaseRequests), [store.purchaseRequests]);

  const updateStore = useCallback((updater: (current: FleetStore) => FleetStore, success: string) => {
    setStore((current) => updater(current));
    setMessage(success);
  }, [setStore]);

  function archiveRecord(collection: keyof FleetStore, idKey: string, id: string) {
    if (!window.confirm(tx("Archive this local record? It will be hidden but preserved in localStorage."))) return;
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

  function deleteRecord(collection: keyof FleetStore, idKey: string, id: string) {
    if (!window.confirm(tx("Delete this local record permanently? This cannot be undone."))) return;
    updateStore(
      (current) => ({
        ...current,
        [collection]: (current[collection] as Array<Record<string, unknown>>).filter((record) => record[idKey] !== id)
      }),
      tx("Record deleted locally.")
    );
  }

  function saveHelicopter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const registration = text(form, "registration").trim().toUpperCase();
    if (!registration) {
      setMessage(tx("Registration is required."));
      return;
    }
    if (mode !== "edit" && store.helicopters.some((item) => item.registration === registration && !item.archived)) {
      setMessage(tx("A record with this identifier already exists."));
      return;
    }
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
    if (!text(form, "name").trim()) {
      setMessage(tx("Vessel name is required."));
      return;
    }
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
    if (!text(form, "helicopterRegistration") || !text(form, "componentName").trim()) {
      setMessage(tx("Helicopter and component name are required."));
      return;
    }
    if (remainingHours < 0 || lifeLimitHours < 0 || remainingCalendarDays < 0) {
      setMessage(tx("Numeric values cannot be negative."));
      return;
    }
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
        maintenanceAlerts: reconcileMaintenanceAlerts(current.maintenanceAlerts, [record])
      }),
      tx("Component saved and status recalculated locally.")
    );
  }

  function saveFlightLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const hobbsStart = num(form.get("hobbsStart"));
    const hobbsEnd = num(form.get("hobbsEnd"));
    if (!text(form, "helicopterRegistration") || !text(form, "flightDate")) {
      setMessage(tx("Aircraft and date are required."));
      return;
    }
    if (hobbsEnd < hobbsStart) {
      setMessage(tx("Hobbs end must be greater than or equal to Hobbs start."));
      return;
    }
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

    updateStore((current) => applyFlightLogRules(current, log, mode), tx("Flight log saved, hourmeter updated, components recalculated, and alerts refreshed."));
  }

  function saveMaintenanceLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!text(form, "helicopterRegistration") || !text(form, "maintenanceType").trim()) {
      setMessage(tx("Helicopter and maintenance type are required."));
      return;
    }
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
    if (!helicopterRegistration || !installedName.trim()) {
      setMessage(tx("Helicopter and installed component are required."));
      return;
    }
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
    const installed: HelicopterComponent = recalculateComponent({
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
    });

    updateStore((current) => {
      const removedComponents = current.components
        .filter((component) => component.id === removedComponentId)
        .map((component) => ({ ...component, status: "Removed" as ComponentStatus, archived: true }));
      return {
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
        maintenanceAlerts: reconcileMaintenanceAlerts(current.maintenanceAlerts, [...removedComponents, installed])
      };
    }, tx("Component change saved, replacement history updated, and alerts recalculated."));
  }

  function saveInventoryItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = editingInventoryId ?? generateId("inv");
    if (!text(form, "vesselId") || !text(form, "itemName").trim()) {
      setMessage(tx("Vessel and item name are required."));
      return;
    }
    if (num(form.get("quantity")) < 0 || num(form.get("minimumStock")) < 0) {
      setMessage(tx("Numeric values cannot be negative."));
      return;
    }
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
    if (!itemId || quantity <= 0) {
      setMessage(tx("Inventory item and positive quantity are required."));
      return;
    }
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
    updateStore((current) => ({
      ...current,
      stockMovements: [...current.stockMovements, movement],
      inventoryItems: applyStockMovementRules(current.inventoryItems, movement)
    }), tx("Stock movement recorded and quantity updated locally."));
  }

  function savePurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = editingPurchaseId ?? generateId("pr");
    if (!text(form, "supplier").trim() || !text(form, "itemName").trim()) {
      setMessage(tx("Supplier and item name are required."));
      return;
    }
    if (num(form.get("quantity")) <= 0 || num(form.get("unitCost")) < 0) {
      setMessage(tx("Quantity must be positive and cost cannot be negative."));
      return;
    }
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
      purchaseRequests: editingPurchaseId ? current.purchaseRequests.map((record) => record.id === id ? request : record) : [...current.purchaseRequests, request],
      inventoryItems: applyPurchaseInventoryRules(current, request)
    }), tx("Purchase request saved and inventory readiness updated locally."));
    setEditingPurchaseId(undefined);
  }

  const header = getHeader(view, mode);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <PageHeader {...header} />
        {message ? (
          <div className="hsv-success-banner">
            {message}
          </div>
        ) : null}
        {!isReady ? <LoadingState /> : renderView()}
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
    const openAlerts = store.maintenanceAlerts.filter((alert) => alert.status !== "Resolved");
    const criticalAlerts = openAlerts.filter((alert) => ["Critical", "Grounding"].includes(alert.severity));
    const maintenanceDue = getForecastComponents(components);
    const inventoryRisks = inventoryItems.filter((item) => getLowStockStatus(item) !== "OK");
    const activeCampaigns = store.campaigns.filter((campaign) => ["Active", "Approved", "Readiness Review", "Planned"].includes(campaign.status));
    const aura = buildCopilotAnalysis(store).aura;
    const fleetHealth = aura.fleetHealth.score;
    const operationalReadiness = aura.missionReadiness.score;
    const auraRecommendations = aura.executiveRecommendations;
    const quickActions = [
      ["Import components", "/components"],
      ["Review maintenance alerts", "/alerts"],
      ["Open inventory", "/inventory"],
      ["Review AURA", "/copilot"]
    ];
    return (
      <div className="grid gap-6">
        <Panel className="overflow-hidden bg-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 w-fit">
                <BrandLockup variant="compact" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-aviation-blue">{t(getTimeGreetingKey())}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">{tx("Operations Command Center")}</h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-ink-muted">
                {tx("A calm executive view of fleet health, readiness, maintenance exposure, campaigns, inventory risk, and AURA recommendations.")}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-canvas-muted/55 p-4">
              <StatusPill tone={criticalAlerts.length ? "red" : inventoryRisks.length || maintenanceDue.length ? "amber" : "green"}>
                {criticalAlerts.length ? tx("Attention Required") : tx("Operational")}
              </StatusPill>
              <p className="mt-3 text-sm leading-6 text-ink-subtle">{tx("Panama · Ecuador · Latin America")}</p>
            </div>
          </div>
        </Panel>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <Metric label="Fleet Health" value={`${fleetHealth}%`} tone={fleetHealth >= 80 ? "green" : fleetHealth >= 65 ? "amber" : "red"} detail="Aircraft readiness and alert exposure" />
          <Metric label="Operational Readiness" value={`${operationalReadiness}%`} tone={operationalReadiness >= 80 ? "green" : operationalReadiness >= 60 ? "amber" : "red"} detail="Aircraft available for current work" />
          <Metric label="Critical Alerts" value={String(criticalAlerts.length)} tone={criticalAlerts.length ? "red" : "green"} detail="Immediate maintenance attention" />
          <Metric label="Active Campaigns" value={String(activeCampaigns.length)} tone="blue" detail="Active, planned, or readiness review" />
          <Metric label="Maintenance Due" value={String(maintenanceDue.length)} tone={maintenanceDue.length ? "amber" : "green"} detail="Forecasted due components" />
          <Metric label="Inventory Risk" value={String(inventoryRisks.length)} tone={inventoryRisks.length ? "amber" : "green"} detail="Low stock or expiry signals" />
        </section>
        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Panel>
            <SectionHeading title="Critical Alerts" detail="Management attention required before operations continue." />
            <div className="mt-5 grid gap-3">
              {criticalAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="rounded-xl border border-aviation-red/20 bg-aviation-red/5 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="red">{alert.severity}</StatusPill>
                    <StatusPill tone="neutral">{alert.helicopterRegistration}</StatusPill>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink">{alert.componentName}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-subtle">{alert.description}</p>
                </div>
              ))}
              {!criticalAlerts.length ? <EmptyInlineState /> : null}
            </div>
          </Panel>
          <Panel>
            <SectionHeading title="AURA Recommendations" detail="Executive recommendations, not a chat transcript." />
            <div className="mt-5 grid gap-3">
              {auraRecommendations.map((recommendation) => (
                <AuraExecutiveCard key={recommendation.recommendation} {...recommendation} />
              ))}
            </div>
          </Panel>
        </section>
        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Panel>
            <SectionHeading title="Maintenance Due" detail="Forecasted component exposure from local records." />
            <div className="mt-5 grid gap-3">
              {maintenanceDue.slice(0, 4).map((component) => (
                <div key={component.id} className="rounded-xl border border-line bg-canvas-muted/45 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={component.status === "OK" ? "green" : component.status === "Monitor" ? "amber" : "red"}>{component.status}</StatusPill>
                    <StatusPill tone="neutral">{component.helicopterRegistration}</StatusPill>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink">{component.componentName}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-subtle">{component.remainingHours.toFixed(1)} {tx("Remaining Hours")}</p>
                </div>
              ))}
              {!maintenanceDue.length ? <EmptyInlineState /> : null}
            </div>
          </Panel>
          <Panel>
            <SectionHeading title="Quick Actions" detail="Move from executive signal to the operating workspace." />
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {quickActions.map(([label, href]) => (
                <Link key={href} className="rounded-xl border border-line bg-canvas-muted/58 p-4 text-sm font-semibold text-ink transition hover:border-aviation-blue/30 hover:bg-brand-lightBlue/50 hover:text-aviation-blue" href={href}>
                  {tx(label)}
                </Link>
              ))}
            </div>
            <p className="mt-5 rounded-lg border border-aviation-amber/20 bg-aviation-amber/10 px-4 py-3 text-sm font-medium text-ink-muted">
              {demoDataPolicy}
            </p>
          </Panel>
        </section>
      </div>
    );
  }

  function renderHelicopters() {
    const rows = prepareCrudRows(helicopters, {
      query: listQuery,
      filter: listFilter,
      sortKey,
      sortDirection,
      searchable: (helicopter) => [helicopter.registration, helicopter.model, helicopter.status, helicopter.assignedVessel, helicopter.source],
      filterValue: (helicopter) => [helicopter.status, helicopter.source ?? "Demo"],
      sortValue: (helicopter, key) => key === "hourmeter" ? helicopter.currentHourmeter : key === "status" ? helicopter.status : helicopter.registration
    });
    return (
      <Panel>
        <ListHeader title="Helicopters" href="/helicopters/new" action="Create helicopter" />
        <ListControls
          query={listQuery}
          onQueryChange={setListQuery}
          filter={listFilter}
          onFilterChange={setListFilter}
          filters={["All", "Available", "Assigned", "In Campaign", "Maintenance", "Grounded", "User", "Demo"]}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          sortOptions={[["name", "Registration"], ["hourmeter", "Hourmeter"], ["status", "Status"]]}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          resultCount={rows.length}
        />
        <Table headers={["Registration", "Model", "Hourmeter", "Status", "Assigned vessel", "Source", "Actions"]}>
          {rows.map((helicopter) => (
            <tr key={helicopter.registration}>
              <Cell><Link className="font-semibold text-ink hover:text-aviation-teal" href={`/helicopters/${helicopter.registration}`}>{helicopter.registration}</Link></Cell>
              <Cell muted>{helicopter.model}</Cell>
              <Cell>{helicopter.currentHourmeter.toFixed(1)}</Cell>
              <Cell><StatusPill tone={helicopter.status === "Grounded" ? "red" : "teal"}>{helicopter.status}</StatusPill></Cell>
              <Cell muted>{helicopter.assignedVessel || "Unassigned"}</Cell>
              <Cell><StatusPill tone={helicopter.source === "User" ? "green" : "amber"}>{helicopter.source ?? "Demo"}</StatusPill></Cell>
              <Cell><Actions edit={`/helicopters/${helicopter.registration}/edit`} onArchive={() => archiveRecord("helicopters", "registration", helicopter.registration)} onDelete={() => deleteRecord("helicopters", "registration", helicopter.registration)} /></Cell>
            </tr>
          ))}
          {!rows.length ? <EmptyTableRow colSpan={7} /> : null}
        </Table>
      </Panel>
    );
  }

  function renderHelicopterDetail(registration?: string) {
    const helicopter = helicopters.find((item) => item.registration === registration);
    if (!helicopter) return <Empty title="Helicopter not found" />;
    const assignedComponents = components.filter((item) => item.helicopterRegistration === helicopter.registration);
    const criticalComponents = assignedComponents.filter((item) => ["Critical", "Expired"].includes(item.status));
    const aircraftAlerts = store.maintenanceAlerts.filter((alert) => alert.helicopterRegistration === helicopter.registration && alert.status !== "Resolved");
    const aircraftRecords = store.technicalRecords.filter((record) => record.relatedHelicopter === helicopter.registration);
    const aircraftCompliance = store.complianceItems.filter((item) => item.relatedHelicopter === helicopter.registration);
    const aircraftCampaigns = store.campaigns.filter((campaign) => campaign.helicopterRegistration === helicopter.registration);
    const aircraftHistory = [
      ...store.flightLogs.filter((log) => log.helicopterRegistration === helicopter.registration).map((log) => ({ date: log.flightDate, title: `${log.flightHours.toFixed(1)} flight hours`, detail: log.campaign || log.vesselName })),
      ...store.replacementEvents.filter((event) => event.helicopterRegistration === helicopter.registration).map((event) => ({ date: event.installationDate, title: event.installedComponent, detail: event.reason }))
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    return (
      <div className="grid gap-5">
        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={helicopter.status === "Grounded" ? "red" : helicopter.status === "Maintenance" ? "amber" : "green"}>{helicopter.status}</StatusPill>
                <StatusPill tone={helicopter.source === "User" ? "green" : "amber"}>{helicopter.source ?? "Demo"}</StatusPill>
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-ink">{tx("Aircraft")} <span className="hsv-technical-value">{helicopter.registration}</span></h2>
              <div className="mt-4 grid gap-3 text-sm text-ink-subtle sm:grid-cols-3">
                <ProfileField label="Model" value={helicopter.model} mono={false} />
                <ProfileField label="Serial" value={helicopter.serialNumber || "N/A"} />
                <ProfileField label="Current Hours" value={helicopter.currentHourmeter.toFixed(1)} />
              </div>
            </div>
            <Link className="hsv-primary-button" href={`/helicopters/${helicopter.registration}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {tx("Edit helicopter")}
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <ExecutiveSummaryCard title="Health Score" value={`${helicopter.readiness}%`} status={helicopter.readiness >= 80 ? "Healthy" : helicopter.readiness >= 60 ? "Watch" : "Critical"} detail="Imported or local readiness field" tone={helicopter.readiness >= 80 ? "green" : helicopter.readiness >= 60 ? "amber" : "red"} />
            <ExecutiveSummaryCard title="Mission Readiness" value={aircraftAlerts.length ? "Review" : "Ready"} status={aircraftAlerts.length ? "Attention" : "Operational"} detail={`${aircraftAlerts.length} open alert${aircraftAlerts.length === 1 ? "" : "s"}`} tone={aircraftAlerts.length ? "amber" : "green"} />
            <ExecutiveSummaryCard title="Assigned Vessel" value={helicopter.assignedVessel || "None"} status="Assignment" detail={helicopter.operationArea || "No operation area"} tone="blue" />
            <ExecutiveSummaryCard title="Critical Components" value={String(criticalComponents.length)} status={criticalComponents.length ? "Critical" : "Clear"} detail={`${assignedComponents.length} installed component records`} tone={criticalComponents.length ? "red" : "green"} />
          </div>
          <p className="mt-5 text-sm leading-6 text-ink-subtle">{helicopter.notes}</p>
        </Panel>
        <div className="flex gap-2 overflow-x-auto rounded-xl border border-line bg-white p-2 shadow-control dark:bg-canvas-muted">
          {["Overview", "Components", "Technical Records", "Compliance", "History"].map((tab) => (
            <a key={tab} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted transition hover:bg-brand-lightBlue hover:text-aviation-blue" href={`#${tab.toLowerCase().replaceAll(" ", "-")}`}>
              {tx(tab)}
            </a>
          ))}
        </div>
        <section id="overview" className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <Panel>
            <SectionHeading title="Overview" detail="One aircraft, one operational profile." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MiniStat label="Registration" value={helicopter.registration} />
              <MiniStat label="Owner company" value={helicopter.ownerCompany || "N/A"} />
              <MiniStat label="Country / operation area" value={helicopter.operationArea || "N/A"} />
              <MiniStat label="Next due component" value={helicopter.nextDueComponent || "N/A"} />
            </div>
          </Panel>
          <Panel>
            <SectionHeading title="Campaign Summary" detail="Aircraft deployment history and active context." />
            <div className="mt-5 grid gap-3">
              {aircraftCampaigns.slice(0, 4).map((campaign) => (
                <div key={campaign.id} className="rounded-lg border border-line bg-canvas-muted/45 p-3">
                  <p className="text-sm font-semibold text-ink">{campaign.code} / {campaign.name}</p>
                  <p className="mt-1 text-sm text-ink-subtle">{campaign.vesselName} / {campaign.status}</p>
                </div>
              ))}
              {!aircraftCampaigns.length ? <EmptyInlineState /> : null}
            </div>
          </Panel>
        </section>
        <AircraftMigrationCenter
          compact
          preselectedRegistration={helicopter.registration}
          store={store}
          onApply={updateStore}
        />
        <Panel id="components">
          <SectionHeading title="Components" detail="Installed component exposure by aircraft." />
          <div className="mt-5">
          {renderComponentsTable(assignedComponents)}
          </div>
        </Panel>
        <section className="grid gap-5 xl:grid-cols-2">
          <Panel id="technical-records">
            <SectionHeading title="Technical Records" detail="Evidence linked to this aircraft." />
            <div className="mt-5 grid gap-3">
              {aircraftRecords.slice(0, 6).map((record) => (
                <div key={record.id} className="rounded-lg border border-line bg-canvas-muted/45 p-3">
                  <p className="text-sm font-semibold text-ink">{record.title}</p>
                  <p className="mt-1 text-sm text-ink-subtle">{record.recordType} / {record.recordDate}</p>
                </div>
              ))}
              {!aircraftRecords.length ? <EmptyInlineState /> : null}
            </div>
          </Panel>
          <Panel id="compliance">
            <SectionHeading title="Compliance" detail="Open applicability and regulatory references." />
            <div className="mt-5 grid gap-3">
              {aircraftCompliance.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-lg border border-line bg-canvas-muted/45 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={item.status === "Overdue" ? "red" : item.status === "Complied" ? "green" : "amber"}>{item.status}</StatusPill>
                    <StatusPill tone="neutral">{item.authority}</StatusPill>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink">{item.referenceNumber} / {item.title}</p>
                </div>
              ))}
              {!aircraftCompliance.length ? <EmptyInlineState /> : null}
            </div>
          </Panel>
        </section>
        <Panel id="history">
          <SectionHeading title="History" detail="Flight and maintenance timeline preview." />
          <div className="mt-5 grid gap-3">
            {aircraftHistory.map((event) => (
              <div key={`${event.date}-${event.title}`} className="grid gap-2 rounded-lg border border-line bg-canvas-muted/45 p-3 sm:grid-cols-[140px_1fr]">
                <p className="hsv-technical-value text-sm font-semibold text-ink">{event.date || "N/A"}</p>
                <div>
                  <p className="text-sm font-semibold text-ink">{event.title}</p>
                  <p className="mt-1 text-sm text-ink-subtle">{event.detail}</p>
                </div>
              </div>
            ))}
            {!aircraftHistory.length ? <EmptyInlineState /> : null}
          </div>
        </Panel>
      </div>
    );
  }

  function renderHelicopterForm(registration?: string) {
    const record = helicopters.find((item) => item.registration === registration);
    return (
      <FormShell onSubmit={saveHelicopter}>
        <Field name="registration" label="Registration" defaultValue={record?.registration} required />
        <Field name="model" label="Model" defaultValue={record?.model} required />
        <Field name="serialNumber" label="Serial number" defaultValue={record?.serialNumber} />
        <Field name="manufactureYear" label="Year" defaultValue={record?.manufactureYear} />
        <Field name="currentHourmeter" label="Current hourmeter" defaultValue={record?.currentHourmeter} required />
        <Select name="status" label="Status" defaultValue={record?.status ?? "Available"} options={["Available", "Assigned", "In Campaign", "Maintenance", "Grounded", "Retired"]} />
        <Field name="ownerCompany" label="Owner company" defaultValue={record?.ownerCompany} />
        <Select name="assignedVessel" label="Assigned vessel" defaultValue={record?.assignedVessel ?? "Unassigned"} options={["Unassigned", ...vessels.map((item) => item.name)]} />
        <Field name="operationArea" label="Country / operation area" defaultValue={record?.operationArea} />
        <TextArea name="notes" label="Notes" defaultValue={record?.notes} />
      </FormShell>
    );
  }

  function renderVessels() {
    const rows = prepareCrudRows(vessels, {
      query: listQuery,
      filter: listFilter,
      sortKey,
      sortDirection,
      searchable: (vessel) => [vessel.name, vessel.owner, vessel.country, vessel.homePort, vessel.campaign, vessel.assignedHelicopter, vessel.status, vessel.source],
      filterValue: (vessel) => [vessel.status, vessel.source ?? "Demo"],
      sortValue: (vessel, key) => key === "country" ? vessel.country : key === "status" ? vessel.status : vessel.name
    });
    return (
      <Panel>
        <ListHeader title="Vessels" href="/vessels/new" action="Create vessel" />
        <ListControls
          query={listQuery}
          onQueryChange={setListQuery}
          filter={listFilter}
          onFilterChange={setListFilter}
          filters={["All", "Active", "Inactive", "Prospect", "User", "Demo"]}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          sortOptions={[["name", "Vessel"], ["country", "Country"], ["status", "Status"]]}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          resultCount={rows.length}
        />
        <Table headers={["Vessel", "Owner", "Country", "Port", "Campaign", "Assigned helicopter", "Source", "Actions"]}>
          {rows.map((vessel) => (
            <tr key={vessel.id}>
              <Cell><Link className="font-semibold text-ink hover:text-aviation-teal" href={`/vessels/${vessel.id}`}>{vessel.name}</Link></Cell>
              <Cell muted>{vessel.owner}</Cell>
              <Cell muted>{vessel.country}</Cell>
              <Cell muted>{vessel.homePort}</Cell>
              <Cell muted>{vessel.campaign}</Cell>
              <Cell muted>{vessel.assignedHelicopter || "Unassigned"}</Cell>
              <Cell><StatusPill tone={vessel.source === "User" ? "green" : "amber"}>{vessel.source ?? "Demo"}</StatusPill></Cell>
              <Cell><Actions edit={`/vessels/${vessel.id}/edit`} onArchive={() => archiveRecord("vessels", "id", vessel.id)} onDelete={() => deleteRecord("vessels", "id", vessel.id)} /></Cell>
            </tr>
          ))}
          {!rows.length ? <EmptyTableRow colSpan={8} /> : null}
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
        <InventoryImportCenter
          compact
          context={{ vesselId: vessel.id, helicopterRegistration: vessel.assignedHelicopter }}
          store={store}
          onApply={updateStore}
        />
      </div>
    );
  }

  function renderVesselForm(id?: string) {
    const record = vessels.find((item) => item.id === id);
    return (
      <FormShell onSubmit={saveVessel}>
        <Field name="name" label="Vessel name" defaultValue={record?.name} required />
        <Field name="owner" label="Owner company" defaultValue={record?.owner} required />
        <Field name="country" label="Country" defaultValue={record?.country} required />
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
      <div className="grid gap-5">
        <AircraftMigrationCenter store={store} onApply={updateStore} />
        <Panel>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">{tx("Components")}</h2>
              <p className="mt-1 text-sm leading-6 text-ink-subtle">{tx("Use Excel migration for complete aircraft component control. Manual entry is available for small corrections only.")}</p>
            </div>
            <Link className="hsv-secondary-button w-full sm:w-auto" href="/components/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {tx("Add component manually")}
            </Link>
          </div>
          {renderComponentsTable(components)}
        </Panel>
      </div>
    );
  }

  function renderComponentsTable(rows: HelicopterComponent[]) {
    const preparedRows = prepareCrudRows(rows, {
      query: listQuery,
      filter: listFilter,
      sortKey,
      sortDirection,
      searchable: (component) => [component.helicopterRegistration, component.componentName, component.category, component.partNumber, component.serialNumber, component.position, component.status, component.source],
      filterValue: (component) => [component.status, component.source ?? "Demo", component.helicopterRegistration],
      sortValue: (component, key) => key === "remaining" ? component.remainingHours : key === "status" ? component.status : component.componentName
    });
    return (
      <>
        <ListControls
          query={listQuery}
          onQueryChange={setListQuery}
          filter={listFilter}
          onFilterChange={setListFilter}
          filters={["All", "OK", "Monitor", "Critical", "Expired", "User", "Demo", ...helicopters.map((item) => item.registration)]}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          sortOptions={[["name", "Component"], ["remaining", "Remaining"], ["status", "Status"]]}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          resultCount={preparedRows.length}
        />
        <Table headers={["Aircraft", "Component", "P/N", "S/N", "Remaining", "%", "Status", "Source", "Actions"]}>
        {preparedRows.map((component) => (
          <tr key={component.id}>
            <Cell>{component.helicopterRegistration}</Cell>
            <Cell><Link className="font-semibold text-ink hover:text-aviation-teal" href={`/components/${component.id}`}>{component.componentName}</Link></Cell>
            <Cell muted>{component.partNumber}</Cell>
            <Cell muted>{component.serialNumber}</Cell>
            <Cell>{component.remainingHours.toFixed(1)} hrs</Cell>
            <Cell>{component.remainingPercentage.toFixed(1)}%</Cell>
            <Cell><StatusPill tone={component.status === "OK" ? "green" : component.status === "Monitor" ? "amber" : component.status === "Removed" ? "neutral" : "red"}>{component.status}</StatusPill></Cell>
            <Cell><StatusPill tone={component.source === "User" ? "green" : "amber"}>{component.source ?? "Demo"}</StatusPill></Cell>
            <Cell><Actions edit={`/components/${component.id}/edit`} onArchive={() => archiveRecord("components", "id", component.id)} onDelete={() => deleteRecord("components", "id", component.id)} /></Cell>
          </tr>
        ))}
        {!preparedRows.length ? <EmptyTableRow colSpan={9} /> : null}
        </Table>
      </>
    );
  }

  function renderComponentDetail(id?: string) {
    const component = components.find((item) => item.id === id);
    if (!component) return <Empty title="Component not found" />;
    const helicopter = helicopters.find((item) => item.registration === component.helicopterRegistration);
    const componentAlerts = store.maintenanceAlerts.filter((alert) => alert.componentId === component.id && alert.status !== "Resolved");
    const componentChanges = store.componentChanges.filter((change) => change.removedComponentId === component.id || change.installedComponentName === component.componentName);
    const replacementHistory = store.replacementEvents.filter((event) => event.helicopterRegistration === component.helicopterRegistration && (event.removedComponent.includes(component.componentName) || event.installedComponent.includes(component.componentName)));
    return (
      <div className="grid gap-5">
        <Panel>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={component.status === "OK" ? "green" : component.status === "Monitor" ? "amber" : component.status === "Removed" ? "neutral" : "red"}>{component.status}</StatusPill>
                <StatusPill tone={component.source === "User" ? "green" : "amber"}>{component.source ?? "Demo"}</StatusPill>
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-ink">{component.componentName}</h2>
              <div className="mt-4 grid gap-3 text-sm text-ink-subtle sm:grid-cols-4">
                <ProfileField label="Aircraft" value={component.helicopterRegistration} />
                <ProfileField label="P/N" value={component.partNumber || "N/A"} />
                <ProfileField label="S/N" value={component.serialNumber || "N/A"} />
                <ProfileField label="Position" value={component.position || "N/A"} />
              </div>
            </div>
            <Link className="hsv-primary-button" href={`/components/${component.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {tx("Edit component")}
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Metric label="Remaining Hours" value={`${component.remainingHours.toFixed(1)} hrs`} tone={component.remainingHours <= 0 ? "red" : component.remainingPercentage < 25 ? "amber" : "green"} detail="Hour-controlled balance" />
            <Metric label="Remaining Calendar" value={`${component.remainingCalendarDays} days`} tone={component.remainingCalendarDays <= 0 ? "red" : component.remainingCalendarDays < 180 ? "amber" : "green"} detail={component.calendarLimitDate || "No calendar limit"} />
            <Metric label="Current Status" value={component.status} tone={component.status === "OK" ? "green" : component.status === "Monitor" ? "amber" : "red"} detail="Rule-derived state" />
            <Metric label="Forecast" value={component.remainingHours <= 100 || component.remainingCalendarDays <= 180 ? "Plan" : "Normal"} tone={component.remainingHours <= 100 || component.remainingCalendarDays <= 180 ? "amber" : "green"} detail={helicopter ? `${helicopter.currentHourmeter.toFixed(1)} aircraft hours` : "Aircraft not found"} />
          </div>
          <p className="mt-5 text-sm leading-6 text-ink-subtle">{component.notes}</p>
        </Panel>
        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel>
            <SectionHeading title="Forecast" detail="Maintenance exposure based on current remaining life." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MiniStat label="Life Limit" value={`${component.lifeLimitHours.toFixed(1)} hrs`} />
              <MiniStat label="TSN" value={`${component.tsnHours.toFixed(1)} hrs`} />
              <MiniStat label="TSO" value={`${component.tsoHours.toFixed(1)} hrs`} />
              <MiniStat label="Remaining %" value={`${component.remainingPercentage.toFixed(1)}%`} />
            </div>
          </Panel>
          <Panel>
            <SectionHeading title="Current Alerts" detail="Open maintenance signals linked to this component." />
            <div className="mt-5 grid gap-3">
              {componentAlerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-line bg-canvas-muted/45 p-3">
                  <StatusPill tone={alert.severity === "Info" ? "blue" : alert.severity === "Monitor" ? "amber" : "red"}>{alert.severity}</StatusPill>
                  <p className="mt-3 text-sm text-ink-subtle">{alert.description}</p>
                </div>
              ))}
              {!componentAlerts.length ? <EmptyInlineState /> : null}
            </div>
          </Panel>
        </section>
        <Panel>
          <SectionHeading title="History" detail="Replacement and component-change events." />
          <div className="mt-5 grid gap-3">
            {[...componentChanges.map((change) => ({ id: change.id, date: change.installationDate, title: change.installedComponentName, detail: change.reason })), ...replacementHistory.map((event) => ({ id: event.id, date: event.installationDate, title: event.installedComponent, detail: event.reason }))].slice(0, 8).map((event) => (
              <div key={event.id} className="grid gap-2 rounded-lg border border-line bg-canvas-muted/45 p-3 sm:grid-cols-[140px_1fr]">
                <p className="hsv-technical-value text-sm font-semibold text-ink">{event.date || "N/A"}</p>
                <div>
                  <p className="text-sm font-semibold text-ink">{event.title}</p>
                  <p className="mt-1 text-sm text-ink-subtle">{event.detail}</p>
                </div>
              </div>
            ))}
            {!componentChanges.length && !replacementHistory.length ? <EmptyInlineState /> : null}
          </div>
        </Panel>
      </div>
    );
  }

  function renderComponentForm(id?: string) {
    const record = components.find((item) => item.id === id);
    return (
      <FormShell onSubmit={saveComponent}>
        <Select name="helicopterRegistration" label="Helicopter registration" defaultValue={record?.helicopterRegistration ?? helicopters[0]?.registration} options={helicopters.map((item) => item.registration)} required />
        <Select name="category" label="Component category" defaultValue={record?.category ?? "Engine"} options={componentCategories.map((item) => item.name)} />
        <Field name="componentName" label="Component name" defaultValue={record?.componentName} required />
        <Field name="partNumber" label="Part number" defaultValue={record?.partNumber} />
        <Field name="serialNumber" label="Serial number" defaultValue={record?.serialNumber} />
        <Field name="position" label="Position" defaultValue={record?.position} />
        <Field name="installationDate" label="Installation date" defaultValue={record?.installationDate} />
        <Field name="tsnHours" label="TSN hours" defaultValue={record?.tsnHours} />
        <Field name="tsoHours" label="TSO hours" defaultValue={record?.tsoHours} />
        <Field name="lifeLimitHours" label="Life limit hours" defaultValue={record?.lifeLimitHours} required />
        <Field name="remainingHours" label="Remaining hours" defaultValue={record?.remainingHours} required />
        <Field name="calendarLimitDate" label="Calendar limit date" defaultValue={record?.calendarLimitDate} />
        <Field name="remainingCalendarDays" label="Remaining calendar days" defaultValue={record?.remainingCalendarDays} />
        <TextArea name="notes" label="Notes" defaultValue={record?.notes} />
      </FormShell>
    );
  }

  function renderFlightLog() {
    const logs = prepareCrudRows(store.flightLogs, {
      query: listQuery,
      filter: listFilter,
      sortKey,
      sortDirection,
      searchable: (log) => [log.helicopterRegistration, log.vesselName, log.campaign, log.flightDate, log.pilot, log.mechanic],
      filterValue: (log) => [log.helicopterRegistration, log.vesselName, log.approvalStatus],
      sortValue: (log, key) => key === "hours" ? log.flightHours : key === "date" ? log.flightDate : log.helicopterRegistration
    });
    return (
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        {renderFlightLogForm()}
        <Panel>
          <h2 className="mb-4 text-lg font-semibold text-ink">Flight Logs</h2>
          <ListControls
            query={listQuery}
            onQueryChange={setListQuery}
            filter={listFilter}
            onFilterChange={setListFilter}
            filters={["All", "Approved", ...helicopters.map((item) => item.registration)]}
            sortKey={sortKey}
            onSortKeyChange={setSortKey}
            sortOptions={[["date", "Date"], ["aircraft", "Aircraft"], ["hours", "Hours"]]}
            sortDirection={sortDirection}
            onSortDirectionChange={setSortDirection}
            resultCount={logs.length}
          />
          <Table headers={["Aircraft", "Vessel", "Date", "Hours", "Pilot", "Actions"]}>
            {logs.map((log) => (
              <tr key={log.id}>
                <Cell>{log.helicopterRegistration}</Cell>
                <Cell muted>{log.vesselName}</Cell>
                <Cell muted>{log.flightDate}</Cell>
                <Cell>{log.flightHours.toFixed(1)}</Cell>
                <Cell muted>{log.pilot}</Cell>
                <Cell><Actions edit={`/flight-log/${log.id}/edit`} onArchive={() => archiveRecord("flightLogs", "id", log.id)} onDelete={() => deleteRecord("flightLogs", "id", log.id)} /></Cell>
              </tr>
            ))}
            {!logs.length ? <EmptyTableRow colSpan={6} /> : null}
          </Table>
        </Panel>
      </div>
    );
  }

  function renderFlightLogForm(id?: string) {
    const record = store.flightLogs.find((item) => item.id === id);
    return (
      <FormShell onSubmit={saveFlightLog}>
        <Select name="helicopterRegistration" label="Helicopter" defaultValue={record?.helicopterRegistration ?? helicopters[0]?.registration} options={helicopters.map((item) => item.registration)} required />
        <Select name="vesselName" label="Vessel / campaign" defaultValue={record?.vesselName ?? vessels[0]?.name} options={vessels.map((item) => item.name)} />
        <Field name="campaign" label="Campaign" defaultValue={record?.campaign ?? vessels[0]?.campaign} />
        <Field name="flightDate" label="Flight date" defaultValue={record?.flightDate ?? new Date().toISOString().slice(0, 10)} required />
        <Field name="pilot" label="Pilot" defaultValue={record?.pilot} />
        <Field name="mechanic" label="Mechanic" defaultValue={record?.mechanic} />
        <Field name="hobbsStart" label="Hobbs start" defaultValue={record?.hobbsStart} required />
        <Field name="hobbsEnd" label="Hobbs end" defaultValue={record?.hobbsEnd} required />
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
        <Select name="helicopterRegistration" label="Helicopter" options={helicopters.map((item) => item.registration)} required />
        <Field name="date" label="Date" defaultValue={new Date().toISOString().slice(0, 10)} />
        <Field name="maintenanceType" label="Maintenance type" required />
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
        <Select name="helicopterRegistration" label="Helicopter" options={helicopters.map((item) => item.registration)} required />
        <Select name="removedComponentId" label="Removed component" options={["", ...components.map((item) => item.id)]} />
        <Field name="installedComponentName" label="Installed component" required />
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
    const selectedVessel = vessels.find((vessel) => vessel.id === selectedInventoryVesselId);
    const hasInventoryContext = Boolean(selectedInventoryVesselId && selectedInventoryBodega);
    const bodegaOptions = selectedInventoryVesselId
      ? uniqueValues(inventoryItems
        .filter((item) => item.vesselId === selectedInventoryVesselId)
        .map(inventoryBodegaName))
      : [];
    const bodegaItems = inventoryItems.filter((item) =>
      Boolean(selectedInventoryVesselId) &&
      Boolean(selectedInventoryBodega) &&
      item.vesselId === selectedInventoryVesselId &&
      inventoryBodegaName(item) === selectedInventoryBodega
    );
    const vesselItems = inventoryItems.filter((item) => !selectedInventoryVesselId || item.vesselId === selectedInventoryVesselId);
    const categoryOptions = ["All", ...uniqueValues(vesselItems.map((item) => item.itemType))];
    const aircraftOptions = ["All", ...uniqueValues(vesselItems.map((item) => item.relatedHelicopter || "Unassigned aircraft"))];
    const stockStatusOptions = ["All", "OK", "Low stock", "Out of stock", "Expiring soon", "Expired"];
    const filteredBodegaItems = bodegaItems.filter((item) => {
      const stockStatus = getLowStockStatus(item);
      const aircraft = item.relatedHelicopter || "Unassigned aircraft";
      return matchesInventorySearch(item, inventorySearchQuery) &&
        (inventoryCategoryFilter === "All" || item.itemType === inventoryCategoryFilter) &&
        (inventoryAircraftFilter === "All" || aircraft === inventoryAircraftFilter) &&
        (inventoryStockStatusFilter === "All" || stockStatus === inventoryStockStatusFilter);
    });
    const movementItems = bodegaItems.length ? bodegaItems : vesselItems;
    const bodegaMovements = store.stockMovements.filter((movement) => {
      const item = inventoryItems.find((record) => record.id === movement.inventoryItemId);
      if (!item) return false;
      return (!selectedInventoryVesselId || item.vesselId === selectedInventoryVesselId) &&
        (!selectedInventoryBodega || inventoryBodegaName(item) === selectedInventoryBodega || movement.fromLocation === selectedInventoryBodega || movement.toLocation === selectedInventoryBodega);
    });
    const rows = prepareCrudRows(filteredBodegaItems, {
      query: "",
      filter: "All",
      sortKey,
      sortDirection,
      searchable: (item) => [item.itemName, item.itemType, item.storageLocation, item.partNumber, item.serialNumber, item.condition, item.relatedHelicopter, item.notes],
      filterValue: (item) => [getLowStockStatus(item), item.itemType, item.source ?? "Demo", item.relatedHelicopter ?? "Unassigned aircraft"],
      sortValue: (item, key) => key === "quantity" ? item.quantity : key === "status" ? getLowStockStatus(item) : item.itemName
    });
    const summary = {
      total: bodegaItems.length,
      totalUnits: bodegaItems.reduce((sum, item) => sum + item.quantity, 0),
      criticalSpares: bodegaItems.filter((item) => ["Component", "Kit"].includes(item.itemType)).length,
      consumables: bodegaItems.filter((item) => ["Consumable", "Oil", "Filter", "Hardware"].includes(item.itemType)).length,
      lowStock: bodegaItems.filter((item) => getLowStockStatus(item) !== "OK").length,
      withSerial: bodegaItems.filter((item) => item.serialNumber?.trim()).length,
      withoutSerial: bodegaItems.filter((item) => !item.serialNumber?.trim()).length
    };
    const auraFindings = buildInventoryAuraFindings(bodegaItems, inventoryItems);
    const movementDefaults = getInventoryMovementDefaults(inventoryMovementPreset, selectedInventoryBodega, selectedVessel?.assignedHelicopter);
    const purchaseNeeds = bodegaItems
      .filter((item) => item.quantity <= item.minimumStock)
      .map((item) => ({
        id: item.id,
        itemName: item.itemName,
        partNumber: item.partNumber || "N/A",
        quantity: Math.max(1, item.minimumStock - item.quantity + 1),
        unit: item.unitOfMeasure
      }));

    function openMovement(type: StockMovement["movementType"]) {
      setInventoryMovementPreset(type);
      setInventoryWorkspaceMode("movement");
    }

    function exportSelectedInventory() {
      if (!selectedInventoryVesselId || !selectedInventoryBodega) {
        setMessage(tx("Select a vessel and bodega before exporting the bodega inventory PDF."));
        return;
      }
      exportInventoryPdfDocument({
        items: bodegaItems,
        store,
        vesselId: selectedInventoryVesselId,
        storageLocation: selectedInventoryBodega,
        campaignName: selectedVessel?.campaign,
        relatedAircraft: inventoryAircraftFilter !== "All" ? inventoryAircraftFilter : selectedVessel?.assignedHelicopter
      });
    }

    return (
      <div className="grid gap-5">
        <Panel>
          <div className="grid gap-5 xl:grid-cols-[1fr_1fr] xl:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-aviation-blue">{tx("Vessel Inventory Workspace")}</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">{tx("Select vessel and bodega first.")}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-subtle">
                {tx("Inventory is organized by vessel, then bodega, then current stock, movements, consumption, and purchase needs.")}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                {tx("Vessel")}
                <select className={inputClass} value={selectedInventoryVesselId} onChange={(event) => {
                  setSelectedInventoryVesselId(event.target.value);
                  setSelectedInventoryBodega("");
                  setInventoryCategoryFilter("All");
                  setInventoryAircraftFilter("All");
                  setInventoryStockStatusFilter("All");
                  setInventorySearchQuery("");
                }}>
                  <option value="">{tx("Select vessel")}</option>
                  {vessels.map((vessel) => <option key={vessel.id} value={vessel.id}>{vessel.name}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                {tx("Bodega / storage location")}
                <select className={inputClass} value={selectedInventoryBodega} onChange={(event) => setSelectedInventoryBodega(event.target.value)} disabled={!selectedInventoryVesselId}>
                  <option value="">{tx("Select bodega")}</option>
                  {bodegaOptions.map((bodega) => <option key={bodega} value={bodega}>{bodega}</option>)}
                </select>
              </label>
            </div>
          </div>
        </Panel>

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
          <Metric label="Total items" value={String(summary.total)} tone="blue" detail="Current records in selected bodega" />
          <Metric label="Total units" value={formatQuantity(summary.totalUnits)} tone="teal" detail="Total quantity across selected bodega" />
          <Metric label="Critical spares" value={String(summary.criticalSpares)} tone="teal" detail="Components and kits on board" />
          <Metric label="Consumables" value={String(summary.consumables)} tone="green" detail="Consumables, oils, filters, and hardware" />
          <Metric label="Low stock" value={String(summary.lowStock)} tone={summary.lowStock ? "amber" : "green"} detail="Items at or below minimum stock" />
          <Metric label="With S/N" value={String(summary.withSerial)} tone="blue" detail="Items with serial numbers" />
          <Metric label="Without S/N" value={String(summary.withoutSerial)} tone={summary.withoutSerial ? "amber" : "neutral"} detail="Items without serial numbers" />
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          {hasInventoryContext ? (
            <InventoryImportCenter
              key={`${selectedInventoryVesselId}-${selectedInventoryBodega}`}
              store={store}
              onApply={updateStore}
              context={{
                vesselId: selectedInventoryVesselId,
                helicopterRegistration: selectedVessel?.assignedHelicopter
              }}
            />
          ) : (
            <Panel>
              <SectionHeading title="Import inventory from Excel" detail="Select a vessel and bodega first so imported records are scoped to the correct storage location." />
              <div className="mt-5 rounded-lg border border-dashed border-line bg-canvas-muted/45 px-5 py-8 text-center text-sm text-ink-subtle">
                {tx("Select a vessel and bodega to enable inventory import.")}
              </div>
            </Panel>
          )}
          <Panel>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeading title="Inventory actions" detail="Use these actions for bodega-level stock control." />
              <button className="hsv-secondary-button" type="button" onClick={exportSelectedInventory} disabled={!hasInventoryContext}>
                <FileDown className="h-4 w-4" aria-hidden="true" />
                {tx("Export Bodega Inventory PDF")}
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button className="hsv-secondary-button justify-center" type="button" disabled={!hasInventoryContext} onClick={() => {
                setEditingInventoryId(undefined);
                setInventoryWorkspaceMode("item");
              }}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {tx("Add item manually")}
              </button>
              <button className="hsv-secondary-button justify-center" type="button" disabled={!hasInventoryContext} onClick={() => openMovement("Received")}>
                <PackagePlus className="h-4 w-4" aria-hidden="true" />
                {tx("Register stock entry")}
              </button>
              <button className="hsv-secondary-button justify-center" type="button" disabled={!hasInventoryContext} onClick={() => openMovement("Used")}>
                <PackageMinus className="h-4 w-4" aria-hidden="true" />
                {tx("Register stock exit")}
              </button>
              <button className="hsv-secondary-button justify-center" type="button" disabled={!hasInventoryContext} onClick={() => openMovement("Consumed")}>
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                {tx("Register consumption")}
              </button>
              <button className="hsv-secondary-button justify-center sm:col-span-2" type="button" disabled={!hasInventoryContext} onClick={() => openMovement("Transferred")}>
                <Repeat2 className="h-4 w-4" aria-hidden="true" />
                {tx("Transfer between bodegas")}
              </button>
            </div>
            {!hasInventoryContext ? (
              <p className="mt-4 rounded-lg border border-aviation-amber/20 bg-aviation-amber/10 px-4 py-3 text-sm font-medium text-ink-muted">
                {tx("Select a vessel and bodega to enable bodega actions.")}
              </p>
            ) : null}
          </Panel>
        </div>

        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeading title="AURA inventory intelligence" detail="AURA reviews selected bodega stock for operational risk and purchase needs." />
            <StatusPill tone={auraFindings.some((finding) => finding.tone === "red") ? "red" : auraFindings.some((finding) => finding.tone === "amber") ? "amber" : "green"}>
              {auraFindings.length ? tx("Review required") : tx("No immediate findings")}
            </StatusPill>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {auraFindings.map((finding) => (
              <article key={finding.title} className="rounded-lg border border-line bg-canvas-muted/45 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={finding.tone}>{tx(finding.priority)}</StatusPill>
                  <StatusPill tone="neutral">{finding.count}</StatusPill>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-ink">{tx(finding.title)}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-subtle">{tx(finding.detail)}</p>
                <p className="mt-3 text-sm font-semibold text-aviation-blue">{tx(finding.action)}</p>
              </article>
            ))}
            {!auraFindings.length ? (
              <article className="rounded-lg border border-brand-green/25 bg-brand-green/10 p-4">
                <StatusPill tone="green">{tx("OK")}</StatusPill>
                <p className="mt-3 text-sm font-semibold text-ink">{tx("No immediate inventory findings")}</p>
                <p className="mt-2 text-sm leading-6 text-ink-subtle">{tx("Selected bodega has no low stock, duplicate, missing P/N, or serial-number review findings in local records.")}</p>
              </article>
            ) : null}
          </div>
        </Panel>

        {hasInventoryContext ? (
        <div className="grid gap-5 2xl:grid-cols-[0.82fr_1.18fr]">
          <div className="grid gap-5">
            {inventoryWorkspaceMode === "item" ? (
              <FormShell key={editing?.id ?? `${selectedInventoryVesselId}-${selectedInventoryBodega}-new-inventory-item`} onSubmit={saveInventoryItem} title={editing ? "Edit Inventory Item" : "Add item manually"}>
                <Select name="vesselId" label="Vessel" defaultValue={editing?.vesselId ?? selectedInventoryVesselId} options={["", ...vessels.map((item) => item.id)]} required />
                <Field name="storageLocation" label="Bodega / storage location" defaultValue={editing?.storageLocation ?? selectedInventoryBodega} required />
                <Select name="itemType" label="Category" defaultValue={editing?.itemType ?? "Component"} options={["Component", "Hardware", "Consumable", "Oil", "Filter", "Tool", "Kit", "Other"]} />
                <Field name="itemName" label="Item name" defaultValue={editing?.itemName} required />
                <Field name="partNumber" label="Part Number / P/N" defaultValue={editing?.partNumber} />
                <Field name="serialNumber" label="Serial Number / S/N" defaultValue={editing?.serialNumber} />
                <Field name="lotBatch" label="Lot / batch" defaultValue={editing?.lotBatch} />
                <Field name="quantity" label="Quantity" defaultValue={editing?.quantity} required />
                <Field name="unitOfMeasure" label="Unit" defaultValue={editing?.unitOfMeasure ?? "ea"} />
                <Field name="minimumStock" label="Minimum stock" defaultValue={editing?.minimumStock} />
                <Field name="condition" label="Condition" defaultValue={editing?.condition ?? "Serviceable"} />
                <Field name="expirationDate" label="Expiration date" defaultValue={editing?.expirationDate} />
                <Select name="relatedHelicopter" label="Related aircraft" defaultValue={editing?.relatedHelicopter ?? selectedVessel?.assignedHelicopter ?? ""} options={["", ...helicopters.map((item) => item.registration)]} />
                <TextArea name="notes" label="Notes" defaultValue={editing?.notes} />
              </FormShell>
            ) : (
              <FormShell key={`${inventoryMovementPreset}-${selectedInventoryVesselId}-${selectedInventoryBodega}`} onSubmit={saveStockMovement} title="Record Stock Movement">
                <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">
                  {tx("Inventory item")}
                  <select className={inputClass} name="inventoryItemId" required>
                    <option value="">{tx("Select inventory item")}</option>
                    {movementItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.itemName} / {item.partNumber || "No P/N"} / {item.quantity} {item.unitOfMeasure}
                      </option>
                    ))}
                  </select>
                </label>
                <Select name="movementType" label="Movement type" defaultValue={inventoryMovementPreset} options={["Received", "Transferred", "Used", "Installed", "Consumed", "Adjusted"]} />
                <Field name="fromLocation" label="From location" defaultValue={movementDefaults.fromLocation} />
                <Field name="toLocation" label="To location" defaultValue={movementDefaults.toLocation} />
                <Field name="quantity" label="Quantity" required />
                <Field name="date" label="Date" defaultValue={new Date().toISOString().slice(0, 10)} />
                <Field name="relatedMaintenanceEvent" label="Related maintenance event" defaultValue={selectedVessel?.campaign} />
                <TextArea name="notes" label="Notes" />
              </FormShell>
            )}

            <Panel>
              <SectionHeading title="Stock movements" detail="Recent entries, exits, transfers, consumption, and adjustments for selected bodega." />
              <div className="mt-4 grid gap-3">
                {bodegaMovements.slice(0, 6).map((movement) => {
                  const item = inventoryItems.find((record) => record.id === movement.inventoryItemId);
                  return (
                    <div key={movement.id} className="rounded-lg border border-line bg-canvas-muted/45 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{item?.itemName ?? movement.inventoryItemId}</p>
                        <StatusPill tone={movement.movementType === "Received" ? "green" : movement.movementType === "Transferred" ? "blue" : "amber"}>{movement.movementType}</StatusPill>
                      </div>
                      <p className="mt-2 text-sm text-ink-subtle">{movement.quantity} / {movement.fromLocation || "N/A"} -&gt; {movement.toLocation || "N/A"} / {movement.date || "N/A"}</p>
                    </div>
                  );
                })}
                {!bodegaMovements.length ? <EmptyInlineState /> : null}
              </div>
            </Panel>

            <Panel>
              <SectionHeading title="Purchase needs" detail="Suggested purchase quantities from current stock and minimum-stock records." />
              <div className="mt-4 grid gap-3">
                {purchaseNeeds.slice(0, 6).map((need) => (
                  <div key={need.id} className="rounded-lg border border-line bg-canvas-muted/45 p-3">
                    <p className="text-sm font-semibold text-ink">{need.itemName}</p>
                    <p className="mt-1 text-sm text-ink-subtle">{need.partNumber} / {tx("Suggested purchase request")}: {need.quantity} {need.unit}</p>
                  </div>
                ))}
                {!purchaseNeeds.length ? <EmptyInlineState /> : null}
              </div>
            </Panel>
          </div>

          <Panel>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">{tx("Current Inventory")}</h2>
              <p className="mt-1 text-sm text-ink-subtle">
                {selectedVessel ? selectedVessel.name : tx("Select vessel")} / {selectedInventoryBodega || tx("Select bodega")}
              </p>
            </div>
            <button className="hsv-secondary-button" type="button" onClick={exportSelectedInventory}>
              <FileDown className="h-4 w-4" aria-hidden="true" />
              {tx("Export Bodega Inventory PDF")}
            </button>
          </div>
          <InventoryFilterControls
            query={inventorySearchQuery}
            onQueryChange={setInventorySearchQuery}
            category={inventoryCategoryFilter}
            onCategoryChange={setInventoryCategoryFilter}
            categoryOptions={categoryOptions}
            aircraft={inventoryAircraftFilter}
            onAircraftChange={setInventoryAircraftFilter}
            aircraftOptions={aircraftOptions}
            stockStatus={inventoryStockStatusFilter}
            onStockStatusChange={setInventoryStockStatusFilter}
            stockStatusOptions={stockStatusOptions}
            sortKey={sortKey}
            onSortKeyChange={setSortKey}
            sortOptions={[["name", "Item"], ["quantity", "Quantity"], ["status", "Status"]]}
            sortDirection={sortDirection}
            onSortDirectionChange={setSortDirection}
            resultCount={rows.length}
          />
          <Table headers={["Item name", "P/N", "S/N", "Category", "Quantity", "Unit", "Location / Bodega", "Related aircraft", "Status", "Last movement", "Notes", "Actions"]}>
            {rows.map((item) => (
              <tr key={item.id}>
                <Cell>{item.itemName}</Cell>
                <Cell muted>{item.partNumber || "N/A"}</Cell>
                <Cell muted>{item.serialNumber || "N/A"}</Cell>
                <Cell muted>{item.itemType}</Cell>
                <Cell>{item.quantity}</Cell>
                <Cell muted>{item.unitOfMeasure}</Cell>
                <Cell muted>{item.storageLocation || "Unassigned bodega"}</Cell>
                <Cell muted>{item.relatedHelicopter || "Unassigned aircraft"}</Cell>
                <Cell><StatusPill tone={inventoryStatusTone(getLowStockStatus(item))}>{getLowStockStatus(item)}</StatusPill></Cell>
                <Cell muted>{lastInventoryMovementLabel(item.id, store.stockMovements)}</Cell>
                <Cell muted>{item.notes || "N/A"}</Cell>
                <Cell><InlineActions onEdit={() => setEditingInventoryId(item.id)} onArchive={() => archiveRecord("inventoryItems", "id", item.id)} onDelete={() => deleteRecord("inventoryItems", "id", item.id)} /></Cell>
              </tr>
            ))}
            {!rows.length ? <EmptyTableRow colSpan={12} /> : null}
          </Table>
        </Panel>
        </div>
        ) : (
          <Panel>
            <SectionHeading title="Current Inventory" detail="Select a vessel and bodega to load the bodega inventory table, movement history, purchase needs, and PDF export." />
            <div className="mt-5 rounded-lg border border-dashed border-line bg-canvas-muted/45 px-5 py-8 text-center text-sm text-ink-subtle">
              {tx("Select a vessel and bodega to view current inventory.")}
            </div>
          </Panel>
        )}
      </div>
    );
  }

  function renderPurchasing() {
    const editing = purchaseRequests.find((item) => item.id === editingPurchaseId);
    const rows = prepareCrudRows(purchaseRequests, {
      query: listQuery,
      filter: listFilter,
      sortKey,
      sortDirection,
      searchable: (request) => [request.supplier, request.itemName, request.partNumber, request.status, request.relatedHelicopter, request.relatedCampaign],
      filterValue: (request) => [request.status, request.source ?? "Demo"],
      sortValue: (request, key) => key === "cost" ? request.unitCost : key === "status" ? request.status : request.itemName
    });
    return (
      <div className="grid gap-5 2xl:grid-cols-[0.85fr_1.15fr]">
        <FormShell key={editing?.id ?? "new-purchase-request"} onSubmit={savePurchase} title={editing ? "Edit Purchase Request" : "Create Purchase Request"}>
          <Field name="supplier" label="Supplier" defaultValue={editing?.supplier} required />
          <Field name="itemName" label="Item name" defaultValue={editing?.itemName} required />
          <Field name="partNumber" label="Part number" defaultValue={editing?.partNumber} />
          <Field name="quantity" label="Quantity" defaultValue={editing?.quantity} required />
          <Field name="unitCost" label="Unit cost" defaultValue={editing?.unitCost} required />
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
          <ListControls
            query={listQuery}
            onQueryChange={setListQuery}
            filter={listFilter}
            onFilterChange={setListFilter}
            filters={["All", "Requested", "Quoted", "Approved", "Ordered", "Received", "Shipped to vessel", "Stored", "Installed", "Consumed", "Closed", "User", "Demo"]}
            sortKey={sortKey}
            onSortKeyChange={setSortKey}
            sortOptions={[["name", "Item"], ["cost", "Cost"], ["status", "Status"]]}
            sortDirection={sortDirection}
            onSortDirectionChange={setSortDirection}
            resultCount={rows.length}
          />
          <Table headers={["Supplier", "Item", "Qty", "Cost", "Status", "Actions"]}>
            {rows.map((request) => (
              <tr key={request.id}>
                <Cell>{request.supplier}</Cell>
                <Cell muted>{request.itemName}</Cell>
                <Cell>{request.quantity}</Cell>
                <Cell>{request.currency} {request.unitCost.toFixed(2)}</Cell>
                <Cell><StatusPill tone={purchaseStatusTone(request.status)}>{request.status}</StatusPill></Cell>
                <Cell><InlineActions onEdit={() => setEditingPurchaseId(request.id)} onArchive={() => archiveRecord("purchaseRequests", "id", request.id)} onDelete={() => deleteRecord("purchaseRequests", "id", request.id)} /></Cell>
              </tr>
            ))}
            {!rows.length ? <EmptyTableRow colSpan={6} /> : null}
          </Table>
        </Panel>
      </div>
    );
  }

  function renderAlerts() {
    const alerts = prepareCrudRows(store.maintenanceAlerts, {
      query: listQuery,
      filter: listFilter,
      sortKey,
      sortDirection,
      searchable: (alert) => [alert.helicopterRegistration, alert.componentName, alert.description, alert.severity, alert.alertType, alert.source],
      filterValue: (alert) => [alert.severity, alert.status, alert.source ?? "Demo"],
      sortValue: (alert, key) => key === "severity" ? alert.severity : alert.componentName
    });
    return (
      <Panel>
        <h2 className="mb-4 text-lg font-semibold text-ink">Maintenance Alerts</h2>
        <ListControls
          query={listQuery}
          onQueryChange={setListQuery}
          filter={listFilter}
          onFilterChange={setListFilter}
          filters={["All", "Monitor", "Critical", "Grounding", "Open", "Resolved", "User", "Demo"]}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          sortOptions={[["name", "Component"], ["severity", "Severity"]]}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          resultCount={alerts.length}
        />
        <div className="grid gap-3">
          {alerts.map((alert) => (
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
          {!alerts.length ? <EmptyInlineState /> : null}
        </div>
      </Panel>
    );
  }

  function renderForecast() {
    const rows = prepareCrudRows(getForecastComponents(components), {
      query: listQuery,
      filter: listFilter,
      sortKey,
      sortDirection,
      searchable: (component) => [component.helicopterRegistration, component.componentName, component.status, component.category],
      filterValue: (component) => [component.status, component.source ?? "Demo", component.helicopterRegistration],
      sortValue: (component, key) => key === "remaining" ? component.remainingHours : component.componentName
    });
    return (
      <Panel>
        <h2 className="text-lg font-semibold text-ink">Maintenance Forecast</h2>
        <p className="mt-2 text-sm text-ink-subtle">0.2 keeps forecast display local. Backend forecasting remains deferred.</p>
        <ListControls
          query={listQuery}
          onQueryChange={setListQuery}
          filter={listFilter}
          onFilterChange={setListFilter}
          filters={["All", "Monitor", "Critical", "Expired", "User", "Demo", ...helicopters.map((item) => item.registration)]}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          sortOptions={[["name", "Component"], ["remaining", "Remaining"]]}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          resultCount={rows.length}
        />
        <div className="mt-5 grid gap-3">
          {rows.map((component) => (
              <div key={component.id} className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                <p className="text-sm font-semibold text-ink">{component.helicopterRegistration} / {component.componentName}</p>
                <p className="mt-2 text-sm text-ink-subtle">{component.remainingHours.toFixed(1)} hours and {component.remainingCalendarDays} calendar days remaining.</p>
              </div>
            ))}
          {!rows.length ? <EmptyInlineState /> : null}
        </div>
      </Panel>
    );
  }
}

function getHeader(view: FleetOSClientProps["view"], mode: string) {
  const common = { status: "HSV OS 0.3 / localStorage" };
  if (view === "dashboard") return { eyebrow: "HSV OS 0.3 Operations", title: "Operations Command Center", description: "Executive visibility for fleet health, readiness, critical alerts, campaigns, inventory risk, and AURA recommendations.", icon: Gauge, ...common };
  if (view.includes("helicopter")) return { eyebrow: "Aircraft", title: mode === "edit" ? "Edit aircraft record." : view === "helicopter-form" ? "Create aircraft record." : "Executive aircraft profile.", description: "Registration, mission readiness, component exposure, records, compliance, and history in one operational profile.", icon: Plane, ...common };
  if (view.includes("vessel")) return { eyebrow: "Vessel CRUD", title: mode === "edit" ? "Edit vessel record." : view === "vessel-form" ? "Create vessel record." : "Manage vessel records and helicopter assignments.", description: "Assign helicopters to vessels using local mock state only.", icon: Anchor, ...common };
  if (view.includes("component")) return { eyebrow: "Component CRUD", title: mode === "edit" ? "Edit component record." : view === "component-form" ? "Create component record." : "Manage controlled component records.", description: "Component remaining life and status are calculated in the frontend MVP.", icon: Wrench, ...common };
  if (view.includes("flight")) return { eyebrow: "Flight Hour Logging", title: "Register flight hours and update local component life.", description: "Saving a flight log updates hourmeter, deducts component hours, recalculates status, and creates alerts locally.", icon: ClipboardList, ...common };
  if (view === "crew-portal") return { eyebrow: "Maintenance Crew Portal", title: "Restricted-style maintenance workspace simulation.", description: "Maintenance Chief View focuses on flight hours, maintenance logs, component changes, evidence placeholders, alerts, and aircraft status.", icon: UserRoundCog, ...common };
  if (view === "inventory") return { eyebrow: "Vessel Inventory", title: "Track vessel stock, bodegas, movements, and maintenance usage.", description: "Inventory balances are local and demo-only, with low-stock detection and movement history.", icon: Boxes, ...common };
  if (view === "purchasing") return { eyebrow: "Purchasing", title: "Track operational purchase requests without accounting.", description: "Purchasing status and attachments are local placeholders. Full accounting is deferred.", icon: ShoppingCart, ...common };
  if (view === "alerts") return { eyebrow: "Maintenance Alerts", title: "Review generated maintenance alerts.", description: "Alerts come from demo seed data and local component recalculation.", icon: AlertTriangle, ...common };
  return { eyebrow: "Forecast", title: "Local maintenance exposure preview.", description: "Backend forecasting is deferred to a later version.", icon: Gauge, ...common };
}

function prepareCrudRows<T>(rows: T[], config: {
  query: string;
  filter: string;
  sortKey: string;
  sortDirection: "asc" | "desc";
  searchable: (row: T) => Array<string | number | undefined>;
  filterValue: (row: T) => Array<string | number | undefined>;
  sortValue: (row: T, key: string) => string | number | undefined;
}) {
  return prepareStableCrudRows(rows, config);
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function inventoryBodegaName(item: InventoryItem) {
  return item.storageLocation || "Unassigned bodega";
}

function matchesInventorySearch(item: InventoryItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [item.itemName, item.partNumber, item.serialNumber]
    .some((value) => String(value ?? "").toLowerCase().includes(needle));
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function inventoryStatusTone(status: string): "green" | "amber" | "red" | "blue" | "neutral" {
  if (status === "OK") return "green";
  if (status === "Out of stock" || status === "Expired") return "red";
  if (status === "Low stock" || status === "Expiring soon") return "amber";
  return "neutral";
}

function lastInventoryMovementLabel(itemId: string, movements: StockMovement[]) {
  const movement = movements
    .filter((record) => record.inventoryItemId === itemId)
    .sort((left, right) => (right.date || "").localeCompare(left.date || ""))[0];
  if (!movement) return "No movements";
  return `${movement.date || "N/A"} / ${movement.movementType}`;
}

function getInventoryMovementDefaults(type: StockMovement["movementType"], bodega: string, aircraft?: string) {
  if (type === "Received") return { fromLocation: "Supplier / main warehouse", toLocation: bodega };
  if (type === "Transferred") return { fromLocation: bodega, toLocation: "" };
  if (type === "Installed") return { fromLocation: bodega, toLocation: aircraft ? `${aircraft} installation` : "Aircraft installation" };
  if (type === "Consumed" || type === "Used") return { fromLocation: bodega, toLocation: "Maintenance event" };
  return { fromLocation: bodega, toLocation: "Inventory adjustment" };
}

function buildInventoryAuraFindings(selectedItems: InventoryItem[], allItems: InventoryItem[]) {
  const duplicateKeys = new Map<string, number>();
  selectedItems.forEach((item) => {
    const key = [item.vesselId, item.storageLocation, item.itemName, item.partNumber, item.serialNumber].join("|").toLowerCase();
    duplicateKeys.set(key, (duplicateKeys.get(key) ?? 0) + 1);
  });
  const lowStock = selectedItems.filter((item) => getLowStockStatus(item) !== "OK");
  const duplicates = selectedItems.filter((item) =>
    (duplicateKeys.get([item.vesselId, item.storageLocation, item.itemName, item.partNumber, item.serialNumber].join("|").toLowerCase()) ?? 0) > 1
  );
  const missingPartNumbers = selectedItems.filter((item) => !item.partNumber.trim());
  const serializedTypes: InventoryItem["itemType"][] = ["Component", "Tool", "Kit"];
  const missingSerials = selectedItems.filter((item) => serializedTypes.includes(item.itemType) && !item.serialNumber?.trim());
  const quantityMismatch = selectedItems.filter((item) => item.minimumStock > 0 && item.quantity < item.minimumStock);
  const criticalSpares = selectedItems.filter((item) => ["Component", "Kit"].includes(item.itemType));
  const globalCriticalSpares = allItems.filter((item) => !item.archived && ["Component", "Kit"].includes(item.itemType));
  const findings: Array<{
    title: string;
    detail: string;
    action: string;
    priority: string;
    count: string;
    tone: "green" | "amber" | "blue" | "red" | "neutral";
  }> = [];

  if (!criticalSpares.length && globalCriticalSpares.length) {
    findings.push({
      title: "Missing critical items",
      detail: "No component or kit records are visible in the selected bodega while critical spares exist elsewhere in local inventory.",
      action: "Review whether critical spares should be transferred to this bodega before campaign dispatch.",
      priority: "Medium",
      count: "0",
      tone: "amber"
    });
  }
  if (lowStock.length) findings.push({
    title: "Low stock items",
    detail: "One or more items are at low, expired, expiring, or out-of-stock status based on local quantity and expiration data.",
    action: "Review stock movements and prepare purchase requests for affected items.",
    priority: lowStock.some((item) => getLowStockStatus(item) === "Out of stock" || getLowStockStatus(item) === "Expired") ? "High" : "Medium",
    count: String(lowStock.length),
    tone: lowStock.some((item) => getLowStockStatus(item) === "Out of stock" || getLowStockStatus(item) === "Expired") ? "red" : "amber"
  });
  if (duplicates.length) findings.push({
    title: "Duplicate items",
    detail: "Possible duplicate inventory records share vessel, bodega, item, P/N, and S/N identity.",
    action: "Review duplicate records before exporting reports or creating purchase requests.",
    priority: "Medium",
    count: String(duplicates.length),
    tone: "amber"
  });
  if (missingPartNumbers.length) findings.push({
    title: "Items without P/N",
    detail: "Some records do not include a part number, which limits purchasing and traceability.",
    action: "Add P/N values from invoices, tags, certificates, or approved inventory records.",
    priority: "Medium",
    count: String(missingPartNumbers.length),
    tone: "amber"
  });
  if (missingSerials.length) findings.push({
    title: "Items without S/N where serial should exist",
    detail: "Serialized item categories such as components, tools, and kits should normally carry serial numbers when applicable.",
    action: "Confirm whether each item is serialized and add S/N when available.",
    priority: "Medium",
    count: String(missingSerials.length),
    tone: "amber"
  });
  if (quantityMismatch.length) findings.push({
    title: "Items with quantity mismatch",
    detail: "Current quantity is below minimum stock for one or more items in this bodega.",
    action: "Reconcile physical count and create suggested purchase requests for the shortage.",
    priority: "High",
    count: String(quantityMismatch.length),
    tone: "red"
  });
  if (quantityMismatch.length || lowStock.length) findings.push({
    title: "Suggested purchase requests",
    detail: "AURA can identify purchase needs from bodega quantity and minimum-stock records.",
    action: "Use the purchase needs panel to draft operational purchasing requests.",
    priority: "Medium",
    count: String(new Set([...quantityMismatch, ...lowStock].map((item) => item.id)).size),
    tone: "blue"
  });

  return findings.slice(0, 6);
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "green" | "amber" | "blue" | "teal" | "red" | "neutral" }) {
  const { tx } = useI18n();
  return (
    <Panel className="transition duration-150 hover:-translate-y-0.5 hover:border-aviation-blue/25">
      <StatusPill tone={tone}>{tx(label)}</StatusPill>
      <p className="hsv-technical-value mt-4 text-3xl font-semibold leading-none text-ink">{value}</p>
      <p className="mt-3 text-sm leading-6 text-ink-subtle">{tx(detail)}</p>
    </Panel>
  );
}

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  const { tx } = useI18n();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-ink">{tx(title)}</h2>
        <p className="mt-1 text-sm leading-6 text-ink-subtle">{tx(detail)}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const { tx } = useI18n();
  return (
    <div className="rounded-lg border border-line bg-white/75 px-3 py-3 shadow-control dark:bg-canvas-muted/70">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">{tx(label)}</p>
      <p className="hsv-technical-value mt-1 truncate text-sm font-semibold text-ink">{tx(value)}</p>
    </div>
  );
}

function ProfileField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const { tx } = useI18n();
  return (
    <div className="rounded-lg border border-line bg-canvas-muted/45 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">{tx(label)}</p>
      <p className={[mono ? "hsv-technical-value" : "", "mt-1 truncate text-sm font-semibold text-ink"].join(" ")}>{value}</p>
    </div>
  );
}

function ExecutiveSummaryCard({ title, value, status, detail, tone }: { title: string; value: string; status: string; detail: string; tone: "green" | "amber" | "blue" | "red" }) {
  const { tx } = useI18n();
  return (
    <article className="rounded-xl border border-line bg-canvas-muted/45 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{tx(title)}</p>
        <StatusPill tone={tone}>{tx(status)}</StatusPill>
      </div>
      <p className="hsv-technical-value mt-4 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-ink-subtle">{tx(detail)}</p>
    </article>
  );
}

function AuraExecutiveCard({ priority, subject, recommendation, evidence, operationalImpact, financialImpact, recommendedAction, confidence }: AuraRecommendation) {
  const { tx } = useI18n();
  const tone = priority === "Critical" ? "red" : priority === "High" || priority === "Medium" ? "amber" : "blue";
  return (
    <article className="rounded-xl border border-line bg-white p-4 shadow-control dark:bg-canvas-muted/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <StatusPill tone={tone}>{priority}</StatusPill>
          <h3 className="mt-3 text-sm font-semibold text-ink">{tx(subject)}</h3>
          <p className="mt-1 text-sm text-ink-subtle">{tx(recommendation)}</p>
        </div>
        <StatusPill tone="neutral">{confidence}%</StatusPill>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <RecommendationLine label="Evidence" value={evidence.slice(0, 2).join(" / ")} />
        <RecommendationLine label="Action" value={recommendedAction} />
        <RecommendationLine label="Impact" value={`${operationalImpact} / ${financialImpact}`} />
      </div>
    </article>
  );
}

function RecommendationLine({ label, value }: { label: string; value: string }) {
  const { tx } = useI18n();
  return (
    <div className="grid gap-1 rounded-lg border border-line bg-canvas-muted/38 px-3 py-2 text-sm sm:grid-cols-[150px_1fr]">
      <span className="font-semibold text-ink">{tx(label)}</span>
      <span className="text-ink-subtle">{tx(value)}</span>
    </div>
  );
}

function ListHeader({ title, href, action }: { title: string; href: string; action: string }) {
  const { tx } = useI18n();
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-semibold text-ink">{tx(title)}</h2>
      <Link className="hsv-primary-button w-full sm:w-auto" href={href}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {tx(action)}
      </Link>
    </div>
  );
}

function ListControls({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  filters,
  sortKey,
  onSortKeyChange,
  sortOptions,
  sortDirection,
  onSortDirectionChange,
  resultCount
}: {
  query: string;
  onQueryChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  filters: string[];
  sortKey: string;
  onSortKeyChange: (value: string) => void;
  sortOptions: Array<[string, string]>;
  sortDirection: "asc" | "desc";
  onSortDirectionChange: (value: "asc" | "desc") => void;
  resultCount: number;
}) {
  const { tx } = useI18n();
  return (
    <div className="mb-4 grid gap-3 rounded-lg border border-line bg-canvas-muted/44 p-3 shadow-control lg:grid-cols-[minmax(220px,1fr)_180px_180px_136px_auto] lg:items-end">
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {tx("Search")}
        <input
          className={inputClass}
          placeholder={tx("Search records")}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {tx("Filter")}
        <select className={inputClass} value={filter} onChange={(event) => onFilterChange(event.target.value)}>
          {[...new Set(filters)].map((option) => <option key={option} value={option}>{tx(option)}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {tx("Sort")}
        <select className={inputClass} value={sortKey} onChange={(event) => onSortKeyChange(event.target.value)}>
          {sortOptions.map(([value, label]) => <option key={value} value={value}>{tx(label)}</option>)}
        </select>
      </label>
      <button
        className="hsv-secondary-button h-11"
        type="button"
        onClick={() => onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc")}
      >
        <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
        {sortDirection === "asc" ? tx("Ascending") : tx("Descending")}
      </button>
      <p className="rounded-md border border-line bg-white px-3 py-2 text-center text-sm font-semibold text-ink-muted shadow-control dark:bg-canvas-muted">{resultCount} {tx("records")}</p>
    </div>
  );
}

function InventoryFilterControls({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  categoryOptions,
  aircraft,
  onAircraftChange,
  aircraftOptions,
  stockStatus,
  onStockStatusChange,
  stockStatusOptions,
  sortKey,
  onSortKeyChange,
  sortOptions,
  sortDirection,
  onSortDirectionChange,
  resultCount
}: {
  query: string;
  onQueryChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categoryOptions: string[];
  aircraft: string;
  onAircraftChange: (value: string) => void;
  aircraftOptions: string[];
  stockStatus: string;
  onStockStatusChange: (value: string) => void;
  stockStatusOptions: string[];
  sortKey: string;
  onSortKeyChange: (value: string) => void;
  sortOptions: Array<[string, string]>;
  sortDirection: "asc" | "desc";
  onSortDirectionChange: (value: "asc" | "desc") => void;
  resultCount: number;
}) {
  const { tx } = useI18n();
  return (
    <div className="mb-4 grid gap-3 rounded-lg border border-line bg-canvas-muted/44 p-3 shadow-control xl:grid-cols-[minmax(220px,1.25fr)_150px_170px_160px_145px_136px_auto] xl:items-end">
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {tx("Search item, P/N, or S/N")}
        <input
          className={inputClass}
          placeholder={tx("Search by item name, P/N, S/N")}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {tx("Category")}
        <select className={inputClass} value={category} onChange={(event) => onCategoryChange(event.target.value)}>
          {[...new Set(categoryOptions)].map((option) => <option key={option} value={option}>{tx(option)}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {tx("Related aircraft")}
        <select className={inputClass} value={aircraft} onChange={(event) => onAircraftChange(event.target.value)}>
          {[...new Set(aircraftOptions)].map((option) => <option key={option} value={option}>{tx(option)}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {tx("Stock status")}
        <select className={inputClass} value={stockStatus} onChange={(event) => onStockStatusChange(event.target.value)}>
          {[...new Set(stockStatusOptions)].map((option) => <option key={option} value={option}>{tx(option)}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {tx("Sort")}
        <select className={inputClass} value={sortKey} onChange={(event) => onSortKeyChange(event.target.value)}>
          {sortOptions.map(([value, label]) => <option key={value} value={value}>{tx(label)}</option>)}
        </select>
      </label>
      <button
        className="hsv-secondary-button h-11"
        type="button"
        onClick={() => onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc")}
      >
        <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
        {sortDirection === "asc" ? tx("Ascending") : tx("Descending")}
      </button>
      <p className="rounded-md border border-line bg-white px-3 py-2 text-center text-sm font-semibold text-ink-muted shadow-control dark:bg-canvas-muted">{resultCount} {tx("records")}</p>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  const { tx } = useI18n();
  return (
    <div className="hsv-table-wrap">
      <table className="hsv-table min-w-[920px]">
        <thead className="hsv-table-head">
          <tr>{headers.map((header) => <th key={header} className="hsv-table-th">{tx(header)}</th>)}</tr>
        </thead>
        <tbody className="hsv-table-body">{children}</tbody>
      </table>
    </div>
  );
}

function Cell({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <td className={["hsv-table-cell", muted ? "text-ink-muted" : "font-medium text-ink"].join(" ")}>{children}</td>;
}

function Actions({ edit, onArchive, onDelete }: { edit: string; onArchive: () => void; onDelete: () => void }) {
  const { tx } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link className="hsv-ghost-button text-aviation-teal" href={edit}><Pencil className="h-4 w-4" aria-hidden="true" />{tx("Edit")}</Link>
      <button className="hsv-ghost-button" onClick={onArchive} type="button"><Archive className="h-4 w-4" aria-hidden="true" />{tx("Archive")}</button>
      <button className="hsv-danger-button" onClick={onDelete} type="button"><Trash2 className="h-4 w-4" aria-hidden="true" />{tx("Delete")}</button>
    </div>
  );
}

function InlineActions({ onEdit, onArchive, onDelete }: { onEdit: () => void; onArchive: () => void; onDelete: () => void }) {
  const { tx } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5">
      <button className="hsv-ghost-button text-aviation-teal" onClick={onEdit} type="button"><Pencil className="h-4 w-4" aria-hidden="true" />{tx("Edit")}</button>
      <button className="hsv-ghost-button" onClick={onArchive} type="button"><Archive className="h-4 w-4" aria-hidden="true" />{tx("Archive")}</button>
      <button className="hsv-danger-button" onClick={onDelete} type="button"><Trash2 className="h-4 w-4" aria-hidden="true" />{tx("Delete")}</button>
    </div>
  );
}

function FormShell({ children, onSubmit, title }: { children: React.ReactNode; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; title?: string }) {
  const { tx } = useI18n();
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return (
    <Panel>
      {title ? <h2 className="mb-5 text-lg font-semibold text-ink">{tx(title)}</h2> : null}
      <form
        onChange={() => setDirty(true)}
        onSubmit={(event) => {
          if (!event.currentTarget.checkValidity()) return;
          setDirty(false);
          onSubmit(event);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-subtle">{tx(dirty ? "Unsaved changes" : "Frontend-only localStorage save. No backend or database is connected.")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="hsv-secondary-button"
              type="reset"
              disabled={!dirty}
              onClick={(event) => {
                if (!window.confirm(tx("Discard unsaved changes?"))) event.preventDefault();
                else setDirty(false);
              }}
            >
              {tx("Discard")}
            </button>
            <button className="hsv-primary-button" type="submit">
              {tx("Save locally")}
            </button>
          </div>
        </div>
      </form>
    </Panel>
  );
}

function Field({ name, label, defaultValue, required = false }: { name: string; label: string; defaultValue?: string | number; required?: boolean }) {
  const { tx } = useI18n();
  const inputType = name.toLowerCase().includes("date") ? "date" : ["hour", "hours", "quantity", "stock", "cost", "tons"].some((token) => name.toLowerCase().includes(token)) ? "number" : "text";
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {tx(label)}
      <input className={inputClass} name={name} defaultValue={defaultValue ?? ""} type={inputType} required={required} min={inputType === "number" ? 0 : undefined} step={inputType === "number" ? "any" : undefined} />
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

function Select({ name, label, options, defaultValue, required = false }: { name: string; label: string; options: string[]; defaultValue?: string; required?: boolean }) {
  const { tx } = useI18n();
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {tx(label)}
      <select className={inputClass} name={name} defaultValue={defaultValue ?? options[0] ?? ""} required={required}>
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

function EmptyTableRow({ colSpan }: { colSpan: number }) {
  const { tx } = useI18n();
  return (
    <tr>
      <td className="px-4 py-8" colSpan={colSpan}>
        <div className="hsv-empty-state">
          <p className="font-semibold text-ink">{tx("No records match the current search or filter.")}</p>
          <p className="mt-1 text-xs text-ink-subtle">{tx("Adjust search, filters, or create a new local record.")}</p>
        </div>
      </td>
    </tr>
  );
}

function EmptyInlineState() {
  const { tx } = useI18n();
  return (
    <div className="hsv-empty-state">
      <p className="font-semibold text-ink">{tx("No records match the current search or filter.")}</p>
      <p className="mt-1 text-xs text-ink-subtle">{tx("Adjust search, filters, or create a new local record.")}</p>
    </div>
  );
}

function LoadingState() {
  const { tx } = useI18n();
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="hsv-skeleton-line h-3 w-36" />
        <div className="hsv-skeleton-line h-8 w-24" />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="hsv-skeleton-line h-24" />
        <div className="hsv-skeleton-line h-24" />
        <div className="hsv-skeleton-line h-24" />
      </div>
      <div className="mt-4 h-28 animate-pulse rounded-lg border border-line bg-canvas-muted/60" />
      <p className="mt-4 text-sm font-medium text-ink-subtle">{tx("Loading local records...")}</p>
    </Panel>
  );
}
