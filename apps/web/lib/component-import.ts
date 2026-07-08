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
  currentHourmeter: number;
  detected: boolean;
  manuallyConfirmed: boolean;
  issues: ImportIssue[];
};

export type ComponentImportRecord = {
  rowNumber: number;
  worksheetName: string;
  helicopterRegistration: string;
  model: string;
  aircraftSerialNumber: string;
  manufactureDate: string;
  reviewDate: string;
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
  calendarLimitDate: string;
  remainingCalendarDays: number;
  remainingPercentage: number;
  workbookStatus?: string;
  originalStatus?: string;
  status: ComponentStatus;
  notes: string;
  issues: ImportIssue[];
  duplicateKey: string;
  duplicateInWorkbook: boolean;
  duplicateInStore: boolean;
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
};

export type ComponentImportPreview = {
  fileName: string;
  worksheetNames: string[];
  activeWorksheetName: string;
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
};

export type AircraftImportMetadataOverride = Partial<Pick<
  AircraftImportMetadata,
  "registration" | "model" | "aircraftSerialNumber" | "manufactureDate" | "reviewDate" | "currentHourmeter" | "manuallyConfirmed"
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
};

export type BlockingImportOptions = {
  allowValidRowsOnly?: boolean;
};

type RawRow = unknown[];
export type ComponentImportFieldKey =
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
  | "calendarLimitDate"
  | "remainingPercentage"
  | "status"
  | "notes";

export const HSV_IMPORT_COMPONENTS_V1 = {
  templateName: "HSV-IMPORT-COMPONENTS-v1.xlsx",
  preferredSheetName: "Control Maestro",
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
  registration: ["registration", "matricula", "matrícula", "reg", "reg.", "aircraft", "helicopter", "aeronave", "helicoptero", "helicóptero", "aircraft registration", "helicopter registration"],
  model: ["model", "modelo"],
  aircraftSerialNumber: ["aircraft serial number", "serial aeronave", "sn aeronave", "s/n aeronave", "aircraft sn"],
  currentHourmeter: ["current hourmeter", "horometro", "horómetro", "horometro aeronave", "hourmeter", "hobbs"],
  componentName: ["component name", "component", "componente", "nombre componente"],
  category: ["component category", "category", "categoria", "categoría"],
  partNumber: ["part number", "part no", "part", "pn", "p/n", "numero parte", "n parte", "número de parte"],
  serialNumber: ["serial number", "serial no", "serial", "sn", "s/n", "numero serie", "número de serie"],
  position: ["position", "posicion", "posición"],
  installationDate: ["installation date", "fecha instalacion", "fecha instalación", "fecha instalado"],
  tsnHours: ["tsn", "tsn hrs", "tsn hours", "tsn (hrs)"],
  tsoHours: ["tso", "tso hrs", "tso hours", "tso (hrs)"],
  lifeLimitHours: ["life limit hours", "life limit", "life limit hrs", "limit hours", "limite vida horas", "limite vida hrs", "limite vida (hrs)", "límite vida (hrs)", "limite de vida horas"],
  remainingHours: ["remaining hours", "hours remaining", "life remaining", "remaining life", "remanente hrs", "remanente horas", "remanente (hrs)", "horas remanentes", "vida remanente"],
  calendarLimitDate: ["calendar limit date", "calendar limit", "calendar", "expiration", "expiration date", "expiry", "expiry date", "expires", "limite calendario", "límite calendario", "vencimiento", "fecha vencimiento", "expiracion", "expiración", "remanente calendario", "remanente calendario (anos)", "remanente calendario (años)"],
  remainingPercentage: ["remaining percentage", "remaining %", "% remaining", "% remanente", "% remanente horas", "porcentaje remanente"],
  status: ["status", "estado"],
  notes: ["notes", "observations", "observaciones", "notas"]
};

const fieldLabels: Record<ComponentImportFieldKey, string> = {
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
  calendarLimitDate: "Calendar limit date",
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
    duplicateCounts.set(record.duplicateKey, (duplicateCounts.get(record.duplicateKey) ?? 0) + 1);
  });

  const recordsWithDuplicateFlags = records.map((record) => ({
    ...record,
    duplicateInWorkbook: (duplicateCounts.get(record.duplicateKey) ?? 0) > 1,
    issues: (duplicateCounts.get(record.duplicateKey) ?? 0) > 1
      ? [...record.issues, issue(record.rowNumber, "Duplicate", "warning", "Duplicate component match inside workbook preview.", record.duplicateKey, "Review duplicate component identity.", record.worksheetName, record.helicopterRegistration)]
      : record.issues
  }));

  const issues = [
    ...aircraftMetadata.issues,
    ...(parsedWorksheets.length ? [] : [issue(0, "Workbook", "error", "No component table was detected in the workbook.")]),
    ...recordsWithDuplicateFlags.flatMap((record) => record.issues)
  ];
  const detectedHelicopters = buildDetectedHelicopters(recordsWithDuplicateFlags);
  const firstDetected = detectedHelicopters[0];

  return {
    fileName: input.fileName,
    worksheetNames: input.sheets.map((sheet) => sheet.name),
    activeWorksheetName: activeSheet?.name ?? "",
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
    columnOptions
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
        missingData: issues.filter((item) => ["Registration", "Component name", "P/N or S/N", "Life limit", "Position", "Installation date"].includes(item.field)).length
      };
    })
    .sort((a, b) => a.registration.localeCompare(b.registration));
}

export function applyComponentImport(current: FleetStore, preview: ComponentImportPreview, options: ComponentImportOptions) {
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

  for (const record of validRecords) {
    const existingIndex = nextComponents.findIndex((component) => componentMatchKey(component) === record.duplicateKey && !component.archived);
    const component = buildComponent(record, existingIndex >= 0 ? nextComponents[existingIndex].id : generateId("cmp"));

    if (existingIndex >= 0) {
      if (options.mode === "merge-components" || options.mode === "replace-components") {
        nextComponents = nextComponents.map((item, index) => index === existingIndex ? component : item);
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
      maintenanceAlerts: [...current.maintenanceAlerts, ...alerts]
    },
    summary: {
      imported: importedComponents.length,
      updated,
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

function selectImportSheet(sheets: Array<{ name: string; rows: RawRow[] }>, selectedSheetName?: string) {
  if (!sheets.length) return undefined;
  const selected = selectedSheetName ? sheets.find((sheet) => sheet.name === selectedSheetName) : undefined;
  if (selected) return selected;
  return sheets.find((sheet) => normalizeHeader(sheet.name) === normalizeHeader(HSV_IMPORT_COMPONENTS_V1.preferredSheetName))
    ?? sheets.find((sheet) => normalizeHeader(sheet.name).startsWith(normalizeHeader(HSV_IMPORT_COMPONENTS_V1.preferredSheetName)))
    ?? sheets[0];
}

function findComponentTable(rows: RawRow[], overrides?: ComponentImportColumnOverride) {
  const officialHeaderRow = rows[HSV_IMPORT_COMPONENTS_V1.componentHeaderRowIndex];
  if (officialHeaderRow) {
    const mappedFields = mapHeaderFields(officialHeaderRow, overrides);
    const mapping = mappingIndexesFromFields(mappedFields);
    if (mapping.componentName !== undefined && (mapping.partNumber !== undefined || mapping.serialNumber !== undefined)) {
      return {
        headerRow: officialHeaderRow,
        mapping,
        mappedFields,
        rows: rows
          .slice(HSV_IMPORT_COMPONENTS_V1.componentDataStartRowIndex)
          .filter((candidate) => candidate.some((cell) => normalizeCell(cell))),
        startRowNumber: HSV_IMPORT_COMPONENTS_V1.componentDataStartRowIndex + 1
      };
    }
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const autoMapping = mapHeaderIndexes(row);
    if (autoMapping.componentName !== undefined && (autoMapping.partNumber !== undefined || autoMapping.serialNumber !== undefined)) {
      const mappedFields = mapHeaderFields(row, overrides);
      const mapping = mappingIndexesFromFields(mappedFields);
      return {
        headerRow: row,
        mapping,
        mappedFields,
        rows: rows.slice(index + 1).filter((candidate) => candidate.some((cell) => normalizeCell(cell))),
        startRowNumber: index + 2
      };
    }
  }
  return undefined;
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
  const headerRow = rows[HSV_IMPORT_COMPONENTS_V1.metadataHeaderRowIndex] ?? [];
  const valueRow = rows[HSV_IMPORT_COMPONENTS_V1.metadataValueRowIndex] ?? [];
  const valueFor = (aliases: string[]) => {
    const index = headerRow.findIndex((header) => aliases.some((alias) => normalizeHeader(header) === normalizeHeader(alias)));
    return index >= 0 ? valueRow[index] : "";
  };
  const base: AircraftImportMetadata = {
    registration: normalizeRegistration(valueFor(["Matrícula", "Matricula", "Registration"])),
    model: normalizeCell(valueFor(["Modelo", "Model"])),
    aircraftSerialNumber: normalizeCell(valueFor(["S/N Aeronave", "SN Aeronave", "Serial Aeronave", "Aircraft Serial Number"])),
    manufactureDate: parseDate(valueFor(["Fecha Fabricación", "Fecha Fabricacion", "Manufacture Date"])),
    reviewDate: parseDate(valueFor(["Fecha Revisión", "Fecha Revision", "Review Date"])),
    currentHourmeter: parseNumber(valueFor(["Horómetro", "Horometro", "Current Hourmeter", "Hourmeter"])),
    detected: headerRow.length > 0 && valueRow.length > 0,
    manuallyConfirmed: false,
    issues: []
  };
  const metadata: AircraftImportMetadata = {
    ...base,
    ...overrides,
    registration: normalizeRegistration(overrides?.registration ?? base.registration),
    currentHourmeter: typeof overrides?.currentHourmeter === "number" ? overrides.currentHourmeter : base.currentHourmeter,
    manuallyConfirmed: Boolean(overrides?.manuallyConfirmed)
  };
  metadata.issues = validateAircraftMetadata(metadata, worksheetName);
  return metadata;
}

function buildEmptyMetadata(overrides: AircraftImportMetadataOverride | undefined, worksheetName: string): AircraftImportMetadata {
  const metadata: AircraftImportMetadata = {
    registration: normalizeRegistration(overrides?.registration ?? ""),
    model: overrides?.model ?? "",
    aircraftSerialNumber: overrides?.aircraftSerialNumber ?? "",
    manufactureDate: overrides?.manufactureDate ?? "",
    reviewDate: overrides?.reviewDate ?? "",
    currentHourmeter: typeof overrides?.currentHourmeter === "number" ? overrides.currentHourmeter : 0,
    detected: false,
    manuallyConfirmed: Boolean(overrides?.manuallyConfirmed),
    issues: []
  };
  metadata.issues = validateAircraftMetadata(metadata, worksheetName);
  return metadata;
}

function validateAircraftMetadata(metadata: AircraftImportMetadata, worksheetName: string) {
  const issues: ImportIssue[] = [];
  if (!metadata.detected) {
    issues.push(issue(0, "Aircraft metadata", "error", "Aircraft metadata was not detected. Please confirm registration, model, serial number and hourmeter before importing components.", "", "Enter metadata manually before import.", worksheetName));
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
  const currentHourmeter = parseNumber(raw("currentHourmeter")) || input.metadata.currentHourmeter;
  const lifeLimitHours = parseNumber(raw("lifeLimitHours"));
  const remainingHours = parseNumber(raw("remainingHours"));
  const calendarLimitRaw = normalizeCell(raw("calendarLimitDate"));
  const calendarLimitDate = parseDate(raw("calendarLimitDate"));
  const remainingCalendarDays = calendarLimitDate ? Math.ceil((new Date(calendarLimitDate).getTime() - Date.now()) / 86400000) : 0;
  const remainingPercentage = normalizePercentage(parseNumber(get("remainingPercentage")) || calculateRemainingPercentage(remainingHours, lifeLimitHours));
  const recalculatedStatus = calculateComponentStatus({ remainingHours, remainingCalendarDays, remainingPercentage });
  const workbookStatus = get("status");
  const normalizedWorkbookStatus = normalizeStatus(workbookStatus);
  const record: ComponentImportRecord = {
    rowNumber: input.rowNumber,
    worksheetName: input.worksheetName,
    helicopterRegistration: registration,
    model,
    aircraftSerialNumber,
    manufactureDate,
    reviewDate,
    currentHourmeter,
    category: get("category"),
    componentName: get("componentName"),
    partNumber: get("partNumber"),
    serialNumber: get("serialNumber"),
    position: get("position"),
    installationDate: parseDate(raw("installationDate")),
    tsnHours: parseNumber(raw("tsnHours")),
    tsoHours: parseNumber(raw("tsoHours")),
    lifeLimitHours,
    remainingHours,
    calendarLimitDate: calendarLimitDate || calendarLimitRaw,
    remainingCalendarDays,
    remainingPercentage,
    workbookStatus,
    originalStatus: workbookStatus,
    status: recalculatedStatus,
    notes: get("notes"),
    issues: [],
    duplicateKey: "",
    duplicateInWorkbook: false,
    duplicateInStore: false
  };

  record.duplicateKey = recordMatchKey(record);
  record.duplicateInStore = input.store.components.some((component) => componentMatchKey(component) === record.duplicateKey && !component.archived);
  record.issues = validateRecord(record, normalizedWorkbookStatus);
  if (record.duplicateInStore) {
    record.issues.push(recordIssue(record, "Duplicate", "warning", "Matching component already exists in local HeliServiX OS data.", record.duplicateKey, "Use merge, replace, or skip duplicates."));
  }
  return record;
}

function validateRecord(record: ComponentImportRecord, workbookStatus?: ComponentStatus) {
  const issues: ImportIssue[] = [];
  if (!record.helicopterRegistration) issues.push(recordIssue(record, "Registration", "error", "Helicopter registration is required.", record.helicopterRegistration, "Confirm Matrícula in aircraft metadata."));
  if (!record.componentName) issues.push(recordIssue(record, "Component name", "error", "Component name is required.", record.componentName, "Map or enter Componente."));
  if (!record.partNumber && !record.serialNumber) issues.push(recordIssue(record, "P/N or S/N", "error", "Part number or serial number is required for component import.", "", "Enter P/N or S/N."));
  if (record.lifeLimitHours <= 0 && record.remainingHours <= 0 && !record.calendarLimitDate) issues.push(recordIssue(record, "Life limit", "error", "At least one component limit is required.", "", "Provide Límite vida, Remanente, or Límite calendario."));
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
    ownerCompany: "",
    assignedVessel: "",
    operationArea: "",
    base: "",
    notes: "Created from Excel component-control import.",
    readiness: 100,
    nextDueComponent: record.componentName,
    nextDueHours: record.remainingHours,
    source: "User"
  };
}

function buildComponent(record: ComponentImportRecord, id: string): HelicopterComponent {
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
    notes: record.notes,
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
    .replace(/[%#./()_-]/g, " ")
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

function parseDate(value: unknown) {
  if (typeof value === "number" && value > 20000 && value < 70000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + value);
    return epoch.toISOString().slice(0, 10);
  }

  const cell = normalizeCell(value);
  if (!cell || /^\d+(\.\d+)?$/.test(cell)) return "";
  const slashDate = cell.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashDate) {
    const [, day, month, year] = slashDate;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const date = new Date(Date.UTC(Number(fullYear), Number(month) - 1, Number(day)));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  const normalized = cell
    .replace(/ENE/gi, "JAN")
    .replace(/ABR/gi, "APR")
    .replace(/AGO/gi, "AUG")
    .replace(/DIC/gi, "DEC");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}
