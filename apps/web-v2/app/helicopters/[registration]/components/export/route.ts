import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type RouteParams = { params: Promise<{ registration: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { registration } = await params;

  const { data: helicopter } = await supabase.from("helicopters").select("*").eq("registration", registration).maybeSingle();
  if (!helicopter) {
    return NextResponse.json({ error: `Helicopter ${registration} not found.` }, { status: 404 });
  }

  const { data: components } = await supabase
    .from("components")
    .select("*")
    .eq("helicopter_registration", registration)
    .neq("status", "Removed")
    .order("component_name", { ascending: true });

  // Metadata block, mirroring the original Control Maestro layout so
  // technicians recognize it immediately.
  const metaRows: (string | number)[][] = [
    ["CONTROL MAESTRO DE COMPONENTES"],
    [],
    ["Matrícula", "Modelo", "S/N Aeronave", "Horómetro actual", "Fecha de exportación"],
    [
      helicopter.registration,
      helicopter.model,
      helicopter.serial_number ?? "",
      Number(helicopter.current_hourmeter),
      new Date().toISOString().slice(0, 10)
    ],
    []
  ];

  const header = [
    "Componente",
    "P/N",
    "S/N",
    "Posición",
    "Fecha instalación",
    "TSN (hrs)",
    "TSO (hrs)",
    "Límite de vida (hrs)",
    "Remanente (hrs)",
    "% remanente",
    "Fecha límite calendario",
    "Días remanentes calendario",
    "Estado",
    "Notas"
  ];

  const dataRows = (components ?? []).map((component) => [
    component.component_name,
    component.part_number,
    component.serial_number,
    component.position ?? "",
    component.installation_date ?? "",
    Number(component.tsn_hours),
    Number(component.tso_hours),
    Number(component.life_limit_hours),
    Number(component.remaining_hours),
    Number(component.remaining_percentage),
    component.calendar_limit_date ?? "",
    component.remaining_calendar_days ?? "",
    component.status,
    component.notes ?? ""
  ]);

  const sheetData = [...metaRows, header, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet["!cols"] = header.map((h) => ({ wch: Math.max(12, h.length + 2) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Control Maestro");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Control_Componentes_${registration}.xlsx"`
    }
  });
}
