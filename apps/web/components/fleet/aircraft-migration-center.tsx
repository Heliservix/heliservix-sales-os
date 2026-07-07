"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Plane, ShieldCheck, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { useI18n } from "@/components/i18n/i18n-provider";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  applyComponentImport,
  hasBlockingImportIssues,
  buildComponentImportPreview,
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
  const [createHelicopter, setCreateHelicopter] = useState(true);
  const [updateHelicopter, setUpdateHelicopter] = useState(true);
  const [mode, setMode] = useState<ComponentImportMode>("merge-components");

  const selectedRecords = useMemo(() => {
    const selected = new Set(selectedRegistrations);
    return preview?.records.filter((record) => selected.has(record.helicopterRegistration)) ?? [];
  }, [preview, selectedRegistrations]);

  const selectedIssues = useMemo(() => selectedRecords.flatMap((record) => record.issues), [selectedRecords]);

  const summary = useMemo(() => ({
    componentCount: selectedRecords.length,
    warnings: selectedIssues.filter((issue) => issue.severity === "warning").length,
    errors: selectedIssues.filter((issue) => issue.severity === "error").length,
    duplicates: selectedRecords.filter((record) => record.duplicateInStore || record.duplicateInWorkbook).length,
    missingData: selectedIssues.filter((issue) => ["Registration", "Component name", "P/N or S/N", "Life limit", "Category", "Position", "Notes"].includes(issue.field)).length
  }), [selectedIssues, selectedRecords]);

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
      const nextPreview = buildComponentImportPreview({
        fileName: file.name,
        sheets,
        store,
        preselectedRegistration
      });
      const detected = nextPreview.detectedHelicopters.map((item) => item.registration);
      const nextSelected = preselectedRegistration
        ? detected.filter((registration) => registration === preselectedRegistration)
        : detected;
      setPreview(nextPreview);
      setSelectedRegistrations(nextSelected);
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

  function applyImport() {
    if (!preview || hasBlockingImportIssues(preview, selectedRegistrations)) return;
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-blue px-4 text-sm font-semibold text-white shadow-control transition hover:opacity-92"
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

      {message ? <p className="mt-4 rounded-lg border border-aviation-green/20 bg-aviation-green/10 px-4 py-3 text-sm font-medium text-aviation-green">{message}</p> : null}
      {error ? <p className="mt-4 rounded-lg border border-aviation-red/20 bg-aviation-red/10 px-4 py-3 text-sm font-medium text-aviation-red">{error}</p> : null}

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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-control transition hover:opacity-92"
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

        <section className="rounded-lg border border-line bg-white p-4">
          <h3 className="text-sm font-semibold text-ink">{tx("Detected worksheets")}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {currentPreview.worksheetNames.map((name) => (
              <span key={name} className="rounded-md border border-line bg-canvas-muted/52 px-2.5 py-1 text-xs font-medium text-ink-muted">{name}</span>
            ))}
          </div>
        </section>

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
        <ComponentPreviewTable records={selectedRecords} compact={compact} />
        <WizardActions canContinue={selectedRegistrations.length > 0} onNext={() => setStep(4)} onBack={() => setStep(2)} />
      </div>
    );
  }

  function renderValidateStep(currentPreview: ComponentImportPreview) {
    const blocking = hasBlockingImportIssues(currentPreview, selectedRegistrations);
    return (
      <div className="grid gap-5">
        <section className="grid gap-3 md:grid-cols-5">
          <MigrationStat label="Warnings" value={String(summary.warnings)} tone={summary.warnings ? "amber" : "green"} />
          <MigrationStat label="Errors" value={String(summary.errors)} tone={summary.errors ? "red" : "green"} />
          <MigrationStat label="Duplicates" value={String(summary.duplicates)} tone={summary.duplicates ? "amber" : "green"} />
          <MigrationStat label="Missing data" value={String(summary.missingData)} tone={summary.missingData ? "amber" : "green"} />
          <MigrationStat label="Validation status" value={blocking ? tx("Blocked") : tx("Ready")} tone={blocking ? "red" : "green"} />
        </section>
        <div className="rounded-lg border border-line bg-white p-4">
          <h3 className="text-sm font-semibold text-ink">{tx("Validation findings")}</h3>
          <div className="mt-3 max-h-80 overflow-auto rounded-md border border-line">
            {selectedIssues.length ? selectedIssues.slice(0, 40).map((item, index) => (
              <div key={`${item.worksheetName}-${item.rowNumber}-${item.field}-${index}`} className="grid gap-2 border-b border-line px-3 py-2 text-sm last:border-b-0 md:grid-cols-[120px_160px_1fr]">
                <StatusPill tone={item.severity === "error" ? "red" : "amber"}>{item.severity}</StatusPill>
                <span className="font-medium text-ink-muted">{item.helicopterRegistration || item.worksheetName || tx("Workbook")}</span>
                <p className="text-ink-muted">{item.rowNumber ? `${tx("Row")} ${item.rowNumber}: ` : ""}{tx(item.message)}</p>
              </div>
            )) : (
              <p className="px-3 py-3 text-sm text-ink-subtle">{tx("No blocking validation issues detected.")}</p>
            )}
          </div>
        </div>
        <WizardActions canContinue={!blocking && selectedRegistrations.length > 0} onNext={() => setStep(5)} onBack={() => setStep(3)} />
      </div>
    );
  }

  function renderImportStep(currentPreview: ComponentImportPreview) {
    const blocking = hasBlockingImportIssues(currentPreview, selectedRegistrations);
    return (
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-line bg-white p-4">
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
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-control transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            disabled={blocking || selectedRegistrations.length === 0}
            onClick={applyImport}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {tx("Import selected helicopters")}
          </button>
        </section>

        <section className="rounded-lg border border-line bg-white p-4">
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
        className="h-10 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink-muted shadow-control transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        type="button"
        disabled={!onBack}
        onClick={onBack}
      >
        {tx("Back")}
      </button>
      {onNext ? (
        <button
          className="h-10 rounded-md bg-brand-blue px-4 text-sm font-semibold text-white shadow-control transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-45"
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

function ComponentPreviewTable({ records, compact }: { records: ComponentImportPreview["records"]; compact?: boolean }) {
  const { tx } = useI18n();
  const visibleRecords = records.slice(0, compact ? 8 : 24);
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
        <thead className="bg-canvas-muted text-xs uppercase text-ink-subtle">
          <tr>
            {["Worksheet", "Aircraft", "Component", "P/N", "S/N", "Position", "Remaining", "%", "Calendar", "Status", "Warnings", "Errors"].map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">{tx(header)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
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
              <td className="px-4 py-3">
                <StatusPill tone={record.status === "OK" ? "green" : record.status === "Monitor" ? "amber" : "red"}>{record.status}</StatusPill>
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
    <div className="rounded-lg border border-line bg-white p-3 shadow-control">
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
