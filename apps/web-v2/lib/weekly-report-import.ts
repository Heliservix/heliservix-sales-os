import * as XLSX from "xlsx";
import {
  normalize,
  cellText,
  parseNumberOrNull,
  parseFlexibleDate,
  findRowIndexByFirstCell,
  findLabelValue,
  buildColumnIndex,
  findColumn
} from "@/lib/excel-parsing";

// Parses the weekly operations report ("INFORME SEMANAL DE OPERACIONES") that
// mechanics deliver every Monday per vessel/marea. Three sheets matter:
//   - INFORME SEMANAL: aircraft/marea identification, hourmeter readout for the
//     current week, and the routine inspections performed.
//   - NO RUTINAS: unscheduled findings, one numbered block per event, each with
//     an optional "MATERIAL UTILIZADO" table.
//   - CAMBIO FILTROS: filter replacement log.
//
// This does NOT auto-mutate the live components table. It (a) creates a
// flight_logs row, which the existing trg_apply_flight_log trigger uses to bump
// the helicopter's hourmeter and deduct hours from every active component, and
// (b) logs maintenance events + *candidate* component changes it detects in the
// free text, for a human to confirm in the Control de Componentes. That mirrors
// AURA's original design: analyze and flag, never silently rewrite airworthiness
// records.

function sheetRows(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
}

function cleanVesselName(raw: string): string {
  return raw.replace(/^(m\/n|b\/m|m\/v|f\/v)\s*/i, "").trim();
}

export type DetectedComponentChange = {
  sourceText: string;
  sourceContext: string;
  date: string | null;
  partNumberOn: string | null;
  partNumberOff: string | null;
  serialNumberOn: string | null;
  serialNumberOff: string | null;
};

function extractComponentChange(text: string, context: string, date: string | null): DetectedComponentChange | null {
  if (!text) return null;
  const clean = (match: RegExpMatchArray | null) => (match ? match[1].replace(/[.,;]+$/, "").trim() : null);

  const partNumberOn = clean(text.match(/p\/?n\s*on[:\s]+([A-Za-z0-9\-\/.]+)/i));
  const partNumberOff = clean(text.match(/p\/?n\s*off[:\s]+([A-Za-z0-9\-\/.]+)/i));
  const serialNumberOn = clean(text.match(/s\/?n\s*on[:\s]+([A-Za-z0-9\-\/.]+)/i));
  const serialNumberOff = clean(text.match(/s\/?n\s*off[:\s]+([A-Za-z0-9\-\/.]+)/i));

  // Require something that was actually removed — otherwise it's just a part
  // reference, not a replacement event.
  if (!partNumberOff && !serialNumberOff) return null;

  return { sourceText: text.trim(), sourceContext: context, date, partNumberOn, partNumberOff, serialNumberOn, serialNumberOff };
}

export type RoutineInspection = {
  date: string | null;
  hourmeter: number | null;
  aircraftHours: number | null;
  engineHours: number | null;
  inspectionType: string;
  description: string;
};

export type NonRoutineEvent = {
  blockNumber: number;
  date: string | null;
  hobbs: number | null;
  aircraftHours: number | null;
  engineHours: number | null;
  technician: string | null;
  novelty: string;
  managementAction: string;
  materials: { description: string; partNumber: string; quantity: number | null; notes: string }[];
};

export type FilterChange = {
  date: string | null;
  filterType: string;
  reason: string;
  hourmeter: number | null;
  comments: string;
};

export type ParsedWeeklyReport = {
  helicopterRegistration: string;
  vesselName: string;
  mareaCode: string;
  weekNumber: number;
  reportDate: string | null;
  hobbsStart: number;
  hobbsEnd: number;
  flightHoursThisWeek: number;
  oilConsumptionQts: number | null;
  fuelConsumptionGals: number | null;
  routineInspections: RoutineInspection[];
  nonRoutineEvents: NonRoutineEvent[];
  filterChanges: FilterChange[];
  detectedComponentChanges: DetectedComponentChange[];
  warnings: string[];
};

function parseInformeSemanal(rows: unknown[][], warnings: string[]) {
  const registrationRaw = cellText(findLabelValue(rows, ["matricula"]));
  const helicopterRegistration = registrationRaw.replace(/[-\s]/g, "").toUpperCase();
  if (!helicopterRegistration) throw new Error("No se encontró la matrícula del helicóptero en 'INFORME SEMANAL'.");

  const vesselRaw = cellText(findLabelValue(rows, ["b/m atunero", "atunero", "buque"]));
  const vesselName = cleanVesselName(vesselRaw) || vesselRaw;

  const mareaCode = cellText(findLabelValue(rows, ["codigo de marea"]));
  const weekNumber = parseNumberOrNull(findLabelValue(rows, ["semana n"]));
  const reportDate = parseFlexibleDate(findLabelValue(rows, ["fecha reporte"]));

  if (!mareaCode) warnings.push("No se encontró el código de marea; no se podrá evitar una doble importación de esta semana.");
  if (weekNumber == null) throw new Error("No se encontró el número de semana ('Semana N°') en el reporte.");

  // Weekly hobbs breakdown table: "Concepto" header row, then "Sem 1".."Sem 9" columns.
  const conceptRowIdx = findRowIndexByFirstCell(rows, ["concepto"]);
  if (conceptRowIdx === -1) throw new Error("No se encontró la tabla de desglose semanal de horas (fila 'Concepto').");
  const conceptRow = rows[conceptRowIdx] ?? [];
  const weekColIdx = conceptRow.findIndex((cell) => normalize(cell) === `sem ${weekNumber}`);
  if (weekColIdx === -1) {
    throw new Error(
      `No se encontró la columna "Sem ${weekNumber}" en la tabla de desglose semanal. Verifica el número de semana en el archivo.`
    );
  }

  const startRowIdx = findRowIndexByFirstCell(rows, ["horometro inicia"], conceptRowIdx);
  const endRowIdx = findRowIndexByFirstCell(rows, ["horometro termina"], conceptRowIdx);
  const flownRowIdx = findRowIndexByFirstCell(rows, ["horas voladas en semana"], conceptRowIdx);
  const oilRowIdx = findRowIndexByFirstCell(rows, ["consumo de aceite"], conceptRowIdx);
  const fuelRowIdx = findRowIndexByFirstCell(rows, ["consumo combustible"], conceptRowIdx);

  const hobbsStart = parseNumberOrNull(rows[startRowIdx]?.[weekColIdx]);
  const hobbsEnd = parseNumberOrNull(rows[endRowIdx]?.[weekColIdx]);
  if (hobbsStart == null || hobbsEnd == null) {
    throw new Error(`No se pudieron leer los horómetros de inicio/fin para la semana ${weekNumber}.`);
  }

  const reportedFlightHours = parseNumberOrNull(rows[flownRowIdx]?.[weekColIdx]);
  const flightHoursThisWeek = Math.max(0, hobbsEnd - hobbsStart);
  if (reportedFlightHours != null && Math.abs(reportedFlightHours - flightHoursThisWeek) > 0.5) {
    warnings.push(
      `Las horas voladas reportadas (${reportedFlightHours}) no coinciden con horómetro fin - inicio (${flightHoursThisWeek.toFixed(1)}). Se usó la diferencia de horómetros.`
    );
  }

  const oilConsumptionQts = oilRowIdx !== -1 ? parseNumberOrNull(rows[oilRowIdx]?.[weekColIdx]) : null;
  const fuelConsumptionGals = fuelRowIdx !== -1 ? parseNumberOrNull(rows[fuelRowIdx]?.[weekColIdx]) : null;

  // Routine inspections table.
  const inspectionsHeaderIdx = findRowIndexByFirstCell(rows, ["#"], flownRowIdx === -1 ? conceptRowIdx : flownRowIdx);
  const routineInspections: RoutineInspection[] = [];
  if (inspectionsHeaderIdx !== -1) {
    const headerIndex = buildColumnIndex(rows[inspectionsHeaderIdx]);
    const dateCol = findColumn(headerIndex, ["fecha"]);
    const hourmeterCol = findColumn(headerIndex, ["horometro"]);
    const aircraftHoursCol = findColumn(headerIndex, ["hrs aeronave"]);
    const engineHoursCol = findColumn(headerIndex, ["hrs motor"]);
    const typeCol = findColumn(headerIndex, ["tipo inspeccion"]);
    const descCol = findColumn(headerIndex, ["descripcion"]);

    let blankStreak = 0;
    for (let r = inspectionsHeaderIdx + 1; r < rows.length; r++) {
      const row = rows[r] ?? [];
      const date = dateCol !== -1 ? parseFlexibleDate(row[dateCol]) : null;
      const description = descCol !== -1 ? cellText(row[descCol]) : "";
      const inspectionType = typeCol !== -1 ? cellText(row[typeCol]) : "";
      if (!date && !description && !inspectionType) {
        blankStreak += 1;
        if (blankStreak >= 3) break;
        continue;
      }
      blankStreak = 0;
      if (!date) continue;
      routineInspections.push({
        date,
        hourmeter: hourmeterCol !== -1 ? parseNumberOrNull(row[hourmeterCol]) : null,
        aircraftHours: aircraftHoursCol !== -1 ? parseNumberOrNull(row[aircraftHoursCol]) : null,
        engineHours: engineHoursCol !== -1 ? parseNumberOrNull(row[engineHoursCol]) : null,
        inspectionType: inspectionType || "Rutina",
        description
      });
    }
  }

  return {
    helicopterRegistration,
    vesselName,
    mareaCode,
    weekNumber,
    reportDate,
    hobbsStart,
    hobbsEnd,
    flightHoursThisWeek,
    oilConsumptionQts,
    fuelConsumptionGals,
    routineInspections
  };
}

/** Matches block headers like "NO RUTINA  N° 01" but not the instructional
 * sentence "Registre cada trabajo no rutinario..." which also contains the
 * substring "no rutina". */
function isNoRutinaBlockHeader(value: unknown): boolean {
  return /^no rutina\s*n[°o.]?\s*\d+/.test(normalize(value));
}

function findNoRutinaBlockIndex(rows: unknown[][], fromRow: number): number {
  for (let r = fromRow; r < rows.length; r++) {
    if (isNoRutinaBlockHeader(rows[r]?.[0])) return r;
  }
  return -1;
}

function parseNoRutinas(rows: unknown[][]): NonRoutineEvent[] {
  const events: NonRoutineEvent[] = [];
  let searchFrom = 0;

  while (true) {
    const blockIdx = findNoRutinaBlockIndex(rows, searchFrom);
    if (blockIdx === -1) break;
    searchFrom = blockIdx + 1;

    const blockNumberMatch = cellText(rows[blockIdx]?.[0]).match(/(\d+)/);
    const blockNumber = blockNumberMatch ? Number.parseInt(blockNumberMatch[1], 10) : events.length + 1;

    const metaRow = rows[blockIdx + 1] ?? [];
    const date = parseFlexibleDate(findLabelValue([metaRow], ["fecha"]));
    const hobbs = parseNumberOrNull(findLabelValue([metaRow], ["hobbs"]));
    const aircraftHours = parseNumberOrNull(findLabelValue([metaRow], ["hrs aeronave"]));
    const engineHours = parseNumberOrNull(findLabelValue([metaRow], ["hrs motor"]));
    const technicianRaw = findLabelValue([metaRow], ["tecnico"]);
    const technician = technicianRaw ? cellText(technicianRaw) : null;

    const novedadRow = (rows[blockIdx + 2] ?? []).slice(1).filter((cell) => cell != null && cell !== "");
    const novelty = novedadRow.map(cellText).join(" ").trim();

    const gestionRow = (rows[blockIdx + 3] ?? []).slice(1).filter((cell) => cell != null && cell !== "");
    const managementAction = gestionRow.map(cellText).join(" ").trim();

    // Table header should be ~2 rows below the "MATERIAL UTILIZADO" label.
    let materialHeaderIdx = -1;
    for (let r = blockIdx + 4; r < Math.min(blockIdx + 7, rows.length); r++) {
      const norm = normalize(rows[r]?.[0]);
      if (norm === "#") {
        materialHeaderIdx = r;
        break;
      }
    }

    const materials: NonRoutineEvent["materials"] = [];
    if (materialHeaderIdx !== -1) {
      const headerIndex = buildColumnIndex(rows[materialHeaderIdx]);
      const descCol = findColumn(headerIndex, ["descripcion"]);
      const pnCol = findColumn(headerIndex, ["p/n"]);
      const qtyCol = findColumn(headerIndex, ["cantidad"]);
      const notesCol = findColumn(headerIndex, ["observaciones"]);

      for (let r = materialHeaderIdx + 1; r < rows.length; r++) {
        const row = rows[r] ?? [];
        const firstCellNorm = normalize(row[0]);
        // Stop once we hit the next "NO RUTINA" block or run out of numbered rows.
        if (firstCellNorm.includes("no rutina") || !/^\d+$/.test(firstCellNorm)) break;
        const description = descCol !== -1 ? cellText(row[descCol]) : "";
        if (!description) continue;
        materials.push({
          description,
          partNumber: pnCol !== -1 ? cellText(row[pnCol]) : "",
          quantity: qtyCol !== -1 ? parseNumberOrNull(row[qtyCol]) : null,
          notes: notesCol !== -1 ? cellText(row[notesCol]) : ""
        });
      }
    }

    if (date || novelty || managementAction || materials.length > 0) {
      events.push({ blockNumber, date, hobbs, aircraftHours, engineHours, technician, novelty, managementAction, materials });
    }
  }

  return events;
}

function parseCambioFiltros(rows: unknown[][]): FilterChange[] {
  const headerIdx = findRowIndexByFirstCell(rows, ["item"]);
  if (headerIdx === -1) return [];
  const headerIndex = buildColumnIndex(rows[headerIdx]);
  const dateCol = findColumn(headerIndex, ["fecha"]);
  const typeCol = findColumn(headerIndex, ["tipo de filtro"]);
  const reasonCol = findColumn(headerIndex, ["razon del cambio"]);
  const hourmeterCol = findColumn(headerIndex, ["horometro"]);
  const commentsCol = findColumn(headerIndex, ["comentarios"]);

  const changes: FilterChange[] = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const date = dateCol !== -1 ? parseFlexibleDate(row[dateCol]) : null;
    const filterType = typeCol !== -1 ? cellText(row[typeCol]) : "";
    if (!date && !filterType) continue;
    changes.push({
      date,
      filterType,
      reason: reasonCol !== -1 ? cellText(row[reasonCol]) : "",
      hourmeter: hourmeterCol !== -1 ? parseNumberOrNull(row[hourmeterCol]) : null,
      comments: commentsCol !== -1 ? cellText(row[commentsCol]) : ""
    });
  }
  return changes;
}

export function parseWeeklyReportWorkbook(buffer: Buffer): ParsedWeeklyReport {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const warnings: string[] = [];

  const informeSheetName = workbook.SheetNames.find((name) => normalize(name).includes("informe semanal"));
  if (!informeSheetName) throw new Error("No se encontró la hoja 'INFORME SEMANAL' en el archivo.");
  const informeRows = sheetRows(workbook, informeSheetName);
  const informe = parseInformeSemanal(informeRows, warnings);

  const noRutinasSheetName = workbook.SheetNames.find((name) => normalize(name).includes("no rutinas"));
  const nonRoutineEvents = noRutinasSheetName ? parseNoRutinas(sheetRows(workbook, noRutinasSheetName)) : [];

  const filtrosSheetName = workbook.SheetNames.find((name) => normalize(name).includes("cambio filtros"));
  const filterChanges = filtrosSheetName ? parseCambioFiltros(sheetRows(workbook, filtrosSheetName)) : [];

  const detectedComponentChanges: DetectedComponentChange[] = [];
  for (const inspection of informe.routineInspections) {
    const found = extractComponentChange(inspection.description, `Inspección rutinaria (${inspection.inspectionType})`, inspection.date);
    if (found) detectedComponentChanges.push(found);
  }
  for (const event of nonRoutineEvents) {
    const combined = [event.novelty, event.managementAction].filter(Boolean).join(" — ");
    const found = extractComponentChange(combined, `No Rutina #${event.blockNumber}`, event.date);
    if (found) detectedComponentChanges.push(found);
  }

  if (nonRoutineEvents.length === 0 && filterChanges.length === 0 && informe.routineInspections.length === 0) {
    warnings.push("No se encontraron inspecciones, no-rutinas ni cambios de filtro en el archivo — solo se aplicarán las horas de vuelo.");
  }

  return { ...informe, nonRoutineEvents, filterChanges, detectedComponentChanges, warnings };
}
