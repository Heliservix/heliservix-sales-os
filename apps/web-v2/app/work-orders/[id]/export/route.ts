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

// Downloadable Excel copy recreating Formulario HS-06's own field layout
// (logo, CLIENTE/AERONAVE/MOTOR boxes, DESCRIPCION DEL TRABAJO REQUERIDO /
// TRABAJO REALIZADO split, FIRMAS block) instead of a flat label-value
// dump — same real HeliServiX logo the rest of the app uses (not any Air
// Supplies branding), embedded via exceljs like lib/component-export-
// template.ts already does for the "Control PRO" sheet.
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const { data: order } = await supabase.from("work_orders").select("*").eq("id", id).maybeSingle();
  if (!order) {
    return NextResponse.json({ error: `Work order ${id} not found.` }, { status: 404 });
  }

  const [{ data: itemData }, { data: personnelData }] = await Promise.all([
    supabase.from("work_order_items").select("*").eq("work_order_id", id).eq("archived", false).order("position", { ascending: true }),
    supabase.from("personnel").select("id, full_name, license_number").order("full_name")
  ]);

  const items = itemData ?? [];
  const personnelById = new Map((personnelData ?? []).map((p) => [p.id, p]));
  const nameFor = (personnelId: string | null) => {
    if (!personnelId) return "";
    const p = personnelById.get(personnelId);
    if (!p) return "";
    return p.license_number ? `${p.full_name} (Lic. ${p.license_number})` : p.full_name;
  };
  const pending = items.filter((i) => !i.is_complete);
  const done = items.filter((i) => i.is_complete);

  const orderCode = `OT-${String(order.sequence_number).padStart(5, "0")}`;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Orden de trabajo", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true } });
  sheet.columns = [{ width: 16 }, { width: 20 }, { width: 16 }, { width: 20 }, { width: 14 }, { width: 18 }];

  // Logo (top-left) + title (top-right), matching the paper form's header.
  const logoBuffer = fs.readFileSync(LOGO_PATH);
  const logoImageId = workbook.addImage({ buffer: logoBuffer as unknown as ExcelJS.Buffer, extension: "png" });
  sheet.addImage(logoImageId, { tl: { col: 0, row: 0.1 }, ext: { width: 220, height: 60 } });
  sheet.mergeCells(1, 4, 2, 6);
  const titleCell = sheet.getRow(1).getCell(4);
  titleCell.value = `ORDEN DE TRABAJO Nº ${orderCode}`;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { vertical: "middle", horizontal: "right" };
  sheet.mergeCells(3, 4, 3, 6);
  const subtitleCell = sheet.getRow(3).getCell(4);
  subtitleCell.value = "Formulario HS-06";
  subtitleCell.font = { size: 9, italic: true, color: { argb: "FF666666" } };
  subtitleCell.alignment = { horizontal: "right" };
  for (let r = 1; r <= 3; r++) sheet.getRow(r).height = 20;

  let r = 5;
  sheet.mergeCells(r, 1, r, 6);
  const clienteCell = sheet.getRow(r).getCell(1);
  clienteCell.value = `CLIENTE: ${order.client_name ?? ""}`;
  clienteCell.font = { bold: true, size: 9 };
  clienteCell.alignment = { vertical: "middle" };
  box(clienteCell);
  r++;

  label(sheet.getRow(r).getCell(1), "DIRECCION");
  sheet.mergeCells(r, 2, r, 3);
  value(sheet.getRow(r).getCell(2), order.client_address);
  label(sheet.getRow(r).getCell(4), "TELEFONO");
  sheet.mergeCells(r, 5, r, 6);
  value(sheet.getRow(r).getCell(5), order.client_phone);
  r++;

  label(sheet.getRow(r).getCell(1), "AERONAVE");
  value(sheet.getRow(r).getCell(2), order.aircraft_type);
  label(sheet.getRow(r).getCell(3), "MATRICULA");
  value(sheet.getRow(r).getCell(4), order.aircraft_registration ?? order.helicopter_registration);
  label(sheet.getRow(r).getCell(5), "S/N");
  value(sheet.getRow(r).getCell(6), order.aircraft_serial);
  r++;

  label(sheet.getRow(r).getCell(1), "MOTOR");
  value(sheet.getRow(r).getCell(2), order.engine_type);
  label(sheet.getRow(r).getCell(3), "MODELO");
  value(sheet.getRow(r).getCell(4), order.engine_model);
  label(sheet.getRow(r).getCell(5), "S/N");
  value(sheet.getRow(r).getCell(6), order.engine_serial);
  r += 2;

  sectionHeader(sheet, r, "DESCRIPCION DEL TRABAJO REQUERIDO:");
  r++;
  if (pending.length) {
    for (const [i, item] of pending.entries()) {
      fullRow(sheet, r, `${i + 1}) ${item.section_label ? `[${item.section_label}] ` : ""}${item.description}`);
      r++;
    }
  } else {
    fullRow(sheet, r, "— Ninguna tarea pendiente —");
    r++;
  }
  r++;

  sectionHeader(sheet, r, "TRABAJO REALIZADO:");
  r++;
  if (done.length) {
    for (const [i, item] of done.entries()) {
      const who = nameFor(item.completed_by_personnel_id) || "—";
      const when = item.completed_at ? new Date(item.completed_at).toLocaleString("es-PA") : "";
      const extras = [item.photo_url ? "Foto adjunta" : null, item.signature_url ? "Firma digital" : null].filter(Boolean).join(" · ");
      fullRow(sheet, r, `${i + 1}) ${item.description} — hecho por ${who}${when ? ` el ${when}` : ""}${extras ? ` [${extras}]` : ""}`);
      r++;
    }
  } else {
    fullRow(sheet, r, "— Nada completado todavía —");
    r++;
  }
  r++;

  label(sheet.getRow(r).getCell(1), "HORAS ESTIMADAS");
  value(sheet.getRow(r).getCell(2), order.estimated_hours);
  label(sheet.getRow(r).getCell(3), "MATERIAL");
  sheet.mergeCells(r, 4, r, 4);
  value(sheet.getRow(r).getCell(4), order.material_notes);
  label(sheet.getRow(r).getCell(5), "CONTRATO No.");
  value(sheet.getRow(r).getCell(6), order.contract_number);
  r++;

  fullRow(sheet, r, `ESTADO: ${order.status}    ·    FECHA DE APERTURA: ${order.opened_at ?? ""}`, false);
  r += 2;

  sheet.mergeCells(r, 1, r, 3);
  const techHeader = sheet.getRow(r).getCell(1);
  techHeader.value = "TECNICO ENCARGADO";
  techHeader.font = { bold: true, size: 9 };
  techHeader.alignment = { horizontal: "center" };
  sheet.mergeCells(r, 4, r, 6);
  const mgrHeader = sheet.getRow(r).getCell(4);
  mgrHeader.value = "GERENTE GENERAL — HELISER VIX INC.";
  mgrHeader.font = { bold: true, size: 9 };
  mgrHeader.alignment = { horizontal: "center" };
  r++;

  sheet.mergeCells(r, 1, r, 3);
  const techFirma = sheet.getRow(r).getCell(1);
  techFirma.value = `Firma: ${nameFor(order.lead_technician_id) || "—"}${order.technician_signature_url ? " (firma digital guardada)" : ""}`;
  techFirma.font = { size: 9 };
  techFirma.alignment = { horizontal: "center" };
  box(techFirma);
  sheet.mergeCells(r, 4, r, 6);
  const mgrFirma = sheet.getRow(r).getCell(4);
  mgrFirma.value = `Firma: ${nameFor(order.manager_approved_by) || "—"}${order.manager_signature_url ? " (firma digital guardada)" : ""}`;
  mgrFirma.font = { size: 9 };
  mgrFirma.alignment = { horizontal: "center" };
  box(mgrFirma);
  r++;

  sheet.mergeCells(r, 1, r, 3);
  const techFecha = sheet.getRow(r).getCell(1);
  techFecha.value = `Fecha: ${order.technician_completed_at ? new Date(order.technician_completed_at).toLocaleString("es-PA") : "Pendiente"}`;
  techFecha.font = { size: 9 };
  techFecha.alignment = { horizontal: "center" };
  box(techFecha);
  sheet.mergeCells(r, 4, r, 6);
  const mgrFecha = sheet.getRow(r).getCell(4);
  mgrFecha.value = `Fecha: ${order.manager_approved_at ? new Date(order.manager_approved_at).toLocaleString("es-PA") : "Pendiente"}`;
  mgrFecha.font = { size: 9 };
  mgrFecha.alignment = { horizontal: "center" };
  box(mgrFecha);
  r += 2;

  if (order.notes) {
    sectionHeader(sheet, r, "NOTAS");
    r++;
    fullRow(sheet, r, order.notes);
    r++;
  }

  sheet.mergeCells(r, 1, r, 6);
  const footer = sheet.getRow(r).getCell(1);
  footer.value = `Formulario HS-06 · Generado por HeliServiX OS el ${new Date().toLocaleDateString("es-PA")}`;
  footer.font = { size: 8, bold: true, color: { argb: "FF666666" } };
  footer.alignment = { horizontal: "center" };

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Orden_${orderCode}.xlsx"`
    }
  });
}
