import {
  applyFlightLogRules,
  applyStockMovementRules,
  generateId
} from "@/lib/fleet-ops";
import type {
  FleetStore,
  FlightLog,
  InventoryItem,
  MaintenanceLogEntry,
  StockMovement
} from "@/types/fleet";

export type WorkbookSheet = {
  name: string;
  rows: unknown[][];
};

export type InventoryImportField =
  | "itemName"
  | "partNumber"
  | "serialNumber"
  | "category"
  | "quantity"
  | "unit"
  | "storageLocation"
  | "vessel"
  | "helicopter"
  | "notes";

export type InventoryRowClassification =
  | "New item"
  | "Existing item update"
  | "Quantity adjustment"
  | "Possible duplicate"
  | "Missing part number"
  | "Missing serial number"
  | "Manual review required";

export type InventoryImportAction = "import" | "update" | "replace" | "skip" | "review";

export type InventoryImportRecord = {
  key: string;
  worksheetName: string;
  rowNumber: number;
  itemName: string;
  partNumber: string;
  serialNumber: string;
  category: string;
  quantity: number;
  unitOfMeasure: string;
  storageLocation: string;
  vesselName: string;
  vesselId: string;
  helicopterRegistration: string;
  notes: string;
  classification: InventoryRowClassification;
  recommendedAction: InventoryImportAction;
  confidence: number;
  warnings: string[];
  errors: string[];
  duplicateInWorkbook: boolean;
  existingItemId?: string;
  differenceSummary: string[];
  possibleConsumption: boolean;
};

export type WeeklyReportPreview = {
  vesselName: string;
  vesselId: string;
  helicopterRegistration: string;
  campaignName: string;
  campaignId: string;
  weekNumber: string;
  reportDate: string;
  flightHours: number;
  hobbsStart: number;
  hobbsEnd: number;
  maintenanceActions: string[];
  componentsChanged: string[];
  inventoryUsage: InventoryImportRecord[];
  notes: string[];
};

export type InventoryImportPreview = {
  fileName: string;
  worksheetNames: string[];
  activeWorksheetName: string;
  mappedFields: Array<{
    field: InventoryImportField;
    label: string;
    header: string;
    columnIndex?: number;
    confidence: number;
    status: "auto-mapped" | "needs-review" | "blocked" | "optional" | "manual";
    sampleValues: string[];
    warning?: string;
    evidence: string;
    manuallyMapped: boolean;
  }>;
  columnOptions: Array<{ index: number; header: string }>;
  records: InventoryImportRecord[];
  weeklyReport: WeeklyReportPreview;
  recommendations: string[];
  detected: {
    vesselName: string;
    vesselId: string;
    helicopterRegistration: string;
    campaignName: string;
    campaignId: string;
    storageLocation: string;
  };
};

export type InventoryImportOptions = {
  vesselId: string;
  storageLocation: string;
  campaignId?: string;
  helicopterRegistration?: string;
  mode: "merge" | "replace-bodega" | "skip-duplicates";
  importValidRowsOnly: boolean;
  updateExisting: boolean;
  applyFlightHours: boolean;
  createMaintenanceDraft: boolean;
  createStockMovementDrafts: boolean;
  rowActions: Record<string, InventoryImportAction>;
};

type Mapping = Partial<Record<InventoryImportField, number>>;
export type InventoryImportColumnOverride = Partial<Record<InventoryImportField, number | null>>;

const fieldAliases: Record<InventoryImportField, string[]> = {
  itemName: ["item name", "name", "nombre", "descripcion", "descripción", "description", "item", "articulo", "artículo", "material"],
  partNumber: ["p/n", "pn", "part number", "part no", "part no.", "numero de parte", "número de parte", "numero parte", "nº parte", "no parte"],
  serialNumber: ["s/n", "sn", "serial", "serial number", "serial no", "serial no.", "numero de serie", "número de serie", "numero serie"],
  category: ["category", "categoria", "categoría", "item type", "tipo", "tipo item", "clase", "familia"],
  quantity: ["quantity", "qty", "cantidad", "existencia", "stock"],
  unit: ["unit", "unidad", "u/m", "um", "uom", "medida"],
  storageLocation: ["bodega", "storage", "location", "ubicacion", "ubicación", "almacen", "almacén"],
  vessel: ["vessel", "barco", "buque", "embarcacion", "embarcación"],
  helicopter: ["helicopter", "helicoptero", "helicóptero", "aircraft", "aeronave", "matricula", "matrícula"],
  notes: ["notes", "observations", "observaciones", "nota", "comentario", "remarks"]
};

const fieldLabels: Record<InventoryImportField, string> = {
  itemName: "Item name",
  partNumber: "Part number",
  serialNumber: "Serial number",
  category: "Category",
  quantity: "Quantity",
  unit: "Unit",
  storageLocation: "Bodega / storage location",
  vessel: "Vessel",
  helicopter: "Helicopter",
  notes: "Notes"
};

export function buildInventoryImportPreview(input: {
  fileName: string;
  sheets: WorkbookSheet[];
  store: FleetStore;
  context?: {
    vesselId?: string;
    campaignId?: string;
    helicopterRegistration?: string;
  };
  mappingOverrides?: InventoryImportColumnOverride;
}): InventoryImportPreview {
  const sheetPreview = input.sheets
    .map((sheet) => ({ sheet, table: findInventoryTable(sheet.rows, input.mappingOverrides) }))
    .filter((item) => item.table)
    .sort((a, b) => b.table!.score - a.table!.score)[0];
  const sheet = sheetPreview?.sheet ?? input.sheets[0] ?? { name: "", rows: [] };
  const table = sheetPreview?.table;
  const metadata = detectWeeklyMetadata(input.sheets, input.store, input.context);
  const mapping = table?.mapping ?? {};
  const mappedFields = (Object.keys(fieldAliases) as InventoryImportField[]).map((field) => {
    const columnIndex = mapping[field];
    const sampleValues = columnIndex === undefined ? [] : sampleColumnValues(table?.rows ?? [], columnIndex);
    const manuallyMapped = Boolean(input.mappingOverrides && Object.prototype.hasOwnProperty.call(input.mappingOverrides, field));
    const initialConfidence = columnIndex === undefined ? 0 : manuallyMapped ? 100 : scoreHeaderForField(table?.headerRow[columnIndex], field);
    const warning = columnIndex === undefined ? undefined : validateColumnSamples(field, sampleValues);
    const confidence = warning && !manuallyMapped ? Math.min(initialConfidence, 79) : initialConfidence;
    return {
    field,
    label: fieldLabels[field],
      header: columnIndex === undefined ? "" : normalizeCell(table?.headerRow[columnIndex]),
      columnIndex,
      confidence,
      status: getMappingStatus(field, confidence, manuallyMapped, columnIndex !== undefined),
      sampleValues,
      warning,
      evidence: columnIndex === undefined ? "No matching column met the safe mapping threshold." : `Header "${normalizeCell(table?.headerRow[columnIndex])}" matched ${fieldLabels[field]}.`,
      manuallyMapped
    };
  });

  const records = table
    ? table.rows
      .map((row, index) => rowToRecord({
        row,
        rowNumber: table.startRowNumber + index,
        worksheetName: sheet.name,
        mapping,
        store: input.store,
        metadata
      }))
      .filter((record) => record.itemName || record.partNumber || record.serialNumber)
    : [];

  const duplicateCounts = new Map<string, number>();
  records.forEach((record) => {
    duplicateCounts.set(record.key, (duplicateCounts.get(record.key) ?? 0) + 1);
  });
  const recordsWithDuplicates = records.map((record) => ({
    ...record,
    duplicateInWorkbook: (duplicateCounts.get(record.key) ?? 0) > 1,
    classification: (duplicateCounts.get(record.key) ?? 0) > 1 && record.classification !== "Manual review required"
      ? "Possible duplicate" as const
      : record.classification,
    warnings: (duplicateCounts.get(record.key) ?? 0) > 1
      ? [...record.warnings, "Possible duplicate row in workbook."]
      : record.warnings
  }));

  const weeklyReport: WeeklyReportPreview = {
    ...metadata,
    inventoryUsage: recordsWithDuplicates.filter((record) => record.possibleConsumption)
  };

  return {
    fileName: input.fileName,
    worksheetNames: input.sheets.map((item) => item.name),
    activeWorksheetName: sheet.name,
    mappedFields,
    columnOptions: buildColumnOptions(table?.headerRow ?? []),
    records: recordsWithDuplicates,
    weeklyReport,
    recommendations: buildRecommendations(recordsWithDuplicates, weeklyReport),
    detected: {
      vesselName: metadata.vesselName,
      vesselId: metadata.vesselId,
      helicopterRegistration: metadata.helicopterRegistration,
      campaignName: metadata.campaignName,
      campaignId: metadata.campaignId,
      storageLocation: firstValue(recordsWithDuplicates.map((record) => record.storageLocation))
    }
  };
}

export function applyInventoryImport(current: FleetStore, preview: InventoryImportPreview, options: InventoryImportOptions): FleetStore {
  const validRecords = preview.records.filter((record) => {
    const action = options.rowActions[record.key] ?? record.recommendedAction;
    if (action === "skip" || action === "review") return false;
    if (options.importValidRowsOnly && record.errors.length) return false;
    return true;
  });
  const targetVesselId = options.vesselId || preview.detected.vesselId;
  const targetStorage = options.storageLocation || preview.detected.storageLocation || "Unassigned bodega";
  const targetCampaign = options.campaignId || preview.weeklyReport.campaignId;
  const targetHelicopter = options.helicopterRegistration || preview.weeklyReport.helicopterRegistration;

  let nextInventory = options.mode === "replace-bodega"
    ? current.inventoryItems.map((item) =>
      item.vesselId === targetVesselId && normalizeKey(item.storageLocation) === normalizeKey(targetStorage)
        ? { ...item, archived: true }
        : item
    )
    : [...current.inventoryItems];
  let nextMovements = [...current.stockMovements];

  validRecords.forEach((record) => {
    const action = options.rowActions[record.key] ?? record.recommendedAction;
    const existingIndex = nextInventory.findIndex((item) => item.id === record.existingItemId && !item.archived);
    const item = buildInventoryItem(record, targetVesselId, targetStorage, targetHelicopter);
    if (existingIndex >= 0 && action !== "replace") {
      if (options.mode === "skip-duplicates" && record.duplicateInWorkbook) return;
      if (!options.updateExisting && record.classification !== "New item") return;
      nextInventory = nextInventory.map((existing, index) =>
        index === existingIndex
          ? { ...existing, ...item, id: existing.id, notes: mergeNotes(existing.notes, item.notes), source: "User" }
          : existing
      );
    } else {
      nextInventory = [...nextInventory, item];
    }
  });

  if (options.createStockMovementDrafts) {
    validRecords.filter((record) => record.possibleConsumption && record.existingItemId).forEach((record) => {
      const movement: StockMovement = {
        id: generateId("mov"),
        inventoryItemId: record.existingItemId!,
        movementType: "Consumed",
        fromLocation: targetStorage,
        toLocation: "Maintenance event draft",
        quantity: record.quantity,
        date: preview.weeklyReport.reportDate || new Date().toISOString().slice(0, 10),
        relatedMaintenanceEvent: targetCampaign,
        notes: `Draft from weekly operations report ${preview.fileName}. ${record.notes}`.trim(),
        source: "User"
      };
      nextMovements = [...nextMovements, movement];
      nextInventory = applyStockMovementRules(nextInventory, movement);
    });
  }

  let nextStore: FleetStore = {
    ...current,
    inventoryItems: nextInventory,
    stockMovements: nextMovements
  };

  if (options.applyFlightHours && preview.weeklyReport.flightHours > 0 && targetHelicopter) {
    const helicopter = current.helicopters.find((item) => item.registration === targetHelicopter);
    const hobbsStart = preview.weeklyReport.hobbsStart || helicopter?.currentHourmeter || 0;
    const hobbsEnd = preview.weeklyReport.hobbsEnd || hobbsStart + preview.weeklyReport.flightHours;
    const log: FlightLog = {
      id: generateId("fl"),
      helicopterRegistration: targetHelicopter,
      vesselName: preview.weeklyReport.vesselName,
      campaign: preview.weeklyReport.campaignName,
      flightDate: preview.weeklyReport.reportDate || new Date().toISOString().slice(0, 10),
      pilot: "",
      mechanic: "",
      hobbsStart,
      hobbsEnd,
      flightHours: Math.max(0, hobbsEnd - hobbsStart || preview.weeklyReport.flightHours),
      notes: `Draft imported from weekly operations report ${preview.fileName}. Confirmed by user before applying.`,
      approvalStatus: "Approved",
      source: "User"
    };
    nextStore = applyFlightLogRules(nextStore, log, "create");
  }

  if (options.createMaintenanceDraft && targetHelicopter && preview.weeklyReport.maintenanceActions.length) {
    const entry: MaintenanceLogEntry = {
      id: generateId("mlog"),
      helicopterRegistration: targetHelicopter,
      date: preview.weeklyReport.reportDate || new Date().toISOString().slice(0, 10),
      maintenanceType: "Weekly operations report draft",
      description: preview.weeklyReport.maintenanceActions.join("\n"),
      technician: "Imported technician report",
      relatedComponentId: "",
      actionTaken: preview.weeklyReport.componentsChanged.length ? preview.weeklyReport.componentsChanged.join("\n") : "Review imported maintenance notes.",
      evidencePlaceholder: preview.fileName,
      notes: `Draft generated by AURA from weekly operations report. Campaign: ${preview.weeklyReport.campaignName || "N/A"}.`,
      source: "User"
    };
    nextStore = {
      ...nextStore,
      maintenanceLogs: [...nextStore.maintenanceLogs, entry]
    };
  }

  return nextStore;
}

export function hasBlockingInventoryImportIssues(preview?: InventoryImportPreview, selectedVesselId?: string, selectedStorageLocation?: string) {
  if (!preview) return true;
  const byField = new Map(preview.mappedFields.map((field) => [field.field, field]));
  const itemName = byField.get("itemName");
  const quantity = byField.get("quantity");
  const partNumber = byField.get("partNumber");
  if (!isSafeInventoryMapping(itemName)) return true;
  if (!isSafeInventoryMapping(quantity)) return true;
  if (partNumber?.columnIndex !== undefined && !isSafeInventoryMapping(partNumber)) return true;
  if (!selectedVesselId && !preview.detected.vesselId) return true;
  if (!selectedStorageLocation && !preview.detected.storageLocation) return true;
  return false;
}

export function exportInventoryPdfDocument(input: {
  items: InventoryItem[];
  store: FleetStore;
  vesselId?: string;
  storageLocation?: string;
  campaignName?: string;
}) {
  const vessel = input.store.vessels.find((item) => item.id === input.vesselId);
  const rows = input.items.filter((item) =>
    (!input.vesselId || item.vesselId === input.vesselId) &&
    (!input.storageLocation || item.storageLocation === input.storageLocation)
  );
  const generatedAt = new Date().toLocaleString();
  const summary = {
    totalItems: rows.length,
    lowStock: rows.filter((item) => item.quantity <= item.minimumStock).length,
    serialized: rows.filter((item) => item.serialNumber?.trim()).length,
    withoutSerial: rows.filter((item) => !item.serialNumber?.trim()).length
  };
  const tableRows = rows.map((item) => {
    const itemVessel = input.store.vessels.find((v) => v.id === item.vesselId);
    return `<tr>
      <td>${escapeHtml(item.itemName)}</td>
      <td>${escapeHtml(item.partNumber || "N/A")}</td>
      <td>${escapeHtml(item.serialNumber || "N/A")}</td>
      <td>${escapeHtml(item.itemType)}</td>
      <td>${item.quantity} ${escapeHtml(item.unitOfMeasure)}</td>
      <td>${escapeHtml(item.storageLocation || "N/A")}</td>
      <td>${escapeHtml(item.relatedHelicopter || "N/A")}</td>
      <td>${escapeHtml(item.condition || "N/A")}</td>
      <td>${escapeHtml(item.notes || "")}</td>
      <td>${escapeHtml(item.source ?? "Demo")}</td>
      <td>${escapeHtml(itemVessel?.name ?? item.vesselId)}</td>
    </tr>`;
  }).join("");
  const documentHtml = `<!doctype html>
    <html>
      <head>
        <title>HeliServiX OS Inventory PDF</title>
        <style>
          body { margin: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #122033; background: #fff; }
          header { background: #071a33; color: white; padding: 28px 34px; }
          .brand { font-size: 22px; font-weight: 800; letter-spacing: .02em; }
          .subtitle { color: #b9d8ff; margin-top: 4px; font-size: 13px; }
          main { padding: 28px 34px; }
          .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 22px; }
          .card { border: 1px solid #d9e3ee; border-radius: 10px; padding: 12px; background: #f8fbff; }
          .label { color: #607089; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .value { margin-top: 5px; font-size: 14px; font-weight: 700; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 8px 0 22px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #e8f2ff; color: #071a33; text-align: left; padding: 9px; border-bottom: 1px solid #b9d8ff; }
          td { padding: 8px 9px; border-bottom: 1px solid #edf2f7; vertical-align: top; }
          footer { margin-top: 24px; color: #607089; font-size: 11px; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <header>
          <div class="brand">HeliServiX OS</div>
          <div class="subtitle">Aircraft Operations Intelligence Platform · Vessel Inventory Report</div>
        </header>
        <main>
          <section class="meta">
            <div class="card"><div class="label">Vessel</div><div class="value">${escapeHtml(vessel?.name ?? "All vessels")}</div></div>
            <div class="card"><div class="label">Bodega / Storage</div><div class="value">${escapeHtml(input.storageLocation || "All locations")}</div></div>
            <div class="card"><div class="label">Campaign / Faena</div><div class="value">${escapeHtml(input.campaignName || vessel?.campaign || "N/A")}</div></div>
            <div class="card"><div class="label">Helicopter</div><div class="value">${escapeHtml(vessel?.assignedHelicopter || "N/A")}</div></div>
            <div class="card"><div class="label">Report date</div><div class="value">${escapeHtml(generatedAt)}</div></div>
            <div class="card"><div class="label">Data indicator</div><div class="value">${rows.some((item) => item.source === "User") ? "Real/imported and demo records" : "Demo records"}</div></div>
          </section>
          <section class="summary">
            <div class="card"><div class="label">Total items</div><div class="value">${summary.totalItems}</div></div>
            <div class="card"><div class="label">Low stock</div><div class="value">${summary.lowStock}</div></div>
            <div class="card"><div class="label">Items with S/N</div><div class="value">${summary.serialized}</div></div>
            <div class="card"><div class="label">Items without S/N</div><div class="value">${summary.withoutSerial}</div></div>
          </section>
          <table>
            <thead><tr><th>Item</th><th>P/N</th><th>S/N</th><th>Category</th><th>Quantity</th><th>Bodega</th><th>Aircraft</th><th>Status</th><th>Notes</th><th>Source</th><th>Vessel</th></tr></thead>
            <tbody>${tableRows || "<tr><td colspan='11'>No inventory records available.</td></tr>"}</tbody>
          </table>
          <footer>Generated by HeliServiX OS. Review operational records before dispatch or procurement decisions.</footer>
        </main>
      </body>
    </html>`;
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(documentHtml);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function findInventoryTable(rows: unknown[][], overrides?: InventoryImportColumnOverride) {
  return rows
    .map((row, index) => {
      const mapping = mapHeader(row, overrides);
      const score = scoreMapping(mapping);
      return {
        headerRow: row,
        mapping,
        score,
        startRowNumber: index + 2,
        rows: rows.slice(index + 1).filter((candidate) => candidate.some((cell) => normalizeCell(cell)))
      };
    })
    .filter((item) => item.score >= 120)
    .sort((a, b) => b.score - a.score)[0];
}

function mapHeader(row: unknown[], overrides?: InventoryImportColumnOverride): Mapping {
  const used = new Set<number>();
  const manualMapping: Mapping = {};
  if (overrides) {
    Object.entries(overrides).forEach(([field, index]) => {
      if (index === null || index === undefined) return;
      manualMapping[field as InventoryImportField] = index;
      used.add(index);
    });
  }
  return Object.fromEntries((Object.keys(fieldAliases) as InventoryImportField[]).map((field) => {
    if (manualMapping[field] !== undefined) return [field, manualMapping[field]];
    if (overrides && field in overrides && overrides[field] === null) return [field, undefined];
    const candidates = row
      .map((cell, index) => ({ index, score: scoreHeaderForField(cell, field) }))
      .filter((candidate) => candidate.score >= 80 && !used.has(candidate.index))
      .sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best) return [field, undefined];
    used.add(best.index);
    return [field, best.index];
  }).filter(([, index]) => index !== undefined)) as Mapping;
}

function scoreMapping(mapping: Mapping) {
  return (mapping.itemName !== undefined ? 80 : 0) +
    (mapping.quantity !== undefined ? 70 : 0) +
    (mapping.partNumber !== undefined ? 35 : 0) +
    (mapping.serialNumber !== undefined ? 25 : 0) +
    (mapping.storageLocation !== undefined ? 25 : 0) +
    Object.keys(mapping).length * 8;
}

function rowToRecord(input: {
  row: unknown[];
  rowNumber: number;
  worksheetName: string;
  mapping: Mapping;
  store: FleetStore;
  metadata: WeeklyReportPreview;
}): InventoryImportRecord {
  const raw = (field: InventoryImportField) => input.mapping[field] === undefined ? "" : input.row[input.mapping[field]!];
  const itemName = normalizeCell(raw("itemName"));
  const partNumber = normalizeCell(raw("partNumber"));
  const serialNumber = normalizeCell(raw("serialNumber"));
  const category = normalizeCell(raw("category"));
  const quantity = parseNumber(raw("quantity"));
  const storageLocation = normalizeCell(raw("storageLocation")) || firstValue([input.metadata.notes.find((note) => normalizeKey(note).includes("bodega"))]) || "";
  const vesselName = normalizeCell(raw("vessel")) || input.metadata.vesselName;
  const vesselId = matchVesselId(input.store, vesselName) || input.metadata.vesselId;
  const helicopterRegistration = normalizeRegistration(normalizeCell(raw("helicopter")) || input.metadata.helicopterRegistration);
  const notes = normalizeCell(raw("notes"));
  const unitOfMeasure = normalizeCell(raw("unit")) || "ea";
  const existing = findExistingInventory(input.store.inventoryItems, {
    vesselId,
    storageLocation,
    itemName,
    partNumber,
    serialNumber
  });
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!itemName) errors.push("Item name is required.");
  if (!Number.isFinite(quantity) || quantity < 0) errors.push("Quantity must be zero or greater.");
  if (!partNumber) warnings.push("Missing part number.");
  if (!serialNumber) warnings.push("Missing serial number.");
  if (!storageLocation) warnings.push("Bodega is missing; select a storage location before import.");
  const possibleConsumption = /used|consumed|installed|usage|uso|usado|consumido|instalado|cambio/i.test(notes);
  const differences = existing
    ? [
      existing.quantity !== quantity ? `Quantity ${existing.quantity} -> ${quantity}` : "",
      existing.storageLocation !== storageLocation ? `Bodega ${existing.storageLocation} -> ${storageLocation}` : "",
      existing.condition !== "Serviceable" ? `Condition ${existing.condition}` : ""
    ].filter(Boolean)
    : [];
  const classification = classifyRecord({ errors, warnings, existing, differences, partNumber, serialNumber });
  return {
    key: [
      vesselId,
      storageLocation,
      itemName,
      partNumber,
      serialNumber
    ].map(normalizeKey).join("|"),
    worksheetName: input.worksheetName,
    rowNumber: input.rowNumber,
    itemName,
    partNumber,
    serialNumber,
    category,
    quantity,
    unitOfMeasure,
    storageLocation,
    vesselName,
    vesselId,
    helicopterRegistration,
    notes,
    classification,
    recommendedAction: classification === "Manual review required" ? "review" : existing ? "update" : "import",
    confidence: calculateConfidence({ itemName, partNumber, serialNumber, quantity, storageLocation, existing: Boolean(existing), errors }),
    warnings,
    errors,
    duplicateInWorkbook: false,
    existingItemId: existing?.id,
    differenceSummary: differences,
    possibleConsumption
  };
}

function classifyRecord(input: {
  errors: string[];
  warnings: string[];
  existing?: InventoryItem;
  differences: string[];
  partNumber: string;
  serialNumber: string;
}): InventoryRowClassification {
  if (input.errors.length) return "Manual review required";
  if (input.existing && input.differences.some((item) => item.startsWith("Quantity"))) return "Quantity adjustment";
  if (input.existing) return "Existing item update";
  if (!input.partNumber) return "Missing part number";
  if (!input.serialNumber) return "Missing serial number";
  return "New item";
}

function buildInventoryItem(record: InventoryImportRecord, vesselId: string, storageLocation: string, helicopterRegistration?: string): InventoryItem {
  return {
    id: generateId("inv"),
    vesselId,
    storageLocation: storageLocation || record.storageLocation || "Unassigned bodega",
    itemType: normalizeItemType(record.category) ?? inferItemType(record.itemName),
    itemName: record.itemName,
    partNumber: record.partNumber,
    serialNumber: record.serialNumber,
    quantity: record.quantity,
    unitOfMeasure: record.unitOfMeasure,
    minimumStock: 0,
    condition: "Serviceable",
    expirationDate: "",
    relatedHelicopter: helicopterRegistration || record.helicopterRegistration,
    notes: record.notes,
    source: "User"
  };
}

function detectWeeklyMetadata(sheets: WorkbookSheet[], store: FleetStore, context?: { vesselId?: string; campaignId?: string; helicopterRegistration?: string }): WeeklyReportPreview {
  const textCells = sheets.flatMap((sheet) => sheet.rows.flat()).map(normalizeCell).filter(Boolean);
  const joined = textCells.join(" | ");
  const contextCampaign = store.campaigns.find((item) => item.id === context?.campaignId);
  const contextVessel = store.vessels.find((item) => item.id === context?.vesselId || item.id === contextCampaign?.vesselId);
  const detectedVessel = store.vessels.find((vessel) => normalizeKey(joined).includes(normalizeKey(vessel.name)));
  const detectedHelicopter = store.helicopters.find((helicopter) => normalizeKey(joined).includes(normalizeKey(helicopter.registration)));
  const detectedCampaign = store.campaigns.find((campaign) =>
    normalizeKey(joined).includes(normalizeKey(campaign.code)) ||
    normalizeKey(joined).includes(normalizeKey(campaign.name))
  );
  const weekNumber = matchText(joined, /(?:week|semana)\s*#?\s*(\d{1,2})/i);
  const flightHours = parseNumber(matchText(joined, /(?:flight hours|horas de vuelo|horas)\D{0,12}(\d+(?:[.,]\d+)?)/i));
  const hobbsStart = parseNumber(matchText(joined, /(?:hobbs start|horometro inicial|horómetro inicial)\D{0,12}(\d+(?:[.,]\d+)?)/i));
  const hobbsEnd = parseNumber(matchText(joined, /(?:hobbs end|horometro final|horómetro final)\D{0,12}(\d+(?:[.,]\d+)?)/i));
  const reportDate = parseDate(matchText(joined, /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/));
  const maintenanceActions = textCells.filter((value) => /maintenance|mantenimiento|inspeccion|inspección|servicio|cambio|reemplazo/i.test(value)).slice(0, 12);
  const componentsChanged = textCells.filter((value) => /changed|removed|installed|cambiado|removido|instalado|reemplazado/i.test(value)).slice(0, 12);
  return {
    vesselName: detectedVessel?.name ?? contextVessel?.name ?? contextCampaign?.vesselName ?? "",
    vesselId: detectedVessel?.id ?? contextVessel?.id ?? contextCampaign?.vesselId ?? "",
    helicopterRegistration: detectedHelicopter?.registration ?? context?.helicopterRegistration ?? contextCampaign?.helicopterRegistration ?? contextVessel?.assignedHelicopter ?? "",
    campaignName: detectedCampaign?.name ?? contextCampaign?.name ?? contextVessel?.campaign ?? "",
    campaignId: detectedCampaign?.id ?? contextCampaign?.id ?? "",
    weekNumber,
    reportDate,
    flightHours: hobbsEnd > hobbsStart ? hobbsEnd - hobbsStart : flightHours,
    hobbsStart,
    hobbsEnd,
    maintenanceActions,
    componentsChanged,
    inventoryUsage: [],
    notes: textCells.filter((value) => /observacion|observación|note|nota|remark/i.test(value)).slice(0, 8)
  };
}

function buildRecommendations(records: InventoryImportRecord[], report: WeeklyReportPreview) {
  const recommendations: string[] = [];
  const quantityAdjustments = records.filter((record) => record.classification === "Quantity adjustment");
  const missingSerials = records.filter((record) => record.classification === "Missing serial number");
  const duplicates = records.filter((record) => record.duplicateInWorkbook || record.classification === "Possible duplicate");
  if (quantityAdjustments.length) recommendations.push(`${quantityAdjustments.length} inventory item${quantityAdjustments.length === 1 ? "" : "s"} already exist in this bodega. Update quantity?`);
  if (missingSerials.length) recommendations.push(`${missingSerials.length} row${missingSerials.length === 1 ? "" : "s"} have part numbers but missing serial numbers. Manual review recommended.`);
  if (duplicates.length) recommendations.push(`${duplicates.length} possible duplicate${duplicates.length === 1 ? "" : "s"} detected. Review differences before importing.`);
  if (report.flightHours > 0) recommendations.push(`This weekly report contains ${report.flightHours.toFixed(1)} flight hours. Confirm before updating aircraft hours.`);
  if (report.inventoryUsage.length) recommendations.push("Inventory consumption detected. Create stock movement?");
  if (report.maintenanceActions.length) recommendations.push("Maintenance notes detected. Create maintenance log draft?");
  if (!recommendations.length) recommendations.push("No critical import issues detected. Review preview before saving to localStorage.");
  return recommendations.slice(0, 6);
}

function findExistingInventory(items: InventoryItem[], record: { vesselId: string; storageLocation: string; itemName: string; partNumber: string; serialNumber: string }) {
  return items.find((item) =>
    !item.archived &&
    item.vesselId === record.vesselId &&
    normalizeKey(item.storageLocation) === normalizeKey(record.storageLocation) &&
    ((record.serialNumber && normalizeKey(item.serialNumber) === normalizeKey(record.serialNumber)) ||
      (record.partNumber && normalizeKey(item.partNumber) === normalizeKey(record.partNumber) && normalizeKey(item.itemName) === normalizeKey(record.itemName)))
  );
}

function scoreHeaderForField(header: unknown, field: InventoryImportField) {
  const normalized = normalizeKey(header);
  if (!normalized) return 0;
  return Math.max(...fieldAliases[field].map((alias) => {
    const target = normalizeKey(alias);
    if (normalized === target) return 100;
    if (normalized.includes(target) || target.includes(normalized)) return 88;
    const overlap = target.split(" ").filter((token) => normalized.split(" ").includes(token)).length;
    return overlap ? 50 + overlap * 12 : 0;
  }), 0);
}

function isSafeInventoryMapping(field?: InventoryImportPreview["mappedFields"][number]) {
  if (!field || field.columnIndex === undefined) return false;
  if (field.manuallyMapped) return true;
  return field.confidence >= 95 && field.status === "auto-mapped" && !field.warning;
}

function buildColumnOptions(row: unknown[]) {
  return row
    .map((cell, index) => ({ index, header: normalizeCell(cell) || `Column ${index + 1}` }))
    .filter((option) => option.header.trim());
}

function sampleColumnValues(rows: unknown[][], columnIndex: number) {
  return rows
    .map((row) => normalizeCell(row[columnIndex]))
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 3);
}

function getMappingStatus(
  field: InventoryImportField,
  confidence: number,
  manuallyMapped: boolean,
  hasColumn: boolean
): InventoryImportPreview["mappedFields"][number]["status"] {
  if (field === "notes") return "optional";
  if (manuallyMapped) return "manual";
  if (!hasColumn || confidence < 80) return "blocked";
  if (confidence < 95) return "needs-review";
  return "auto-mapped";
}

function validateColumnSamples(field: InventoryImportField, samples: string[]) {
  if (!samples.length || field === "notes") return undefined;
  if (field === "partNumber" && samples.some(looksLikePartNumberColumnNoise)) {
    return "AURA is not confident this column represents Part Number.";
  }
  if (field === "partNumber" && samples.every(looksLikeRowNumberOrQuantity)) {
    return "Possible wrong P/N mapping. Values look like row numbers or quantities.";
  }
  if (field === "serialNumber" && samples.some(looksLikeSerialNumberColumnNoise)) {
    return "Serial Number appears to be mapped to a quantity column.";
  }
  if (field === "serialNumber" && samples.every(looksLikeRowNumberOrQuantity)) {
    return "Serial Number appears to be mapped to a quantity column.";
  }
  if (field === "quantity" && samples.some(isInvalidNumericSample)) {
    return "AURA is not confident this column represents Quantity.";
  }
  return undefined;
}

function looksLikeRowNumberOrQuantity(value: string) {
  const parsed = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 && /^\d{1,2}(?:[.,]\d+)?$/.test(value.trim());
}

function isInvalidNumericSample(value: string) {
  const numeric = value.replace(",", ".").replace(/[^\d.-]/g, "");
  return !/\d/.test(numeric) || Number.isNaN(Number(numeric));
}

function looksLikePartNumberColumnNoise(value: string) {
  const normalized = normalizeKey(value);
  return ["p/n", "pn", "part number", "numero de parte", "número de parte"].includes(normalized) ||
    normalized.includes("hrs aeronave") ||
    normalized.includes("hrs motor") ||
    normalized.includes("revisado por") ||
    normalized.endsWith(":");
}

function looksLikeSerialNumberColumnNoise(value: string) {
  const normalized = normalizeKey(value);
  return ["s/n", "sn", "serial", "serial number", "numero de serie", "número de serie"].includes(normalized) ||
    normalized.includes("cantidad") ||
    normalized.includes("quantity") ||
    normalized.includes("hrs aeronave") ||
    normalized.includes("hrs motor") ||
    normalized.includes("revisado por");
}

function calculateConfidence(input: { itemName: string; partNumber: string; serialNumber: string; quantity: number; storageLocation: string; existing: boolean; errors: string[] }) {
  if (input.errors.length) return 45;
  let score = 45;
  if (input.itemName) score += 18;
  if (input.partNumber) score += 14;
  if (input.serialNumber) score += 12;
  if (Number.isFinite(input.quantity)) score += 12;
  if (input.storageLocation) score += 9;
  if (input.existing) score += 5;
  return Math.min(100, score);
}

function inferItemType(itemName: string): InventoryItem["itemType"] {
  if (/oil|aceite/i.test(itemName)) return "Oil";
  if (/filter|filtro/i.test(itemName)) return "Filter";
  if (/tool|herramienta/i.test(itemName)) return "Tool";
  if (/kit/i.test(itemName)) return "Kit";
  if (/bolt|nut|washer|tornillo|tuerca|arandela/i.test(itemName)) return "Hardware";
  return "Component";
}

function normalizeItemType(value: string): InventoryItem["itemType"] | undefined {
  const normalized = normalizeKey(value);
  if (!normalized) return undefined;
  if (/component|componente/.test(normalized)) return "Component";
  if (/hardware|tornillo|tuerca|arandela/.test(normalized)) return "Hardware";
  if (/consumable|consumible/.test(normalized)) return "Consumable";
  if (/oil|aceite/.test(normalized)) return "Oil";
  if (/filter|filtro/.test(normalized)) return "Filter";
  if (/tool|herramienta/.test(normalized)) return "Tool";
  if (/kit/.test(normalized)) return "Kit";
  if (/other|otro/.test(normalized)) return "Other";
  return undefined;
}

function matchVesselId(store: FleetStore, value: string) {
  return store.vessels.find((vessel) => normalizeKey(vessel.name) === normalizeKey(value) || normalizeKey(value).includes(normalizeKey(vessel.name)))?.id ?? "";
}

function normalizeCell(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value: unknown) {
  return normalizeCell(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeRegistration(value: string) {
  return value.toUpperCase().replace(/\s+/g, "");
}

function parseNumber(value: unknown) {
  const parsed = Number(normalizeCell(value).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value: string) {
  if (!value) return "";
  const [a, b, c] = value.split(/[/-]/).map(Number);
  if (!a || !b || !c) return "";
  const year = c < 100 ? 2000 + c : c;
  const month = a > 12 ? b : a;
  const day = a > 12 ? a : b;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function matchText(value: string, pattern: RegExp) {
  return value.match(pattern)?.[1] ?? "";
}

function firstValue(values: Array<string | undefined>) {
  return values.find((value) => value && value.trim()) ?? "";
}

function mergeNotes(left: string, right: string) {
  if (!left) return right;
  if (!right || left.includes(right)) return left;
  return `${left}\n${right}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
