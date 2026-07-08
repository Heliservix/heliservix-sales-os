import type { ComponentStatus, FleetStore, Helicopter, HelicopterComponent } from "@/types/fleet";
import {
  calculateComponentStatus,
  calculateRemainingPercentage,
  createAlertsForComponents,
  generateId
} from "@/lib/fleet-ops";

export type ImportIssueSeverity = "error" | "warning";

export type ImportIssue = {
  rowNumber: number;
  field: string;
  severity: ImportIssueSeverity;
  message: string;
  currentValue?: string;
  suggestedFix?: string;
  worksheetName?: string;
  helicopterRegistration?: string;
};

export type AircraftImportMetadata = {
  registration: string;
  model: string;
  aircraftSerialNumber: string;
  manufactureDate: string;
  reviewDate: string;
  owner: string;
  operator: string;
  currentHourmeter: number;
  detected: boolean;
  metadataRowDetected: boolean;
  metadataRowNumber: number;
  missingFields: string[];
  manuallyConfirmed: boolean;
  confidence: number;
  issues: ImportIssue[];
};

export type ComponentMatchType =
  | "new"
  | "exact-update"
  | "probable-replacement"
  | "low-confidence-review"
  | "probable-match";

export type ComponentMigrationAction = "import" | "update" | "replace" | "ignore" | "review";

export type ComponentMatchDifference = {
  field: string;
  currentValue: string;
  importedValue: string;
};

export type ComponentImportRecord = {
  rowNumber: number;
  worksheetName: string;
  referenceNumber: string;
  helicopterRegistration: string;
  model: string;
  aircraftSerialNumber: string;
  manufactureDate: string;
  reviewDate: string;
  owner: string;
  operator: string;
  currentHourmeter: number;
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
  calendarLimitYears: number;
  calendarRemainingYears: number;
  lifeLimitYears: number;
  calendarLimitDate: string;
  remainingCalendarDays: number;
  remainingPercentage: number;
  workbookStatus?: string;
  originalStatus?: string;
  status: ComponentStatus;
  notes: string;
  issues: ImportIssue[];
  fingerprint: string;
  duplicateKey: string;
  duplicateInWorkbook: boolean;
  duplicateInStore: boolean;
  confidence: number;
  matchType: ComponentMatchType;
  recommendedAction: ComponentMigrationAction;
  matchConfidence: number;
  matchedComponentId?: string;
  matchedComponent?: HelicopterComponent;
  differences: ComponentMatchDifference[];
};

export type DetectedMigrationHelicopter = {
  registration: string;
  model: string;
  serialNumber: string;
  currentHourmeter: number;
  worksheetNames: string[];
  componentCount: number;
  warnings: number;
  errors: number;
  duplicates: number;
  missingData: number;
  confidence: number;
};

export type ComponentImportPreview = {
  fileName: string;
  worksheetNames: string[];
  activeWorksheetName: string;
  diagnostics: ComponentImportDiagnostics;
  aircraftMetadata: AircraftImportMetadata;
  detectedHelicopter?: {
    registration: string;
    model: string;
    serialNumber: string;
    currentHourmeter: number;
  };
  detectedHelicopters: DetectedMigrationHelicopter[];
  records: ComponentImportRecord[];
  issues: ImportIssue[];
  mappedColumns: Record<string, string>;
  mappedFields: ComponentImportColumnMapping[];
  columnOptions: ComponentImportColumnOption[];
  recommendations: string[];
  migrationId: string;
  parsedAt: string;
};

export type ComponentImportDiagnostics = {
  parserName: "HSV_OFFICIAL_COMPONENT_WORKBOOK_V1" | "FUZZY_COMPONENT_WORKBOOK";
  templateName: string;
  templateDetected: boolean;
  sheetsFound: string[];
  selectedSheet: string;
  metadataDetected: boolean;
  metadataRowDetected: boolean;
  metadataRowNumber: number;
  metadataFields: {
    registration: string;
    model: string;
    aircraftSerialNumber: string;
    currentHourmeter: string;
    missingFields: string[];
  };
  componentHeaderRowDetected: boolean;
  componentHeaderRow: number;
  componentRowsDetected: number;
  validComponents: number;
  warnings: string[];
  errors: string[];
};

export type AircraftImportMetadataOverride = Partial<Pick<
  AircraftImportMetadata,
  "registration" | "model" | "aircraftSerialNumber" | "manufactureDate" | "reviewDate" | "owner" | "operator" | "currentHourmeter" | "manuallyConfirmed"
>>;

export type ComponentImportMode =
  | "merge-components"
  | "skip-duplicates"
  | "replace-components";

export type ComponentImportOptions = {
  createHelicopter: boolean;
  updateHelicopter: boolean;
  mode: ComponentImportMode;
  selectedRegistrations?: string[];
  recordActions?: Record<string, ComponentMigrationAction>;
};

export type BlockingImportOptions = {
  allowValidRowsOnly?: boolean;
};

type RawRow = unknown[];
export type ComponentImportFieldKey =
  | "referenceNumber"
  | "registration"
  | "model"
  | "aircraftSerialNumber"
  | "currentHourmeter"
  | "componentName"
  | "category"
  | "partNumber"
  | "serialNumber"
  | "position"
  | "installationDate"
  | "tsnHours"
  | "tsoHours"
  | "lifeLimitHours"
  | "remainingHours"
  | "calendarLimitYears"
  | "calendarLimitDate"
  | "remainingCalendarDays"
  | "lifeLimitYears"
  | "remainingPercentage"
  | "status"
  | "notes";

export const HSV_IMPORT_COMPONENTS_V1 = {
  parserName: "HSV_OFFICIAL_COMPONENT_WORKBOOK_V1",
  templateName: "HSV-IMPORT-COMPONENTS-v1.xlsx",
  officialTemplateName: "Official HeliServiX Component Control Workbook V1",
  preferredSheetName: "Control Maestro",
  fallbackSheetName: "Control Maestro (2)",
  ignoredSheetNames: ["Resumen Ejecutivo", "Leyenda"],
  metadataHeaderRowIndex: 3,
  metadataValueRowIndex: 4,
  componentHeaderRowIndex: 6,
  componentDataStartRowIndex: 7
} as const;

export type ComponentImportColumnOverride = Partial<Record<ComponentImportFieldKey, number | null>>;

export type ComponentImportColumnOption = {
  index: number;
  header: string;
};

export type ComponentImportColumnMapping = {
  field: ComponentImportFieldKey;
  label: string;
  header: string;
  columnIndex?: number;
  confidence: number;
  manuallyMapped: boolean;
  alternatives: Array<{
    columnIndex: number;
    header: string;
    confidence: number;
  }>;
};

const fieldAliases: Record<ComponentImportFieldKey, string[]> = {
  referenceNumber: ["ref", "ref #", "ref.", "ref. #", "reference", "reference number", "numero referencia", "número referencia"],
  registration: ["registration", "matricula", "matrícula", "reg", "reg.", "aircraft", "helicopter", "aeronave", "helicoptero", "helicóptero", "aircraft registration", "helicopter registration"],
  model: ["model", "modelo"],
  aircraftSerialNumber: ["aircraft serial number", "serial aeronave", "sn aeronave", "s/n aeronave", "aircraft sn"],
  currentHourmeter: ["current hourmeter", "horometro", "horómetro", "horometro aeronave", "hourmeter", "hobbs"],
  componentName: ["component name", "component", "componente", "nombre componente", "reference", "referencia"],
  category: ["component category", "category", "categoria", "categoría", "grupo", "sistema"],
  partNumber: ["part number", "part no", "part", "pn", "p/n", "numero parte", "n parte", "número de parte"],
  serialNumber: ["serial number", "serial no", "serial", "sn", "s/n", "numero serie", "número de serie"],
  position: ["position", "posicion", "posición"],
  installationDate: ["installation date", "fecha instalacion", "fecha instalación", "fecha instalado"],
  tsnHours: ["tsn", "tsn hrs", "tsn hours", "tsn (hrs)"],
  tsoHours: ["tso", "tso hrs", "tso hours", "tso (hrs)"],
  lifeLimitHours: ["life limit hours", "life limit", "life limit hrs", "limit hours", "limite vida horas", "limite vida hrs", "limite vida (hrs)", "límite vida (hrs)", "limite de vida horas"],
  remainingHours: ["remaining hours", "hours remaining", "life remaining", "remaining life", "remanente hrs", "remanente horas", "remanente (hrs)", "horas remanentes", "vida remanente"],
  calendarLimitYears: ["calendar limit years", "calendar limit anos", "calendar limit años", "limite calendario anos", "límite calendario años", "limite calendario (anos)", "límite calendario (años)"],
  calendarLimitDate: ["calendar limit date", "calendar limit", "calendar", "expiration", "expiration date", "expiry", "expiry date", "expires", "limite calendario", "límite calendario", "vencimiento", "fecha vencimiento", "expiracion", "expiración"],
  remainingCalendarDays: ["remaining calendar", "remaining calendar days", "calendar remaining", "calendar life remaining", "days remaining", "remaining days", "remanente calendario", "remanente calendario dias", "remanente calendario días", "dias remanentes", "días remanentes", "remanente calendario (anos)", "remanente calendario (años)"],
  lifeLimitYears: ["life limit years", "limite de vida en anos", "límite de vida en años", "limite vida anos", "límite vida años"],
  remainingPercentage: ["remaining percentage", "remaining %", "% remaining", "% remanente", "% remanente horas", "porcentaje remanente"],
  status: ["status", "estado"],
  notes: ["notes", "observations", "observaciones", "notas"]
};

const fieldLabels: Record<ComponentImportFieldKey, string> = {
  referenceNumber: "Ref",
  registration: "Registration",
  model: "Model",
  aircraftSerialNumber: "Aircraft Serial Number",
  currentHourmeter: "Current Hourmeter",
  componentName: "Component name",
  category: "Component category",
  partNumber: "Part Number",
  serialNumber: "Serial Number",
  position: "Position",
  installationDate: "Installation date",
  tsnHours: "TSN",
  tsoHours: "TSO",
  lifeLimitHours: "Life limit hours",
  remainingHours: "Remaining hours",
  calendarLimitYears: "Calendar limit years",
  calendarLimitDate: "Calendar limit date",
  remainingCalendarDays: "Remaining calendar days",
  lifeLimitYears: "Life limit years",
  remainingPercentage: "Remaining percentage",
  status: "Status",
  notes: "Notes"
};

export function buildComponentImportPreview(input: {
  fileName: string;
  sheets: Array<{ name: string; rows: RawRow[] }>;
  store: FleetStore;
  preselectedRegistration?: string;
  mappingOverrides?: ComponentImportColumnOverride;
  metadataOverrides?: AircraftImportMetadataOverride;
  selectedSheetName?: string;
}): ComponentImportPreview {
  const official = buildOfficialComponentWorkbookPreview(input);
  if (official) return official;

  const activeSheet = selectImportSheet(input.sheets, input.selectedSheetName);
  const aircraftMetadata = activeSheet
    ? extractOfficialMetadata(activeSheet.rows, activeSheet.name, input.metadataOverrides)
    : buildEmptyMetadata(input.metadataOverrides, "Workbook");
  const worksheetPreviews = activeSheet ? [activeSheet].map((sheet) => {
    const componentTable = findComponentTable(sheet.rows, input.mappingOverrides);
    const records = componentTable
      ? componentTable.rows.map((row, index) =>
        rowToRecord({
          row,
          rowNumber: componentTable.startRowNumber + index,
          worksheetName: sheet.name,
          mapping: componentTable.mapping,
          metadata: aircraftMetadata,
          store: input.store,
          preselectedRegistration: input.preselectedRegistration
        })
      ).filter((record) => record.componentName || record.partNumber || record.serialNumber)
      : [];

    return {
      sheet,
      componentTable,
      records
    };
  }) : [];

  const parsedWorksheets = worksheetPreviews.filter((preview) => preview.componentTable);
  const records = worksheetPreviews.flatMap((preview) => preview.records);
  const mappedColumns = Object.assign(
    {},
    ...parsedWorksheets.map((preview) => mapColumns(preview.componentTable!.headerRow, input.mappingOverrides))
  );
  const mappedFields = mergeMappedFields(parsedWorksheets.flatMap((preview) => preview.componentTable!.mappedFields));
  const columnOptions = buildColumnOptions(parsedWorksheets[0]?.componentTable?.headerRow ?? []);

  const duplicateCounts = new Map<string, number>();
  records.forEach((record) => {
    duplicateCounts.set(record.fingerprint, (duplicateCounts.get(record.fingerprint) ?? 0) + 1);
  });

  const recordsWithDuplicateFlags = records.map((record) => ({
    ...record,
    duplicateInWorkbook: (duplicateCounts.get(record.fingerprint) ?? 0) > 1,
    issues: (duplicateCounts.get(record.fingerprint) ?? 0) > 1
      ? [...record.issues, issue(record.rowNumber, "Duplicate", "warning", "Duplicate component fingerprint inside workbook preview.", record.fingerprint, "Review duplicate component identity.", record.worksheetName, record.helicopterRegistration)]
      : record.issues
  }));

  const issues = [
    ...aircraftMetadata.issues,
    ...(parsedWorksheets.length ? [] : [issue(0, "Workbook", "error", "No component table was detected in the workbook.")]),
    ...recordsWithDuplicateFlags.flatMap((record) => record.issues)
  ];
  const detectedHelicopters = buildDetectedHelicopters(recordsWithDuplicateFlags);
  const firstDetected = detectedHelicopters[0];
  const parsedAt = new Date().toISOString();

  return {
    fileName: input.fileName,
    worksheetNames: input.sheets.map((sheet) => sheet.name),
    activeWorksheetName: activeSheet?.name ?? "",
    diagnostics: buildDiagnostics({
      parserName: "FUZZY_COMPONENT_WORKBOOK",
      sheets: input.sheets,
      selectedSheet: activeSheet?.name ?? "",
      metadata: aircraftMetadata,
      componentHeaderRowDetected: Boolean(parsedWorksheets.length),
      componentHeaderRow: parsedWorksheets[0]?.componentTable ? parsedWorksheets[0].componentTable!.startRowNumber - 1 : 0,
      records: recordsWithDuplicateFlags,
      extraErrors: parsedWorksheets.length ? [] : ["No component table was detected in the workbook."]
    }),
    aircraftMetadata,
    detectedHelicopter: firstDetected
      ? {
        registration: firstDetected.registration,
        model: firstDetected.model,
        serialNumber: firstDetected.serialNumber,
        currentHourmeter: firstDetected.currentHourmeter
      }
      : undefined,
    detectedHelicopters,
    records: recordsWithDuplicateFlags,
    issues,
    mappedColumns,
    mappedFields,
    columnOptions,
    recommendations: buildAuraRecommendations(recordsWithDuplicateFlags, aircraftMetadata, input.store),
    migrationId: generateId("mig"),
    parsedAt
  };
}

function buildOfficialComponentWorkbookPreview(input: {
  fileName: string;
  sheets: Array<{ name: string; rows: RawRow[] }>;
  store: FleetStore;
  preselectedRegistration?: string;
  mappingOverrides?: ComponentImportColumnOverride;
  metadataOverrides?: AircraftImportMetadataOverride;
  selectedSheetName?: string;
}): ComponentImportPreview | undefined {
  const officialSignals = hasOfficialWorkbookSignals(input.sheets);
  const sheet = officialSignals
    ? selectOfficialImportSheet(input.sheets, input.selectedSheetName)
    : input.sheets.find(isOfficialComponentSheet);
  const templateDetected = Boolean(sheet);
  if (!sheet && !officialSignals) return undefined;

  const selectedSheet = sheet ?? input.sheets[0];
  const aircraftMetadata = selectedSheet
    ? extractOfficialWorkbookMetadata(selectedSheet.rows, selectedSheet.name, input.metadataOverrides)
    : buildEmptyMetadata(input.metadataOverrides, "Workbook");
  const componentTable = selectedSheet ? findOfficialComponentTable(selectedSheet.rows, input.mappingOverrides) : undefined;
  const records = componentTable
    ? readComponentRows(componentTable.rows)
      .map((row, index) =>
        rowToRecord({
          row,
          rowNumber: componentTable.startRowNumber + index,
          worksheetName: selectedSheet.name,
          mapping: componentTable.mapping,
          metadata: aircraftMetadata,
          store: input.store,
          preselectedRegistration: input.preselectedRegistration
        })
      )
      .filter((record) => record.componentName || record.partNumber || record.serialNumber)
    : [];
  const recordsWithDuplicateFlags = applyWorkbookDuplicateFlags(records);
  const structuralErrors = [
    ...(templateDetected ? [] : ["Control Maestro sheet was not found."]),
    ...(aircraftMetadata.detected ? [] : ["Aircraft metadata row 4/5 could not be read."]),
    ...(componentTable ? [] : ["Component header row 7 could not be read."]),
    ...(componentTable && !recordsWithDuplicateFlags.length ? ["No valid component rows were detected."] : [])
  ];
  const issues = [
    ...aircraftMetadata.issues,
    ...structuralErrors.map((message) => issue(0, "Workbook", "error", message, "", "Review official workbook structure.", selectedSheet?.name)),
    ...recordsWithDuplicateFlags.flatMap((record) => record.issues)
  ];
  const detectedHelicopters = buildDetectedHelicopters(recordsWithDuplicateFlags);
  const firstDetected = detectedHelicopters[0];

  return {
    fileName: input.fileName,
    worksheetNames: input.sheets.map((item) => item.name),
    activeWorksheetName: selectedSheet?.name ?? "",
    diagnostics: buildDiagnostics({
      parserName: "HSV_OFFICIAL_COMPONENT_WORKBOOK_V1",
      sheets: input.sheets,
      selectedSheet: selectedSheet?.name ?? "",
      metadata: aircraftMetadata,
      componentHeaderRowDetected: Boolean(componentTable),
      componentHeaderRow: componentTable ? HSV_IMPORT_COMPONENTS_V1.componentHeaderRowIndex + 1 : 0,
      records: recordsWithDuplicateFlags,
      extraErrors: structuralErrors
    }),
    aircraftMetadata,
    detectedHelicopter: firstDetected
      ? {
        registration: firstDetected.registration,
        model: firstDetected.model,
        serialNumber: firstDetected.serialNumber,
        currentHourmeter: firstDetected.currentHourmeter
      }
      : undefined,
    detectedHelicopters,
    records: recordsWithDuplicateFlags,
    issues,
    mappedColumns: componentTable ? mapColumns(componentTable.headerRow, input.mappingOverrides) : {},
    mappedFields: componentTable?.mappedFields ?? mergeMappedFields([]),
    columnOptions: buildColumnOptions(componentTable?.headerRow ?? []),
    recommendations: buildAuraRecommendations(recordsWithDuplicateFlags, aircraftMetadata, input.store),
    migrationId: generateId("mig"),
    parsedAt: new Date().toISOString()
  };
}

function applyWorkbookDuplicateFlags(records: ComponentImportRecord[]) {
  const duplicateCounts = new Map<string, number>();
  records.forEach((record) => {
    duplicateCounts.set(record.fingerprint, (duplicateCounts.get(record.fingerprint) ?? 0) + 1);
  });
  return records.map((record) => ({
    ...record,
    duplicateInWorkbook: (duplicateCounts.get(record.fingerprint) ?? 0) > 1,
    issues: (duplicateCounts.get(record.fingerprint) ?? 0) > 1
      ? [...record.issues, issue(record.rowNumber, "Duplicate", "warning", "Duplicate component fingerprint inside workbook preview.", record.fingerprint, "Review duplicate component identity.", record.worksheetName, record.helicopterRegistration)]
      : record.issues
  }));
}

function buildDiagnostics(input: {
  parserName: ComponentImportDiagnostics["parserName"];
  sheets: Array<{ name: string; rows: RawRow[] }>;
  selectedSheet: string;
  metadata: AircraftImportMetadata;
  componentHeaderRowDetected: boolean;
  componentHeaderRow: number;
  records: ComponentImportRecord[];
  extraErrors?: string[];
}): ComponentImportDiagnostics {
  const warnings = input.records.flatMap((record) => record.issues).filter((item) => item.severity === "warning").map((item) => item.message);
  const errors = [
    ...(input.extraErrors ?? []),
    ...input.metadata.issues.filter((item) => item.severity === "error").map((item) => item.message),
    ...input.records.flatMap((record) => record.issues).filter((item) => item.severity === "error").map((item) => item.message)
  ];
  return {
    parserName: input.parserName,
    templateName: input.parserName === "HSV_OFFICIAL_COMPONENT_WORKBOOK_V1" ? HSV_IMPORT_COMPONENTS_V1.officialTemplateName : "Generic component workbook",
    templateDetected: input.parserName === "HSV_OFFICIAL_COMPONENT_WORKBOOK_V1",
    sheetsFound: input.sheets.map((sheet) => sheet.name),
    selectedSheet: input.selectedSheet,
    metadataDetected: input.metadata.detected,
    metadataRowDetected: input.metadata.metadataRowDetected,
    metadataRowNumber: input.metadata.metadataRowNumber,
    metadataFields: {
      registration: input.metadata.registration,
      model: input.metadata.model,
      aircraftSerialNumber: input.metadata.aircraftSerialNumber,
      currentHourmeter: input.metadata.currentHourmeter > 0 ? input.metadata.currentHourmeter.toFixed(1) : "",
      missingFields: input.metadata.missingFields
    },
    componentHeaderRowDetected: input.componentHeaderRowDetected,
    componentHeaderRow: input.componentHeaderRow,
    componentRowsDetected: input.records.length,
    validComponents: input.records.filter((record) => !record.issues.some((item) => item.severity === "error")).length,
    warnings,
    errors
  };
}

function buildDetectedHelicopters(records: ComponentImportRecord[]): DetectedMigrationHelicopter[] {
  const grouped = new Map<string, ComponentImportRecord[]>();
  records.forEach((record) => {
    if (!record.helicopterRegistration) return;
    grouped.set(record.helicopterRegistration, [...(grouped.get(record.helicopterRegistration) ?? []), record]);
  });

  return [...grouped.entries()]
    .map(([registration, group]) => {
      const sample = group.find((record) => record.model || record.aircraftSerialNumber || record.currentHourmeter) ?? group[0];
      const issues = group.flatMap((record) => record.issues);
      return {
        registration,
        model: sample.model,
        serialNumber: sample.aircraftSerialNumber,
        currentHourmeter: sample.currentHourmeter,
        worksheetNames: [...new Set(group.map((record) => record.worksheetName))],
        componentCount: group.length,
        warnings: issues.filter((item) => item.severity === "warning").length,
        errors: issues.filter((item) => item.severity === "error").length,
        duplicates: group.filter((record) => record.duplicateInWorkbook || record.duplicateInStore).length,
        missingData: issues.filter((item) => ["Registration", "Component name", "P/N or S/N", "Life limit", "Position", "Installation date"].includes(item.field)).length,
        confidence: Math.round(group.reduce((sum, record) => sum + record.confidence, 0) / group.length)
      };
    })
    .sort((a, b) => a.registration.localeCompare(b.registration));
}

export function applyComponentImport(current: FleetStore, preview: ComponentImportPreview, options: ComponentImportOptions) {
  const started = Date.now();
  const selected = new Set(options.selectedRegistrations?.length ? options.selectedRegistrations : preview.detectedHelicopters.map((item) => item.registration));
  const validRecords = preview.records.filter((record) =>
    selected.has(record.helicopterRegistration) &&
    !record.issues.some((item) => item.severity === "error")
  );
  const importRegistrations = [...new Set(validRecords.map((record) => record.helicopterRegistration).filter(Boolean))];
  let nextHelicopters = [...current.helicopters];
  let nextComponents = options.mode === "replace-components"
    ? current.components.map((component) =>
      importRegistrations.includes(component.helicopterRegistration)
        ? { ...component, archived: true, status: "Removed" as ComponentStatus }
        : component
    )
    : [...current.components];

  for (const registration of importRegistrations) {
    const sample = validRecords.find((record) => record.helicopterRegistration === registration);
    const existing = nextHelicopters.find((helicopter) => helicopter.registration === registration);
    if (!existing && options.createHelicopter && sample) {
      nextHelicopters = [...nextHelicopters, buildHelicopter(sample)];
    } else if (existing && options.updateHelicopter && sample) {
      nextHelicopters = nextHelicopters.map((helicopter) =>
        helicopter.registration === registration
          ? {
            ...helicopter,
            model: sample.model || helicopter.model,
            serialNumber: sample.aircraftSerialNumber || helicopter.serialNumber,
            manufactureDate: sample.manufactureDate || helicopter.manufactureDate,
            manufactureYear: sample.manufactureDate || helicopter.manufactureYear,
            lastReviewDate: sample.reviewDate || helicopter.lastReviewDate,
            currentHourmeter: sample.currentHourmeter || helicopter.currentHourmeter,
            ownerCompany: sample.owner || helicopter.ownerCompany,
            operationArea: sample.operator || helicopter.operationArea,
            notes: appendImportNote(helicopter.notes),
            source: "User"
          }
          : helicopter
      );
    }
  }

  const importedComponents: HelicopterComponent[] = [];
  let skipped = 0;
  let updated = 0;
  let replaced = 0;
  const replacementEvents = [...current.replacementEvents];

  for (const record of validRecords) {
    const requestedAction = options.recordActions?.[importRecordKey(record)] ?? record.recommendedAction;
    if (requestedAction === "ignore" || requestedAction === "review") {
      skipped += 1;
      continue;
    }

    const existingIndex = nextComponents.findIndex((component) => component.id === record.matchedComponentId && !component.archived);
    const exactIndex = nextComponents.findIndex((component) => componentMatchKey(component) === record.duplicateKey && !component.archived);
    const targetIndex = existingIndex >= 0 ? existingIndex : exactIndex;
    const shouldReplace = requestedAction === "replace";
    const component = buildComponent(record, shouldReplace || targetIndex < 0 ? generateId("cmp") : nextComponents[targetIndex].id);

    if (targetIndex >= 0) {
      if (shouldReplace) {
        const removed = nextComponents[targetIndex];
        nextComponents = nextComponents.map((item, index) => index === targetIndex ? { ...item, archived: true, status: "Removed" as ComponentStatus } : item);
        nextComponents = [...nextComponents, component];
        importedComponents.push(component);
        replaced += 1;
        replacementEvents.push({
          id: generateId("rep"),
          helicopterRegistration: record.helicopterRegistration,
          removedComponent: `${removed.componentName} ${removed.partNumber} ${removed.serialNumber}`.trim(),
          installedComponent: `${record.componentName} ${record.partNumber} ${record.serialNumber}`.trim(),
          removalDate: new Date().toISOString().slice(0, 10),
          installationDate: record.installationDate || new Date().toISOString().slice(0, 10),
          removalHourmeter: record.currentHourmeter,
          installationHourmeter: record.currentHourmeter,
          reason: "AURA aircraft migration interpreted workbook row as component replacement.",
          approvedBy: "Administrator",
          notes: `Migration ID ${preview.migrationId}. Match confidence ${record.matchConfidence}%.`,
          source: "User"
        });
      } else if (options.mode === "merge-components" || options.mode === "replace-components" || requestedAction === "update") {
        nextComponents = nextComponents.map((item, index) => index === targetIndex ? component : item);
        importedComponents.push(component);
        updated += 1;
      } else {
        skipped += 1;
      }
    } else {
      nextComponents = [...nextComponents, component];
      importedComponents.push(component);
    }
  }

  const alerts = createAlertsForComponents(importedComponents)
    .filter((alert) => !current.maintenanceAlerts.some((existing) =>
      existing.componentId === alert.componentId &&
      existing.status !== "Resolved" &&
      existing.alertType === alert.alertType
    ));

  return {
    store: {
      ...current,
      helicopters: nextHelicopters,
      components: nextComponents,
      replacementEvents,
      maintenanceAlerts: [...current.maintenanceAlerts, ...alerts],
      migrationLogs: [
        ...(current.migrationLogs ?? []),
        {
          id: generateId("mlog"),
          migrationId: preview.migrationId,
          migrationDate: new Date().toISOString(),
          user: "Administrator",
          workbook: preview.fileName,
          aircraft: importRegistrations,
          componentsImported: importedComponents.length - updated - replaced,
          componentsUpdated: updated,
          componentsReplaced: replaced,
          warnings: preview.issues.filter((issue) => issue.severity === "warning").length,
          errors: preview.issues.filter((issue) => issue.severity === "error").length,
          durationMs: Date.now() - started,
          source: "User" as const
        }
      ]
    },
    summary: {
      imported: importedComponents.length,
      updated,
      replaced,
      skipped,
      alerts: alerts.length
    }
  };
}

export function hasBlockingImportIssues(preview?: ComponentImportPreview, selectedRegistrations?: string[], options: BlockingImportOptions = {}) {
  if (!preview) return true;
  const selected = new Set(selectedRegistrations?.length ? selectedRegistrations : preview.detectedHelicopters.map((item) => item.registration));
  if (preview.aircraftMetadata.issues.some((item) => item.severity === "error")) return true;
  return preview.issues.some((item) =>
    item.severity === "error" &&
    item.field !== "Aircraft metadata" &&
    !options.allowValidRowsOnly &&
    (!item.helicopterRegistration || selected.has(item.helicopterRegistration))
  );
}

export function importRecordKey(record: ComponentImportRecord) {
  return `${record.worksheetName}:${record.rowNumber}:${record.duplicateKey}`;
}

export function runOfficialComponentWorkbookV1SelfCheck(preview: ComponentImportPreview) {
  const diagnostics = preview.diagnostics;
  return {
    parserName: HSV_IMPORT_COMPONENTS_V1.parserName,
    templateDetected: diagnostics.templateDetected && diagnostics.parserName === "HSV_OFFICIAL_COMPONENT_WORKBOOK_V1",
    registrationDetected: Boolean(preview.aircraftMetadata.registration),
    aircraftSerialDetected: Boolean(preview.aircraftMetadata.aircraftSerialNumber),
    hourmeterDetected: Number.isFinite(preview.aircraftMetadata.currentHourmeter) && preview.aircraftMetadata.currentHourmeter > 0,
    atLeastOneValidComponentDetected: diagnostics.validComponents > 0,
    passed: diagnostics.templateDetected &&
      diagnostics.parserName === "HSV_OFFICIAL_COMPONENT_WORKBOOK_V1" &&
      Boolean(preview.aircraftMetadata.registration) &&
      Boolean(preview.aircraftMetadata.aircraftSerialNumber) &&
      Number.isFinite(preview.aircraftMetadata.currentHourmeter) &&
      preview.aircraftMetadata.currentHourmeter > 0 &&
      diagnostics.validComponents > 0
  };
}

function buildAuraRecommendations(records: ComponentImportRecord[], metadata: AircraftImportMetadata, store: FleetStore) {
  const recommendations: string[] = [];
  const existing = store.helicopters.find((helicopter) => helicopter.registration === metadata.registration);
  if (existing && metadata.currentHourmeter) {
    const hourDelta = Math.abs(existing.currentHourmeter - metadata.currentHourmeter);
    if (hourDelta > 0 && hourDelta <= 1) {
      recommendations.push(`Aircraft hours differ by ${hourDelta.toFixed(1)} hrs. Recommended: update aircraft total hours.`);
    } else if (hourDelta > 1) {
      recommendations.push(`Aircraft hours differ by ${hourDelta.toFixed(1)} hrs. Recommended: review hourmeter source before import.`);
    }
  }

  const replacements = records.filter((record) => record.matchType === "probable-replacement");
  if (replacements.length) {
    recommendations.push(`${replacements.length} component${replacements.length === 1 ? "" : "s"} appear replaced. Recommended: review comparison and create replacement history.`);
  }

  const missingSerials = records.filter((record) => !record.serialNumber);
  if (missingSerials.length) {
    recommendations.push(`${missingSerials.length} component${missingSerials.length === 1 ? "" : "s"} have no serial number. Recommended: review manually.`);
  }

  const critical = records.filter((record) => ["Critical", "Expired"].includes(record.status));
  if (critical.length) {
    recommendations.push(`${critical.length} component${critical.length === 1 ? "" : "s"} are Critical or Expired after recalculation. Recommended: review maintenance alerts before dispatch.`);
  }

  const lowConfidence = records.filter((record) => record.confidence < 75 || record.matchType === "low-confidence-review");
  if (lowConfidence.length) {
    recommendations.push(`${lowConfidence.length} component${lowConfidence.length === 1 ? "" : "s"} need manual review because confidence is below operational threshold.`);
  }

  if (!recommendations.length) {
    recommendations.push("Workbook structure is clear. Recommended: proceed after reviewing detected aircraft and component summary.");
  }

  return recommendations;
}

function selectImportSheet(sheets: Array<{ name: string; rows: RawRow[] }>, selectedSheetName?: string) {
  if (!sheets.length) return undefined;
  const selected = selectedSheetName ? sheets.find((sheet) => sheet.name === selectedSheetName) : undefined;
  if (selected) return selected;
  return sheets.find((sheet) => normalizeHeader(sheet.name) === normalizeHeader(HSV_IMPORT_COMPONENTS_V1.preferredSheetName))
    ?? sheets.find((sheet) => normalizeHeader(sheet.name).startsWith(normalizeHeader(HSV_IMPORT_COMPONENTS_V1.preferredSheetName)))
    ?? sheets[0];
}

function selectOfficialImportSheet(sheets: Array<{ name: string; rows: RawRow[] }>, selectedSheetName?: string) {
  const importSheets = sheets.filter((sheet) =>
    !HSV_IMPORT_COMPONENTS_V1.ignoredSheetNames.some((ignored) => normalizeHeader(ignored) === normalizeHeader(sheet.name))
  );
  if (selectedSheetName) {
    const selected = importSheets.find((sheet) => sheet.name === selectedSheetName);
    if (selected) return selected;
  }
  return importSheets.find((sheet) => normalizeHeader(sheet.name) === normalizeHeader(HSV_IMPORT_COMPONENTS_V1.preferredSheetName))
    ?? importSheets.find((sheet) => normalizeHeader(sheet.name) === normalizeHeader(HSV_IMPORT_COMPONENTS_V1.fallbackSheetName))
    ?? importSheets.find(isOfficialComponentSheet);
}

function hasOfficialWorkbookSignals(sheets: Array<{ name: string; rows: RawRow[] }>) {
  return sheets.some((sheet) =>
    normalizeHeader(sheet.name) === normalizeHeader(HSV_IMPORT_COMPONENTS_V1.preferredSheetName) ||
    normalizeHeader(sheet.name) === normalizeHeader(HSV_IMPORT_COMPONENTS_V1.fallbackSheetName)
  );
}

function isOfficialComponentSheet(sheet: { rows: RawRow[] }) {
  const metadataHeader = sheet.rows[HSV_IMPORT_COMPONENTS_V1.metadataHeaderRowIndex] ?? [];
  const componentHeader = sheet.rows[HSV_IMPORT_COMPONENTS_V1.componentHeaderRowIndex] ?? [];
  return scoreOfficialMetadataHeader(metadataHeader) >= 3 && scoreOfficialComponentHeader(componentHeader) >= 5;
}

function scoreOfficialMetadataHeader(row: RawRow) {
  const expected = ["matricula", "modelo", "fecha fabricacion", "s n aeronave", "fecha revision", "horometro"];
  return expected.filter((label, index) => normalizeHeader(row[index]) === label).length;
}

function scoreOfficialComponentHeader(row: RawRow) {
  const expectedWithRef = ["ref", "componente", "p n", "s n", "posicion", "fecha instalacion", "tsn hrs", "tso hrs", "limite vida hrs", "remanente hrs", "limite calendario anos", "remanente calendario anos", "limite de vida en anos", "remanente horas", "estado", "observaciones"];
  const expectedWithoutRef = ["componente", "p n", "s n", "fecha instalacion", "tsn hrs", "tso hrs", "limite vida hrs", "remanente hrs", "limite calendario anos", "remanente calendario anos", "limite de vida en anos", "remanente horas", "estado", "observaciones"];
  const score = (expected: string[]) => expected.filter((label, index) => {
    const actual = normalizeHeader(row[index]);
    return actual === label || actual.includes(label) || label.includes(actual);
  }).length;
  return Math.max(score(expectedWithRef), score(expectedWithoutRef));
}

const officialMetadataFields = [
  { key: "registration", label: "Registration", aliases: ["matricula", "registration", "aircraft registration", "helicopter registration"] },
  { key: "model", label: "Model", aliases: ["modelo", "model", "aircraft model", "helicopter model"] },
  { key: "manufactureDate", label: "Manufacture Date", aliases: ["fecha fabricacion", "manufacture date", "manufacturing date", "year manufacture"] },
  { key: "aircraftSerialNumber", label: "Aircraft Serial Number", aliases: ["s n aeronave", "sn aeronave", "serial aeronave", "aircraft serial number", "aircraft serial"] },
  { key: "reviewDate", label: "Review Date", aliases: ["fecha revision", "fecha inspeccion", "review date", "inspection date"] },
  { key: "currentHourmeter", label: "Current Hourmeter", aliases: ["horometro", "current hourmeter", "hourmeter", "hobbs"] }
] as const;

type OfficialMetadataKey = typeof officialMetadataFields[number]["key"];
type OfficialMetadataDetection = {
  values: Record<OfficialMetadataKey, unknown>;
  rowDetected: boolean;
  rowNumber: number;
  confidence: number;
};

function extractOfficialWorkbookMetadata(rows: RawRow[], worksheetName: string, overrides?: AircraftImportMetadataOverride): AircraftImportMetadata {
  const detected = detectOfficialWorkbookMetadata(rows);
  const normalized = {
    registration: normalizeRegistration(detected.values.registration),
    model: normalizeCell(detected.values.model),
    manufactureDate: parseDate(detected.values.manufactureDate, { allowYear: true }),
    aircraftSerialNumber: normalizeCell(detected.values.aircraftSerialNumber),
    reviewDate: parseDate(detected.values.reviewDate, { allowYear: false }),
    currentHourmeter: parseNumber(detected.values.currentHourmeter)
  };
  const missingFields = missingOfficialMetadataFields(normalized);
  const base: AircraftImportMetadata = {
    registration: normalized.registration,
    model: normalized.model,
    aircraftSerialNumber: normalized.aircraftSerialNumber,
    manufactureDate: normalized.manufactureDate,
    reviewDate: normalized.reviewDate,
    owner: "",
    operator: "",
    currentHourmeter: normalized.currentHourmeter,
    detected: detected.rowDetected && missingFields.length < officialMetadataFields.length,
    metadataRowDetected: detected.rowDetected,
    metadataRowNumber: detected.rowNumber,
    missingFields,
    manuallyConfirmed: false,
    confidence: detected.confidence,
    issues: []
  };
  const metadata: AircraftImportMetadata = {
    ...base,
    ...overrides,
    registration: normalizeRegistration(overrides?.registration ?? base.registration),
    model: normalizeCell(overrides?.model ?? base.model),
    aircraftSerialNumber: normalizeCell(overrides?.aircraftSerialNumber ?? base.aircraftSerialNumber),
    manufactureDate: parseDate(overrides?.manufactureDate ?? base.manufactureDate, { allowYear: true }),
    reviewDate: parseDate(overrides?.reviewDate ?? base.reviewDate),
    owner: normalizeCell(overrides?.owner ?? base.owner),
    operator: normalizeCell(overrides?.operator ?? base.operator),
    currentHourmeter: typeof overrides?.currentHourmeter === "number" ? overrides.currentHourmeter : base.currentHourmeter,
    metadataRowDetected: base.metadataRowDetected,
    metadataRowNumber: base.metadataRowNumber,
    missingFields: missingOfficialMetadataFields({
      registration: normalizeRegistration(overrides?.registration ?? base.registration),
      model: normalizeCell(overrides?.model ?? base.model),
      aircraftSerialNumber: normalizeCell(overrides?.aircraftSerialNumber ?? base.aircraftSerialNumber),
      manufactureDate: parseDate(overrides?.manufactureDate ?? base.manufactureDate, { allowYear: true }),
      reviewDate: parseDate(overrides?.reviewDate ?? base.reviewDate),
      currentHourmeter: typeof overrides?.currentHourmeter === "number" ? overrides.currentHourmeter : base.currentHourmeter
    }),
    manuallyConfirmed: Boolean(overrides?.manuallyConfirmed),
    confidence: overrides?.manuallyConfirmed ? 100 : base.confidence
  };
  metadata.issues = validateAircraftMetadata(metadata, worksheetName);
  return metadata;
}

function detectOfficialWorkbookMetadata(rows: RawRow[]): OfficialMetadataDetection {
  const fixed = readOfficialMetadataPair(rows, HSV_IMPORT_COMPONENTS_V1.metadataHeaderRowIndex, HSV_IMPORT_COMPONENTS_V1.metadataValueRowIndex);
  if (fixed.rowDetected) return fixed;

  const scanLimit = Math.min(rows.length, 10);
  const candidates = Array.from({ length: scanLimit }, (_, index) => readOfficialMetadataPair(rows, index, index + 1))
    .filter((candidate) => candidate.rowDetected)
    .sort((a, b) => b.confidence - a.confidence);

  return candidates[0] ?? {
    values: emptyOfficialMetadataValues(),
    rowDetected: false,
    rowNumber: 0,
    confidence: 0
  };
}

function readOfficialMetadataPair(rows: RawRow[], headerIndex: number, valueIndex: number): OfficialMetadataDetection {
  const headerRow = rows[headerIndex] ?? [];
  const valueRow = rows[valueIndex] ?? [];
  const values = emptyOfficialMetadataValues();
  let labelScore = 0;
  let valueScore = 0;

  officialMetadataFields.forEach((field) => {
    const columnIndex = findOfficialMetadataColumn(headerRow, field.aliases);
    if (columnIndex === undefined) return;
    labelScore += 1;
    const sameColumnValue = valueRow[columnIndex];
    const adjacentValue = findMetadataValue(rows, headerIndex, columnIndex);
    const value = normalizeCell(sameColumnValue) ? sameColumnValue : adjacentValue;
    values[field.key] = value;
    if (normalizeCell(value)) valueScore += 1;
  });

  const rowDetected = labelScore >= 3;
  return {
    values,
    rowDetected,
    rowNumber: rowDetected ? headerIndex + 1 : 0,
    confidence: rowDetected ? Math.min(100, Math.round((labelScore / officialMetadataFields.length) * 60 + (valueScore / officialMetadataFields.length) * 40)) : 0
  };
}

function findOfficialMetadataColumn(row: RawRow, aliases: readonly string[]) {
  let best: { index: number; score: number } | undefined;
  row.forEach((cell, index) => {
    const label = normalizeHeader(cell);
    if (!label) return;
    const score = scoreMetadataLabel(label, aliases);
    if (score < 72) return;
    if (!best || score > best.score) best = { index, score };
  });
  return best?.index;
}

function emptyOfficialMetadataValues(): Record<OfficialMetadataKey, unknown> {
  return {
    registration: "",
    model: "",
    manufactureDate: "",
    aircraftSerialNumber: "",
    reviewDate: "",
    currentHourmeter: ""
  };
}

function missingOfficialMetadataFields(metadata: Pick<AircraftImportMetadata, "registration" | "model" | "aircraftSerialNumber" | "manufactureDate" | "reviewDate" | "currentHourmeter">) {
  const missing: string[] = [];
  if (!metadata.registration) missing.push("Registration / Matrícula");
  if (!metadata.model) missing.push("Model / Modelo");
  if (!metadata.manufactureDate) missing.push("Manufacture Date / Fecha Fabricación");
  if (!metadata.aircraftSerialNumber) missing.push("Aircraft Serial Number / S/N Aeronave");
  if (!metadata.reviewDate) missing.push("Review Date / Fecha Revisión");
  if (!Number.isFinite(metadata.currentHourmeter) || metadata.currentHourmeter <= 0) missing.push("Current Hourmeter / Horómetro");
  return missing;
}

function findOfficialComponentTable(rows: RawRow[], overrides?: ComponentImportColumnOverride) {
  const headerRow = rows[HSV_IMPORT_COMPONENTS_V1.componentHeaderRowIndex] ?? [];
  if (scoreOfficialComponentHeader(headerRow) < 5) return undefined;
  const hasRefColumn = normalizeHeader(headerRow[0]).includes("ref");
  const officialMapping: Partial<Record<ComponentImportFieldKey, number>> = hasRefColumn ? {
    referenceNumber: 0,
    componentName: 1,
    partNumber: 2,
    serialNumber: 3,
    position: 4,
    installationDate: 5,
    tsnHours: 6,
    tsoHours: 7,
    lifeLimitHours: 8,
    remainingHours: 9,
    calendarLimitYears: 10,
    calendarLimitDate: 10,
    remainingCalendarDays: 11,
    lifeLimitYears: 12,
    remainingPercentage: 13,
    status: 14,
    notes: 15
  } : {
    componentName: 0,
    partNumber: 1,
    serialNumber: 2,
    installationDate: 3,
    tsnHours: 4,
    tsoHours: 5,
    lifeLimitHours: 6,
    remainingHours: 7,
    calendarLimitYears: 8,
    calendarLimitDate: 8,
    remainingCalendarDays: 9,
    lifeLimitYears: 10,
    remainingPercentage: 11,
    status: 12,
    notes: 13
  };
  const mapping = { ...officialMapping };
  if (overrides) {
    Object.entries(overrides).forEach(([field, index]) => {
      if (index === null) {
        delete mapping[field as ComponentImportFieldKey];
      } else if (index !== undefined) {
        mapping[field as ComponentImportFieldKey] = index;
      }
    });
  }
  const mappedFields = mapHeaderFields(headerRow, overrides).map((field) =>
    mapping[field.field] !== undefined
      ? buildColumnMapping(field.field, headerRow, mapping[field.field], field.confidence || 100, Boolean(overrides && Object.prototype.hasOwnProperty.call(overrides, field.field)), field.alternatives)
      : field
  );
  return {
    headerRow,
    mapping,
    mappedFields,
    rows: rows.slice(HSV_IMPORT_COMPONENTS_V1.componentDataStartRowIndex),
    startRowNumber: HSV_IMPORT_COMPONENTS_V1.componentDataStartRowIndex + 1
  };
}

function readComponentRows(rows: RawRow[]) {
  const accepted: RawRow[] = [];
  let blankCount = 0;
  for (const row of rows) {
    const isBlank = !row.some((cell) => normalizeCell(cell));
    if (isBlank) {
      blankCount += 1;
      if (blankCount >= 12) break;
      continue;
    }
    blankCount = 0;
    const componentName = normalizeCell(row[1]);
    const partNumber = normalizeCell(row[2]);
    const serialNumber = normalizeCell(row[3]);
    const visualTitle = normalizeCell(row[0]) && !componentName && !partNumber && !serialNumber;
    if (visualTitle) continue;
    accepted.push(row);
  }
  return accepted;
}

function findComponentTable(rows: RawRow[], overrides?: ComponentImportColumnOverride) {
  const candidates = rows.map((row, index) => {
    const mappedFields = mapHeaderFields(row, overrides);
    const mapping = mappingIndexesFromFields(mappedFields);
    const score = scoreComponentHeader(mappedFields, mapping);
    return { row, index, mappedFields, mapping, score };
  }).filter((candidate) =>
    candidate.score >= 130 &&
    candidate.mapping.componentName !== undefined &&
    (candidate.mapping.partNumber !== undefined || candidate.mapping.serialNumber !== undefined)
  ).sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best) return undefined;

  return {
    headerRow: best.row,
    mapping: best.mapping,
    mappedFields: best.mappedFields,
    rows: rows.slice(best.index + 1).filter((candidate) => candidate.some((cell) => normalizeCell(cell))),
    startRowNumber: best.index + 2
  };
}

function scoreComponentHeader(mappedFields: ComponentImportColumnMapping[], mapping: Partial<Record<ComponentImportFieldKey, number>>) {
  const expectedFields: ComponentImportFieldKey[] = [
    "componentName",
    "partNumber",
    "serialNumber",
    "position",
    "installationDate",
    "tsnHours",
    "tsoHours",
    "lifeLimitHours",
    "remainingHours",
    "calendarLimitYears",
    "calendarLimitDate",
    "remainingCalendarDays",
    "lifeLimitYears",
    "status",
    "notes"
  ];
  const mappedExpected = expectedFields.filter((field) => mapping[field] !== undefined);
  const confidence = mappedFields
    .filter((field) => expectedFields.includes(field.field) && field.columnIndex !== undefined)
    .reduce((sum, field) => sum + field.confidence, 0);
  const requiredBonus = mapping.componentName !== undefined ? 60 : 0;
  const identityBonus = mapping.partNumber !== undefined || mapping.serialNumber !== undefined ? 45 : 0;
  return confidence + mappedExpected.length * 12 + requiredBonus + identityBonus;
}

function mapHeaderIndexes(row: RawRow, overrides?: ComponentImportColumnOverride) {
  return mappingIndexesFromFields(mapHeaderFields(row, overrides));
}

function mapColumns(row: RawRow, overrides?: ComponentImportColumnOverride) {
  const mapping = mapHeaderIndexes(row, overrides);
  return Object.fromEntries(
    Object.entries(mapping).map(([field, index]) => [fieldLabels[field as ComponentImportFieldKey], normalizeCell(row[index as number])])
  );
}

function mapHeaderFields(row: RawRow, overrides?: ComponentImportColumnOverride): ComponentImportColumnMapping[] {
  const fields = Object.keys(fieldAliases) as ComponentImportFieldKey[];
  const candidatesByField = Object.fromEntries(
    fields.map((field) => [field, buildFieldCandidates(row, field)])
  ) as Record<ComponentImportFieldKey, ComponentImportColumnMapping["alternatives"]>;

  const manualMappings = new Map<ComponentImportFieldKey, ComponentImportColumnMapping>();
  fields.forEach((field) => {
    if (!overrides || !(field in overrides)) return;
    const columnIndex = overrides[field];
    manualMappings.set(field, buildColumnMapping(field, row, columnIndex ?? undefined, 100, true, candidatesByField[field]));
  });

  const acceptedColumns = new Set(
    [...manualMappings.values()]
      .map((mapping) => mapping.columnIndex)
      .filter((index): index is number => index !== undefined)
  );
  const autoMatches = fields
    .filter((field) => !manualMappings.has(field))
    .map((field) => {
      const best = candidatesByField[field][0];
      return best && best.confidence >= 58
        ? buildColumnMapping(field, row, best.columnIndex, best.confidence, false, candidatesByField[field])
        : buildColumnMapping(field, row, undefined, 0, false, candidatesByField[field]);
    })
    .sort((a, b) => b.confidence - a.confidence);

  const resolvedAuto = new Map<ComponentImportFieldKey, ComponentImportColumnMapping>();
  autoMatches.forEach((mapping) => {
    if (mapping.columnIndex === undefined || acceptedColumns.has(mapping.columnIndex)) {
      resolvedAuto.set(mapping.field, { ...mapping, columnIndex: undefined, header: "", confidence: 0 });
      return;
    }
    acceptedColumns.add(mapping.columnIndex);
    resolvedAuto.set(mapping.field, mapping);
  });

  return fields.map((field) => manualMappings.get(field) ?? resolvedAuto.get(field) ?? buildColumnMapping(field, row, undefined, 0, false, candidatesByField[field]));
}

function mappingIndexesFromFields(mappedFields: ComponentImportColumnMapping[]) {
  const mapping: Partial<Record<ComponentImportFieldKey, number>> = {};
  mappedFields.forEach((field) => {
    if (field.columnIndex !== undefined) mapping[field.field] = field.columnIndex;
  });
  return mapping;
}

function buildColumnMapping(
  field: ComponentImportFieldKey,
  row: RawRow,
  columnIndex: number | undefined,
  confidence: number,
  manuallyMapped: boolean,
  alternatives: ComponentImportColumnMapping["alternatives"]
): ComponentImportColumnMapping {
  return {
    field,
    label: fieldLabels[field],
    header: columnIndex === undefined ? "" : normalizeCell(row[columnIndex]),
    columnIndex,
    confidence,
    manuallyMapped,
    alternatives
  };
}

function buildFieldCandidates(row: RawRow, field: ComponentImportFieldKey) {
  return row
    .map((cell, index) => ({
      columnIndex: index,
      header: normalizeCell(cell),
      confidence: scoreHeaderForField(cell, field)
    }))
    .filter((candidate) => candidate.header && candidate.confidence >= 35)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);
}

function scoreHeaderForField(header: unknown, field: ComponentImportFieldKey) {
  const normalizedHeader = normalizeHeader(header);
  if (!normalizedHeader) return 0;
  const headerTokens = tokenizeHeader(normalizedHeader);
  let bestScore = 0;

  fieldAliases[field].forEach((alias) => {
    const normalizedAlias = normalizeHeader(alias);
    const aliasTokens = tokenizeHeader(normalizedAlias);
    if (!normalizedAlias) return;
    if (normalizedHeader === normalizedAlias) {
      bestScore = Math.max(bestScore, 100);
      return;
    }
    if (isCompactMatch(normalizedHeader, normalizedAlias)) {
      bestScore = Math.max(bestScore, 96);
    }
    if (normalizedHeader.includes(normalizedAlias) && normalizedAlias.length >= 3) {
      bestScore = Math.max(bestScore, 88);
    }
    if (normalizedAlias.includes(normalizedHeader) && normalizedHeader.length >= 3) {
      bestScore = Math.max(bestScore, 78);
    }
    const overlap = tokenOverlapScore(headerTokens, aliasTokens);
    if (overlap > 0) {
      bestScore = Math.max(bestScore, Math.round(42 + overlap * 42));
    }
    const editSimilarity = stringSimilarity(normalizedHeader, normalizedAlias);
    if (editSimilarity >= 0.72) {
      bestScore = Math.max(bestScore, Math.round(editSimilarity * 88));
    }
  });

  return Math.min(bestScore, 100);
}

function mergeMappedFields(mappings: ComponentImportColumnMapping[]) {
  const fields = Object.keys(fieldAliases) as ComponentImportFieldKey[];
  return fields.map((field) => {
    const candidates = mappings.filter((mapping) => mapping.field === field);
    return candidates.sort((a, b) => b.confidence - a.confidence)[0] ?? buildColumnMapping(field, [], undefined, 0, false, []);
  });
}

function buildColumnOptions(row: RawRow): ComponentImportColumnOption[] {
  return row
    .map((cell, index) => ({ index, header: normalizeCell(cell) }))
    .filter((option) => option.header);
}

function extractOfficialMetadata(rows: RawRow[], worksheetName: string, overrides?: AircraftImportMetadataOverride): AircraftImportMetadata {
  const detected = detectAircraftMetadata(rows);
  const base: AircraftImportMetadata = {
    registration: normalizeRegistration(detected.registration),
    model: normalizeCell(detected.model),
    aircraftSerialNumber: normalizeCell(detected.aircraftSerialNumber),
    manufactureDate: parseDate(detected.manufactureDate),
    reviewDate: parseDate(detected.reviewDate),
    owner: normalizeCell(detected.owner),
    operator: normalizeCell(detected.operator),
    currentHourmeter: parseNumber(detected.currentHourmeter),
    detected: detected.confidence >= 40,
    metadataRowDetected: detected.confidence >= 40,
    metadataRowNumber: 0,
    missingFields: [],
    manuallyConfirmed: false,
    confidence: detected.confidence,
    issues: []
  };
  const metadata: AircraftImportMetadata = {
    ...base,
    ...overrides,
    registration: normalizeRegistration(overrides?.registration ?? base.registration),
    model: normalizeCell(overrides?.model ?? base.model),
    aircraftSerialNumber: normalizeCell(overrides?.aircraftSerialNumber ?? base.aircraftSerialNumber),
    manufactureDate: parseDate(overrides?.manufactureDate ?? base.manufactureDate),
    reviewDate: parseDate(overrides?.reviewDate ?? base.reviewDate),
    owner: normalizeCell(overrides?.owner ?? base.owner),
    operator: normalizeCell(overrides?.operator ?? base.operator),
    currentHourmeter: typeof overrides?.currentHourmeter === "number" ? overrides.currentHourmeter : base.currentHourmeter,
    metadataRowDetected: base.metadataRowDetected,
    metadataRowNumber: base.metadataRowNumber,
    missingFields: missingOfficialMetadataFields({
      registration: normalizeRegistration(overrides?.registration ?? base.registration),
      model: normalizeCell(overrides?.model ?? base.model),
      aircraftSerialNumber: normalizeCell(overrides?.aircraftSerialNumber ?? base.aircraftSerialNumber),
      manufactureDate: parseDate(overrides?.manufactureDate ?? base.manufactureDate, { allowYear: true }),
      reviewDate: parseDate(overrides?.reviewDate ?? base.reviewDate),
      currentHourmeter: typeof overrides?.currentHourmeter === "number" ? overrides.currentHourmeter : base.currentHourmeter
    }),
    manuallyConfirmed: Boolean(overrides?.manuallyConfirmed),
    confidence: overrides?.manuallyConfirmed ? 100 : base.confidence
  };
  metadata.issues = validateAircraftMetadata(metadata, worksheetName);
  return metadata;
}

function detectAircraftMetadata(rows: RawRow[]) {
  const fields = {
    registration: ["registration", "aircraft registration", "matricula", "matrícula", "helicopter registration", "aeronave"],
    aircraftSerialNumber: ["aircraft serial", "aircraft s n", "aircraft sn", "serial aeronave", "s n aeronave", "serial number"],
    model: ["model", "modelo", "aircraft model", "helicopter model", "r44", "r44 raven", "r44 clipper"],
    currentHourmeter: ["current hourmeter", "hour meter", "horometro", "horómetro", "hobbs", "aircraft hours", "current hours"],
    manufactureDate: ["manufacture date", "fecha fabricacion", "fecha fabricación", "year", "ano fabricacion", "año fabricación"],
    reviewDate: ["inspection date", "review date", "fecha revision", "fecha revisión", "fecha inspeccion", "fecha inspección"],
    owner: ["owner", "owner company", "propietario", "dueno", "dueño"],
    operator: ["operator", "operador"]
  } as const;
  const values: Record<keyof typeof fields, { value: unknown; confidence: number }> = {
    registration: { value: "", confidence: 0 },
    aircraftSerialNumber: { value: "", confidence: 0 },
    model: { value: "", confidence: 0 },
    currentHourmeter: { value: "", confidence: 0 },
    manufactureDate: { value: "", confidence: 0 },
    reviewDate: { value: "", confidence: 0 },
    owner: { value: "", confidence: 0 },
    operator: { value: "", confidence: 0 }
  };

  rows.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      const label = normalizeHeader(cell);
      if (!label) return;
      (Object.keys(fields) as Array<keyof typeof fields>).forEach((field) => {
        const confidence = scoreMetadataLabel(label, fields[field]);
        if (confidence < 58) return;
        const value = findMetadataValue(rows, rowIndex, columnIndex);
        if (!normalizeCell(value)) return;
        if (confidence > values[field].confidence) {
          values[field] = { value, confidence };
        }
      });
    });
  });

  if (!values.registration.value) {
    const registration = rows.flat().map(normalizeCell).find((cell) => /^HP\d{4}$/i.test(cell));
    if (registration) values.registration = { value: registration, confidence: 76 };
  }

  const requiredConfidence = [values.registration, values.currentHourmeter, values.model, values.aircraftSerialNumber]
    .filter((item) => normalizeCell(item.value))
    .reduce((sum, item) => sum + item.confidence, 0);
  const confidence = Math.min(100, Math.round(requiredConfidence / 4 + (values.manufactureDate.value ? 8 : 0) + (values.reviewDate.value ? 8 : 0)));

  return {
    registration: values.registration.value,
    aircraftSerialNumber: values.aircraftSerialNumber.value,
    model: values.model.value,
    currentHourmeter: values.currentHourmeter.value,
    manufactureDate: values.manufactureDate.value,
    reviewDate: values.reviewDate.value,
    owner: values.owner.value,
    operator: values.operator.value,
    confidence
  };
}

function findMetadataValue(rows: RawRow[], rowIndex: number, columnIndex: number) {
  const sameRowRight = rows[rowIndex]?.[columnIndex + 1];
  if (normalizeCell(sameRowRight)) return sameRowRight;
  const nextRowSameColumn = rows[rowIndex + 1]?.[columnIndex];
  if (normalizeCell(nextRowSameColumn)) return nextRowSameColumn;
  const nextRowRight = rows[rowIndex + 1]?.[columnIndex + 1];
  if (normalizeCell(nextRowRight)) return nextRowRight;
  return "";
}

function scoreMetadataLabel(label: string, aliases: readonly string[]) {
  return aliases.reduce((best, alias) => {
    const normalizedAlias = normalizeHeader(alias);
    if (label === normalizedAlias) return Math.max(best, 100);
    if (isCompactMatch(label, normalizedAlias)) return Math.max(best, 96);
    if (label.includes(normalizedAlias) || normalizedAlias.includes(label)) return Math.max(best, 82);
    const similarity = stringSimilarity(label, normalizedAlias);
    return Math.max(best, similarity >= 0.72 ? Math.round(similarity * 88) : 0);
  }, 0);
}

function buildEmptyMetadata(overrides: AircraftImportMetadataOverride | undefined, worksheetName: string): AircraftImportMetadata {
  const metadataBase = {
    registration: normalizeRegistration(overrides?.registration ?? ""),
    model: overrides?.model ?? "",
    aircraftSerialNumber: overrides?.aircraftSerialNumber ?? "",
    manufactureDate: overrides?.manufactureDate ?? "",
    reviewDate: overrides?.reviewDate ?? "",
    owner: overrides?.owner ?? "",
    operator: overrides?.operator ?? "",
    currentHourmeter: typeof overrides?.currentHourmeter === "number" ? overrides.currentHourmeter : 0
  };
  const metadata: AircraftImportMetadata = {
    ...metadataBase,
    detected: false,
    metadataRowDetected: false,
    metadataRowNumber: 0,
    missingFields: missingOfficialMetadataFields(metadataBase),
    manuallyConfirmed: Boolean(overrides?.manuallyConfirmed),
    confidence: overrides?.manuallyConfirmed ? 100 : 0,
    issues: []
  };
  metadata.issues = validateAircraftMetadata(metadata, worksheetName);
  return metadata;
}

function validateAircraftMetadata(metadata: AircraftImportMetadata, worksheetName: string) {
  const issues: ImportIssue[] = [];
  if (!metadata.detected) {
    const missing = metadata.missingFields.length ? ` Missing: ${metadata.missingFields.join(", ")}.` : "";
    issues.push(issue(0, "Aircraft metadata", "error", `Aircraft metadata was not detected. Please confirm registration, model, serial number and hourmeter before importing components.${missing}`, "", "Enter metadata manually before import.", worksheetName));
  }
  if (!metadata.registration) {
    issues.push(issue(5, "Registration", "error", "Helicopter registration is required.", metadata.registration, "Enter Matrícula from the official workbook metadata row.", worksheetName));
  }
  if (!metadata.model) {
    issues.push(issue(5, "Model", "warning", "Aircraft model is recommended.", metadata.model, "Confirm Modelo before import.", worksheetName, metadata.registration));
  }
  if (!metadata.aircraftSerialNumber) {
    issues.push(issue(5, "Aircraft Serial Number", "warning", "Aircraft serial number is strongly recommended.", metadata.aircraftSerialNumber, "Confirm S/N Aeronave before import.", worksheetName, metadata.registration));
  }
  if (!Number.isFinite(metadata.currentHourmeter) || metadata.currentHourmeter <= 0) {
    issues.push(issue(5, "Current Hourmeter", "error", "Aircraft hourmeter is required.", String(metadata.currentHourmeter || ""), "Enter a valid Horómetro value.", worksheetName, metadata.registration));
  }
  return issues;
}

function rowToRecord(input: {
  row: RawRow;
  rowNumber: number;
  worksheetName: string;
  mapping: Partial<Record<ComponentImportFieldKey, number>>;
  metadata: AircraftImportMetadata;
  store: FleetStore;
  preselectedRegistration?: string;
}): ComponentImportRecord {
  const raw = (field: ComponentImportFieldKey) => input.mapping[field] === undefined ? "" : input.row[input.mapping[field]];
  const get = (field: ComponentImportFieldKey) => normalizeCell(raw(field));
  const registration = normalizeRegistration(get("registration") || input.preselectedRegistration || input.metadata.registration);
  const model = get("model") || input.metadata.model;
  const aircraftSerialNumber = get("aircraftSerialNumber") || input.metadata.aircraftSerialNumber;
  const manufactureDate = input.metadata.manufactureDate;
  const reviewDate = input.metadata.reviewDate;
  const owner = input.metadata.owner;
  const operator = input.metadata.operator;
  const currentHourmeter = parseNumber(raw("currentHourmeter")) || input.metadata.currentHourmeter;
  const lifeLimitHours = parseNumber(raw("lifeLimitHours"));
  const remainingHours = parseNumber(raw("remainingHours"));
  const calendarLimitYears = parseNumber(raw("calendarLimitYears"));
  const calendarRemainingYears = parseNumber(raw("remainingCalendarDays"));
  const lifeLimitYears = parseNumber(raw("lifeLimitYears"));
  const calendarLimitRaw = normalizeCell(raw("calendarLimitDate"));
  const calendarLimitDate = parseDate(raw("calendarLimitDate"));
  const installationDate = parseDate(raw("installationDate"));
  const derivedCalendarLimitDate = installationDate && calendarLimitYears > 0 ? addYearsToIsoDate(installationDate, calendarLimitYears) : "";
  const importedRemainingCalendarDays = parseNumber(raw("remainingCalendarDays"));
  const remainingCalendarDays = calendarLimitDate
    ? Math.ceil((new Date(calendarLimitDate).getTime() - Date.now()) / 86400000)
    : derivedCalendarLimitDate
      ? Math.ceil((new Date(derivedCalendarLimitDate).getTime() - Date.now()) / 86400000)
    : calendarRemainingYears > 0
      ? Math.round(calendarRemainingYears * 365)
      : importedRemainingCalendarDays;
  const remainingPercentage = normalizePercentage(parseNumber(get("remainingPercentage")) || calculateRemainingPercentage(remainingHours, lifeLimitHours));
  const recalculatedStatus = calculateComponentStatus({ remainingHours, remainingCalendarDays, remainingPercentage });
  const workbookStatus = get("status");
  const normalizedWorkbookStatus = normalizeStatus(workbookStatus);
  const record: ComponentImportRecord = {
    rowNumber: input.rowNumber,
    worksheetName: input.worksheetName,
    referenceNumber: get("referenceNumber"),
    helicopterRegistration: registration,
    model,
    aircraftSerialNumber,
    manufactureDate,
    reviewDate,
    owner,
    operator,
    currentHourmeter,
    category: get("category"),
    componentName: get("componentName"),
    partNumber: get("partNumber"),
    serialNumber: get("serialNumber"),
    position: get("position"),
    installationDate,
    tsnHours: parseNumber(raw("tsnHours")),
    tsoHours: parseNumber(raw("tsoHours")),
    lifeLimitHours,
    remainingHours,
    calendarLimitYears,
    calendarRemainingYears,
    lifeLimitYears,
    calendarLimitDate: calendarLimitDate || derivedCalendarLimitDate || calendarLimitRaw,
    remainingCalendarDays,
    remainingPercentage,
    workbookStatus,
    originalStatus: workbookStatus,
    status: recalculatedStatus,
    notes: get("notes"),
    issues: [],
    fingerprint: "",
    duplicateKey: "",
    duplicateInWorkbook: false,
    duplicateInStore: false,
    confidence: 0,
    matchType: "new",
    recommendedAction: "import",
    matchConfidence: 0,
    differences: []
  };

  record.duplicateKey = recordMatchKey(record);
  record.fingerprint = recordFingerprint(record);
  const match = evaluateComponentMatch(record, input.store.components);
  record.duplicateInStore = match.matchType !== "new";
  record.matchType = match.matchType;
  record.recommendedAction = match.recommendedAction;
  record.matchConfidence = match.matchConfidence;
  record.matchedComponentId = match.component?.id;
  record.matchedComponent = match.component;
  record.differences = match.differences;
  record.confidence = calculateRecordConfidence(record, input.metadata);
  record.issues = validateRecord(record, normalizedWorkbookStatus);
  if (record.duplicateInStore) {
    record.issues.push(recordIssue(record, "Match", match.matchType === "low-confidence-review" ? "warning" : "warning", match.message, `${record.matchConfidence}%`, match.suggestedFix));
  }
  return record;
}

function evaluateComponentMatch(record: ComponentImportRecord, components: HelicopterComponent[]) {
  const active = components.filter((component) => component.helicopterRegistration === record.helicopterRegistration && !component.archived);
  const exact = active.find((component) => componentMatchKey(component) === record.duplicateKey);
  if (exact) {
    return {
      component: exact,
      matchType: "exact-update" as const,
      recommendedAction: "update" as const,
      matchConfidence: 100,
      differences: componentDifferences(exact, record),
      message: "Same P/N, S/N and position detected. AURA recommends updating changed hours and status.",
      suggestedFix: "Update existing component."
    };
  }

  const samePartPosition = active.find((component) =>
    normalizeHeader(record.serialNumber) &&
    normalizeHeader(component.serialNumber) &&
    normalizeHeader(component.partNumber) &&
    normalizeHeader(component.partNumber) === normalizeHeader(record.partNumber) &&
    normalizeHeader(component.position) === normalizeHeader(record.position) &&
    normalizeHeader(component.serialNumber) !== normalizeHeader(record.serialNumber)
  );
  if (samePartPosition) {
    return {
      component: samePartPosition,
      matchType: "probable-replacement" as const,
      recommendedAction: "replace" as const,
      matchConfidence: 92,
      differences: componentDifferences(samePartPosition, record),
      message: "Same P/N and position with different S/N detected. AURA interprets this as a probable replacement.",
      suggestedFix: "Review replacement, then replace existing component if correct."
    };
  }

  const sameSerialDifferentPart = active.find((component) =>
    normalizeHeader(component.serialNumber) &&
    normalizeHeader(component.serialNumber) === normalizeHeader(record.serialNumber) &&
    normalizeHeader(component.partNumber) !== normalizeHeader(record.partNumber)
  );
  if (sameSerialDifferentPart) {
    return {
      component: sameSerialDifferentPart,
      matchType: "low-confidence-review" as const,
      recommendedAction: "review" as const,
      matchConfidence: 58,
      differences: componentDifferences(sameSerialDifferentPart, record),
      message: "Same S/N with different P/N detected. AURA requires manual review before migration.",
      suggestedFix: "Review component identity before import."
    };
  }

  if (!record.serialNumber) {
    const scored = active.map((component) => ({
      component,
      score: scoreComponentIdentity(component, record)
    })).sort((a, b) => b.score - a.score)[0];
    if (scored && scored.score >= 70) {
      return {
        component: scored.component,
        matchType: "probable-match" as const,
        recommendedAction: "update" as const,
        matchConfidence: scored.score,
        differences: componentDifferences(scored.component, record),
        message: "Missing S/N. AURA matched by component name, P/N and position with confidence score.",
        suggestedFix: "Review probable match before update."
      };
    }
  }

  return {
    component: undefined,
    matchType: "new" as const,
    recommendedAction: "import" as const,
    matchConfidence: 100,
    differences: [],
    message: "No existing component match detected.",
    suggestedFix: "Import as new component."
  };
}

function scoreComponentIdentity(component: HelicopterComponent, record: ComponentImportRecord) {
  let score = 0;
  if (normalizeHeader(component.componentName) === normalizeHeader(record.componentName)) score += 35;
  if (normalizeHeader(component.partNumber) && normalizeHeader(component.partNumber) === normalizeHeader(record.partNumber)) score += 35;
  if (normalizeHeader(component.position) === normalizeHeader(record.position)) score += 20;
  if (stringSimilarity(normalizeHeader(component.componentName), normalizeHeader(record.componentName)) >= 0.82) score += 10;
  return Math.min(score, 100);
}

function componentDifferences(component: HelicopterComponent, record: ComponentImportRecord): ComponentMatchDifference[] {
  const comparisons: Array<[string, string | number, string | number]> = [
    ["Serial", component.serialNumber, record.serialNumber],
    ["Part Number", component.partNumber, record.partNumber],
    ["Position", component.position, record.position],
    ["TSN", component.tsnHours, record.tsnHours],
    ["TSO", component.tsoHours, record.tsoHours],
    ["Installation Date", component.installationDate, record.installationDate],
    ["Remaining Life", component.remainingHours, record.remainingHours],
    ["Status", component.status, record.status]
  ];
  return comparisons
    .filter(([, currentValue, importedValue]) => normalizeCell(currentValue) !== normalizeCell(importedValue))
    .map(([field, currentValue, importedValue]) => ({
      field,
      currentValue: normalizeCell(currentValue) || "N/A",
      importedValue: normalizeCell(importedValue) || "N/A"
    }));
}

function calculateRecordConfidence(record: ComponentImportRecord, metadata: AircraftImportMetadata) {
  let confidence = 45;
  if (record.helicopterRegistration) confidence += 10;
  if (record.componentName) confidence += 12;
  if (record.partNumber) confidence += 10;
  if (record.serialNumber) confidence += 10;
  if (record.position) confidence += 5;
  if (record.lifeLimitHours > 0 || record.remainingHours > 0 || record.calendarLimitYears > 0 || record.calendarRemainingYears > 0 || record.lifeLimitYears > 0 || record.calendarLimitDate) confidence += 5;
  confidence = Math.round((confidence + record.matchConfidence + metadata.confidence) / 3);
  if (record.matchType === "low-confidence-review") confidence = Math.min(confidence, 72);
  if (!record.serialNumber) confidence = Math.min(confidence, 82);
  return Math.max(0, Math.min(confidence, 100));
}

function validateRecord(record: ComponentImportRecord, workbookStatus?: ComponentStatus) {
  const issues: ImportIssue[] = [];
  if (!record.helicopterRegistration) issues.push(recordIssue(record, "Registration", "error", "Helicopter registration is required.", record.helicopterRegistration, "Confirm Matrícula in aircraft metadata."));
  if (!record.componentName) issues.push(recordIssue(record, "Component name", "error", "Component name is required.", record.componentName, "Map or enter Componente."));
  if (!record.partNumber && !record.serialNumber) issues.push(recordIssue(record, "P/N or S/N", "warning", "Part number or serial number is missing.", "", "Review P/N or S/N if available."));
  if (record.lifeLimitHours <= 0 && record.remainingHours <= 0 && record.calendarLimitYears <= 0 && record.calendarRemainingYears <= 0 && record.lifeLimitYears <= 0 && !record.calendarLimitDate) issues.push(recordIssue(record, "Life limit", "error", "At least one component limit is required.", "", "Provide Límite vida, Remanente, Límite calendario, Remanente calendario, or Límite de vida en años."));
  if (!record.position) issues.push(recordIssue(record, "Position", "warning", "Position is missing.", record.position, "Confirm component position if available."));
  if (!record.installationDate) issues.push(recordIssue(record, "Installation date", "warning", "Installation date is recommended.", record.installationDate, "Confirm Fecha instalación if available."));
  if (record.installationDate && !isValidIsoDate(record.installationDate)) issues.push(recordIssue(record, "Installation date", "error", "Installation date is invalid.", record.installationDate, "Use a valid date."));
  if (record.tsnHours < 0 || record.tsoHours < 0 || record.lifeLimitHours < 0 || record.remainingHours < 0) issues.push(recordIssue(record, "Hours", "error", "Hour values cannot be negative.", "", "Correct negative hour values."));
  if (workbookStatus && workbookStatus !== record.status) issues.push(recordIssue(record, "Status", "warning", `Workbook status ${workbookStatus} differs from recalculated status ${record.status}.`, workbookStatus, `System will use ${record.status}.`));
  return issues;
}

function buildHelicopter(record: ComponentImportRecord): Helicopter {
  return {
    registration: record.helicopterRegistration,
    model: record.model || "Unknown model",
    serialNumber: record.aircraftSerialNumber || "",
    manufactureYear: record.manufactureDate || "",
    manufactureDate: record.manufactureDate,
    lastReviewDate: record.reviewDate,
    currentHourmeter: record.currentHourmeter,
    status: "Available",
    ownerCompany: record.owner,
    assignedVessel: "",
    operationArea: record.operator,
    base: "",
    notes: "Created from Excel component-control import.",
    readiness: 100,
    nextDueComponent: record.componentName,
    nextDueHours: record.remainingHours,
    source: "User"
  };
}

function buildComponent(record: ComponentImportRecord, id: string): HelicopterComponent {
  const notes = [
    record.referenceNumber ? `Ref: ${record.referenceNumber}` : "",
    record.notes
  ].filter(Boolean).join("\n");
  return {
    id,
    helicopterRegistration: record.helicopterRegistration,
    category: record.category || "Uncategorized",
    componentName: record.componentName,
    partNumber: record.partNumber,
    serialNumber: record.serialNumber,
    position: record.position || "N/A",
    installationDate: record.installationDate,
    tsnHours: record.tsnHours,
    tsoHours: record.tsoHours,
    lifeLimitHours: record.lifeLimitHours,
    remainingHours: record.remainingHours,
    calendarLimitDate: record.calendarLimitDate,
    remainingCalendarDays: record.remainingCalendarDays,
    remainingPercentage: record.remainingPercentage,
    status: record.status,
    notes,
    documents: 0,
    source: "User"
  };
}

function recordMatchKey(record: ComponentImportRecord) {
  return [
    record.helicopterRegistration,
    record.componentName,
    record.partNumber,
    record.serialNumber,
    record.position
  ].map(normalizeHeader).join("|");
}

function recordFingerprint(record: ComponentImportRecord) {
  return [
    record.helicopterRegistration,
    record.componentName,
    record.partNumber,
    record.serialNumber,
    record.position,
    record.installationDate,
    record.tsnHours,
    record.tsoHours,
    record.lifeLimitHours,
    record.remainingHours
  ].map(normalizeHeader).join("|");
}

function componentMatchKey(component: HelicopterComponent) {
  return [
    component.helicopterRegistration,
    component.componentName,
    component.partNumber,
    component.serialNumber,
    component.position
  ].map(normalizeHeader).join("|");
}

function tokenizeHeader(value: string) {
  return value.split(" ").filter(Boolean);
}

function isCompactMatch(left: string, right: string) {
  return left.replace(/\s/g, "") === right.replace(/\s/g, "");
}

function tokenOverlapScore(left: string[], right: string[]) {
  if (!left.length || !right.length) return 0;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union ? intersection / union : 0;
}

function stringSimilarity(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);
  if (!maxLength) return 1;
  return 1 - levenshteinDistance(left, right) / maxLength;
}

function levenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previousDiagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const insert = previous[rightIndex] + 1;
      const remove = previous[rightIndex - 1] + 1;
      const replace = previousDiagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      previousDiagonal = previous[rightIndex];
      previous[rightIndex] = Math.min(insert, remove, replace);
    }
  }
  return previous[right.length];
}

function normalizeStatus(value: string): ComponentStatus | undefined {
  const normalized = normalizeHeader(value);
  if (!normalized) return undefined;
  if (normalized.includes("removed") || normalized.includes("removido")) return "Removed";
  if (normalized.includes("expired") || normalized.includes("expirado") || normalized.includes("vencido")) return "Expired";
  if (normalized.includes("critical") || normalized.includes("critico")) return "Critical";
  if (normalized.includes("monitor") || normalized.includes("monitorear")) return "Monitor";
  if (normalized === "ok") return "OK";
  return undefined;
}

function issue(
  rowNumber: number,
  field: string,
  severity: ImportIssueSeverity,
  message: string,
  currentValue?: string,
  suggestedFix?: string,
  worksheetName?: string,
  helicopterRegistration?: string
): ImportIssue {
  return { rowNumber, field, severity, message, currentValue, suggestedFix, worksheetName, helicopterRegistration };
}

function recordIssue(record: ComponentImportRecord, field: string, severity: ImportIssueSeverity, message: string, currentValue?: string, suggestedFix?: string) {
  return issue(record.rowNumber, field, severity, message, currentValue, suggestedFix, record.worksheetName, record.helicopterRegistration);
}

function appendImportNote(notes: string) {
  return notes.includes("Excel component-control import") ? notes : `${notes ? `${notes}\n` : ""}Updated from Excel component-control import.`;
}

function normalizeRegistration(value: unknown) {
  return normalizeCell(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeHeader(value: unknown) {
  return normalizeCell(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[%#.:/()_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCell(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let cell = normalizeCell(value)
    .replace(/hrs?/gi, "")
    .replace(/hours?/gi, "")
    .replace(/%/g, "")
    .replace(/\s/g, "");
  if (cell.includes(",") && cell.includes(".")) {
    cell = cell.replace(/,/g, "");
  } else if (cell.includes(",")) {
    cell = cell.replace(/,/g, ".");
  }
  const cleaned = cell.match(/-?\d+(\.\d+)?/);
  return cleaned ? Number(cleaned[0]) : 0;
}

function normalizePercentage(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value > 0 && value <= 1 ? value * 100 : Math.min(value, 100);
}

function parseDate(value: unknown, options: { allowYear?: boolean } = {}) {
  if (typeof value === "number" && options.allowYear && value >= 1900 && value <= 2100 && Number.isInteger(value)) {
    return String(value);
  }
  if (typeof value === "number" && value > 20000 && value < 70000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + value);
    return epoch.toISOString().slice(0, 10);
  }

  const cell = normalizeCell(value);
  if (!cell) return "";
  if (/^\d{4}$/.test(cell) && options.allowYear) return cell;
  if (/^\d+(\.\d+)?$/.test(cell)) return "";
  const isoDate = cell.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) return cell;
  const slashDate = cell.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashDate) {
    const [, day, month, year] = slashDate;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const date = new Date(Date.UTC(Number(fullYear), Number(month) - 1, Number(day)));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  const normalized = cell
    .replace(/ENE/gi, "JAN")
    .replace(/FEB/gi, "FEB")
    .replace(/MAR/gi, "MAR")
    .replace(/ABR/gi, "APR")
    .replace(/MAY/gi, "MAY")
    .replace(/JUN/gi, "JUN")
    .replace(/JUL/gi, "JUL")
    .replace(/AGO/gi, "AUG")
    .replace(/SEP/gi, "SEP")
    .replace(/OCT/gi, "OCT")
    .replace(/NOV/gi, "NOV")
    .replace(/DIC/gi, "DEC");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function addYearsToIsoDate(value: string, years: number) {
  if (!isValidIsoDate(value) || !Number.isFinite(years) || years <= 0) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCFullYear(date.getUTCFullYear() + Math.floor(years));
  return date.toISOString().slice(0, 10);
}

function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}
