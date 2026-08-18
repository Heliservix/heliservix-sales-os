import ExcelJS from "exceljs";
import JSZip from "jszip";
import path from "path";
import fs from "fs";
import { monthlyFlightHourTrend, type FlightLogRow } from "@/lib/aura";

// Fills the office's original "Control Maestro de Componentes" workbook
// (data/templates/control-componentes-template.xlsx) with a helicopter's
// live data instead of building a bare spreadsheet from scratch. Because we
// load the real template and only overwrite specific cell values, everything
// else survives untouched: the HeliServiX logo, the Excel Table styling
// (banded rows, autofilter), the calculated-column formulas for "Remanente
// (HRS)" and "% remanente horas", the "Resumen Ejecutivo" and "Leyenda"
// tabs. See lib/component-import.ts for the matching import-side column
// mapping — both read/write the same layout, one level of truth for the
// file's structure.
const TEMPLATE_PATH = path.join(process.cwd(), "data", "templates", "control-componentes-template.xlsx");

export type ExportHelicopter = {
  registration: string;
  model: string;
  manufacture_year: string | null;
  serial_number: string | null;
  last_review_date: string | null;
  current_hourmeter: number;
};

export type ExportComponent = {
  id: string;
  component_name: string;
  part_number: string;
  serial_number: string;
  position: string | null;
  installation_date: string | null;
  tsn_hours: number;
  tso_hours: number;
  life_limit_hours: number;
  remaining_hours: number;
  calendar_limit_date: string | null;
  remaining_calendar_days: number | null;
  status: string;
  notes: string | null;
  remaining_percentage: number | null;
};

export type ExportComplianceItem = {
  related_component_id: string | null;
  compliance_type: string;
  reference_number: string | null;
  title: string;
  status: string;
};

export type ExportPurchaseRequest = {
  part_number: string | null;
  unit_cost: number;
  currency: string;
  status: string;
  lead_time_days: number | null;
  priority: string | null;
  created_at: string;
};

export type ExportTechnicalRecord = {
  related_component_id: string | null;
  record_date: string | null;
  title: string;
  notes: string | null;
  inspection_type: string | null;
};

// Purchase requests are matched to a component by part_number text (no
// direct FK exists — see the schema comment on purchase_requests) — same
// normalization (trim + uppercase) used elsewhere in this codebase
// (lib/aura.ts's procurement matching) so the two never disagree.
function normalizePartNumber(value: string | null): string {
  return (value ?? "").trim().toUpperCase();
}

const ORDERED_STATUSES = new Set(["Ordered", "Received", "Shipped to vessel", "Stored", "Installed"]);

// Excel's date system has no timezone — reading the date back at UTC noon
// means no downstream timezone conversion (browser download, Excel's own
// locale) can ever push the visible day back or forward by one.
function toExcelDate(iso: string | null): Date | null {
  if (!iso) return null;
  return new Date(`${iso}T12:00:00.000Z`);
}

function clearRow(sheet: ExcelJS.Worksheet, row: number, fromCol: number, toCol: number) {
  const r = sheet.getRow(row);
  for (let c = fromCol; c <= toCol; c++) r.getCell(c).value = null;
}

function colLetter(n: number): string {
  let s = "";
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

// A couple of date cells in the original template (the "Fecha Revisión"
// metadata cell) were typed as plain text ("10-MAR-2026"), not real Excel
// dates — their style has no date number format. Writing a JS Date into a
// cell like that renders as a raw serial number (e.g. "46143.5") instead of
// a readable date. Setting the number format explicitly whenever we write a
// real date sidesteps that regardless of what the template cell's original
// style happened to be.
//
// IMPORTANT: exceljs cells loaded from the same file can share one style
// object by reference when they had the same style index in the source
// XML. Setting `cell.numFmt = x` mutates that object in place, which then
// silently changes every OTHER cell still pointing at the same shared
// style (this bit us once already: setting the hourmeter's numFmt on F5
// also changed E5's, because both started out on style index 5). Always
// assign a shallow-cloned style object instead of mutating in place.
function setNumFmt(cell: ExcelJS.Cell, numFmt: string) {
  cell.style = { ...cell.style, numFmt };
}

// Years between an installation date and its calendar_limit_date, rounded
// to one decimal — null if either date is missing (no calendar limit at
// all, or no installation date to measure from).
function calendarLimitYears(installationDate: string | null, calendarLimitDate: string | null): number | null {
  if (!installationDate || !calendarLimitDate) return null;
  const start = new Date(`${installationDate}T00:00:00Z`).getTime();
  const end = new Date(`${calendarLimitDate}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round(((end - start) / (365.25 * 86400000)) * 10) / 10;
}

function writeDateCell(cell: ExcelJS.Cell, iso: string | null) {
  const date = toExcelDate(iso);
  if (date) {
    cell.value = date;
    setNumFmt(cell, "dd-mmm-yyyy");
  } else {
    cell.value = "";
  }
}

/** Fills one of the two "Control Maestro" component tables. `hasRefAndPosition`
 * distinguishes the primary "Control Maestro" tab (16 columns: Ref.#,
 * ..., Posición, ...) from the secondary "Control Maestro (2)" tab (14
 * columns, no Ref.#/Posición) — both get the same live data, just mapped to
 * their own column layout, so neither tab is left showing stale demo rows.
 * `maxRows` is the template's fixed table size (43 for the primary tab, 50
 * for the secondary) — components beyond that are truncated with a warning
 * rather than resizing the Excel Table's range, which risks corrupting the
 * table definition. No helicopter has come close to that many active
 * components in practice. */
function fillComponentTable(
  sheet: ExcelJS.Worksheet,
  tableName: string,
  helicopter: ExportHelicopter,
  components: ExportComponent[],
  hasRefAndPosition: boolean,
  maxRows: number
) {
  const metaRow = sheet.getRow(5);
  metaRow.getCell(1).value = helicopter.registration;
  metaRow.getCell(2).value = helicopter.model;
  metaRow.getCell(3).value = helicopter.manufacture_year ?? "";
  metaRow.getCell(4).value = helicopter.serial_number ?? "";
  writeDateCell(metaRow.getCell(5), helicopter.last_review_date);
  const hourmeterCell = metaRow.getCell(6);
  hourmeterCell.value = Number(helicopter.current_hourmeter) || 0;
  setNumFmt(hourmeterCell, '0.0" HRS"');

  const used = components.slice(0, maxRows);
  if (components.length > maxRows) {
    console.warn(
      `[components/export] ${helicopter.registration}: ${components.length} componentes exceden las ${maxRows} filas de la plantilla "${tableName}"; se truncó a ${maxRows}.`
    );
  }

  for (let i = 0; i < maxRows; i++) {
    const rowNum = 8 + i;
    const row = sheet.getRow(rowNum);
    const component = used[i];
    const colCount = hasRefAndPosition ? 16 : 14;

    if (!component) {
      // Blank out unused template rows so they don't show leftover demo
      // data or a #DIV/0! from the calculated columns reading empty inputs.
      clearRow(sheet, rowNum, 1, colCount);
      continue;
    }

    let col = 1;
    if (hasRefAndPosition) row.getCell(col++).value = i + 1; // Ref. #
    row.getCell(col++).value = component.component_name;
    row.getCell(col++).value = component.part_number;
    row.getCell(col++).value = component.serial_number;
    if (hasRefAndPosition) row.getCell(col++).value = component.position ?? "";
    writeDateCell(row.getCell(col++), component.installation_date);
    row.getCell(col++).value = Number(component.tsn_hours) || 0;
    const tsoCol = col;
    const tso = Number(component.tso_hours) || 0;
    row.getCell(col++).value = tso;
    const lifeLimitCol = col;
    const lifeLimit = Number(component.life_limit_hours) || 0;
    row.getCell(col++).value = lifeLimit;
    // Remanente (HRS) — same idea as the original template's calculated
    // column (Límite vida - TSO), but written as a plain cell-reference
    // formula (e.g. "=I8-H8") instead of an Excel Table structured
    // reference. Structured references ("tblComponentes[[#This Row],...]")
    // aren't understood by every spreadsheet app — Apple Numbers in
    // particular fails to parse them — which showed up as a real error in
    // this exact column. A plain formula works everywhere, and a cached
    // `result` is included too so the number still shows correctly even in
    // a viewer that doesn't recalculate formulas on open at all.
    const remanenteCol = col;
    const remanente = lifeLimit - tso;
    row.getCell(col++).value = {
      formula: `${colLetter(lifeLimitCol)}${rowNum}-${colLetter(tsoCol)}${rowNum}`,
      result: remanente
    } as ExcelJS.CellFormulaValue;
    // Límite calendario (AÑOS): the duration between installation and the
    // calendar_limit_date column right after this one. Previously left
    // blank on the reasoning that HSV OS only stores the resulting
    // expiration date, not an original "years" figure — but Adolfo pointed
    // out a blank cell here reads as "nothing was checked," not "no
    // calendar limit," which is confusing on a printed report. Computed
    // instead of guessed: derived straight from the same two dates already
    // on this row, so it can't disagree with them. A component with no
    // calendar_limit_date at all (LIFE/ON CONDITION/N/A in the source —
    // see lib/component-import.ts) correctly shows blank here, same as its
    // own Estado/Observaciones already say "no calendar limit."
    // Forcing a plain "0.0" number format on both of these cells rather
    // than trusting whatever style the template's original row happened to
    // carry: a handful of rows in the template (SPRAG CLUTCH, STARTER, TR
    // GEAR BOX, TR GUARD) had a leftover date-formatted style on these
    // exact columns, so a fractional number like 11.6 rendered as a
    // nonsense "1900-01-11" date instead of a plain number — same shared-
    // style-object gotcha documented on setNumFmt above, just discovered
    // on a different column this time.
    const calYearsCell = row.getCell(col++);
    calYearsCell.value = calendarLimitYears(component.installation_date, component.calendar_limit_date) ?? "";
    setNumFmt(calYearsCell, "0.0");
    writeDateCell(row.getCell(col++), component.calendar_limit_date);
    // LIMITE DE VIDA EN AÑOS: years of calendar life REMAINING (from
    // today), same idea as "Remanente (HRS)" two columns back but for the
    // calendar side instead of the hour side. This used to just reproduce
    // the original template's own leftover formula ("19+12-26" — a fixed
    // "5" for every single row, regardless of the component) verbatim,
    // on the reasoning that it wasn't something HSV OS introduced. Adolfo
    // correctly flagged that every component showing exactly "5" is
    // obviously wrong, not a harmless leftover — so it's now computed for
    // real from remaining_calendar_days (already on this component from
    // the fixed calendar-limit logic), and left blank for a component with
    // no calendar limit at all rather than showing a fake "5".
    const remainingYearsCell = row.getCell(col++);
    if (component.remaining_calendar_days != null) {
      remainingYearsCell.value = Math.round((component.remaining_calendar_days / 365.25) * 10) / 10;
      setNumFmt(remainingYearsCell, "0.0");
    } else {
      remainingYearsCell.value = "";
    }
    // A component with no hour-based life limit (life_limit_hours = 0 — it
    // only tracks a calendar limit) would make this formula divide by zero
    // (#DIV/0!) both in our cached result and when Excel recalculates on
    // open. Write a plain 0 instead of a formula for those rows rather than
    // shipping a guaranteed error.
    if (lifeLimit > 0) {
      row.getCell(col++).value = {
        formula: `${colLetter(remanenteCol)}${rowNum}*100/${colLetter(lifeLimitCol)}${rowNum}`,
        result: (remanente * 100) / lifeLimit
      } as ExcelJS.CellFormulaValue;
    } else {
      row.getCell(col++).value = 0;
    }
    row.getCell(col++).value = component.status;
    row.getCell(col++).value = component.notes ?? "";
  }
}

function fillResumenEjecutivo(sheet: ExcelJS.Worksheet, helicopter: ExportHelicopter, components: ExportComponent[]) {
  sheet.getRow(5).getCell(2).value = helicopter.registration;
  sheet.getRow(6).getCell(2).value = helicopter.model;
  sheet.getRow(7).getCell(2).value = helicopter.manufacture_year ?? "";
  sheet.getRow(8).getCell(2).value = helicopter.serial_number ?? "";
  writeDateCell(sheet.getRow(9).getCell(2), helicopter.last_review_date);
  const hourmeterCell = sheet.getRow(10).getCell(2);
  hourmeterCell.value = Number(helicopter.current_hourmeter) || 0;
  setNumFmt(hourmeterCell, '0.0" HRS"');

  // Matches this same sheet's Leyenda-documented thresholds (CRÍTICO = <20%
  // vida remanente por horas) rather than reusing app-wide status buckets,
  // so the printed criteria and the printed count always agree.
  const critical = components.filter((c) => c.remaining_percentage != null && c.remaining_percentage < 20).length;
  const noCalendarLimit = components.filter((c) => !c.calendar_limit_date).length;

  sheet.getRow(5).getCell(8).value = components.length; // Total componentes controlados
  sheet.getRow(7).getCell(8).value = critical; // Componentes críticos <20% vida hrs
  sheet.getRow(9).getCell(8).value = noCalendarLimit; // Componentes sin límite calendario en fuente
  sheet.getRow(11).getCell(8).value = 0; // Referencias normalizadas — no ambiguity to normalize on a live HSV OS export
}

// exceljs (v4.4.0) has a real bug in how it re-serializes an Excel Table's
// <table> XML part on save: for a table with "calculated columns" (ones
// carrying a dataDxfId + calculatedColumnFormula, like this template's
// "LIMITE DE VIDA EN AÑOS" and "% remanente horas") it silently drops every
// column definition from that point onward — the table's cell VALUES and
// FORMULAS all save correctly, but the <tableColumns> list ends up shorter
// than the table's own column range (e.g. 13 columns declared for a 16-
// column A7:P50 range). That mismatch is invalid OOXML, so Excel detects
// corruption on open and repairs the file — which is exactly what wiped out
// "Remanente (HRS)" and "% remanente horas" for the user (2026-07-24 bug
// report). Filed as a real exceljs limitation, not something fixable by
// changing how we write cells.
//
// The fix: exceljs writes everything else correctly (cell values, formulas,
// styles, the embedded logo), so after it finishes we reach into the raw
// zip and swap the two broken xl/tables/table*.xml parts back for the
// pristine, byte-correct versions from the untouched template file — we
// never actually change the table's column *structure*, only the data
// inside it, so the template's original table XML is always still valid.
async function restoreTableDefinitions(generatedBuffer: Buffer): Promise<Buffer> {
  const [generatedZip, templateZip] = await Promise.all([
    JSZip.loadAsync(generatedBuffer),
    JSZip.loadAsync(fs.readFileSync(TEMPLATE_PATH))
  ]);

  const templateTablesByName = new Map<string, string>();
  for (const file of Object.values(templateZip.files)) {
    if (!/^xl\/tables\/table\d+\.xml$/.test(file.name)) continue;
    const xml = await file.async("string");
    const nameMatch = xml.match(/<table\b[^>]*\bname="([^"]+)"/);
    if (nameMatch) templateTablesByName.set(nameMatch[1], xml);
  }

  for (const file of Object.values(generatedZip.files)) {
    if (!/^xl\/tables\/table\d+\.xml$/.test(file.name)) continue;
    const xml = await file.async("string");
    const nameMatch = xml.match(/<table\b[^>]*\bname="([^"]+)"/);
    const original = nameMatch ? templateTablesByName.get(nameMatch[1]) : undefined;
    if (original) generatedZip.file(file.name, original);
  }

  const patched = await generatedZip.generateAsync({ type: "nodebuffer" });
  return Buffer.from(patched);
}

const PRO_HEADERS = [
  "Componente",
  "P/N",
  "S/N",
  "Posición",
  "Fecha instalación",
  "TSN (HRS)",
  "TSO (HRS)",
  "Límite de vida (HRS)",
  "Horómetro actual",
  "Horas remanentes reales",
  "Fecha límite calendario",
  "Meses restantes",
  "Horas mensuales proyectadas",
  "Fecha estimada de agotamiento",
  "Costo estimado",
  "Lead time (días)",
  "Prioridad de compra",
  "Ordenado",
  "AD-SB aplicables",
  "Estado",
  "Observaciones (fuente)",
  "Observaciones de mantenimiento"
];

// Days-until-due math mirrors lib/aura.ts's buildMaintenanceForecastEngine
// exactly (min of hours-based days-remaining at the aircraft's own flown
// trend, and calendar days-remaining) so this export's "meses restantes" /
// "fecha estimada de agotamiento" never disagrees with what AURA and
// Alertas already show for the same component.
function computeDueInDays(remainingHours: number, remainingCalendarDays: number | null, monthlyTrend: number): number | null {
  const daysByHours = remainingHours <= 0 ? 0 : monthlyTrend > 0 ? Math.ceil(remainingHours / (monthlyTrend / 30)) : Number.POSITIVE_INFINITY;
  const calendarDays = remainingCalendarDays == null ? Number.POSITIVE_INFINITY : Math.max(0, remainingCalendarDays);
  const dueInDays = Math.min(daysByHours, calendarDays);
  return Number.isFinite(dueInDays) ? dueInDays : null;
}

function priorityFromDueInDays(dueInDays: number | null): string {
  if (dueInDays == null) return "Planificar";
  if (dueInDays <= 30) return "Inmediata";
  if (dueInDays <= 90) return "Pronto";
  return "Planificar";
}

/** Builds the "Control PRO" sheet from scratch (plain cells, no Excel Table
 * structured references) instead of extending the office's original
 * template tabs — those are a fixed-size Excel Table with a documented
 * exceljs bug around adding/removing calculated columns (see
 * restoreTableDefinitions's comment above), so adding a dozen new columns
 * to them is a real corruption risk. This sheet is free-form and can carry
 * every column Adolfo asked for: horómetro actual, horas remanentes
 * reales, fecha límite, meses restantes, horas mensuales proyectadas,
 * fecha estimada de agotamiento, costo estimado, lead time, prioridad de
 * compra, ordenado sí/no, AD-SB aplicables, and observaciones de
 * mantenimiento — without touching the original tabs at all. */
function buildControlProSheet(
  workbook: ExcelJS.Workbook,
  helicopter: ExportHelicopter,
  components: ExportComponent[],
  flightLogs: FlightLogRow[],
  complianceItems: ExportComplianceItem[],
  purchaseRequests: ExportPurchaseRequest[],
  technicalRecords: ExportTechnicalRecord[]
) {
  const sheet = workbook.addWorksheet("Control PRO", { views: [{ state: "frozen", ySplit: 2 }] });

  sheet.getCell(1, 1).value = `${helicopter.registration} — CONTROL MAESTRO PRO DE COMPONENTES`;
  sheet.getCell(1, 1).font = { bold: true, size: 13 };
  sheet.mergeCells(1, 1, 1, PRO_HEADERS.length);

  const headerRow = sheet.getRow(2);
  PRO_HEADERS.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
    cell.alignment = { wrapText: true, vertical: "middle" };
  });
  headerRow.height = 30;
  sheet.columns.forEach((col, i) => {
    col.width = i === 0 ? 26 : i === PRO_HEADERS.length - 1 || i === PRO_HEADERS.length - 2 ? 40 : 16;
  });
  sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: PRO_HEADERS.length } };

  const monthlyTrend = monthlyFlightHourTrend(flightLogs, helicopter.registration);
  const currentHourmeter = Number(helicopter.current_hourmeter) || 0;
  const today = new Date();

  components.forEach((component, i) => {
    const rowNum = 3 + i;
    const row = sheet.getRow(rowNum);
    let col = 1;

    const dueInDays = computeDueInDays(component.remaining_hours, component.remaining_calendar_days, monthlyTrend);
    const monthsRemaining = dueInDays != null ? Math.round((dueInDays / 30.44) * 10) / 10 : null;
    const exhaustionDate = dueInDays != null ? new Date(today.getTime() + dueInDays * 86400000) : null;

    const adSb = complianceItems
      .filter((c) => c.related_component_id === component.id)
      .map((c) => `${c.compliance_type} ${c.reference_number || ""} (${c.status})`.trim())
      .join("; ");

    const matchedPurchase = purchaseRequests
      .filter((p) => normalizePartNumber(p.part_number) === normalizePartNumber(component.part_number))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const costoEstimado = matchedPurchase ? matchedPurchase.unit_cost : null;
    const leadTime = matchedPurchase?.lead_time_days ?? null;
    const prioridad = matchedPurchase?.priority || priorityFromDueInDays(dueInDays);
    const ordenado = matchedPurchase ? (ORDERED_STATUSES.has(matchedPurchase.status) ? "Sí" : "No") : dueInDays != null && dueInDays <= 90 ? "No" : "—";

    const latestRecord = technicalRecords
      .filter((t) => t.related_component_id === component.id)
      .sort((a, b) => (b.record_date ?? "").localeCompare(a.record_date ?? ""))[0];
    const observacionesMantenimiento = latestRecord
      ? `${latestRecord.record_date ?? ""} — ${latestRecord.inspection_type ?? latestRecord.title}${latestRecord.notes ? ": " + latestRecord.notes : ""}`.trim()
      : "";

    row.getCell(col++).value = component.component_name;
    row.getCell(col++).value = component.part_number;
    row.getCell(col++).value = component.serial_number;
    row.getCell(col++).value = component.position ?? "";
    writeDateCell(row.getCell(col++), component.installation_date);
    row.getCell(col++).value = Number(component.tsn_hours) || 0;
    row.getCell(col++).value = Number(component.tso_hours) || 0;
    row.getCell(col++).value = Number(component.life_limit_hours) || 0;
    row.getCell(col++).value = currentHourmeter;
    row.getCell(col++).value = Number(component.remaining_hours) || 0;
    writeDateCell(row.getCell(col++), component.calendar_limit_date);
    row.getCell(col++).value = monthsRemaining ?? "";
    row.getCell(col++).value = Math.round(monthlyTrend * 10) / 10;
    if (exhaustionDate) writeDateCell(row.getCell(col++), exhaustionDate.toISOString().slice(0, 10));
    else col++;
    row.getCell(col++).value = costoEstimado ?? "";
    row.getCell(col++).value = leadTime ?? "";
    row.getCell(col++).value = prioridad;
    row.getCell(col++).value = ordenado;
    row.getCell(col++).value = adSb || "—";
    row.getCell(col++).value = component.status;
    row.getCell(col++).value = component.notes ?? "";
    row.getCell(col++).value = observacionesMantenimiento || "—";

    // Same visual severity cue as the rest of the app (Expired/Critical = red
    // tint, Monitor = amber) so a técnico scanning this flat sheet doesn't
    // have to read every "Estado" cell individually.
    if (component.status === "Expired" || component.status === "Critical") {
      row.eachCell((cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4E4" } }));
    } else if (component.status === "Monitor") {
      row.eachCell((cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } }));
    }
  });
}

export async function buildComponentControlWorkbook(
  helicopter: ExportHelicopter,
  components: ExportComponent[],
  flightLogs: FlightLogRow[] = [],
  complianceItems: ExportComplianceItem[] = [],
  purchaseRequests: ExportPurchaseRequest[] = [],
  technicalRecords: ExportTechnicalRecord[] = []
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  workbook.calcProperties.fullCalcOnLoad = true;

  const controlMaestro2 = workbook.getWorksheet("Control Maestro (2)");
  const controlMaestro = workbook.getWorksheet("Control Maestro");
  const resumen = workbook.getWorksheet("Resumen Ejecutivo");

  if (!controlMaestro) throw new Error('La plantilla no tiene la hoja "Control Maestro".');

  fillComponentTable(controlMaestro, "tblComponentes", helicopter, components, true, 43);
  if (controlMaestro2) fillComponentTable(controlMaestro2, "tblComponentes3", helicopter, components, false, 50);
  buildControlProSheet(workbook, helicopter, components, flightLogs, complianceItems, purchaseRequests, technicalRecords);
  if (resumen) fillResumenEjecutivo(resumen, helicopter, components);

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return restoreTableDefinitions(buffer);
}
