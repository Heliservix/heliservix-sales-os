import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type RouteParams = { params: Promise<{ id: string }> };

// Downloadable Excel copy of the report, same shape/purpose as the Work
// Orders export (app/work-orders/[id]/export/route.ts) — one flat sheet
// with the record's fields, then the "Control de Componente" sub-table.
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
  const nameFor = (personnelId: string | null) => {
    if (!personnelId) return "";
    const p = personnelById.get(personnelId);
    if (!p) return "";
    return p.license_number ? `${p.full_name} (Lic. ${p.license_number})` : p.full_name;
  };

  const reportCode = `NR-${String(report.sequence_number).padStart(5, "0")}`;
  const relatedOT = report.work_order_id ? `OT-${String(workOrdersById.get(report.work_order_id) ?? "").padStart(5, "0")}` : "";

  const rows: (string | number)[][] = [
    [`REPORTE NO RUTINA — ${reportCode}`],
    [],
    ["Aeronave", report.helicopter_registration ?? report.aircraft_model ?? ""],
    ["Modelo de aeronave", report.aircraft_model ?? ""],
    ["Orden de trabajo relacionada", relatedOT],
    ["Horas totales (Total Time)", report.total_time_hours ?? ""],
    ["Fecha del reporte", report.report_date ?? ""],
    ["Encontrado por", nameFor(report.opened_by_personnel_id) || "Sin asignar"],
    [],
    ["Discrepancia encontrada"],
    [report.discrepancy ?? ""],
    [],
    ["Acción correctiva"],
    [report.corrective_action ?? "Pendiente"],
    ["Corregido por", nameFor(report.corrected_by_personnel_id) || "—"],
    [],
    ["Referencia de manual (AD/SB/manual de mantenimiento)", report.manual_reference ?? "—"],
    [],
    ["CONTROL DE COMPONENTE"],
    ["Descripción", "P/N", "S/N removido", "S/N instalado"],
    ...components.map((c) => [c.description ?? "", c.part_number ?? "", c.serial_removed ?? "", c.serial_installed ?? ""]),
    [],
    ["CIERRE POR INSPECCIÓN"],
    ["Estado", report.status],
    ["Inspector", nameFor(report.inspector_personnel_id) || "—"],
    ["Fecha de cierre", report.completed_at ?? "—"],
    [],
    ["Notas", report.notes ?? ""]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 40 }, { wch: 24 }, { wch: 20 }, { wch: 20 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "No Rutina");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="NoRutina_${reportCode}.xlsx"`
    }
  });
}
