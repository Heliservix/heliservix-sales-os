import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type RouteParams = { params: Promise<{ id: string }> };

// Downloadable Excel copy of the order — same "one flat sheet with the
// record's fields, then the checklist as a table" shape as the inventory
// and component-control exports, just for a single record instead of a
// full list. Meant for archiving/emailing a copy outside the app; "Imprimir"
// (same detail page) covers handing someone a paper/PDF copy.
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

  const orderCode = `OT-${String(order.sequence_number).padStart(5, "0")}`;

  const rows: (string | number)[][] = [
    [`ORDEN DE TRABAJO — ${orderCode}`],
    [],
    ["Cliente", order.client_name ?? ""],
    ["Dirección", order.client_address ?? ""],
    ["Teléfono", order.client_phone ?? ""],
    [],
    ["Aeronave (tipo)", order.aircraft_type ?? ""],
    ["Matrícula", order.aircraft_registration ?? order.helicopter_registration ?? ""],
    ["S/N aeronave", order.aircraft_serial ?? ""],
    ["Motor", order.engine_type ?? ""],
    ["Modelo (motor)", order.engine_model ?? ""],
    ["S/N motor", order.engine_serial ?? ""],
    [],
    ["Técnico encargado", nameFor(order.lead_technician_id) || "Sin asignar"],
    ["Horas estimadas", order.estimated_hours ?? ""],
    ["Material", order.material_notes ?? ""],
    ["Contrato N°", order.contract_number ?? ""],
    ["Estado", order.status],
    ["Fecha de apertura", order.opened_at ?? ""],
    [],
    ["CHECKLIST DE TRABAJO"],
    ["#", "Sección", "Descripción", "Hecho", "Realizado por", "Fecha"],
    ...items.map((item, i) => [
      i + 1,
      item.section_label ?? "",
      item.description,
      item.is_complete ? "Sí" : "No",
      nameFor(item.completed_by_personnel_id),
      item.completed_at ? new Date(item.completed_at).toLocaleString("es-PA") : ""
    ]),
    [],
    ["Notas", order.notes ?? ""],
    [],
    ["FIRMAS (Formulario HS-06)"],
    [
      "Técnico encargado",
      order.technician_completed_at ? `Trabajo terminado el ${new Date(order.technician_completed_at).toLocaleString("es-PA")}` : "Pendiente"
    ],
    [
      "Gerente General — Heliser Vix Inc.",
      order.manager_approved_at ? `Aprobado por ${nameFor(order.manager_approved_by)} el ${new Date(order.manager_approved_at).toLocaleString("es-PA")}` : "Pendiente"
    ]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 26 }, { wch: 40 }, { wch: 40 }, { wch: 10 }, { wch: 28 }, { wch: 20 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orden de trabajo");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Orden_${orderCode}.xlsx"`
    }
  });
}
