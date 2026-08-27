"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optionalText(form: FormData, key: string) {
  const value = text(form, key);
  return value || null;
}

function optionalNumber(form: FormData, key: string) {
  const value = text(form, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Digital version of Formulario AS-09 "No Rutina" — un hallazgo (discrepancia)
// que un mecánico encuentra durante una orden de trabajo o una inspección
// suelta, con su acción correctiva y el cierre de un inspector. Las tres
// personas (quien lo encontró, quien lo corrigió, quien lo cerró) se guardan
// como personnel_id, igual que en Órdenes de Trabajo, para que el nombre y la
// licencia mostrados siempre sean los actuales de esa persona.
export async function createNonRoutineReport(formData: FormData) {
  const discrepancy = text(formData, "discrepancy");
  if (!discrepancy) throw new Error("Describe la discrepancia encontrada.");

  const { data: report, error } = await supabase
    .from("non_routine_reports")
    .insert({
      helicopter_registration: optionalText(formData, "helicopterRegistration"),
      work_order_id: optionalText(formData, "workOrderId"),
      aircraft_model: optionalText(formData, "aircraftModel"),
      total_time_hours: optionalNumber(formData, "totalTimeHours"),
      report_date: optionalText(formData, "reportDate") ?? new Date().toISOString().slice(0, 10),
      discrepancy,
      opened_by_personnel_id: optionalText(formData, "openedByPersonnelId"),
      manual_reference: optionalText(formData, "manualReference"),
      notes: optionalText(formData, "notes"),
      source: "User"
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/non-routine");
  revalidatePath("/");
  redirect(`/non-routine/${report.id}`);
}

export async function updateNonRoutineReport(id: string, formData: FormData) {
  const discrepancy = text(formData, "discrepancy");
  if (!discrepancy) throw new Error("Describe la discrepancia encontrada.");

  const { error } = await supabase
    .from("non_routine_reports")
    .update({
      helicopter_registration: optionalText(formData, "helicopterRegistration"),
      work_order_id: optionalText(formData, "workOrderId"),
      aircraft_model: optionalText(formData, "aircraftModel"),
      total_time_hours: optionalNumber(formData, "totalTimeHours"),
      report_date: optionalText(formData, "reportDate") ?? new Date().toISOString().slice(0, 10),
      discrepancy,
      opened_by_personnel_id: optionalText(formData, "openedByPersonnelId"),
      manual_reference: optionalText(formData, "manualReference"),
      notes: optionalText(formData, "notes"),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/non-routine");
  revalidatePath(`/non-routine/${id}`);
  redirect(`/non-routine/${id}`);
}

// Digital stand-in for the "ACCION CORRECTIVA" box on the paper AS-09 —
// records what was done and who did it, and moves the report to "Corregida"
// so it's visibly distinct from a discrepancy that's still just sitting open.
export async function recordCorrectiveAction(id: string, formData: FormData) {
  const correctiveAction = text(formData, "correctiveAction");
  const correctedByPersonnelId = text(formData, "correctedByPersonnelId");
  if (!correctiveAction) throw new Error("Describe la acción correctiva.");
  if (!correctedByPersonnelId) throw new Error("Selecciona quién hizo la corrección.");

  const { error } = await supabase
    .from("non_routine_reports")
    .update({
      corrective_action: correctiveAction,
      corrected_by_personnel_id: correctedByPersonnelId,
      status: "Corregida",
      updated_at: new Date().toISOString()
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/non-routine/${id}`);
  revalidatePath("/non-routine");
  revalidatePath("/");
}

// Digital stand-in for the inspector's sign-off box — closes the report and,
// same pattern as approveWorkOrder, leaves a trace in Registros Técnicos
// (record_type "Inspection", which already existed as a valid value).
export async function closeNonRoutineReport(id: string, formData: FormData) {
  const inspectorPersonnelId = text(formData, "inspectorPersonnelId");
  if (!inspectorPersonnelId) throw new Error("Selecciona quién inspecciona y cierra el reporte.");

  const { data: report, error: fetchError } = await supabase
    .from("non_routine_reports")
    .select("sequence_number, helicopter_registration, discrepancy, corrective_action")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("non_routine_reports")
    .update({
      inspector_personnel_id: inspectorPersonnelId,
      completed_at: new Date().toISOString().slice(0, 10),
      status: "Cerrada",
      updated_at: new Date().toISOString()
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  let inspectorName: string | null = null;
  const { data: inspector } = await supabase.from("personnel").select("full_name").eq("id", inspectorPersonnelId).maybeSingle();
  inspectorName = inspector?.full_name ?? null;

  await supabase.from("technical_records").insert({
    record_type: "Inspection",
    related_helicopter: report?.helicopter_registration ?? null,
    title: `No Rutina NR-${String(report?.sequence_number ?? "").padStart(5, "0")}`,
    record_date: new Date().toISOString().slice(0, 10),
    technician_name: inspectorName,
    inspection_type: "No Rutina",
    notes: [report?.discrepancy, report?.corrective_action].filter(Boolean).join(" — Corrección: "),
    source: "User"
  });

  revalidatePath(`/non-routine/${id}`);
  revalidatePath("/non-routine");
  revalidatePath("/");
  revalidatePath("/technical-records");
}

export async function updateNonRoutineStatus(id: string, formData: FormData) {
  const status = text(formData, "status");
  const { error } = await supabase.from("non_routine_reports").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/non-routine/${id}`);
  revalidatePath("/non-routine");
  revalidatePath("/");
}

export async function archiveNonRoutineReport(id: string) {
  const { error } = await supabase.from("non_routine_reports").update({ archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/non-routine");
  revalidatePath("/");
  redirect("/non-routine");
}

// "Control de Componente" — sub-tabla opcional 0-a-muchos para cuando la
// no-rutina involucra cambiar una pieza. Se agrega de a una fila a la vez,
// igual que addWorkOrderItem, en vez de intentar meterlo todo en el
// formulario de creación.
export async function addComponentChange(reportId: string, formData: FormData) {
  const description = text(formData, "description");
  if (!description) throw new Error("Describe el componente.");

  const { error } = await supabase.from("non_routine_component_changes").insert({
    non_routine_report_id: reportId,
    description,
    part_number: optionalText(formData, "partNumber"),
    serial_removed: optionalText(formData, "serialRemoved"),
    serial_installed: optionalText(formData, "serialInstalled")
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/non-routine/${reportId}`);
}

export async function deleteComponentChange(componentChangeId: string, reportId: string) {
  const { error } = await supabase.from("non_routine_component_changes").delete().eq("id", componentChangeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/non-routine/${reportId}`);
}
