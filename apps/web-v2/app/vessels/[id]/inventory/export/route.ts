import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type RouteParams = { params: Promise<{ id: string }> };

// Exports the current bodega in exactly the column layout that
// lib/inventory-import.ts expects, so this file doubles as an editable
// template: download it (even empty, for a brand-new vessel), fill it in
// Excel, and re-upload from "Cargar inventario desde Excel".
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const { data: vessel } = await supabase.from("vessels").select("id, name").eq("id", id).maybeSingle();
  if (!vessel) {
    return NextResponse.json({ error: `Vessel ${id} not found.` }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("vessel_id", id)
    .eq("archived", false)
    .order("item_name");

  const metaRows: (string | number)[][] = [
    [`INVENTARIO — ${vessel.name}`],
    [],
    ["Barco", "Fecha de exportación"],
    [vessel.name, new Date().toISOString().slice(0, 10)],
    []
  ];

  const header = [
    "Ítem",
    "Tipo",
    "P/N",
    "S/N",
    "Lote",
    "Cantidad",
    "Unidad",
    "Mínimo",
    "Ubicación",
    "Condición",
    "Vencimiento",
    "Helicóptero",
    "Notas"
  ];

  const dataRows = (items ?? []).map((item) => [
    item.item_name,
    item.item_type,
    item.part_number ?? "",
    item.serial_number ?? "",
    item.lot_batch ?? "",
    Number(item.quantity),
    item.unit_of_measure ?? "ea",
    Number(item.minimum_stock),
    item.storage_location ?? "",
    item.condition ?? "",
    item.expiration_date ?? "",
    item.related_helicopter ?? "",
    item.notes ?? ""
  ]);

  const sheetData = [...metaRows, header, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet["!cols"] = header.map((h) => ({ wch: Math.max(12, h.length + 2) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Inventario_${vessel.name.replace(/\s+/g, "_")}.xlsx"`
    }
  });
}
