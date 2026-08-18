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
      "id, component_name, part_number, serial_number, position, installation_date, tsn_hours, tso_hours, life_limit_hours, remaining_hours, calendar_limit_date, remaining_calendar_days, status, notes, remaining_percentage"
    )
    .eq("helicopter_registration", registration)
    .neq("status", "Removed")
    .order("component_name", { ascending: true });

  const componentIds = (components ?? []).map((c) => c.id);

  // Everything below feeds the "Control PRO" sheet's extra columns
  // (horas mensuales proyectadas / fecha estimada de agotamiento / AD-SB
  // aplicables / costo estimado / lead time / prioridad / ordenado /
  // observaciones de mantenimiento) — all scoped to this one aircraft, same
  // as the components query above, so this stays cheap even on a big fleet.
  const [{ data: flightLogs }, { data: complianceItems }, { data: purchaseRequests }, { data: technicalRecords }] = await Promise.all([
    supabase.from("flight_logs").select("helicopter_registration, flight_date, flight_hours").eq("helicopter_registration", registration),
    componentIds.length
      ? supabase
          .from("compliance_items")
          .select("related_component_id, compliance_type, reference_number, title, status")
          .in("related_component_id", componentIds)
          .in("compliance_type", ["AD", "SB"])
          .eq("archived", false)
      : Promise.resolve({ data: [] }),
    supabase
      .from("purchase_requests")
      .select("part_number, unit_cost, currency, status, lead_time_days, priority, created_at")
      .eq("related_helicopter", registration)
      .eq("archived", false),
    componentIds.length
      ? supabase
          .from("technical_records")
          .select("related_component_id, record_date, title, notes, inspection_type")
          .in("related_component_id", componentIds)
          .eq("archived", false)
          .order("record_date", { ascending: false })
      : Promise.resolve({ data: [] })
  ]);

  const buffer = await buildComponentControlWorkbook(
    helicopter,
    components ?? [],
    flightLogs ?? [],
    complianceItems ?? [],
    purchaseRequests ?? [],
    technicalRecords ?? []
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Control_Componentes_${registration}.xlsx"`
    }
  });
}
