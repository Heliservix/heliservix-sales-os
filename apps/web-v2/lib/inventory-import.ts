import * as XLSX from "xlsx";
import { normalize, cellText, parseNumber, parseFlexibleDate, findHeaderRowIndex, buildColumnIndex, findColumn } from "@/lib/excel-parsing";
import { inventoryItemTypes } from "@/app/vessels/[id]/inventory/constants";

// Parses a flat inventory spreadsheet for a vessel's bodega. Unlike the
// weekly report or Control Maestro, there's no pre-existing fixed format for
// this — technicians don't currently track a full parts count in Excel, so
// this importer defines a simple template (also downloadable from the
// "Exportar" button on the vessel inventory page, which produces a file in
// exactly this format for re-upload). One flat table, header row first, no
// metadata block: Ítem | Tipo | P/N | S/N | Lote | Cantidad | Unidad |
// Mínimo | Ubicación | Condición | Vencimiento | Helicóptero | Notas.

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

export function parseInventoryWorkbook(buffer: Buffer): ParsedInventoryWorkbook {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("El archivo no tiene ninguna hoja.");

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  const warnings: string[] = [];

  const headerRowIndex = findHeaderRowIndex(rows, ["item", "descripcion"]);
  if (headerRowIndex === -1) {
    throw new Error("No se encontró la fila de encabezados (columna 'Ítem' o 'Descripción'). Usa la plantilla exportada desde el sistema.");
  }
  const headerIndex = buildColumnIndex(rows[headerRowIndex]);

  const col = {
    item: findColumn(headerIndex, ["item", "descripcion"]),
    tipo: findColumn(headerIndex, ["tipo"]),
    pn: findColumn(headerIndex, ["p/n"]),
    sn: findColumn(headerIndex, ["s/n"]),
    lote: findColumn(headerIndex, ["lote"]),
    cantidad: findColumn(headerIndex, ["cantidad"]),
    unidad: findColumn(headerIndex, ["unidad"]),
    minimo: findColumn(headerIndex, ["minimo"]),
    ubicacion: findColumn(headerIndex, ["ubicacion"]),
    condicion: findColumn(headerIndex, ["condicion"]),
    vencimiento: findColumn(headerIndex, ["vencimiento"]),
    helicoptero: findColumn(headerIndex, ["helicoptero"]),
    notas: findColumn(headerIndex, ["notas"])
  };

  if (col.item === -1) {
    throw new Error("La tabla no tiene una columna 'Ítem'. Usa la plantilla exportada desde el sistema.");
  }

  const parsedRows: ParsedInventoryRow[] = [];
  let blankStreak = 0;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const itemName = cellText(row[col.item]);
    if (!itemName) {
      blankStreak += 1;
      if (blankStreak >= 5) break;
      continue;
    }
    blankStreak = 0;

    const helicopterRaw = col.helicoptero !== -1 ? cellText(row[col.helicoptero]) : "";
    const relatedHelicopter = helicopterRaw.replace(/[-\s]/g, "").toUpperCase();

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
      notes: col.notas !== -1 ? cellText(row[col.notas]) : ""
    });
  }

  if (parsedRows.length === 0) {
    warnings.push("No se encontraron filas de inventario con nombre de ítem debajo del encabezado.");
  }

  return { rows: parsedRows, warnings };
}
