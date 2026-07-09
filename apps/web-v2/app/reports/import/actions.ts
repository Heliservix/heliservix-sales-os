"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { parseWeeklyReportWorkbook } from "@/lib/weekly-report-import";

export type WeeklyImportState = {
  status: "idle" | "success" | "error";
  message: string;
  registration?: string;
  flightHoursApplied?: number;
  maintenanceLogsCreated?: number;
  componentChangesDetected?: number;
  componentChangesReview?: string[];
  warnings?: string[];
};

export async function importWeeklyReport(_prevState: WeeklyImportState, formData: FormData): Promise<WeeklyImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecciona el archivo Excel del reporte semanal." };
  }

  let parsed;
  try {
    const arrayBuffer = await file.arrayBuffer();
    parsed = parseWeeklyReportWorkbook(Buffer.from(arrayBuffer));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "error", message: `No se pudo leer el archivo: ${detail}` };
  }

  const {
    helicopterRegistration,
    vesselName,
    mareaCode,
    weekNumber,
    reportDate,
    hobbsStart,
    hobbsEnd,
    flightHoursThisWeek,
    oilConsumptionQts,
    fuelConsumptionGals,
    routineInspections,
    nonRoutineEvents,
    filterChanges,
    detectedComponentChanges,
    warnings
  } = parsed;

  // 1. The helicopter must already exist — a weekly report shouldn't silently create
  // a brand-new tail number. Use the Control de Componentes importer for that first.
  const { data: helicopter, error: helicopterLookupError } = await supabase
    .from("helicopters")
    .select("registration, assigned_vessel_id")
    .eq("registration", helicopterRegistration)
    .maybeSingle();

  if (helicopterLookupError) {
    return { status: "error", message: `Error consultando el helicóptero: ${helicopterLookupError.message}` };
  }
  if (!helicopter) {
    return {
      status: "error",
      message: `El helicóptero ${helicopterRegistration} no existe todavía. Impórtalo primero desde "Importar componentes" (Control de Componentes) o créalo manualmente.`,
      warnings
    };
  }

  // 2. Block re-importing the same marea + week for this aircraft — otherwise every
  // re-upload would double-deduct component hours via trg_apply_flight_log.
  if (mareaCode) {
    const { data: existingLog, error: existingLogError } = await supabase
      .from("flight_logs")
      .select("id, flight_date")
      .eq("helicopter_registration", helicopterRegistration)
      .eq("marea_code", mareaCode)
      .eq("week_number", weekNumber)
      .maybeSingle();

    if (existingLogError) {
      return { status: "error", message: `Error verificando importaciones previas: ${existingLogError.message}` };
    }
    if (existingLog) {
      return {
        status: "error",
        message: `Esta semana (Marea ${mareaCode}, Semana ${weekNumber}) ya fue importada para ${helicopterRegistration} el ${existingLog.flight_date}. No se volvió a aplicar para evitar restar horas dos veces.`,
        registration: helicopterRegistration,
        warnings
      };
    }
  }

  // 3. Find or create the vessel by name.
  let vesselId: string | null = null;
  if (vesselName) {
    const { data: existingVessel, error: vesselLookupError } = await supabase
      .from("vessels")
      .select("id")
      .ilike("name", vesselName)
      .maybeSingle();

    if (vesselLookupError) {
      return { status: "error", message: `Error consultando el barco: ${vesselLookupError.message}` };
    }

    if (existingVessel) {
      vesselId = existingVessel.id;
    } else {
      const { data: newVessel, error: createVesselError } = await supabase
        .from("vessels")
        .insert({ name: vesselName, status: "Active", source: "User" })
        .select("id")
        .single();
      if (createVesselError) {
        return { status: "error", message: `No se pudo crear el barco "${vesselName}": ${createVesselError.message}` };
      }
      vesselId = newVessel.id;
    }

    if (vesselId && !helicopter.assigned_vessel_id) {
      await supabase.from("helicopters").update({ assigned_vessel_id: vesselId }).eq("registration", helicopterRegistration);
    }
  }

  // 4. Insert the flight_logs row. trg_apply_flight_log then bumps the helicopter's
  // hourmeter and deducts these hours from every active component automatically.
  const weeklyNotes = [
    `Marea ${mareaCode || "N/A"} — Semana ${weekNumber}`,
    oilConsumptionQts != null ? `Aceite: ${oilConsumptionQts} qts` : null,
    fuelConsumptionGals != null ? `Combustible: ${fuelConsumptionGals.toFixed(1)} gal` : null
  ]
    .filter(Boolean)
    .join(" · ");

  const { error: flightLogError } = await supabase.from("flight_logs").insert({
    helicopter_registration: helicopterRegistration,
    vessel_id: vesselId,
    marea_code: mareaCode || null,
    week_number: weekNumber,
    flight_date: reportDate ?? new Date().toISOString().slice(0, 10),
    hobbs_start: hobbsStart,
    hobbs_end: hobbsEnd,
    notes: weeklyNotes,
    source: "User"
  });

  if (flightLogError) {
    return { status: "error", message: `No se pudieron aplicar las horas de vuelo: ${flightLogError.message}`, warnings };
  }

  // 5. Log routine inspections, non-routine events, and filter changes as maintenance_logs.
  const maintenanceRows = [
    ...routineInspections.map((inspection) => ({
      helicopter_registration: helicopterRegistration,
      log_date: inspection.date,
      maintenance_type: inspection.inspectionType,
      description: inspection.description,
      notes: [
        inspection.hourmeter != null ? `Horómetro: ${inspection.hourmeter}` : null,
        inspection.aircraftHours != null ? `Hrs aeronave: ${inspection.aircraftHours}` : null,
        inspection.engineHours != null ? `Hrs motor: ${inspection.engineHours}` : null
      ]
        .filter(Boolean)
        .join(" · "),
      source: "User" as const
    })),
    ...nonRoutineEvents.map((event) => ({
      helicopter_registration: helicopterRegistration,
      log_date: event.date,
      maintenance_type: "No Rutina",
      description: event.novelty || null,
      technician: event.technician,
      action_taken: event.managementAction || null,
      notes: event.materials.length
        ? `Materiales: ${event.materials.map((m) => `${m.description}${m.partNumber ? ` (${m.partNumber})` : ""}${m.quantity ? ` x${m.quantity}` : ""}`).join("; ")}`
        : null,
      source: "User" as const
    })),
    ...filterChanges.map((change) => ({
      helicopter_registration: helicopterRegistration,
      log_date: change.date,
      maintenance_type: "Cambio de Filtro",
      description: `Filtro ${change.filterType || "N/A"}${change.reason ? ` — motivo: ${change.reason}` : ""}`,
      notes: [change.hourmeter != null ? `Horómetro: ${change.hourmeter}` : null, change.comments || null].filter(Boolean).join(" · "),
      source: "User" as const
    }))
  ];

  let maintenanceLogsCreated = 0;
  if (maintenanceRows.length > 0) {
    const { error: maintenanceError, data } = await supabase.from("maintenance_logs").insert(maintenanceRows).select("id");
    if (maintenanceError) {
      return {
        status: "error",
        message: `Se aplicaron las horas de vuelo pero falló el registro de mantenimiento: ${maintenanceError.message}`,
        registration: helicopterRegistration,
        flightHoursApplied: flightHoursThisWeek,
        warnings
      };
    }
    maintenanceLogsCreated = data?.length ?? maintenanceRows.length;
  }

  // 6. Log detected component changes for human review — try to match the removed
  // part against an existing component so the record links to it, but never touch
  // the live components table automatically.
  const componentChangesReview: string[] = [];
  if (detectedComponentChanges.length > 0) {
    const rows = [];
    for (const change of detectedComponentChanges) {
      let removedComponentId: string | null = null;
      let removedComponentName: string | null = null;

      if (change.partNumberOff || change.serialNumberOff) {
        let query = supabase.from("components").select("id, component_name").eq("helicopter_registration", helicopterRegistration);
        if (change.partNumberOff) query = query.eq("part_number", change.partNumberOff);
        if (change.serialNumberOff) query = query.eq("serial_number", change.serialNumberOff);
        const { data: match } = await query.maybeSingle();
        if (match) {
          removedComponentId = match.id;
          removedComponentName = match.component_name;
        }
      }

      rows.push({
        helicopter_registration: helicopterRegistration,
        removed_component_id: removedComponentId,
        removed_component_name: removedComponentName,
        installed_part_number: change.partNumberOn,
        installed_serial_number: change.serialNumberOn,
        removal_date: change.date,
        installation_date: change.date,
        reason: `Detectado automáticamente en reporte semanal (${change.sourceContext})`,
        notes: `${change.sourceText}${removedComponentId ? "" : " — No se encontró el componente removido en Control de Componentes; verificar y actualizar manualmente."}`,
        source: "User" as const
      });

      componentChangesReview.push(
        `${change.sourceContext}: P/N off ${change.partNumberOff ?? "?"} → P/N on ${change.partNumberOn ?? "?"}${removedComponentId ? "" : " (no encontrado en Control de Componentes)"}`
      );
    }

    const { error: componentChangesError } = await supabase.from("component_changes").insert(rows);
    if (componentChangesError) {
      componentChangesReview.push(`Aviso: no se pudieron guardar los cambios de componentes detectados: ${componentChangesError.message}`);
    }
  }

  revalidatePath("/helicopters");
  revalidatePath(`/helicopters/${helicopterRegistration}`);
  revalidatePath("/");

  return {
    status: "success",
    message: `Listo. Se aplicaron ${flightHoursThisWeek.toFixed(1)} hrs a ${helicopterRegistration} (Semana ${weekNumber}) y se dedujeron de todos sus componentes activos.`,
    registration: helicopterRegistration,
    flightHoursApplied: flightHoursThisWeek,
    maintenanceLogsCreated,
    componentChangesDetected: detectedComponentChanges.length,
    componentChangesReview,
    warnings
  };
}
