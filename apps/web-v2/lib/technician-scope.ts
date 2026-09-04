import { getSessionUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// Sept 2026, Adolfo: "el tecnico debe visualizar todos los modulos de
// acuerdo a su helicoptero asignado... no es de su competencia mirar todos
// los demas helicopteros." Extends the AURA-only scoping (app/aura/page.tsx)
// to every módulo a Mecánico can reach — Flota, Alertas, Registros Técnicos,
// Cumplimiento, Órdenes de Trabajo, No Rutina, Cambios de Componentes, y
// (por barco) Inventario.
//
// A single helper so every page asks the exact same question the exact same
// way: null means "no restriction" (admin, piloto, administrativo, or a
// mecánico with no aircraft assigned yet in Personal) — anything else is the
// ONE registration/vessel that técnico is allowed to see anywhere in the
// system.
export async function getTechnicianScope(): Promise<{ scopedRegistration: string | null; scopedVesselId: string | null }> {
  const session = await getSessionUser();
  const scoped = Boolean(session && !session.isAdmin && session.personnelRole === "Mecánico" && session.assignedHelicopterRegistration);
  if (!scoped) return { scopedRegistration: null, scopedVesselId: null };

  const scopedRegistration = session!.assignedHelicopterRegistration as string;

  // Inventario vive por BARCO, no por helicóptero (cada barco tiene su
  // propia bodega) — Adolfo, sept 2026: "el modulo de inventario de acuerdo
  // a su barco asignado". El barco del técnico se resuelve a través del
  // helicóptero que tiene asignado (helicopters.assigned_vessel_id), ya que
  // no hay un campo de barco directo en personnel.
  const { data: helicopter } = await supabase
    .from("helicopters")
    .select("assigned_vessel_id")
    .eq("registration", scopedRegistration)
    .maybeSingle();

  return { scopedRegistration, scopedVesselId: helicopter?.assigned_vessel_id ?? null };
}
