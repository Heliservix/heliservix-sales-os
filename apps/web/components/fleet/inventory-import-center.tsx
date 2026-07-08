"use client";

import { useMemo, useRef, useState } from "react";
import { FileDown, FileSpreadsheet, PackageCheck, ShieldCheck, Upload } from "lucide-react";
import { useI18n } from "@/components/i18n/i18n-provider";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  applyInventoryImport,
  buildInventoryImportPreview,
  exportInventoryPdfDocument,
  type InventoryImportAction,
  type InventoryImportOptions,
  type InventoryImportPreview,
  type WorkbookSheet
} from "@/lib/inventory-report-import";
import type { FleetStore } from "@/types/fleet";

type InventoryImportCenterProps = {
  store: FleetStore;
  onApply: (updater: (current: FleetStore) => FleetStore, success: string) => void;
  context?: {
    vesselId?: string;
    campaignId?: string;
    helicopterRegistration?: string;
  };
  compact?: boolean;
};

export function InventoryImportCenter({ store, onApply, context, compact = false }: InventoryImportCenterProps) {
  const { tx } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<InventoryImportPreview>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<InventoryImportOptions["mode"]>("merge");
  const [importValidRowsOnly, setImportValidRowsOnly] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [applyFlightHours, setApplyFlightHours] = useState(false);
  const [createMaintenanceDraft, setCreateMaintenanceDraft] = useState(true);
  const [createStockMovementDrafts, setCreateStockMovementDrafts] = useState(true);
  const [selectedVesselId, setSelectedVesselId] = useState(context?.vesselId ?? "");
  const [selectedStorageLocation, setSelectedStorageLocation] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState(context?.campaignId ?? "");
  const [selectedHelicopter, setSelectedHelicopter] = useState(context?.helicopterRegistration ?? "");
  const [rowActions, setRowActions] = useState<Record<string, InventoryImportAction>>({});

  const summary = useMemo(() => {
    const records = preview?.records ?? [];
    return {
      items: records.length,
      validRows: records.filter((record) => !record.errors.length).length,
      warnings: records.reduce((sum, record) => sum + record.warnings.length, 0),
      errors: records.reduce((sum, record) => sum + record.errors.length, 0),
      duplicates: records.filter((record) => record.duplicateInWorkbook || record.classification === "Possible duplicate").length,
      matches: records.filter((record) => record.existingItemId).length
    };
  }, [preview]);

  async function parseFile(file?: File) {
    setError("");
    setMessage("");
    if (!file) return;
    setIsOpen(true);
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError(tx("Please upload an .xlsx workbook."));
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
      const sheets: WorkbookSheet[] = workbook.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
          header: 1,
          blankrows: false,
          defval: "",
          raw: true
        })
      }));
      const nextPreview = buildInventoryImportPreview({ fileName: file.name, sheets, store, context });
      setPreview(nextPreview);
      setSelectedVesselId(nextPreview.detected.vesselId || context?.vesselId || store.vessels[0]?.id || "");
      setSelectedStorageLocation(nextPreview.detected.storageLocation || "");
      setSelectedCampaignId(nextPreview.detected.campaignId || context?.campaignId || "");
      setSelectedHelicopter(nextPreview.detected.helicopterRegistration || context?.helicopterRegistration || "");
      setApplyFlightHours(nextPreview.weeklyReport.flightHours > 0);
      setRowActions(Object.fromEntries(nextPreview.records.map((record) => [record.key, record.recommendedAction])));
      setMessage(tx("Workbook parsed. Review inventory and weekly report preview before saving."));
    } catch {
      setError(tx("The workbook could not be parsed. Confirm it is an .xlsx operations or inventory report."));
    }
  }

  function applyImport() {
    if (!preview) return;
    if (!selectedVesselId) {
      setError(tx("Select a vessel before importing inventory."));
      return;
    }
    if (!selectedStorageLocation && preview.records.some((record) => !record.storageLocation)) {
      setError(tx("Select a bodega before importing rows with missing storage location."));
      return;
    }
    onApply(
      (current) => applyInventoryImport(current, preview, {
        vesselId: selectedVesselId,
        storageLocation: selectedStorageLocation,
        campaignId: selectedCampaignId,
        helicopterRegistration: selectedHelicopter,
        mode,
        importValidRowsOnly,
        updateExisting,
        applyFlightHours,
        createMaintenanceDraft,
        createStockMovementDrafts,
        rowActions
      }),
      tx("Inventory and weekly operations report import saved to localStorage.")
    );
    setMessage(tx("Import complete. Inventory, flight hours, maintenance drafts, and stock movements were updated where selected."));
  }

  function exportPdf() {
    exportInventoryPdfDocument({
      items: store.inventoryItems,
      store,
      vesselId: selectedVesselId || context?.vesselId,
      storageLocation: selectedStorageLocation,
      campaignName: store.campaigns.find((campaign) => campaign.id === (selectedCampaignId || context?.campaignId))?.name
    });
  }

  return (
    <Panel>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-lightBlue text-aviation-blue">
            <PackageCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-aviation-blue">{tx("AURA Inventory Import")}</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{tx("Import Inventory from Excel")}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-subtle">
              {tx("Upload an inventory workbook or weekly vessel operations report. AURA previews vessel, aircraft, campaign, flight hours, maintenance notes, and bodega stock before saving.")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => void parseFile(event.target.files?.[0])}
          />
          {!isOpen ? (
            <button className="hsv-secondary-button" type="button" onClick={() => setIsOpen(true)}>
              {tx("Review import workflow")}
            </button>
          ) : null}
          <button className="hsv-primary-button" type="button" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            {tx("Import Inventory from Excel")}
          </button>
          <button className="hsv-secondary-button" type="button" onClick={exportPdf}>
            <FileDown className="h-4 w-4" aria-hidden="true" />
            {tx("Export Inventory PDF")}
          </button>
        </div>
      </div>

      {!isOpen ? (
        <div className="mt-5 rounded-xl border border-brand-blue/20 bg-brand-lightBlue/35 p-4">
          <p className="text-sm leading-6 text-ink-subtle">
            {tx("A maintenance chief can import the whole vessel inventory or weekly operations report here instead of entering stock one item at a time.")}
          </p>
        </div>
      ) : null}

      {message ? <p className="hsv-success-banner mt-4 mb-0">{message}</p> : null}
      {error ? <p className="hsv-error-banner mt-4 mb-0">{error}</p> : null}

      {isOpen ? (
        <div className="mt-5 grid gap-5">
          <section className="rounded-xl border border-dashed border-line bg-canvas-muted/42 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-base font-semibold text-ink">{tx("Import Weekly Operations Report")}</h3>
                <p className="mt-2 text-sm text-ink-subtle">{tx("Expected reference file")}: M02_2026_CARONI_2_REPORTE_SEMANA_6.xlsx</p>
              </div>
              <button className="hsv-primary-button" type="button" onClick={() => inputRef.current?.click()}>
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                {tx("Upload .xlsx")}
              </button>
            </div>
          </section>

          {preview ? (
            <>
              <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <ImportStat label="Vessel detected" value={preview.detected.vesselName || tx("Needs review")} tone={preview.detected.vesselId ? "green" : "amber"} />
                <ImportStat label="Helicopter detected" value={preview.detected.helicopterRegistration || tx("Needs review")} tone={preview.detected.helicopterRegistration ? "green" : "amber"} />
                <ImportStat label="Bodega detected" value={preview.detected.storageLocation || tx("Needs review")} tone={preview.detected.storageLocation ? "green" : "amber"} />
                <ImportStat label="Items detected" value={String(summary.items)} />
                <ImportStat label="Valid rows" value={String(summary.validRows)} tone="green" />
                <ImportStat label="Warnings" value={String(summary.warnings)} tone={summary.warnings ? "amber" : "green"} />
                <ImportStat label="Errors" value={String(summary.errors)} tone={summary.errors ? "red" : "green"} />
                <ImportStat label="Possible duplicates" value={String(summary.duplicates)} tone={summary.duplicates ? "amber" : "green"} />
                <ImportStat label="Existing stock matches" value={String(summary.matches)} tone={summary.matches ? "blue" : "neutral"} />
                <ImportStat label="Flight hours" value={preview.weeklyReport.flightHours ? preview.weeklyReport.flightHours.toFixed(1) : "0.0"} tone={preview.weeklyReport.flightHours ? "amber" : "neutral"} />
              </section>

              <section className="rounded-lg border border-line bg-white/84 p-4 shadow-control dark:bg-canvas-muted/70">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    {tx("Vessel")}
                    <select className="hsv-control h-10" value={selectedVesselId} onChange={(event) => setSelectedVesselId(event.target.value)}>
                      <option value="">{tx("Select vessel")}</option>
                      {store.vessels.map((vessel) => <option key={vessel.id} value={vessel.id}>{vessel.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    {tx("Bodega / storage location")}
                    <input className="hsv-control h-10" value={selectedStorageLocation} onChange={(event) => setSelectedStorageLocation(event.target.value)} placeholder={tx("Select or enter bodega")} />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    {tx("Campaign")}
                    <select className="hsv-control h-10" value={selectedCampaignId} onChange={(event) => setSelectedCampaignId(event.target.value)}>
                      <option value="">{tx("None")}</option>
                      {store.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.code} / {campaign.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    {tx("Helicopter")}
                    <select className="hsv-control h-10" value={selectedHelicopter} onChange={(event) => setSelectedHelicopter(event.target.value)}>
                      <option value="">{tx("None")}</option>
                      {store.helicopters.map((helicopter) => <option key={helicopter.registration} value={helicopter.registration}>{helicopter.registration}</option>)}
                    </select>
                  </label>
                </div>
              </section>

              <section className="rounded-lg border border-brand-blue/20 bg-brand-lightBlue/40 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{tx("AURA Recommendations")}</h3>
                    <div className="mt-3 grid gap-2">
                      {preview.recommendations.map((recommendation) => (
                        <p key={recommendation} className="rounded-md border border-white/80 bg-white/75 px-3 py-2 text-sm text-ink-muted">{tx(recommendation)}</p>
                      ))}
                    </div>
                  </div>
                  <StatusPill tone="blue">{tx("Operational analyst")}</StatusPill>
                </div>
              </section>

              <section className="rounded-lg border border-line bg-white/84 p-4 shadow-control dark:bg-canvas-muted/70">
                <h3 className="text-sm font-semibold text-ink">{tx("Weekly operations preview")}</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MiniStat label="Campaign / faena" value={preview.weeklyReport.campaignName || "N/A"} />
                  <MiniStat label="Week number" value={preview.weeklyReport.weekNumber || "N/A"} />
                  <MiniStat label="Report date" value={preview.weeklyReport.reportDate || "N/A"} />
                  <MiniStat label="Maintenance actions" value={String(preview.weeklyReport.maintenanceActions.length)} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Toggle checked={applyFlightHours} onChange={setApplyFlightHours} label="Confirm flight hours and update aircraft" disabled={!preview.weeklyReport.flightHours} />
                  <Toggle checked={createMaintenanceDraft} onChange={setCreateMaintenanceDraft} label="Create maintenance log draft" disabled={!preview.weeklyReport.maintenanceActions.length} />
                  <Toggle checked={createStockMovementDrafts} onChange={setCreateStockMovementDrafts} label="Create stock movement drafts" disabled={!preview.weeklyReport.inventoryUsage.length} />
                </div>
              </section>

              <section className="rounded-lg border border-line bg-white/84 p-4 shadow-control dark:bg-canvas-muted/70">
                <h3 className="text-sm font-semibold text-ink">{tx("Inventory reconciliation")}</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Toggle checked={importValidRowsOnly} onChange={setImportValidRowsOnly} label="Import valid rows only" />
                  <Toggle checked={updateExisting} onChange={setUpdateExisting} label="Update existing inventory" />
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    {tx("Import mode")}
                    <select className="hsv-control h-10" value={mode} onChange={(event) => setMode(event.target.value as InventoryImportOptions["mode"])}>
                      <option value="merge">{tx("Merge with existing inventory")}</option>
                      <option value="replace-bodega">{tx("Replace inventory for selected bodega")}</option>
                      <option value="skip-duplicates">{tx("Skip duplicates")}</option>
                    </select>
                  </label>
                </div>
                <div className="hsv-table-wrap mt-4">
                  <table className="hsv-table min-w-[1180px]">
                    <thead className="hsv-table-head">
                      <tr>
                        {["Worksheet", "Item", "P/N", "S/N", "Qty", "Bodega", "Classification", "Confidence", "Warnings", "Action"].map((header) => (
                          <th key={header} className="hsv-table-th">{tx(header)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="hsv-table-body">
                      {preview.records.slice(0, compact ? 8 : 32).map((record) => (
                        <tr key={`${record.worksheetName}-${record.rowNumber}-${record.key}`}>
                          <td className="px-4 py-3 text-ink-muted">{record.worksheetName} / {record.rowNumber}</td>
                          <td className="px-4 py-3 font-semibold text-ink">{record.itemName || tx("Missing")}</td>
                          <td className="px-4 py-3 text-ink-muted">{record.partNumber || "N/A"}</td>
                          <td className="px-4 py-3 text-ink-muted">{record.serialNumber || "N/A"}</td>
                          <td className="px-4 py-3 text-ink">{record.quantity} {record.unitOfMeasure}</td>
                          <td className="px-4 py-3 text-ink-muted">{record.storageLocation || selectedStorageLocation || "N/A"}</td>
                          <td className="hsv-table-cell"><StatusPill tone={classificationTone(record.classification)}>{tx(record.classification)}</StatusPill></td>
                          <td className="hsv-table-cell"><StatusPill tone={record.confidence >= 85 ? "green" : record.confidence >= 70 ? "blue" : "amber"}>{record.confidence}%</StatusPill></td>
                          <td className="px-4 py-3 text-ink-muted">{[...record.errors, ...record.warnings].slice(0, 2).map(tx).join(" / ") || tx("None")}</td>
                          <td className="hsv-table-cell">
                            <select className="hsv-control h-10" value={rowActions[record.key] ?? record.recommendedAction} onChange={(event) => setRowActions((current) => ({ ...current, [record.key]: event.target.value as InventoryImportAction }))}>
                              <option value="import">{tx("Import")}</option>
                              <option value="update">{tx("Update")}</option>
                              <option value="replace">{tx("Replace")}</option>
                              <option value="skip">{tx("Skip duplicate")}</option>
                              <option value="review">{tx("Review differences")}</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button className="hsv-secondary-button" type="button" onClick={exportPdf}>
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  {tx("Export Inventory PDF")}
                </button>
                <button className="hsv-primary-button" type="button" onClick={applyImport} disabled={!summary.validRows}>
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  {tx("Import all valid rows")}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

function ImportStat({ label, value, tone = "blue" }: { label: string; value: string; tone?: "green" | "amber" | "blue" | "red" | "neutral" }) {
  const { tx } = useI18n();
  return (
    <div className="rounded-lg border border-line bg-white/84 p-3 shadow-control dark:bg-canvas-muted/70">
      <StatusPill tone={tone}>{tx(label)}</StatusPill>
      <p className="mt-3 truncate text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const { tx } = useI18n();
  return (
    <div className="rounded-md border border-line bg-canvas-muted/40 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-ink-subtle">{tx(label)}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  const { tx } = useI18n();
  return (
    <label className="flex items-start gap-3 rounded-lg border border-line bg-canvas-muted/35 p-3 text-sm font-medium text-ink-muted">
      <input className="mt-1" type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span>{tx(label)}</span>
    </label>
  );
}

function classificationTone(classification: string): "green" | "amber" | "blue" | "red" {
  if (classification === "New item") return "green";
  if (classification === "Existing item update" || classification === "Quantity adjustment") return "blue";
  if (classification === "Manual review required") return "red";
  return "amber";
}
