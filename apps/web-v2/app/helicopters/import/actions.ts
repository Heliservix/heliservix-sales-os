"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { parseComponentControlWorkbook } from "@/lib/component-import";

export type ImportState = {
  status: "idle" | "success" | "error";
  message: string;
  registration?: string;
  componentsUpserted?: number;
  warnings?: string[];
};

export async function importComponentControl(_prevState: ImportState, formData: FormData): Promise<ImportState> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecciona un archivo Excel (.xlsx) del Control Maestro." };
  }

  let parsed;
  try {
    const arrayBuffer = await file.arrayBuffer();
    parsed = parseComponentControlWorkbook(Buffer.from(arrayBuffer));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "error", message: `No se pudo leer el archivo: ${detail}` };
  }

  const { helicopter, components, warnings } = parsed;

  // 1. Make sure the helicopter exists (create it if this is the first time we see it),
  // and refresh its hourmeter/model info from the file without touching fields the
  // importer doesn't know about (status, owner, notes, etc).
  const { error: helicopterError } = await supabase.from("helicopters").upsert(
    {
      registration: helicopter.registration,
      model: helicopter.model || undefined,
      serial_number: helicopter.serialNumber || undefined,
      manufacture_year: helicopter.manufactureYear || undefined,
      current_hourmeter: helicopter.currentHourmeter
    },
    { onConflict: "registration" }
  );

  if (helicopterError) {
    return { status: "error", message: `No se pudo guardar el helicóptero: ${helicopterError.message}` };
  }

  if (components.length === 0) {
    return {
      status: "error",
      message: "El archivo no tiene filas de componentes reconocibles.",
      registration: helicopter.registration,
      warnings
    };
  }

  // 2. Upsert every component. The database's unique constraint on
  // (helicopter_registration, part_number, serial_number) is what prevents duplicates
  // when the same file gets re-imported — no fragile JS matching needed.
  const rows = components.map((component) => ({
    helicopter_registration: helicopter.registration,
    component_name: component.componentName,
    part_number: component.partNumber,
    serial_number: component.serialNumber,
    position: component.position,
    installation_date: component.installationDate,
    tsn_hours: component.tsnHours,
    tso_hours: component.tsoHours,
    life_limit_hours: component.lifeLimitHours,
    remaining_hours: component.remainingHours,
    calendar_limit_date: component.calendarLimitDate,
    remaining_calendar_days: component.remainingCalendarDays,
    notes: component.notes,
    source: "User" as const
  }));

  const { error: componentsError, data } = await supabase
    .from("components")
    .upsert(rows, { onConflict: "helicopter_registration,part_number,serial_number" })
    .select("id");

  if (componentsError) {
    return {
      status: "error",
      message: `Se guardó el helicóptero pero falló la carga de componentes: ${componentsError.message}`,
      registration: helicopter.registration,
      warnings
    };
  }

  revalidatePath("/helicopters");
  revalidatePath(`/helicopters/${helicopter.registration}`);
  revalidatePath("/");

  return {
    status: "success",
    message: `Listo. Se actualizaron ${data?.length ?? rows.length} componentes de ${helicopter.registration}.`,
    registration: helicopter.registration,
    componentsUpserted: data?.length ?? rows.length,
    warnings
  };
}
