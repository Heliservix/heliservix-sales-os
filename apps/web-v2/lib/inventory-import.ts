import * as XLSX from "xlsx";
import { normalize, cellText, parseNumber, parseFlexibleDate, findHeaderRowIndex, buildColumnIndex, findColumn } from "@/lib/excel-parsing";
import { inventoryItemTypes } from "@/app/vessels/[id]/inventory/constants";

// Parses a vessel's bodega inventory count. Two column layouts are accepted:
//
//   1. The real "INVENTARIO BODEGA" sheet technicians started including in
//      the weekly report workbook: ÍTEM (row number) | DESCRIPCIÓN (name) |
//      P/N | C/A (secondary reference) | CANTIDAD | CONDICIÓN | UBICACIÓN,
//      with a "FAENA <marea>" / "FECHA" metadata block above the header.
//   2. This system's own export template (Exportar button on the vessel
//      inventory page), which uses Ítem as the name column directly plus a
//      few extra fields (Tipo, S/N, Lote, Unidad, Mínimo, Vencimiento,
//      Helicóptero, Notas) that the real file doesn't have.
//
// Column detection is alias-based (like every other importer here) so both
// layouts resolve through the same code: DESCRIPCIÓN wins for the name
// column when present (layout 1); otherwise ÍTEM itself is the name
// (layout 2).

export type ParsedInventoryRow = {
  itemName: string;
  itemType: string;
  partNumber: string;
  serialNumber: string;
  lotBatch: string;
  quantity: number;
  unitOfMeasure: string;
  minimumStock: number;
  storageLocation: string;
  condition: string;
  expirationDate: string | null;
  relatedHelicopter: string;
  notes: string;
};

export type ParsedInventoryWorkbook = {
  rows: ParsedInventoryRow[];
  warnings: string[];
};

function normalizeItemType(raw: string): string {
  const match = (inventoryItemTypes as readonly string[]).find((type) => normalize(type) === normalize(raw));
  return match ?? "Other";
}

/** Picks the inventory sheet out of a workbook: prefers one named like
 * "INVENTARIO BODEGA" (the real weekly-report sheet), falls back to the
 * first sheet for a single-sheet template/export file. */
function pickInventorySheet(workbook: XLSX.WorkBook): string {
  const candidate = workbook.SheetNames.find((name) => normalize(name).includes("inventario"));
  return candidate ?? workbook.SheetNames[0];
}

export function parseInventoryWorkbook(buffer: Buffer): ParsedInventoryWorkbook {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = pickInventorySheet(workbook);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("El archivo no tiene ninguna hoja.");

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  return parseInventoryRows(rows);
}

export function parseInventoryRows(rows: unknown[][]): ParsedInventoryWorkbook {
  const warnings: string[] = [];

  const headerRowIndex = findHeaderRowIndex(rows, ["item", "descripcion"]);
  if (headerRowIndex === -1) {
    throw new Error("No se encontró la fila de encabezados (columna 'Ítem' o 'Descripción'). Usa la plantilla exportada desde el sistema.");
  }
  const headerIndex = buildColumnIndex(rows[headerRowIndex]);

  // DESCRIPCIÓN wins when present (real "INVENTARIO BODEGA" sheet: ÍTEM is
  // just a row number there). Otherwise ÍTEM itself is the name column
  // (this system's own simpler export template).
  const descCol = findColumn(headerIndex, ["descripcion"]);
  const itemCol = findColumn(headerIndex, ["item"]);
  const nameCol = descCol !== -1 ? descCol : itemCol;

  const col = {
    name: nameCol,
    tipo: findColumn(headerIndex, ["tipo"]),
    pn: findColumn(headerIndex, ["p/n"]),
    // "C/A" shows up on the real sheet as a secondary reference (not
    // consistently populated, meaning varies by row) — kept in notes rather
    // than guessed into a specific field. "S/N" from this system's own
    // template still maps straight to serial_number.
    ca: findColumn(headerIndex, ["c/a"]),
    sn: findColumn(headerIndex, ["s/n"]),
    lote: findColumn(headerIndex, ["lote"]),
    cantidad: findColumn(headerIndex, ["cantidad"]),
    unidad: findColumn(headerIndex, ["unidad"]),
    minimo: findColumn(headerIndex, ["minimo"]),
    ubicacion: findColumn(headerIndex, ["ubicacion"]),
    condicion: findColumn(headerIndex, ["condicion"]),
    vencimiento: findColumn(headerIndex, ["vencimiento"]),
    helicoptero: findColumn(headerIndex, ["helicoptero"]),
    notas: findColumn(headerIndex, ["notas", "observacion"])
  };

  if (col.name === -1) {
    throw new Error("La tabla no tiene una columna 'Ítem' o 'Descripción'. Usa la plantilla exportada desde el sistema.");
  }

  const parsedRows: ParsedInventoryRow[] = [];
  let blankStreak = 0;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const itemName = cellText(row[col.name]);
    if (!itemName) {
      blankStreak += 1;
      if (blankStreak >= 5) break;
      continue;
    }
    blankStreak = 0;

    const helicopterRaw = col.helicoptero !== -1 ? cellText(row[col.helicoptero]) : "";
    const relatedHelicopter = helicopterRaw.replace(/[-\s]/g, "").toUpperCase();

    const caValue = col.ca !== -1 ? cellText(row[col.ca]) : "";
    const notesParts = [col.notas !== -1 ? cellText(row[col.notas]) : "", caValue ? `C/A: ${caValue}` : ""].filter(Boolean);

    parsedRows.push({
      itemName,
      itemType: col.tipo !== -1 ? normalizeItemType(cellText(row[col.tipo])) : "Other",
      partNumber: col.pn !== -1 ? cellText(row[col.pn]) : "",
      serialNumber: col.sn !== -1 ? cellText(row[col.sn]) : "",
      lotBatch: col.lote !== -1 ? cellText(row[col.lote]) : "",
      quantity: col.cantidad !== -1 ? parseNumber(row[col.cantidad]) : 0,
      unitOfMeasure: col.unidad !== -1 ? cellText(row[col.unidad]) || "ea" : "ea",
      minimumStock: col.minimo !== -1 ? parseNumber(row[col.minimo]) : 0,
      storageLocation: col.ubicacion !== -1 ? cellText(row[col.ubicacion]) : "",
      condition: col.condicion !== -1 ? cellText(row[col.condicion]) : "",
      expirationDate: col.vencimiento !== -1 ? parseFlexibleDate(row[col.vencimiento]) : null,
      relatedHelicopter,
      notes: notesParts.join(" — ")
    });
  }

  if (parsedRows.length === 0) {
    warnings.push("No se encontraron filas de inventario con nombre de ítem debajo del encabezado.");
  }

  return { rows: parsedRows, warnings };
}
