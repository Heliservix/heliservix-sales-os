"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  CalendarRange,
  ClipboardCheck,
  FileText,
  GitBranch,
  Plane,
  Radar,
  ShieldCheck
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AircraftMigrationCenter } from "@/components/fleet/aircraft-migration-center";
import { PageHeader } from "@/components/fleet/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { useI18n } from "@/components/i18n/i18n-provider";
import { demoDataPolicy } from "@/lib/fleet-data";
import {
  calculateCampaignStatus,
  calculateComplianceStatus,
  calculateDigitalTwinSummary,
  campaignStatusTone,
  complianceStatusTone,
  createComplianceAlert,
  fleetStorageKey,
  generateId,
  generateMaintenanceTimeline,
  initialFleetStore,
  technicalRecordLinkingSummary
} from "@/lib/fleet-ops";
import type {
  Campaign,
  CampaignStatus,
  ComplianceItem,
  ComplianceStatus,
  FleetStore,
  MaintenanceTimelineEvent,
  TechnicalRecord
} from "@/types/fleet";

type OperationsView =
  | "campaigns"
  | "campaign-form"
  | "campaign-detail"
  | "digital-twin-list"
  | "digital-twin-detail"
  | "technical-records"
  | "technical-record-form"
  | "technical-record-detail"
  | "compliance"
  | "compliance-form"
  | "compliance-detail"
  | "compliance-alerts";

type OperationsOSClientProps = {
  view: OperationsView;
  recordId?: string;
  mode?: "create" | "edit";
};

const inputClass =
  "h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted";
const textareaClass =
  "min-h-28 rounded-md border border-line bg-white px-3 py-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted";

const text = (form: FormData, key: string) => String(form.get(key) ?? "");
const active = <T extends { archived?: boolean }>(records: T[]) => records.filter((record) => !record.archived);

export function OperationsOSClient({ view, recordId, mode = "create" }: OperationsOSClientProps) {
  const { tx } = useI18n();
  const [store, setStore] = useState<FleetStore>(() => {
    if (typeof window === "undefined") return initialFleetStore();
    const raw = window.localStorage.getItem(fleetStorageKey);
    return raw ? { ...initialFleetStore(), ...JSON.parse(raw) } : initialFleetStore();
  });
  const [message, setMessage] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [listQuery, setListQuery] = useState("");
  const [listFilter, setListFilter] = useState("All");
  const [sortKey, setSortKey] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(fleetStorageKey, JSON.stringify(store));
  }, [store]);

  const helicopters = useMemo(() => active(store.helicopters), [store.helicopters]);
  const vessels = useMemo(() => active(store.vessels), [store.vessels]);
  const campaigns = useMemo(() => active(store.campaigns), [store.campaigns]);
  const technicalRecords = useMemo(() => active(store.technicalRecords), [store.technicalRecords]);
  const complianceItems = useMemo(() => active(store.complianceItems), [store.complianceItems]);
  const components = useMemo(() => active(store.components), [store.components]);
  const purchaseRequests = useMemo(() => active(store.purchaseRequests), [store.purchaseRequests]);

  function updateStore(updater: (current: FleetStore) => FleetStore, success: string) {
    setStore((current) => updater(current));
    setMessage(success);
  }

  function archiveRecord(collection: "campaigns" | "technicalRecords" | "complianceItems", id: string) {
    if (!window.confirm(tx("Archive this local record? It will be hidden but preserved in localStorage."))) return;
    updateStore(
      (current) => ({
        ...current,
        [collection]: current[collection].map((record) => record.id === id ? { ...record, archived: true } : record)
      }),
      tx("Record archived locally.")
    );
  }

  function deleteRecord(collection: "campaigns" | "technicalRecords" | "complianceItems", id: string) {
    if (!window.confirm(tx("Delete this local record permanently? This cannot be undone."))) return;
    updateStore(
      (current) => ({
        ...current,
        [collection]: current[collection].filter((record) => record.id !== id)
      }),
      tx("Record deleted locally.")
    );
  }

  function saveCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = mode === "edit" && recordId ? recordId : generateId("camp");
    const vesselId = text(form, "vesselId");
    const vessel = vessels.find((item) => item.id === vesselId);
    if (!text(form, "code").trim() || !text(form, "name").trim()) {
      setMessage(tx("Campaign code and name are required."));
      return;
    }
    const record: Campaign = {
      id,
      code: text(form, "code"),
      name: text(form, "name"),
      clientFleetOwner: text(form, "clientFleetOwner"),
      vesselId,
      vesselName: vessel?.name ?? text(form, "vesselName"),
      helicopterRegistration: text(form, "helicopterRegistration"),
      pilot: text(form, "pilot"),
      mechanic: text(form, "mechanic"),
      startDate: text(form, "startDate"),
      endDate: text(form, "endDate"),
      operationArea: text(form, "operationArea"),
      contractReference: text(form, "contractReference"),
      status: calculateCampaignStatus({ ...emptyCampaign(), status: text(form, "status") as CampaignStatus, startDate: text(form, "startDate"), endDate: text(form, "endDate") }),
      notes: text(form, "notes"),
      source: "User"
    };

    updateStore((current) => {
      const previous = current.campaigns.find((item) => item.id === id);
      const nextCampaigns = mode === "edit" ? current.campaigns.map((item) => item.id === id ? record : item) : [...current.campaigns, record];
      const affectedHelicopters = new Set([previous?.helicopterRegistration, record.helicopterRegistration].filter(Boolean));
      return {
        ...current,
        campaigns: nextCampaigns,
        helicopters: current.helicopters.map((helicopter) => {
          if (!affectedHelicopters.has(helicopter.registration)) return helicopter;
          if (helicopter.registration === record.helicopterRegistration) {
            return {
              ...helicopter,
              assignedVessel: record.vesselName,
              status: record.status === "Active" ? "In Campaign" : helicopter.status === "Grounded" ? helicopter.status : "Assigned"
            };
          }
          const remainingActiveAssignment = nextCampaigns.find((campaign) =>
            !campaign.archived &&
            campaign.helicopterRegistration === helicopter.registration &&
            ["Active", "Approved", "Readiness Review", "Planned"].includes(calculateCampaignStatus(campaign))
          );
          return remainingActiveAssignment
            ? { ...helicopter, assignedVessel: remainingActiveAssignment.vesselName }
            : { ...helicopter, assignedVessel: "", status: helicopter.status === "In Campaign" ? "Available" : helicopter.status };
        }),
        vessels: current.vessels.map((item) => {
          if (item.id === record.vesselId) return { ...item, assignedHelicopter: record.helicopterRegistration, campaign: record.name };
          if (previous && item.id === previous.vesselId && previous.vesselId !== record.vesselId) return { ...item, assignedHelicopter: "", campaign: "" };
          return item;
        })
      };
    }, tx("Campaign saved locally and helicopter assignment preview updated."));
  }

  function saveTechnicalRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = mode === "edit" && recordId ? recordId : generateId("tech");
    if (!text(form, "title").trim() || !text(form, "recordDate")) {
      setMessage(tx("Title and date are required."));
      return;
    }
    const record: TechnicalRecord = {
      id,
      recordType: text(form, "recordType") as TechnicalRecord["recordType"],
      relatedHelicopter: text(form, "relatedHelicopter"),
      relatedComponentId: text(form, "relatedComponentId"),
      relatedMaintenanceEvent: text(form, "relatedMaintenanceEvent"),
      relatedCampaignId: text(form, "relatedCampaignId"),
      relatedPurchaseId: text(form, "relatedPurchaseId"),
      title: text(form, "title"),
      recordDate: text(form, "recordDate"),
      documentNumber: text(form, "documentNumber"),
      notes: text(form, "notes"),
      attachmentPlaceholder: text(form, "attachmentPlaceholder"),
      source: "User"
    };

    updateStore((current) => ({
      ...current,
      technicalRecords: mode === "edit" ? current.technicalRecords.map((item) => item.id === id ? record : item) : [...current.technicalRecords, record]
    }), tx("Technical record saved locally."));
  }

  function saveComplianceItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = mode === "edit" && recordId ? recordId : generateId("comp");
    if (!text(form, "referenceNumber").trim() || !text(form, "title").trim()) {
      setMessage(tx("Reference number and title are required."));
      return;
    }
    const item: ComplianceItem = {
      id,
      authority: text(form, "authority") as ComplianceItem["authority"],
      complianceType: text(form, "complianceType") as ComplianceItem["complianceType"],
      referenceNumber: text(form, "referenceNumber"),
      title: text(form, "title"),
      effectiveDate: text(form, "effectiveDate"),
      dueDate: text(form, "dueDate"),
      applicability: text(form, "applicability"),
      relatedHelicopter: text(form, "relatedHelicopter"),
      relatedComponentId: text(form, "relatedComponentId"),
      status: calculateComplianceStatus({ ...emptyComplianceItem(), status: text(form, "status") as ComplianceStatus, dueDate: text(form, "dueDate") }),
      notes: text(form, "notes"),
      attachmentPlaceholder: text(form, "attachmentPlaceholder"),
      source: "User"
    };
    const alert = createComplianceAlert(item);

    updateStore((current) => ({
      ...current,
      complianceItems: mode === "edit" ? current.complianceItems.map((record) => record.id === id ? item : record) : [...current.complianceItems, item],
      complianceAlerts: alert ? [...current.complianceAlerts.filter((record) => record.complianceItemId !== id), alert] : current.complianceAlerts
    }), tx("Compliance item saved locally and alert status recalculated."));
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
        {!isReady ? <LoadingState /> : renderView()}
      </div>
    </AppShell>
  );

  function renderView() {
    if (view === "campaigns") return renderCampaigns();
    if (view === "campaign-form") return renderCampaignForm(recordId);
    if (view === "campaign-detail") return renderCampaignDetail(recordId);
    if (view === "digital-twin-list") return renderDigitalTwinList();
    if (view === "digital-twin-detail") return renderDigitalTwinDetail(recordId);
    if (view === "technical-records") return renderTechnicalRecords();
    if (view === "technical-record-form") return renderTechnicalRecordForm(recordId);
    if (view === "technical-record-detail") return renderTechnicalRecordDetail(recordId);
    if (view === "compliance") return renderCompliance();
    if (view === "compliance-form") return renderComplianceForm(recordId);
    if (view === "compliance-detail") return renderComplianceDetail(recordId);
    return renderComplianceAlerts();
  }

  function renderCampaigns() {
    const activeCampaigns = campaigns.filter((campaign) => calculateCampaignStatus(campaign) === "Active").length;
    const rows = prepareCrudRows(campaigns, {
      query: listQuery,
      filter: listFilter,
      sortKey,
      sortDirection,
      searchable: (campaign) => [campaign.code, campaign.name, campaign.clientFleetOwner, campaign.vesselName, campaign.helicopterRegistration, campaign.status, campaign.source],
      filterValue: (campaign) => [calculateCampaignStatus(campaign), campaign.source ?? "Demo"],
      sortValue: (campaign, key) => key === "status" ? calculateCampaignStatus(campaign) : key === "date" ? campaign.startDate : campaign.name
    });
    return (
      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Campaigns" value={String(campaigns.length)} tone="teal" detail="Local campaign records" />
          <Metric label="Active" value={String(activeCampaigns)} tone="green" detail="Computed from status and dates" />
          <Metric label="Linked Hours" value={campaignFlightHours(campaigns[0]?.id).toFixed(1)} tone="blue" detail="First campaign preview" />
          <Metric label="Data Policy" value={tx("Demo")} tone="amber" detail="Unknown records stay non-operational" />
        </section>
        <Panel>
          <ListHeader title="Campaigns" href="/campaigns/new" action="Create campaign" />
          <ListControls
            query={listQuery}
            onQueryChange={setListQuery}
            filter={listFilter}
            onFilterChange={setListFilter}
            filters={["All", "Draft", "Planned", "Active", "Completed", "Cancelled", "User", "Demo"]}
            sortKey={sortKey}
            onSortKeyChange={setSortKey}
            sortOptions={[["name", "Campaign"], ["date", "Start date"], ["status", "Status"]]}
            sortDirection={sortDirection}
            onSortDirectionChange={setSortDirection}
            resultCount={rows.length}
          />
          <Table headers={["Code", "Campaign", "Client / owner", "Vessel", "Helicopter", "Dates", "Status", "Source", "Actions"]}>
            {rows.map((campaign) => (
              <tr key={campaign.id}>
                <Cell muted>{campaign.code}</Cell>
                <Cell><Link className="font-semibold text-ink hover:text-aviation-teal" href={`/campaigns/${campaign.id}`}>{campaign.name}</Link></Cell>
                <Cell muted>{campaign.clientFleetOwner}</Cell>
                <Cell muted>{campaign.vesselName}</Cell>
                <Cell>{campaign.helicopterRegistration || "Unassigned"}</Cell>
                <Cell muted>{campaign.startDate} to {campaign.endDate}</Cell>
                <Cell><StatusPill tone={campaignStatusTone(calculateCampaignStatus(campaign))}>{calculateCampaignStatus(campaign)}</StatusPill></Cell>
                <Cell><SourcePill source={campaign.source} /></Cell>
                <Cell><Actions edit={`/campaigns/${campaign.id}/edit`} onArchive={() => archiveRecord("campaigns", campaign.id)} onDelete={() => deleteRecord("campaigns", campaign.id)} /></Cell>
              </tr>
            ))}
            {!rows.length ? <EmptyTableRow colSpan={9} /> : null}
          </Table>
        </Panel>
      </div>
    );
  }

  function renderCampaignDetail(id?: string) {
    const campaign = campaigns.find((item) => item.id === id);
    if (!campaign) return <Empty title="Campaign not found" />;
    const flightHours = campaignFlightHours(campaign.id);
    const maintenanceEvents = store.maintenanceLogs.filter((event) => event.helicopterRegistration === campaign.helicopterRegistration);
    const inventoryUsage = store.stockMovements.filter((movement) => movement.notes.includes(campaign.name) || movement.notes.includes(campaign.code));
    const purchases = purchaseRequests.filter((request) => request.relatedCampaign === campaign.name || request.relatedCampaign === campaign.id);
    const linkedRecords = technicalRecordLinkingSummary(store, { campaignId: campaign.id, helicopterRegistration: campaign.helicopterRegistration });
    return (
      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Flight Hours" value={flightHours.toFixed(1)} tone="blue" detail="Linked by campaign name/code" />
          <Metric label="Maintenance Events" value={String(maintenanceEvents.length)} tone="amber" detail="Helicopter-linked local logs" />
          <Metric label="Technical Records" value={String(linkedRecords.length)} tone="teal" detail="Record graph preview" />
          <Metric label="Future Profitability" value={tx("Deferred")} tone="neutral" detail="Finance is future scope" />
        </section>
        <Panel>
          <ListHeader title={`${campaign.code} / ${campaign.name}`} href={`/campaigns/${campaign.id}/edit`} action="Edit campaign" />
          <div className="grid gap-4 md:grid-cols-3">
            <Info label="Assigned helicopter" value={campaign.helicopterRegistration || "Unassigned"} />
            <Info label="Vessel" value={campaign.vesselName} />
            <Info label="Status" value={calculateCampaignStatus(campaign)} />
            <Info label="Pilot" value={campaign.pilot} />
            <Info label="Mechanic" value={campaign.mechanic} />
            <Info label="Contract" value={campaign.contractReference} />
          </div>
          <p className="mt-5 text-sm leading-6 text-ink-subtle">{campaign.notes}</p>
        </Panel>
        <section className="grid gap-5 lg:grid-cols-2">
          <RelatedList title="Maintenance Events" items={maintenanceEvents.map((event) => `${event.date} / ${event.maintenanceType}`)} />
          <RelatedList title="Inventory Usage" items={inventoryUsage.map((movement) => `${movement.date} / ${movement.movementType} / ${movement.quantity}`)} />
          <RelatedList title="Purchases" items={purchases.map((request) => `${request.status} / ${request.itemName}`)} />
          <RelatedList title="Technical Records" items={linkedRecords.map((record) => `${record.recordType} / ${record.title}`)} />
        </section>
      </div>
    );
  }

  function renderCampaignForm(id?: string) {
    const record = campaigns.find((item) => item.id === id);
    return (
      <FormShell onSubmit={saveCampaign}>
        <Field name="code" label="Campaign name / code" defaultValue={record?.code ?? `HSV-CAMP-${new Date().getFullYear()}-`} required />
        <Field name="name" label="Campaign name" defaultValue={record?.name} required />
        <Field name="clientFleetOwner" label="Client or fleet owner" defaultValue={record?.clientFleetOwner} required />
        <Select name="vesselId" label="Vessel" defaultValue={record?.vesselId ?? vessels[0]?.id} options={vessels.map((item) => item.id)} />
        <Select name="helicopterRegistration" label="Helicopter" defaultValue={record?.helicopterRegistration ?? helicopters[0]?.registration} options={["", ...helicopters.map((item) => item.registration)]} />
        <Field name="pilot" label="Pilot" defaultValue={record?.pilot} />
        <Field name="mechanic" label="Mechanic" defaultValue={record?.mechanic} />
        <Field name="startDate" label="Start date" defaultValue={record?.startDate} required />
        <Field name="endDate" label="End date" defaultValue={record?.endDate} />
        <Field name="operationArea" label="Country / operation area" defaultValue={record?.operationArea} />
        <Field name="contractReference" label="Contract reference" defaultValue={record?.contractReference} />
        <Select name="status" label="Status" defaultValue={record?.status ?? "Draft"} options={["Draft", "Planned", "Readiness Review", "Approved", "Active", "Suspended", "Completed", "Cancelled", "Archived"]} />
        <TextArea name="notes" label="Notes" defaultValue={record?.notes} />
      </FormShell>
    );
  }

  function renderDigitalTwinList() {
    return (
      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Aircraft Operations Center" value={String(helicopters.length)} tone="teal" detail="One operational profile per aircraft" />
          <Metric label="Open Compliance" value={String(complianceItems.filter((item) => !["Complied", "Not applicable"].includes(calculateComplianceStatus(item))).length)} tone="amber" detail="Applies to fleet readiness" />
          <Metric label="Timeline Events" value={String(helicopters.reduce((sum, helicopter) => sum + generateMaintenanceTimeline(store, helicopter.registration).length, 0))} tone="blue" detail="Generated from local state" />
        </section>
        <AircraftMigrationCenter store={store} onApply={updateStore} />
        <Panel>
          <h2 className="mb-4 text-lg font-semibold text-ink">{tx("Aircraft Operations Center")}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {helicopters.map((helicopter) => {
              const summary = calculateDigitalTwinSummary(store, helicopter.registration);
              return (
                <Link key={helicopter.registration} className="rounded-lg border border-line bg-canvas-muted/58 p-4 transition hover:border-aviation-teal" href={`/digital-twin/${helicopter.registration}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{helicopter.registration}</p>
                    <StatusPill tone={helicopter.status === "Grounded" ? "red" : helicopter.status === "Maintenance" ? "amber" : "teal"}>{helicopter.status}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm text-ink-subtle">{helicopter.model} / {helicopter.currentHourmeter.toFixed(1)} hrs</p>
                  <p className="mt-3 text-xs font-semibold uppercase text-ink-muted">{summary?.installedComponents ?? 0} components / {summary?.openAlerts ?? 0} open alerts</p>
                </Link>
              );
            })}
          </div>
        </Panel>
      </div>
    );
  }

  function renderDigitalTwinDetail(registration?: string) {
    const summary = registration ? calculateDigitalTwinSummary(store, registration) : undefined;
    if (!summary) return <Empty title="Digital twin not found" />;
    const { helicopter } = summary;
    return (
      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Hourmeter" value={helicopter.currentHourmeter.toFixed(1)} tone="blue" detail="Current local value" />
          <Metric label="Components" value={String(summary.installedComponents)} tone="teal" detail={`${summary.criticalComponents} critical or expired`} />
          <Metric label="Open Alerts" value={String(summary.openAlerts)} tone="amber" detail="Maintenance alert count" />
          <Metric label="Compliance" value={String(summary.complianceOpenCount)} tone={summary.complianceOpenCount ? "red" : "green"} detail="Open compliance items" />
        </section>
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">{helicopter.registration} {tx("Aircraft Operations Center")}</h2>
              <p className="mt-1 text-sm text-ink-subtle">{helicopter.model} / serial {helicopter.serialNumber}</p>
            </div>
            <SourcePill source={helicopter.source} />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Info label="Operational status" value={helicopter.status} />
            <Info label="Assigned vessel" value={summary.assignedVessel?.name ?? helicopter.assignedVessel ?? "Unassigned"} />
            <Info label="Active campaign" value={summary.activeCampaign?.name ?? "None"} />
            <Info label="Flight history" value={`${summary.totalFlightHours.toFixed(1)} linked hours`} />
            <Info label="Campaign history" value={`${summary.campaignCount} campaigns`} />
            <Info label="Technical records" value={`${summary.technicalRecordCount} records`} />
          </div>
        </Panel>
        <AircraftMigrationCenter
          compact
          preselectedRegistration={helicopter.registration}
          store={store}
          onApply={updateStore}
        />
        <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <Panel>
            <h2 className="mb-4 text-lg font-semibold text-ink">Summary</h2>
            <div className="grid gap-3">
              <Info label="Installed component summary" value={`${summary.installedComponents} active components`} />
              <Info label="Forecasted due items" value={`${summary.forecastedDueItems} forecasted events`} />
              <Info label="Technical records summary" value={`${summary.technicalRecordCount} linked records`} />
              <Info label="Compliance status summary" value={summary.complianceOpenCount ? `${summary.complianceOpenCount} open items` : "No open local items"} />
            </div>
          </Panel>
          <TimelinePreview events={summary.timeline} />
        </section>
      </div>
    );
  }

  function renderTechnicalRecords() {
    const rows = prepareCrudRows(technicalRecords, {
      query: listQuery,
      filter: listFilter,
      sortKey,
      sortDirection,
      searchable: (record) => [record.recordType, record.title, record.relatedHelicopter, record.documentNumber, record.recordDate, record.source],
      filterValue: (record) => [record.recordType, record.source ?? "Demo", record.relatedHelicopter],
      sortValue: (record, key) => key === "date" ? record.recordDate : key === "type" ? record.recordType : record.title
    });
    return (
      <Panel>
        <ListHeader title="Technical Records" href="/technical-records/new" action="Create record" />
        <ListControls
          query={listQuery}
          onQueryChange={setListQuery}
          filter={listFilter}
          onFilterChange={setListFilter}
          filters={["All", "8130", "Logbook page", "Work order", "Invoice", "Photo", "Certificate", "Release to service", "Inspection", "Other", "User", "Demo", ...helicopters.map((item) => item.registration)]}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          sortOptions={[["name", "Title"], ["date", "Date"], ["type", "Type"]]}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          resultCount={rows.length}
        />
        <Table headers={["Type", "Title", "Helicopter", "Campaign", "Date", "Document", "Source", "Actions"]}>
          {rows.map((record) => (
            <tr key={record.id}>
              <Cell>{record.recordType}</Cell>
              <Cell><Link className="font-semibold text-ink hover:text-aviation-teal" href={`/technical-records/${record.id}`}>{record.title}</Link></Cell>
              <Cell muted>{record.relatedHelicopter || "None"}</Cell>
              <Cell muted>{campaigns.find((campaign) => campaign.id === record.relatedCampaignId)?.name ?? "None"}</Cell>
              <Cell muted>{record.recordDate}</Cell>
              <Cell muted>{record.documentNumber}</Cell>
              <Cell><SourcePill source={record.source} /></Cell>
              <Cell><Actions edit={`/technical-records/${record.id}/edit`} onArchive={() => archiveRecord("technicalRecords", record.id)} onDelete={() => deleteRecord("technicalRecords", record.id)} /></Cell>
            </tr>
          ))}
          {!rows.length ? <EmptyTableRow colSpan={8} /> : null}
        </Table>
      </Panel>
    );
  }

  function renderTechnicalRecordDetail(id?: string) {
    const record = technicalRecords.find((item) => item.id === id);
    if (!record) return <Empty title="Technical record not found" />;
    return (
      <Panel>
        <ListHeader title={record.title} href={`/technical-records/${record.id}/edit`} action="Edit record" />
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="Record type" value={record.recordType} />
          <Info label="Related helicopter" value={record.relatedHelicopter || "None"} />
          <Info label="Related component" value={components.find((component) => component.id === record.relatedComponentId)?.componentName ?? "None"} />
          <Info label="Related campaign" value={campaigns.find((campaign) => campaign.id === record.relatedCampaignId)?.name ?? "None"} />
          <Info label="Related purchase" value={purchaseRequests.find((purchase) => purchase.id === record.relatedPurchaseId)?.itemName ?? "None"} />
          <Info label="Document number" value={record.documentNumber} />
        </div>
        <p className="mt-5 text-sm leading-6 text-ink-subtle">{record.notes}</p>
        <p className="mt-3 text-sm font-medium text-ink">Attachment placeholder: {record.attachmentPlaceholder || "None"}</p>
      </Panel>
    );
  }

  function renderTechnicalRecordForm(id?: string) {
    const record = technicalRecords.find((item) => item.id === id);
    return (
      <FormShell onSubmit={saveTechnicalRecord}>
        <Select name="recordType" label="Record type" defaultValue={record?.recordType ?? "8130"} options={["8130", "Logbook page", "Work order", "Invoice", "Photo", "Certificate", "Release to service", "Inspection", "Other"]} />
        <Select name="relatedHelicopter" label="Related helicopter" defaultValue={record?.relatedHelicopter ?? ""} options={["", ...helicopters.map((item) => item.registration)]} />
        <Select name="relatedComponentId" label="Related component" defaultValue={record?.relatedComponentId ?? ""} options={["", ...components.map((item) => item.id)]} />
        <Field name="relatedMaintenanceEvent" label="Related maintenance event" defaultValue={record?.relatedMaintenanceEvent} />
        <Select name="relatedCampaignId" label="Related campaign" defaultValue={record?.relatedCampaignId ?? ""} options={["", ...campaigns.map((item) => item.id)]} />
        <Select name="relatedPurchaseId" label="Related purchase" defaultValue={record?.relatedPurchaseId ?? ""} options={["", ...purchaseRequests.map((item) => item.id)]} />
        <Field name="title" label="Title" defaultValue={record?.title} required />
        <Field name="recordDate" label="Date" defaultValue={record?.recordDate ?? new Date().toISOString().slice(0, 10)} required />
        <Field name="documentNumber" label="Document number" defaultValue={record?.documentNumber} />
        <Field name="attachmentPlaceholder" label="Attachment placeholder" defaultValue={record?.attachmentPlaceholder} />
        <TextArea name="notes" label="Notes" defaultValue={record?.notes} />
      </FormShell>
    );
  }

  function renderCompliance() {
    const rows = prepareCrudRows(complianceItems, {
      query: listQuery,
      filter: listFilter,
      sortKey,
      sortDirection,
      searchable: (item) => [item.authority, item.complianceType, item.referenceNumber, item.title, item.relatedHelicopter, calculateComplianceStatus(item), item.source],
      filterValue: (item) => [item.authority, item.complianceType, calculateComplianceStatus(item), item.source ?? "Demo", item.relatedHelicopter],
      sortValue: (item, key) => key === "due" ? item.dueDate : key === "status" ? calculateComplianceStatus(item) : item.title
    });
    return (
      <Panel>
        <ListHeader title="Compliance Items" href="/compliance/new" action="Create compliance item" />
        <ListControls
          query={listQuery}
          onQueryChange={setListQuery}
          filter={listFilter}
          onFilterChange={setListFilter}
          filters={["All", "AAC Panama", "DGAC Ecuador", "FAA", "Robinson", "AD", "SB", "Not reviewed", "Applicable", "In progress", "Complied", "Overdue", "User", "Demo", ...helicopters.map((item) => item.registration)]}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          sortOptions={[["name", "Title"], ["due", "Due date"], ["status", "Status"]]}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          resultCount={rows.length}
        />
        <Table headers={["Authority", "Type", "Reference", "Title", "Helicopter", "Due date", "Status", "Source", "Actions"]}>
          {rows.map((item) => (
            <tr key={item.id}>
              <Cell>{item.authority}</Cell>
              <Cell muted>{item.complianceType}</Cell>
              <Cell muted>{item.referenceNumber}</Cell>
              <Cell><Link className="font-semibold text-ink hover:text-aviation-teal" href={`/compliance/${item.id}`}>{item.title}</Link></Cell>
              <Cell muted>{item.relatedHelicopter || "Fleet"}</Cell>
              <Cell muted>{item.dueDate}</Cell>
              <Cell><StatusPill tone={complianceStatusTone(calculateComplianceStatus(item))}>{calculateComplianceStatus(item)}</StatusPill></Cell>
              <Cell><SourcePill source={item.source} /></Cell>
              <Cell><Actions edit={`/compliance/${item.id}/edit`} onArchive={() => archiveRecord("complianceItems", item.id)} onDelete={() => deleteRecord("complianceItems", item.id)} /></Cell>
            </tr>
          ))}
          {!rows.length ? <EmptyTableRow colSpan={9} /> : null}
        </Table>
      </Panel>
    );
  }

  function renderComplianceDetail(id?: string) {
    const item = complianceItems.find((record) => record.id === id);
    if (!item) return <Empty title="Compliance item not found" />;
    return (
      <Panel>
        <ListHeader title={`${item.complianceType} / ${item.referenceNumber}`} href={`/compliance/${item.id}/edit`} action="Edit item" />
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="Authority/source" value={item.authority} />
          <Info label="Status" value={calculateComplianceStatus(item)} />
          <Info label="Due date" value={item.dueDate} />
          <Info label="Effective date" value={item.effectiveDate} />
          <Info label="Related helicopter" value={item.relatedHelicopter || "Fleet"} />
          <Info label="Related component" value={components.find((component) => component.id === item.relatedComponentId)?.componentName ?? "None"} />
        </div>
        <p className="mt-5 text-sm leading-6 text-ink-subtle">{item.applicability}</p>
        <p className="mt-3 text-sm leading-6 text-ink-subtle">{item.notes}</p>
        <p className="mt-3 text-sm font-medium text-ink">Attachment placeholder: {item.attachmentPlaceholder || "None"}</p>
      </Panel>
    );
  }

  function renderComplianceForm(id?: string) {
    const item = complianceItems.find((record) => record.id === id);
    return (
      <FormShell onSubmit={saveComplianceItem}>
        <Select name="authority" label="Authority/source" defaultValue={item?.authority ?? "Robinson"} options={["AAC Panama", "DGAC Ecuador", "FAA", "Robinson", "Other"]} />
        <Select name="complianceType" label="Type" defaultValue={item?.complianceType ?? "SB"} options={["AD", "SB", "Service Letter", "Manual Revision", "Operational Requirement", "Life Limit"]} />
        <Field name="referenceNumber" label="Reference number" defaultValue={item?.referenceNumber} required />
        <Field name="title" label="Title" defaultValue={item?.title} required />
        <Field name="effectiveDate" label="Effective date" defaultValue={item?.effectiveDate} />
        <Field name="dueDate" label="Due date" defaultValue={item?.dueDate} />
        <Select name="relatedHelicopter" label="Related helicopter" defaultValue={item?.relatedHelicopter ?? ""} options={["", ...helicopters.map((record) => record.registration)]} />
        <Select name="relatedComponentId" label="Related component" defaultValue={item?.relatedComponentId ?? ""} options={["", ...components.map((record) => record.id)]} />
        <Select name="status" label="Status" defaultValue={item?.status ?? "Not reviewed"} options={["Not reviewed", "Applicable", "Not applicable", "In progress", "Complied", "Overdue"]} />
        <Field name="attachmentPlaceholder" label="Attachment placeholder" defaultValue={item?.attachmentPlaceholder} />
        <TextArea name="applicability" label="Applicability" defaultValue={item?.applicability} />
        <TextArea name="notes" label="Notes" defaultValue={item?.notes} />
      </FormShell>
    );
  }

  function renderComplianceAlerts() {
    const alerts = prepareCrudRows(store.complianceAlerts.filter((alert) => alert.status !== "Resolved"), {
      query: listQuery,
      filter: listFilter,
      sortKey,
      sortDirection,
      searchable: (alert) => [alert.relatedHelicopter, alert.description, alert.severity, alert.status, alert.source],
      filterValue: (alert) => [alert.severity, alert.status, alert.source ?? "Demo", alert.relatedHelicopter],
      sortValue: (alert, key) => key === "severity" ? alert.severity : alert.relatedHelicopter
    });
    return (
      <Panel>
        <h2 className="mb-4 text-lg font-semibold text-ink">Compliance Alerts</h2>
        <ListControls
          query={listQuery}
          onQueryChange={setListQuery}
          filter={listFilter}
          onFilterChange={setListFilter}
          filters={["All", "Info", "Monitor", "Critical", "Open", "User", "Demo", ...helicopters.map((item) => item.registration)]}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          sortOptions={[["name", "Aircraft"], ["severity", "Severity"]]}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          resultCount={alerts.length}
        />
        <div className="grid gap-3">
          {alerts.map((alert) => {
            const item = store.complianceItems.find((record) => record.id === alert.complianceItemId);
            return (
              <div key={alert.id} className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={alert.severity === "Critical" ? "red" : alert.severity === "Monitor" ? "amber" : "blue"}>{alert.severity}</StatusPill>
                  <StatusPill tone="neutral">{alert.relatedHelicopter || "Fleet"}</StatusPill>
                  <SourcePill source={alert.source} />
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">{item?.referenceNumber ?? "Compliance alert"} / {item?.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink-subtle">{alert.description}</p>
              </div>
            );
          })}
          {!alerts.length ? <EmptyInlineState /> : null}
        </div>
      </Panel>
    );
  }

  function campaignFlightHours(campaignId?: string) {
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) return 0;
    return store.flightLogs
      .filter((log) => log.campaign === campaign.name || log.campaign === campaign.code || log.helicopterRegistration === campaign.helicopterRegistration)
      .reduce((sum, log) => sum + log.flightHours, 0);
  }
}

function getHeader(view: OperationsView, mode: string) {
  const common = { status: "HSV OS 0.4 / localStorage MVP" };
  if (view.includes("campaign")) return { eyebrow: "Campaigns", title: mode === "edit" ? "Edit campaign." : view === "campaign-form" ? "Create campaign." : "Manage helicopter deployments within tuna-vessel campaigns.", description: "Campaigns connect client, vessel, contract, helicopter, crew, maintenance, inventory, purchasing, records, compliance, and future profitability.", icon: CalendarRange, ...common };
  if (view.includes("digital")) return { eyebrow: "Aircraft Operations Center", title: "Aircraft operational truth profile.", description: "The Aircraft Operations Center summarizes status, components, alerts, campaign history, records, compliance, forecast, and timeline from local state.", icon: GitBranch, ...common };
  if (view.includes("technical")) return { eyebrow: "Technical Records", title: mode === "edit" ? "Edit technical record." : view === "technical-record-form" ? "Create technical record." : "Manage linked aviation evidence.", description: "Records link to helicopters, components, maintenance events, campaigns, purchases, and future compliance proof.", icon: FileText, ...common };
  if (view === "compliance-alerts") return { eyebrow: "Compliance Alerts", title: "Review compliance exposure by aircraft and operation.", description: "Alerts are local decision-support placeholders until backend compliance workflows are implemented.", icon: ShieldCheck, ...common };
  return { eyebrow: "Compliance", title: mode === "edit" ? "Edit compliance item." : view === "compliance-form" ? "Create compliance item." : "Track regulatory and manufacturer requirements.", description: "AAC Panama, DGAC Ecuador, FAA references, Robinson bulletins, manual revisions, and life-limit compliance are modeled as operational readiness inputs.", icon: ShieldCheck, ...common };
}

function emptyCampaign(): Campaign {
  return {
    id: "",
    code: "",
    name: "",
    clientFleetOwner: "",
    vesselId: "",
    vesselName: "",
    helicopterRegistration: "",
    pilot: "",
    mechanic: "",
    startDate: "",
    endDate: "",
    operationArea: "",
    contractReference: "",
    status: "Draft",
    notes: ""
  };
}

function emptyComplianceItem(): ComplianceItem {
  return {
    id: "",
    authority: "Other",
    complianceType: "Operational Requirement",
    referenceNumber: "",
    title: "",
    effectiveDate: "",
    dueDate: "",
    applicability: "",
    status: "Not reviewed",
    notes: "",
    attachmentPlaceholder: ""
  };
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
  const query = config.query.trim().toLowerCase();
  return [...rows]
    .filter((row) => {
      const haystack = config.searchable(row).join(" ").toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesFilter = config.filter === "All" || config.filterValue(row).map(String).includes(config.filter);
      return matchesQuery && matchesFilter;
    })
    .sort((left, right) => {
      const leftValue = config.sortValue(left, config.sortKey) ?? "";
      const rightValue = config.sortValue(right, config.sortKey) ?? "";
      const comparison = typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" });
      return config.sortDirection === "asc" ? comparison : -comparison;
    });
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
  const { tx, t } = useI18n();
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-ink">{tx(title)}</h2>
        <p className="mt-1 text-sm text-ink-subtle">{t("shell.demoPolicy")}</p>
      </div>
      <Link className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-control transition hover:opacity-92 dark:bg-white dark:text-ink" href={href}>
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
    <div className="mb-4 grid gap-3 rounded-lg border border-line bg-canvas-muted/44 p-3 lg:grid-cols-[1fr_180px_180px_120px_auto] lg:items-center">
      <label className="grid gap-1 text-xs font-semibold uppercase text-ink-subtle">
        {tx("Search")}
        <input className={inputClass} placeholder={tx("Search records")} value={query} onChange={(event) => onQueryChange(event.target.value)} />
      </label>
      <label className="grid gap-1 text-xs font-semibold uppercase text-ink-subtle">
        {tx("Filter")}
        <select className={inputClass} value={filter} onChange={(event) => onFilterChange(event.target.value)}>
          {[...new Set(filters)].map((option) => <option key={option} value={option}>{tx(option)}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold uppercase text-ink-subtle">
        {tx("Sort")}
        <select className={inputClass} value={sortKey} onChange={(event) => onSortKeyChange(event.target.value)}>
          {sortOptions.map(([value, label]) => <option key={value} value={value}>{tx(label)}</option>)}
        </select>
      </label>
      <button
        className="h-11 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink shadow-control"
        type="button"
        onClick={() => onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc")}
      >
        {sortDirection === "asc" ? tx("Ascending") : tx("Descending")}
      </button>
      <p className="text-sm font-semibold text-ink-muted">{resultCount} {tx("records")}</p>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  const { tx } = useI18n();
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
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

function Actions({ edit, onArchive, onDelete }: { edit: string; onArchive: () => void; onDelete: () => void }) {
  const { tx } = useI18n();
  return (
    <div className="flex flex-wrap gap-3">
      <Link className="font-semibold text-aviation-teal hover:text-ink" href={edit}>{tx("Edit")}</Link>
      <button className="font-semibold text-aviation-red hover:text-ink" onClick={onArchive} type="button">{tx("Archive")}</button>
      <button className="font-semibold text-ink-muted hover:text-aviation-red" onClick={onDelete} type="button">{tx("Delete")}</button>
    </div>
  );
}

function FormShell({ children, onSubmit }: { children: React.ReactNode; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
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
          <p className="text-sm text-ink-subtle">{tx(dirty ? "Unsaved changes" : "Frontend-only localStorage save. No backend, auth, database, or external service is connected.")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="h-10 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink-muted shadow-control transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
              type="reset"
              disabled={!dirty}
              onClick={(event) => {
                if (!window.confirm(tx("Discard unsaved changes?"))) event.preventDefault();
                else setDirty(false);
              }}
            >
              {tx("Discard")}
            </button>
            <button className="h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-control transition hover:opacity-92 dark:bg-white dark:text-ink" type="submit">
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
  const inputType = name.toLowerCase().includes("date") ? "date" : "text";
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {tx(label)}
      <input className={inputClass} name={name} defaultValue={defaultValue ?? ""} type={inputType} required={required} />
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

function Info({ label, value }: { label: string; value: string }) {
  const { tx } = useI18n();
  return (
    <div className="rounded-lg border border-line bg-canvas-muted/58 p-4">
      <p className="text-xs font-semibold uppercase text-ink-muted">{tx(label)}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value || tx("None")}</p>
    </div>
  );
}

function SourcePill({ source }: { source?: "Demo" | "User" }) {
  return <StatusPill tone={source === "User" ? "green" : "amber"}>{source ?? "Demo"}</StatusPill>;
}

function RelatedList({ title, items }: { title: string; items: string[] }) {
  const { tx } = useI18n();
  return (
    <Panel>
      <h2 className="mb-4 text-lg font-semibold text-ink">{tx(title)}</h2>
      {items.length ? (
        <div className="grid gap-2">
          {items.map((item) => <p key={item} className="rounded-lg border border-line bg-canvas-muted/58 px-3 py-2 text-sm text-ink-subtle">{item}</p>)}
        </div>
      ) : <p className="text-sm text-ink-subtle">{tx("No local records linked yet.")}</p>}
    </Panel>
  );
}

function TimelinePreview({ events }: { events: MaintenanceTimelineEvent[] }) {
  const { tx } = useI18n();
  return (
    <Panel>
      <h2 className="mb-4 text-lg font-semibold text-ink">{tx("Maintenance Timeline Preview")}</h2>
      <div className="grid gap-3">
        {events.slice(0, 8).map((event) => (
          <div key={event.id} className="rounded-lg border border-line bg-canvas-muted/58 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={event.severity === "Critical" ? "red" : event.severity === "Monitor" ? "amber" : "blue"}>{event.eventType}</StatusPill>
              {event.forecasted ? <StatusPill tone="neutral">Forecasted</StatusPill> : null}
              <SourcePill source={event.source} />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink">{event.eventDate} / {event.title}</p>
            <p className="mt-2 text-sm leading-6 text-ink-subtle">{event.description}</p>
          </div>
        ))}
      </div>
    </Panel>
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
      <td className="px-4 py-8 text-center text-sm text-ink-subtle" colSpan={colSpan}>
        {tx("No records match the current search or filter.")}
      </td>
    </tr>
  );
}

function EmptyInlineState() {
  const { tx } = useI18n();
  return <p className="rounded-lg border border-dashed border-line bg-canvas-muted/44 px-4 py-6 text-center text-sm text-ink-subtle">{tx("No records match the current search or filter.")}</p>;
}

function LoadingState() {
  const { tx } = useI18n();
  return (
    <Panel>
      <div className="h-3 w-36 animate-pulse rounded bg-canvas-muted" />
      <div className="mt-4 h-20 animate-pulse rounded-lg bg-canvas-muted/70" />
      <p className="mt-4 text-sm text-ink-subtle">{tx("Loading local records...")}</p>
    </Panel>
  );
}
