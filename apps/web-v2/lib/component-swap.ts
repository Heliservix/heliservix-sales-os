import { supabase } from "@/lib/supabase";

// Shared by both flows in app/component-changes: Transferir (mover la misma
// pieza física de un helicóptero a otro, conservando TSN/TSO/horas
// remanentes) y Cambiar por componente nuevo (retirar una pieza y darla de
// alta con una nueva, en el mismo helicóptero). Sept 2026, Adolfo:
// "muchas veces intercambiamos de un helicóptero a otro un componente...
// hay que actualizar el control de componentes, manteniendo la información
// de cada uno."
export type ComponentPickerOption = {
  id: string;
  helicopterRegistration: string;
  componentName: string;
  partNumber: string;
  serialNumber: string;
  status: string;
  remainingHours: number;
  label: string;
};

/** Every active (not archived, not already Removed) component across the
 * whole fleet, in one flat list — a técnico picks straight from "MATRÍCULA —
 * Nombre (P/N / S/N) — X hrs" instead of a two-step aircraft-then-component
 * cascade, which keeps the form to one screen on a tablet. */
export async function fetchActiveComponentsForPicker(): Promise<ComponentPickerOption[]> {
  const { data } = await supabase
    .from("components")
    .select("id, helicopter_registration, component_name, part_number, serial_number, status, remaining_hours")
    .eq("archived", false)
    .neq("status", "Removed")
    .order("helicopter_registration")
    .order("component_name");

  return (data ?? []).map((c) => ({
    id: c.id,
    helicopterRegistration: c.helicopter_registration,
    componentName: c.component_name,
    partNumber: c.part_number,
    serialNumber: c.serial_number,
    status: c.status,
    remainingHours: Number(c.remaining_hours),
    label: `${c.helicopter_registration} — ${c.component_name} (P/N ${c.part_number || "—"} / S/N ${c.serial_number || "—"}) — ${Number(
      c.remaining_hours
    ).toFixed(1)} hrs, ${c.status}`
  }));
}

export type TechnicianOption = { id: string; fullName: string; role: string };

/** Who can sign a component change — Mecánico (does the physical work) and
 * Administrativo (per the Sept 2026 rol added for full-access office staff)
 * both make sense here; Piloto deliberately excluded, same as every other
 * maintenance picker in this app. */
export async function fetchTechniciansForPicker(): Promise<TechnicianOption[]> {
  const { data } = await supabase
    .from("personnel")
    .select("id, full_name, role")
    .in("role", ["Mecánico", "Administrativo"])
    .eq("status", "Active")
    .eq("archived", false)
    .order("full_name");

  return (data ?? []).map((p) => ({ id: p.id, fullName: p.full_name, role: p.role }));
}
