import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { buildComponentControlWorkbook } from "@/lib/component-export-template";

type RouteParams = { params: Promise<{ registration: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { registration } = await params;

  const { data: helicopter } = await supabase
    .from("helicopters")
    .select("registration, model, manufacture_year, serial_number, last_review_date, current_hourmeter")
    .eq("registration", registration)
    .maybeSingle();
  if (!helicopter) {
    return NextResponse.json({ error: `Helicopter ${registration} not found.` }, { status: 404 });
  }

  const { data: components } = await supabase
    .from("components")
    .select(
      "component_name, part_number, serial_number, position, installation_date, tsn_hours, tso_hours, life_limit_hours, calendar_limit_date, status, notes, remaining_percentage"
    )
    .eq("helicopter_registration", registration)
    .neq("status", "Removed")
    .order("component_name", { ascending: true });

  const buffer = await buildComponentControlWorkbook(helicopter, components ?? []);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Control_Componentes_${registration}.xlsx"`
    }
  });
}
