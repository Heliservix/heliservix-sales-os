import ExcelJS from "exceljs";
import path from "path";

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
    row.getCell(col++).value = Number(component.tso_hours) || 0;
    row.getCell(col++).value = Number(component.life_limit_hours) || 0;
    // Remanente (HRS) — the same calculated-column formula the original
    // template uses, so it recalculates live in Excel from TSO/Límite vida
    // instead of shipping as a frozen number.
    row.getCell(col++).value = {
      formula: `${tableName}[[#This Row],[Límite vida (HRS)]]-${tableName}[[#This Row],[TSO (HRS)]]`
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
    row.getCell(col++).value = { formula: "19+12-26" } as ExcelJS.CellFormulaValue;
    row.getCell(col++).value = {
      formula: `${tableName}[[#This Row],[Remanente (HRS)]]*100/${tableName}[[#This Row],[Límite vida (HRS)]]`
    } as ExcelJS.CellFormulaValue;
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

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
