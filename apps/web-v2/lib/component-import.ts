import * as XLSX from "xlsx";
import {
  normalize,
  cellText,
  parseNumber,
  parseFlexibleDate,
  findHeaderRowIndex,
  buildColumnIndex,
  findColumn
} from "@/lib/excel-parsing";

// Parses the "Control Maestro de Componentes" workbook that mechanics fill out per
// helicopter. The layout is not perfectly consistent between files (extra/missing
// columns like "Ref. #" or "Posición", header wording drifts slightly), so instead
// of hard-coded column indexes we detect columns by matching normalized header text.
// This is deliberately simpler than the old app's fuzzy-matching importer: the
// database's unique constraint on (helicopter_registration, part_number, serial_number)
// is what guarantees no duplicates, not clever JS matching.

export type ParsedHelicopterMeta = {
  registration: string;
  model: string;
  manufactureYear: string;
  serialNumber: string;
  reviewDate: string | null;
  currentHourmeter: number;
};

export type ParsedComponentRow = {
  componentName: string;
  partNumber: string;
  serialNumber: string;
  position: string | null;
  installationDate: string | null;
  tsnHours: number;
  tsoHours: number;
  lifeLimitHours: number;
  remainingHours: number;
  calendarLimitDate: string | null;
  remainingCalendarDays: number | null;
  notes: string | null;
};

export type ParsedComponentControl = {
  helicopter: ParsedHelicopterMeta;
  components: ParsedComponentRow[];
  warnings: string[];
};

function daysUntil(isoDate: string): number {
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${isoDate}T00:00:00Z`).getTime();
  return Math.round((target - todayUtc) / 86400000);
}

function pickComponentSheet(workbook: XLSX.WorkBook): string {
  const candidates = workbook.SheetNames.filter((name) => normalize(name).includes("control maestro"));
  if (candidates.length === 0) return workbook.SheetNames[0];
  // Prefer the sheet without a "(2)"/"(copy)" suffix — that's the canonical one.
  const primary = candidates.find((name) => !/\(\d+\)/.test(name));
  return primary ?? candidates[0];
}

export function parseComponentControlWorkbook(buffer: Buffer): ParsedComponentControl {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = pickComponentSheet(workbook);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("No se encontró la hoja 'Control Maestro' en el archivo.");

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  const warnings: string[] = [];

  // --- Aircraft metadata block ---
  const metaHeaderRowIndex = findHeaderRowIndex(rows, ["matricula"]);
  if (metaHeaderRowIndex === -1) {
    throw new Error("No se encontró la fila de metadatos (Matrícula, Modelo, etc.) en el archivo.");
  }
  const metaHeaders = buildColumnIndex(rows[metaHeaderRowIndex]);
  const metaValuesRow = rows[metaHeaderRowIndex + 1] ?? [];

  const registrationRaw = cellText(metaValuesRow[findColumn(metaHeaders, ["matricula"])]);
  const registration = registrationRaw.replace(/[-\s]/g, "").toUpperCase();
  if (!registration) throw new Error("No se encontró la matrícula del helicóptero en el archivo.");

  const hourmeterCol = findColumn(metaHeaders, ["horometro"]);
  const currentHourmeter = parseNumber(metaValuesRow[hourmeterCol]);

  const helicopter: ParsedHelicopterMeta = {
    registration,
    model: cellText(metaValuesRow[findColumn(metaHeaders, ["modelo"])]),
    manufactureYear: cellText(metaValuesRow[findColumn(metaHeaders, ["fabricacion"])]),
    serialNumber: cellText(metaValuesRow[findColumn(metaHeaders, ["s/n aeronave", "sn aeronave"])]),
    reviewDate: parseFlexibleDate(metaValuesRow[findColumn(metaHeaders, ["fecha revision"])]),
    currentHourmeter
  };

  // --- Component table block ---
  const componentHeaderRowIndex = findHeaderRowIndex(rows, ["componente"], metaHeaderRowIndex + 2);
  if (componentHeaderRowIndex === -1) {
    throw new Error("No se encontró la tabla de componentes (encabezado con 'Componente', 'P/N', etc.).");
  }
  const compHeaders = buildColumnIndex(rows[componentHeaderRowIndex]);

  const col = {
    componente: findColumn(compHeaders, ["nombre de componente", "componente"]),
    pn: findColumn(compHeaders, ["p/n"]),
    sn: findColumn(compHeaders, ["s/n"]),
    posicion: findColumn(compHeaders, ["posicion"]),
    fechaInstalacion: findColumn(compHeaders, ["fecha instalacion"]),
    tsn: findColumn(compHeaders, ["tsn"]),
    tso: findColumn(compHeaders, ["tso"]),
    limiteVida: findColumn(compHeaders, ["limite vida", "limite de vida (hrs)"]),
    remanente: findColumn(compHeaders, ["remanente (hrs)"]),
    limiteCalendario: findColumn(compHeaders, ["limite calendario"]),
    remanenteCalendario: findColumn(compHeaders, ["remanente calendario"]),
    estado: findColumn(compHeaders, ["estado"]),
    observaciones: findColumn(compHeaders, ["observaciones"])
  };

  if (col.componente === -1 || col.pn === -1) {
    throw new Error("La tabla de componentes no tiene las columnas esperadas (Componente, P/N).");
  }

  const components: ParsedComponentRow[] = [];
  let blankStreak = 0;

  for (let r = componentHeaderRowIndex + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const componentName = cellText(row[col.componente]);

    if (!componentName) {
      blankStreak += 1;
      if (blankStreak >= 3) break;
      continue;
    }
    blankStreak = 0;

    const positionRaw = col.posicion !== -1 ? cellText(row[col.posicion]) : "";
    const position = positionRaw && normalize(positionRaw) !== "n/a" ? positionRaw : null;

    const calendarLimitDate = col.remanenteCalendario !== -1 ? parseFlexibleDate(row[col.remanenteCalendario]) : null;
    const remainingCalendarDays = calendarLimitDate ? daysUntil(calendarLimitDate) : null;

    const rawObservaciones = col.observaciones !== -1 ? cellText(row[col.observaciones]) : "";
    const limiteCalendarioRaw = col.limiteCalendario !== -1 ? row[col.limiteCalendario] : null;
    const limiteCalendarioText = limiteCalendarioRaw != null ? cellText(limiteCalendarioRaw) : "";
    const isSpecialCalendarValue =
      limiteCalendarioText && Number.isNaN(Number.parseFloat(limiteCalendarioText.replace(",", ".")));

    const noteParts = [rawObservaciones];
    if (isSpecialCalendarValue) noteParts.push(`Límite calendario (origen): ${limiteCalendarioText}`);
    const notes = noteParts.filter(Boolean).join(" — ") || null;

    const partNumber = col.pn !== -1 ? cellText(row[col.pn]) : "";
    if (!partNumber) {
      warnings.push(`Fila ${r + 1}: "${componentName}" no tiene P/N, se omitió.`);
      continue;
    }

    components.push({
      componentName,
      partNumber,
      serialNumber: col.sn !== -1 ? cellText(row[col.sn]) : "",
      position,
      installationDate: col.fechaInstalacion !== -1 ? parseFlexibleDate(row[col.fechaInstalacion]) : null,
      tsnHours: col.tsn !== -1 ? parseNumber(row[col.tsn]) : 0,
      tsoHours: col.tso !== -1 ? parseNumber(row[col.tso]) : 0,
      lifeLimitHours: col.limiteVida !== -1 ? parseNumber(row[col.limiteVida]) : 0,
      remainingHours: col.remanente !== -1 ? parseNumber(row[col.remanente]) : 0,
      calendarLimitDate,
      remainingCalendarDays,
      notes
    });
  }

  if (components.length === 0) {
    warnings.push("No se encontraron filas de componentes con P/N debajo del encabezado.");
  }

  return { helicopter, components, warnings };
}
