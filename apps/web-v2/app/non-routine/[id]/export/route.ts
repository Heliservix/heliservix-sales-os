import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type RouteParams = { params: Promise<{ id: string }> };

const LOGO_PATH = path.join(process.cwd(), "public", "brand", "heliservix-logo.png");

const THIN: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FF000000" } };
function box(cell: ExcelJS.Cell) {
  cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
}
function label(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.font = { bold: true, size: 9 };
  cell.alignment = { vertical: "middle", wrapText: true };
  box(cell);
}
function value(cell: ExcelJS.Cell, text: string | number | null) {
  cell.value = text ?? "";
  cell.font = { size: 9 };
  cell.alignment = { vertical: "middle", wrapText: true };
  box(cell);
}
function sectionHeader(sheet: ExcelJS.Worksheet, row: number, text: string) {
  sheet.mergeCells(row, 1, row, 6);
  const cell = sheet.getRow(row).getCell(1);
  cell.value = text;
  cell.font = { bold: true, size: 10 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8ECEF" } };
  cell.alignment = { vertical: "middle" };
  box(cell);
}
function fullRow(sheet: ExcelJS.Worksheet, row: number, text: string, wrap = true) {
  sheet.mergeCells(row, 1, row, 6);
  const cell = sheet.getRow(row).getCell(1);
  cell.value = text;
  cell.font = { size: 9 };
  cell.alignment = { vertical: "top", wrapText: wrap };
  box(cell);
}

// Downloadable Excel copy recreating Formulario AS-09's own field layout
// ("CONTROL DE REPORTE DE NO-RUTINA" from the shop's original maintenance
// manual) — Matrícula/Modelo/T.T./Fecha header row, DISCREPANCIA and
// ACCION CORRECTIVA boxes, CONTROL DE COMPONENTE table, closeout — with
// the real HeliServiX logo/letterhead instead of the form's original Air
// Supplies letterhead. Same exceljs pattern as the Work Orders export.
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const { data: report } = await supabase.from("non_routine_reports").select("*").eq("id", id).maybeSingle();
  if (!report) {
    return NextResponse.json({ error: `Non-routine report ${id} not found.` }, { status: 404 });
  }

  const [{ data: componentData }, { data: personnelData }, { data: workOrderData }] = await Promise.all([
    supabase.from("non_routine_component_changes").select("*").eq("non_routine_report_id", id).order("created_at", { ascending: true }),
    supabase.from("personnel").select("id, full_name, license_number").order("full_name"),
    supabase.from("work_orders").select("id, sequence_number")
  ]);

  const components = componentData ?? [];
  const personnelById = new Map((personnelData ?? []).map((p) => [p.id, p]));
  const workOrdersById = new Map((workOrderData ?? []).map((o) => [o.id, o.sequence_number]));
  const nameOnly = (personnelId: string | null) => (personnelId ? (personnelById.get(personnelId)?.full_name ?? "") : "");
  const licOnly = (personnelId: string | null) => (personnelId ? (personnelById.get(personnelId)?.license_number ?? "") : "");

  const reportCode = `NR-${String(report.sequence_number).padStart(5, "0")}`;
  const relatedOT = report.work_order_id ? `OT-${String(workOrdersById.get(report.work_order_id) ?? "").padStart(5, "0")}` : "—";

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("No Rutina", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true } });
  sheet.columns = [{ width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];

  const logoBuffer = fs.readFileSync(LOGO_PATH);
  const logoImageId = workbook.addImage({ buffer: logoBuffer as unknown as ExcelJS.Buffer, extension: "png" });
  sheet.addImage(logoImageId, { tl: { col: 0, row: 0.1 }, ext: { width: 220, height: 60 } });
  sheet.mergeCells(1, 4, 1, 6);
  const companyCell = sheet.getRow(1).getCell(4);
  companyCell.value = "HELISER VIX INC.";
  companyCell.font = { bold: true, size: 10 };
  companyCell.alignment = { horizontal: "right" };
  sheet.mergeCells(2, 4, 2, 6);
  const titleCell = sheet.getRow(2).getCell(4);
  titleCell.value = `REPORTE NO RUTINA ${reportCode}`;
  titleCell.font = { bold: true, size: 13 };
  titleCell.alignment = { horizontal: "right" };
  sheet.mergeCells(3, 4, 3, 6);
  const subtitleCell = sheet.getRow(3).getCell(4);
  subtitleCell.value = "Formato: AS-09";
  subtitleCell.font = { size: 9, italic: true, color: { argb: "FF666666" } };
  subtitleCell.alignment = { horizontal: "right" };
  for (let r = 1; r <= 3; r++) sheet.getRow(r).height = 18;

  let r = 5;
  label(sheet.getRow(r).getCell(1), "Matrícula");
  value(sheet.getRow(r).getCell(2), report.helicopter_registration);
  label(sheet.getRow(r).getCell(3), "Modelo");
  value(sheet.getRow(r).getCell(4), report.aircraft_model);
  label(sheet.getRow(r).getCell(5), "T.T.");
  value(sheet.getRow(r).getCell(6), report.total_time_hours);
  r++;

  label(sheet.getRow(r).getCell(1), "Fecha");
  value(sheet.getRow(r).getCell(2), report.report_date);
  label(sheet.getRow(r).getCell(3), "Ítem N°");
  value(sheet.getRow(r).getCell(4), reportCode);
  label(sheet.getRow(r).getCell(5), "N° W/O");
  value(sheet.getRow(r).getCell(6), relatedOT);
  r += 2;

  sectionHeader(sheet, r, "DISCREPANCIA:");
  r++;
  fullRow(sheet, r, report.discrepancy ?? "");
  r++;
  label(sheet.getRow(r).getCell(1), "MECANICO");
  sheet.mergeCells(r, 2, r, 4);
  value(sheet.getRow(r).getCell(2), nameOnly(report.opened_by_personnel_id));
  label(sheet.getRow(r).getCell(5), "No. LIC.");
  value(sheet.getRow(r).getCell(6), licOnly(report.opened_by_personnel_id));
  r += 2;

  sectionHeader(sheet, r, "ACCION CORRECTIVA:");
  r++;
  fullRow(sheet, r, report.corrective_action ?? "Pendiente");
  r++;
  label(sheet.getRow(r).getCell(1), "MECANICO");
  sheet.mergeCells(r, 2, r, 4);
  value(sheet.getRow(r).getCell(2), nameOnly(report.corrected_by_personnel_id));
  label(sheet.getRow(r).getCell(5), "No. LIC.");
  value(sheet.getRow(r).getCell(6), licOnly(report.corrected_by_personnel_id));
  r += 2;

  label(sheet.getRow(r).getCell(1), "REFERENCIA DE MANUAL");
  sheet.mergeCells(r, 2, r, 6);
  value(sheet.getRow(r).getCell(2), report.manual_reference || "—");
  r += 2;

  sectionHeader(sheet, r, "CONTROL DE COMPONENTE");
  r++;
  // 4 header labels over the 6-col grid: DESCRIPCIÓN gets the extra width
  // (2 cols), S/N INSTALADO gets 2 cols too so it doesn't get clipped,
  // NUMERO DE PARTE and S/N REMOVIDO get 1 column each.
  sheet.mergeCells(r, 1, r, 2);
  sheet.getRow(r).getCell(1).value = "DESCRIPCIÓN";
  sheet.getRow(r).getCell(3).value = "NUMERO DE PARTE";
  sheet.getRow(r).getCell(4).value = "S/N REMOVIDO";
  sheet.mergeCells(r, 5, r, 6);
  sheet.getRow(r).getCell(5).value = "S/N INSTALADO";
  for (let c = 1; c <= 6; c++) {
    const cell = sheet.getRow(r).getCell(c);
    cell.font = { bold: true, size: 9 };
    box(cell);
  }
  r++;

  if (components.length) {
    for (const c of components) {
      sheet.mergeCells(r, 1, r, 2);
      value(sheet.getRow(r).getCell(1), c.description);
      value(sheet.getRow(r).getCell(3), c.part_number);
      value(sheet.getRow(r).getCell(4), c.serial_removed);
      sheet.mergeCells(r, 5, r, 6);
      value(sheet.getRow(r).getCell(5), c.serial_installed);
      r++;
    }
  } else {
    fullRow(sheet, r, "— Sin cambios de componente —", false);
    r++;
  }
  r++;

  sectionHeader(sheet, r, "CIERRE POR INSPECCIÓN");
  r++;
  label(sheet.getRow(r).getCell(1), "MECANICO");
  sheet.mergeCells(r, 2, r, 2);
  value(sheet.getRow(r).getCell(2), `${nameOnly(report.corrected_by_personnel_id) || "—"}${licOnly(report.corrected_by_personnel_id) ? ` (Lic. ${licOnly(report.corrected_by_personnel_id)})` : ""}`);
  label(sheet.getRow(r).getCell(3), "INSPECTOR");
  sheet.mergeCells(r, 4, r, 4);
  value(sheet.getRow(r).getCell(4), `${nameOnly(report.inspector_personnel_id) || "—"}${licOnly(report.inspector_personnel_id) ? ` (Lic. ${licOnly(report.inspector_personnel_id)})` : ""}`);
  label(sheet.getRow(r).getCell(5), "FECHA COMPLETADA");
  value(sheet.getRow(r).getCell(6), report.completed_at || "—");
  r += 2;

  if (report.notes) {
    sectionHeader(sheet, r, "NOTAS");
    r++;
    fullRow(sheet, r, report.notes);
    r++;
  }

  sheet.mergeCells(r, 1, r, 6);
  const footer = sheet.getRow(r).getCell(1);
  footer.value = `Formato: AS-09 · Estado: ${report.status} · Generado por HeliServiX OS el ${new Date().toLocaleDateString("es-PA")}`;
  footer.font = { size: 8, bold: true, color: { argb: "FF666666" } };
  footer.alignment = { horizontal: "center" };

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="NoRutina_${reportCode}.xlsx"`
    }
  });
}
