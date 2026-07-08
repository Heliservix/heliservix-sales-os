"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Plane, ShieldCheck, Upload } from "lucide-react";
import { useI18n } from "@/components/i18n/i18n-provider";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  applyComponentImport,
  hasBlockingImportIssues,
  buildComponentImportPreview,
  HSV_IMPORT_COMPONENTS_V1,
  type AircraftImportMetadataOverride,
  type ComponentImportColumnOverride,
  type ComponentImportFieldKey,
  type ComponentImportMode,
  type ComponentImportPreview
} from "@/lib/component-import";
import type { FleetStore } from "@/types/fleet";

type AircraftMigrationCenterProps = {
  store: FleetStore;
  onApply: (updater: (current: FleetStore) => FleetStore, success: string) => void;
  preselectedRegistration?: string;
  compact?: boolean;
};

type ParsedWorkbookSheet = {
  name: string;
  rows: unknown[][];
};

const officialWorkbookName = "HSV-IMPORT-COMPONENTS-v1.xlsx";

const steps = [
  "Select Excel",
  "Detect helicopters",
  "Preview components",
  "Validate",
  "Import"
] as const;

const importModes: Array<{ value: ComponentImportMode; label: string; description: string }> = [
  {
    value: "merge-components",
    label: "Merge components",
    description: "Update matching components and add clean new rows."
  },
  {
    value: "skip-duplicates",
    label: "Skip duplicates",
    description: "Import only clean new rows and leave matching components unchanged."
  },
  {
    value: "replace-components",
    label: "Replace components",
    description: "Archive current components for selected helicopters before importing workbook rows."
  }
];

export function AircraftMigrationCenter({ store, onApply, preselectedRegistration, compact = false }: AircraftMigrationCenterProps) {
  const { tx } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState<ComponentImportPreview>();
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [workbookSheets, setWorkbookSheets] = useState<ParsedWorkbookSheet[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [mappingOverrides, setMappingOverrides] = useState<ComponentImportColumnOverride>({});
  const [metadataOverrides, setMetadataOverrides] = useState<AircraftImportMetadataOverride>({});
  const [createHelicopter, setCreateHelicopter] = useState(true);
  const [updateHelicopter, setUpdateHelicopter] = useState(true);
  const [forceValidRowsOnly, setForceValidRowsOnly] = useState(true);
  const [mode, setMode] = useState<ComponentImportMode>("merge-components");

  const selectedRecords = useMemo(() => {
    const selected = new Set(selectedRegistrations);
    return preview?.records.filter((record) => selected.has(record.helicopterRegistration)) ?? [];
  }, [preview, selectedRegistrations]);

  const selectedIssues = useMemo(() => selectedRecords.flatMap((record) => record.issues), [selectedRecords]);
  const visibleIssues = useMemo(() => [...(preview?.aircraftMetadata.issues ?? []), ...selectedIssues], [preview?.aircraftMetadata.issues, selectedIssues]);

  const summary = useMemo(() => ({
    componentCount: selectedRecords.length,
    warnings: visibleIssues.filter((issue) => issue.severity === "warning").length,
    errors: visibleIssues.filter((issue) => issue.severity === "error").length,
    duplicates: selectedRecords.filter((record) => record.duplicateInStore || record.duplicateInWorkbook).length,
    missingData: visibleIssues.filter((issue) => ["Registration", "Component name", "P/N or S/N", "Life limit", "Position", "Installation date", "Current Hourmeter"].includes(issue.field)).length
  }), [visibleIssues, selectedRecords]);

  async function parseFile(file?: File) {
    setError("");
    setMessage("");
    setPreview(undefined);
    setSelectedRegistrations([]);
    setStep(1);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError(tx("Please upload an .xlsx workbook."));
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
      const sheets = workbook.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
          header: 1,
          blankrows: false,
          defval: "",
          raw: true
        })
      }));
      setWorkbookSheets(sheets);
      const initialSheetName = sheets.find((sheet) => sheet.name === HSV_IMPORT_COMPONENTS_V1.preferredSheetName)?.name
        ?? sheets.find((sheet) => sheet.name.startsWith(HSV_IMPORT_COMPONENTS_V1.preferredSheetName))?.name
        ?? sheets[0]?.name
        ?? "";
      setSelectedSheetName(initialSheetName);
      setMappingOverrides({});
      setMetadataOverrides({});
      rebuildPreview(file.name, sheets, {}, [], {}, initialSheetName);
      setStep(2);
      setMessage(tx("Workbook parsed. Review detected helicopters before import."));
    } catch {
      setError(tx("The workbook could not be parsed. Confirm it is an .xlsx component-control file."));
    }
  }

  function toggleRegistration(registration: string) {
    setSelectedRegistrations((current) =>
      current.includes(registration)
        ? current.filter((item) => item !== registration)
        : [...current, registration]
    );
  }

  function rebuildPreview(
    fileName: string,
    sheets: ParsedWorkbookSheet[],
    overrides: ComponentImportColumnOverride,
    preferredSelection = selectedRegistrations,
    nextMetadataOverrides = metadataOverrides,
    nextSheetName = selectedSheetName
  ) {
    const nextPreview = buildComponentImportPreview({
      fileName,
      sheets,
      store,
      preselectedRegistration,
      mappingOverrides: overrides,
      metadataOverrides: nextMetadataOverrides,
      selectedSheetName: nextSheetName
    });
    const detected = nextPreview.detectedHelicopters.map((item) => item.registration);
    const nextSelected = preselectedRegistration
      ? detected.filter((registration) => registration === preselectedRegistration)
      : preferredSelection.length
        ? preferredSelection.filter((registration) => detected.includes(registration))
        : detected;
    setPreview(nextPreview);
    setSelectedRegistrations(nextSelected);
  }

  function updateSheet(name: string) {
    if (!preview) return;
    setSelectedSheetName(name);
    rebuildPreview(preview.fileName, workbookSheets, mappingOverrides, [], metadataOverrides, name);
    setMessage(tx("Worksheet selection updated. Review metadata and validation before import."));
  }

  function updateMetadata(field: keyof AircraftImportMetadataOverride, value: string) {
    if (!preview) return;
    const nextMetadataOverrides: AircraftImportMetadataOverride = {
      ...metadataOverrides,
      [field]: field === "currentHourmeter" ? Number(value) : value,
      manuallyConfirmed: true
    };
    setMetadataOverrides(nextMetadataOverrides);
    rebuildPreview(preview.fileName, workbookSheets, mappingOverrides, selectedRegistrations, nextMetadataOverrides, selectedSheetName);
    setMessage(tx("Aircraft metadata updated. Review detected helicopters and validation before import."));
  }

  function updateMapping(field: ComponentImportFieldKey, value: string) {
    if (!preview) return;
    const nextOverrides: ComponentImportColumnOverride = { ...mappingOverrides };
    if (value === "auto") {
      delete nextOverrides[field];
    } else if (value === "ignore") {
      nextOverrides[field] = null;
    } else {
      nextOverrides[field] = Number(value);
    }
    setMappingOverrides(nextOverrides);
    rebuildPreview(preview.fileName, workbookSheets, nextOverrides);
    setMessage(tx("Column mapping updated. Review detected helicopters and validation before import."));
  }

  function applyImport() {
    if (!preview || hasBlockingImportIssues(preview, selectedRegistrations, { allowValidRowsOnly: forceValidRowsOnly })) return;
    const result = applyComponentImport(store, preview, {
      createHelicopter,
      updateHelicopter,
      mode,
      selectedRegistrations
    });
    onApply(() => result.store, tx("Aircraft migration saved to localStorage as real user data."));
    setStep(5);
    setMessage(tx(`Migration complete: ${result.summary.imported} components saved, ${result.summary.updated} updated, ${result.summary.skipped} skipped, ${result.summary.alerts} alerts generated.`));
  }

  return (
    <Panel>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-brand-lightBlue text-aviation-blue">
              <Plane className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">{tx("Aircraft Migration Center")}</h2>
              <p className="mt-1 text-sm text-ink-subtle">
                {tx("Use the approved HSV-IMPORT-COMPONENTS-v1.xlsx workbook to migrate aircraft component control data.")}
              </p>
            </div>
          </div>
          {preselectedRegistration ? (
            <p className="mt-3 text-sm font-medium text-aviation-blue">
              {tx("Migration scoped to")} {preselectedRegistration}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => void parseFile(event.target.files?.[0])}
          />
          <button
            className="hsv-primary-button"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {tx("Select Excel")}
          </button>
          <StatusPill tone="green">{tx("Imported Excel records are real user data")}</StatusPill>
        </div>
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-5">
        {steps.map((label, index) => {
          const number = index + 1;
          const active = number === step;
          const complete = number < step;
          return (
            <button
              key={label}
              className={[
                "flex min-h-14 items-center gap-3 rounded-lg border px-3 text-left text-sm transition",
                active ? "border-brand-blue bg-brand-lightBlue text-ink" : complete ? "border-aviation-green/30 bg-aviation-green/10 text-ink" : "border-line bg-white text-ink-muted"
              ].join(" ")}
              type="button"
              disabled={!preview && number > 1}
              onClick={() => preview || number === 1 ? setStep(number) : undefined}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-aviation-blue shadow-control">
                {complete ? <CheckCircle2 className="h-4 w-4 text-aviation-green" aria-hidden="true" /> : number}
              </span>
              <span className="font-semibold">{tx(label)}</span>
            </button>
          );
        })}
      </div>

      {message ? <p className="hsv-success-banner mt-4 mb-0">{message}</p> : null}
      {error ? <p className="hsv-error-banner mt-4 mb-0">{error}</p> : null}

      <div className="mt-5">
        {step === 1 ? renderSelectStep() : null}
        {preview && step === 2 ? renderDetectStep(preview) : null}
        {preview && step === 3 ? renderPreviewStep() : null}
        {preview && step === 4 ? renderValidateStep(preview) : null}
        {preview && step === 5 ? renderImportStep(preview) : null}
      </div>
    </Panel>
  );

  function renderSelectStep() {
    return (
      <div className="rounded-xl border border-dashed border-line bg-canvas-muted/42 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-ink">{tx("Step 1: Select Excel")}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-subtle">
              {tx("Select the approved aircraft migration workbook. The expected file is")} <span className="font-semibold text-ink">{officialWorkbookName}</span>.
            </p>
          </div>
          <button
            className="hsv-primary-button"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            {tx("Choose workbook")}
          </button>
        </div>
      </div>
    );
  }

  function renderDetectStep(currentPreview: ComponentImportPreview) {
    return (
      <div className="grid gap-5">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MigrationStat label="Worksheets detected" value={String(currentPreview.worksheetNames.length)} />
          <MigrationStat label="Helicopters detected" value={String(currentPreview.detectedHelicopters.length)} />
          <MigrationStat label="Component Count" value={String(currentPreview.records.length)} />
          <MigrationStat label="Warnings" value={String(currentPreview.issues.filter((issue) => issue.severity === "warning").length)} tone="amber" />
          <MigrationStat label="Errors" value={String(currentPreview.issues.filter((issue) => issue.severity === "error").length)} tone={currentPreview.issues.some((issue) => issue.severity === "error") ? "red" : "green"} />
        </section>

        <section className="rounded-lg border border-line bg-white/84 p-4 shadow-control dark:bg-canvas-muted/70">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">{tx("Detected worksheets")}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {currentPreview.worksheetNames.map((name) => (
                  <span key={name} className={["rounded-md border px-2.5 py-1 text-xs font-medium", name === currentPreview.activeWorksheetName ? "border-brand-blue bg-brand-lightBlue text-aviation-blue" : "border-line bg-canvas-muted/52 text-ink-muted"].join(" ")}>{name}</span>
                ))}
              </div>
            </div>
            <label className="grid min-w-64 gap-2 text-sm font-semibold text-ink">
              {tx("Active worksheet")}
              <select className="hsv-control h-10" value={selectedSheetName} onChange={(event) => updateSheet(event.target.value)}>
                {workbookSheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}
              </select>
            </label>
          </div>
        </section>

        <AircraftMetadataPanel preview={currentPreview} onChange={updateMetadata} />
        <MappingConfidencePanel preview={currentPreview} onChange={updateMapping} />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {currentPreview.detectedHelicopters.map((helicopter) => {
            const selected = selectedRegistrations.includes(helicopter.registration);
            return (
              <label key={helicopter.registration} className={["rounded-xl border p-4 transition", selected ? "border-brand-blue bg-brand-lightBlue/55" : "border-line bg-white"].join(" ")}>
                <div className="flex items-start gap-3">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={selected}
                    disabled={Boolean(preselectedRegistration && helicopter.registration !== preselectedRegistration)}
                    onChange={() => toggleRegistration(helicopter.registration)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-ink">{helicopter.registration}</p>
                      <StatusPill tone={helicopter.errors ? "red" : helicopter.warnings ? "amber" : "green"}>
                        {helicopter.errors ? tx("Errors") : helicopter.warnings ? tx("Warnings") : tx("Ready")}
                      </StatusPill>
                    </div>
                    <p className="mt-2 text-sm text-ink-subtle">{helicopter.model || tx("Unknown model")} / {tx("Current Hourmeter")} {helicopter.currentHourmeter.toFixed(1)}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <MiniStat label="Component Count" value={String(helicopter.componentCount)} />
                      <MiniStat label="Warnings" value={String(helicopter.warnings)} />
                      <MiniStat label="Errors" value={String(helicopter.errors)} />
                      <MiniStat label="Duplicates" value={String(helicopter.duplicates)} />
                      <MiniStat label="Missing data" value={String(helicopter.missingData)} />
                      <MiniStat label="Worksheets" value={String(helicopter.worksheetNames.length)} />
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </section>

        <WizardActions canContinue={selectedRegistrations.length > 0} onNext={() => setStep(3)} />
      </div>
    );
  }

  function renderPreviewStep() {
    return (
      <div className="grid gap-5">
        <section className="grid gap-3 md:grid-cols-5">
          <MigrationStat label="Selected helicopters" value={String(selectedRegistrations.length)} />
          <MigrationStat label="Component Count" value={String(summary.componentCount)} />
          <MigrationStat label="Duplicates" value={String(summary.duplicates)} tone={summary.duplicates ? "amber" : "green"} />
          <MigrationStat label="Missing data" value={String(summary.missingData)} tone={summary.missingData ? "amber" : "green"} />
          <MigrationStat label="Errors" value={String(summary.errors)} tone={summary.errors ? "red" : "green"} />
        </section>
        {preview ? <AircraftMetadataPanel preview={preview} onChange={updateMetadata} /> : null}
        <p className="rounded-lg border border-brand-blue/15 bg-brand-lightBlue/45 px-4 py-3 text-sm font-medium text-aviation-blue">
          {tx("Observations are optional and will not affect import validation.")}
        </p>
        <ComponentPreviewTable records={selectedRecords} compact={compact} />
        <WizardActions canContinue={selectedRegistrations.length > 0} onNext={() => setStep(4)} onBack={() => setStep(2)} />
      </div>
    );
  }

  function renderValidateStep(currentPreview: ComponentImportPreview) {
    const blocking = hasBlockingImportIssues(currentPreview, selectedRegistrations, { allowValidRowsOnly: forceValidRowsOnly });
    return (
      <div className="grid gap-5">
        <section className="grid gap-3 md:grid-cols-5">
          <MigrationStat label="Warnings" value={String(summary.warnings)} tone={summary.warnings ? "amber" : "green"} />
          <MigrationStat label="Errors" value={String(summary.errors)} tone={summary.errors ? "red" : "green"} />
          <MigrationStat label="Duplicates" value={String(summary.duplicates)} tone={summary.duplicates ? "amber" : "green"} />
          <MigrationStat label="Missing data" value={String(summary.missingData)} tone={summary.missingData ? "amber" : "green"} />
          <MigrationStat label="Validation status" value={blocking ? tx("Blocked") : tx("Ready")} tone={blocking ? "red" : "green"} />
        </section>
        <div className="rounded-lg border border-line bg-white/84 p-4 shadow-control dark:bg-canvas-muted/70">
          <h3 className="text-sm font-semibold text-ink">{tx("Validation findings")}</h3>
          <div className="mt-3 max-h-80 overflow-auto rounded-md border border-line">
            {visibleIssues.length ? visibleIssues.slice(0, 80).map((item, index) => (
              <div key={`${item.worksheetName}-${item.rowNumber}-${item.field}-${index}`} className="grid gap-2 border-b border-line px-3 py-2 text-sm last:border-b-0 lg:grid-cols-[90px_80px_150px_1fr_160px_180px]">
                <StatusPill tone={item.severity === "error" ? "red" : "amber"}>{item.severity}</StatusPill>
                <span className="font-medium text-ink-muted">{item.rowNumber ? `${tx("Row")} ${item.rowNumber}` : tx("Workbook")}</span>
                <span className="font-medium text-ink-muted">{tx(item.field)}</span>
                <p className="text-ink-muted">{tx(item.message)}</p>
                <span className="text-ink-subtle">{item.currentValue || "N/A"}</span>
                <span className="text-ink-subtle">{item.suggestedFix ? tx(item.suggestedFix) : "N/A"}</span>
              </div>
            )) : (
              <p className="px-3 py-3 text-sm text-ink-subtle">{tx("No blocking validation issues detected.")}</p>
            )}
          </div>
        </div>
        <WizardActions canContinue={!blocking && selectedRegistrations.length > 0 && selectedRecords.some((record) => !record.issues.some((issue) => issue.severity === "error"))} onNext={() => setStep(5)} onBack={() => setStep(3)} />
      </div>
    );
  }

  function renderImportStep(currentPreview: ComponentImportPreview) {
    const blocking = hasBlockingImportIssues(currentPreview, selectedRegistrations, { allowValidRowsOnly: forceValidRowsOnly });
    return (
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-line bg-white/84 p-4 shadow-control dark:bg-canvas-muted/70">
          <h3 className="text-sm font-semibold text-ink">{tx("Import options")}</h3>
          <div className="mt-4 grid gap-3">
            <label className="flex items-start gap-3 text-sm text-ink-muted">
              <input className="mt-1" type="checkbox" checked={createHelicopter} onChange={(event) => setCreateHelicopter(event.target.checked)} />
              <span>{tx("Create helicopter")}</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-ink-muted">
              <input className="mt-1" type="checkbox" checked={updateHelicopter} onChange={(event) => setUpdateHelicopter(event.target.checked)} />
              <span>{tx("Update helicopter")}</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-ink-muted">
              <input className="mt-1" type="checkbox" checked={forceValidRowsOnly} onChange={(event) => setForceValidRowsOnly(event.target.checked)} />
              <span>{tx("Force import valid rows only")}</span>
            </label>
          </div>
          <div className="mt-4 grid gap-2">
            {importModes.map((item) => (
              <label key={item.value} className="flex items-start gap-3 rounded-md border border-line bg-canvas-muted/40 p-3 text-sm">
                <input className="mt-1" type="radio" name="aircraft-migration-mode" value={item.value} checked={mode === item.value} onChange={() => setMode(item.value)} />
                <span>
                  <span className="font-semibold text-ink">{tx(item.label)}</span>
                  <span className="mt-1 block text-ink-subtle">{tx(item.description)}</span>
                </span>
              </label>
            ))}
          </div>
          <button
            className="hsv-primary-button mt-5"
            type="button"
            disabled={blocking || selectedRegistrations.length === 0}
            onClick={applyImport}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {tx("Import selected helicopters")}
          </button>
        </section>

        <section className="rounded-lg border border-line bg-white/84 p-4 shadow-control dark:bg-canvas-muted/70">
          <h3 className="text-sm font-semibold text-ink">{tx("Migration summary")}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniStat label="Selected helicopters" value={selectedRegistrations.join(", ") || tx("None")} />
            <MiniStat label="Component Count" value={String(summary.componentCount)} />
            <MiniStat label="Warnings" value={String(summary.warnings)} />
            <MiniStat label="Errors" value={String(summary.errors)} />
            <MiniStat label="Duplicates" value={String(summary.duplicates)} />
            <MiniStat label="Missing data" value={String(summary.missingData)} />
          </div>
          <p className="mt-4 text-sm leading-6 text-ink-subtle">
            {tx("Imported records are stored in localStorage for now. No backend is connected.")}
          </p>
          <div className="mt-5">
            <WizardActions canContinue={false} onBack={() => setStep(4)} />
          </div>
        </section>
      </div>
    );
  }
}

function WizardActions({ canContinue, onNext, onBack }: { canContinue: boolean; onNext?: () => void; onBack?: () => void }) {
  const { tx } = useI18n();
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
      <button
        className="hsv-secondary-button"
        type="button"
        disabled={!onBack}
        onClick={onBack}
      >
        {tx("Back")}
      </button>
      {onNext ? (
        <button
          className="hsv-primary-button"
          type="button"
          disabled={!canContinue}
          onClick={onNext}
        >
          {tx("Continue")}
        </button>
      ) : <span />}
    </div>
  );
}

function AircraftMetadataPanel({
  preview,
  onChange
}: {
  preview: ComponentImportPreview;
  onChange: (field: keyof AircraftImportMetadataOverride, value: string) => void;
}) {
  const { tx } = useI18n();
  const metadata = preview.aircraftMetadata;
  const fields: Array<{ key: keyof AircraftImportMetadataOverride; label: string; type?: string; value: string | number }> = [
    { key: "registration", label: "Registration / Matrícula", value: metadata.registration },
    { key: "model", label: "Model / Modelo", value: metadata.model },
    { key: "aircraftSerialNumber", label: "Aircraft Serial Number / S/N Aeronave", value: metadata.aircraftSerialNumber },
    { key: "manufactureDate", label: "Manufacture Date / Fecha Fabricación", type: "date", value: metadata.manufactureDate },
    { key: "reviewDate", label: "Review Date / Fecha Revisión", type: "date", value: metadata.reviewDate },
    { key: "currentHourmeter", label: "Current Hourmeter / Horómetro", type: "number", value: metadata.currentHourmeter || "" }
  ];
  return (
    <section className="rounded-lg border border-line bg-white/84 p-4 shadow-control dark:bg-canvas-muted/70">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">{tx("Aircraft Metadata")}</h3>
          <p className="mt-1 text-sm text-ink-subtle">{tx("Metadata is read from Row 4 headers and Row 5 values in Control Maestro.")}</p>
        </div>
        <StatusPill tone={metadata.issues.some((issue) => issue.severity === "error") ? "red" : metadata.issues.length ? "amber" : "green"}>
          {metadata.manuallyConfirmed ? tx("Manual") : metadata.detected ? tx("Detected") : tx("Needs review")}
        </StatusPill>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => (
          <label key={field.key} className="grid gap-2 text-sm font-semibold text-ink">
            {tx(field.label)}
            <input
              className="hsv-control h-10"
              type={field.type ?? "text"}
              value={field.value}
              min={field.type === "number" ? 0 : undefined}
              step={field.type === "number" ? "any" : undefined}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>
      {metadata.issues.length ? (
        <div className="mt-4 grid gap-2">
          {metadata.issues.map((issue, index) => (
            <p key={`${issue.field}-${index}`} className="rounded-md border border-aviation-amber/20 bg-aviation-amber/10 px-3 py-2 text-sm text-ink-muted">
              <span className="font-semibold text-ink">{tx(issue.field)}:</span> {tx(issue.message)}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function MappingConfidencePanel({
  preview,
  onChange
}: {
  preview: ComponentImportPreview;
  onChange: (field: ComponentImportFieldKey, value: string) => void;
}) {
  const { tx } = useI18n();
  return (
    <section className="rounded-lg border border-line bg-white/84 p-4 shadow-control dark:bg-canvas-muted/70">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">{tx("Column mapping confidence")}</h3>
          <p className="mt-1 text-sm text-ink-subtle">{tx("Review automatic matches and correct any column before import.")}</p>
        </div>
        <StatusPill tone={preview.mappedFields.some((field) => field.confidence < 75) ? "amber" : "green"}>
          {tx("Fuzzy matching active")}
        </StatusPill>
      </div>
      <div className="hsv-table-wrap mt-4">
        <table className="hsv-table min-w-[860px]">
          <thead className="hsv-table-head">
            <tr>
              {["Field", "Detected header", "Confidence", "Correction"].map((header) => (
                <th key={header} className="hsv-table-th">{tx(header)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="hsv-table-body">
            {preview.mappedFields.map((field) => (
              <tr key={field.field}>
                <td className="px-4 py-3 font-semibold text-ink">{tx(field.label)}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {field.header || tx("No column mapped")}
                  {field.manuallyMapped ? <span className="ml-2 text-xs font-semibold text-aviation-blue">{tx("Manual")}</span> : null}
                </td>
                <td className="hsv-table-cell">
                  <StatusPill tone={field.confidence >= 90 ? "green" : field.confidence >= 75 ? "blue" : field.confidence >= 58 ? "amber" : "red"}>
                    {field.confidence}%
                  </StatusPill>
                </td>
                <td className="hsv-table-cell">
                  <select
                    className="hsv-control h-10"
                    value={field.manuallyMapped ? field.columnIndex === undefined ? "ignore" : String(field.columnIndex) : "auto"}
                    onChange={(event) => onChange(field.field, event.target.value)}
                  >
                    <option value="auto">{tx("Auto detect")}</option>
                    <option value="ignore">{tx("Do not import this field")}</option>
                    {preview.columnOptions.map((option) => (
                      <option key={`${field.field}-${option.index}`} value={option.index}>
                        {option.header}
                      </option>
                    ))}
                  </select>
                  {field.alternatives.length > 1 ? (
                    <p className="mt-1 text-xs text-ink-subtle">
                      {tx("Other likely matches")}: {field.alternatives.slice(1, 3).map((item) => `${item.header} ${item.confidence}%`).join(", ")}
                    </p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ComponentPreviewTable({ records, compact }: { records: ComponentImportPreview["records"]; compact?: boolean }) {
  const { tx } = useI18n();
  const visibleRecords = records.slice(0, compact ? 8 : 24);
  return (
    <div className="hsv-table-wrap">
      <table className="hsv-table min-w-[1120px]">
        <thead className="hsv-table-head">
          <tr>
            {["Worksheet", "Aircraft", "Component", "P/N", "S/N", "Position", "Remaining", "%", "Calendar", "Status", "Result", "Warnings", "Errors"].map((header) => (
              <th key={header} className="hsv-table-th">{tx(header)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="hsv-table-body">
          {visibleRecords.map((record) => (
            <tr key={`${record.worksheetName}-${record.rowNumber}-${record.duplicateKey}`}>
              <td className="px-4 py-3 text-ink-muted">{record.worksheetName}</td>
              <td className="px-4 py-3 font-medium text-ink">{record.helicopterRegistration}</td>
              <td className="px-4 py-3 font-semibold text-ink">{record.componentName || tx("Missing")}</td>
              <td className="px-4 py-3 text-ink-muted">{record.partNumber || "N/A"}</td>
              <td className="px-4 py-3 text-ink-muted">{record.serialNumber || "N/A"}</td>
              <td className="px-4 py-3 text-ink-muted">{record.position || "N/A"}</td>
              <td className="px-4 py-3 text-ink">{record.remainingHours.toFixed(1)} hrs</td>
              <td className="px-4 py-3 text-ink">{record.remainingPercentage.toFixed(1)}%</td>
              <td className="px-4 py-3 text-ink-muted">{record.calendarLimitDate || "N/A"}</td>
              <td className="hsv-table-cell">
                <StatusPill tone={record.status === "OK" ? "green" : record.status === "Monitor" ? "amber" : "red"}>{record.status}</StatusPill>
              </td>
              <td className="hsv-table-cell">
                <StatusPill tone={record.issues.some((issue) => issue.severity === "error") ? "red" : record.issues.some((issue) => issue.severity === "warning") ? "amber" : "green"}>
                  {record.issues.some((issue) => issue.severity === "error") ? tx("Error") : record.issues.some((issue) => issue.severity === "warning") ? tx("Warning") : tx("Valid")}
                </StatusPill>
              </td>
              <td className="px-4 py-3 text-ink-muted">{record.issues.filter((issue) => issue.severity === "warning").length}</td>
              <td className="px-4 py-3 text-ink-muted">{record.issues.filter((issue) => issue.severity === "error").length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MigrationStat({ label, value, tone = "blue" }: { label: string; value: string; tone?: "green" | "amber" | "blue" | "teal" | "red" | "neutral" }) {
  const { tx } = useI18n();
  return (
    <div className="rounded-lg border border-line bg-white/84 p-3 shadow-control dark:bg-canvas-muted/70">
      <StatusPill tone={tone}>{tx(label)}</StatusPill>
      <p className="mt-3 truncate text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const { tx } = useI18n();
  return (
    <div className="rounded-md border border-line bg-canvas-muted/42 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase text-ink-subtle">{tx(label)}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
