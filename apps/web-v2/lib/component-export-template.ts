import ExcelJS from "exceljs";
import JSZip from "jszip";
import path from "path";
import fs from "fs";

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
  component_name: string;
  part_number: string;
  serial_number: string;
  position: string | null;
  installation_date: string | null;
  tsn_hours: number;
  tso_hours: number;
  life_limit_hours: number;
  calendar_limit_date: string | null;
  status: string;
  notes: string | null;
  remaining_percentage: number | null;
};

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
    // Límite calendario (AÑOS): the template's original author typed a raw
    // year-duration here; HSV OS only stores the resulting expiration date
    // (below), not that original duration, so this cell is left blank
    // rather than guessed at.
    row.getCell(col++).value = "";
    writeDateCell(row.getCell(col++), component.calendar_limit_date);
    // Kept verbatim from the original template — this column's formula
    // ("19+12-26") isn't something HSV OS introduced or can meaningfully
    // fix; it's reproduced as-is so the file matches the source format.
    row.getCell(col++).value = { formula: "19+12-26", result: 5 } as ExcelJS.CellFormulaValue;
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

export async function buildComponentControlWorkbook(helicopter: ExportHelicopter, components: ExportComponent[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  workbook.calcProperties.fullCalcOnLoad = true;

  const controlMaestro2 = workbook.getWorksheet("Control Maestro (2)");
  const controlMaestro = workbook.getWorksheet("Control Maestro");
  const resumen = workbook.getWorksheet("Resumen Ejecutivo");

  if (!controlMaestro) throw new Error('La plantilla no tiene la hoja "Control Maestro".');

  fillComponentTable(controlMaestro, "tblComponentes", helicopter, components, true, 43);
  if (controlMaestro2) fillComponentTable(controlMaestro2, "tblComponentes3", helicopter, components, false, 50);
  if (resumen) fillResumenEjecutivo(resumen, helicopter, components);

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return restoreTableDefinitions(buffer);
}
