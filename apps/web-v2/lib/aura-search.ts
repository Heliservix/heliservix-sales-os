import { supabase } from "@/lib/supabase";
import type { AuraTone } from "@/lib/aura";

// Buscador universal de AURA (Sept 2026, Adolfo: "¿dónde está instalado el
// alternador con serial XXXXX en todo el sistema?" — quiere que AURA analice
// e interprete, no solo dé recomendaciones). Deliberadamente NO usa un modelo
// de lenguaje: Adolfo prefirió no pagar por eso por ahora (mismo trade-off
// que ya había elegido para la lectura de Libreta de Marino — ver
// lib/document-vision.ts). Esto es una búsqueda determinística por
// número de serie / número de parte / palabra clave a través de TODAS las
// tablas donde una pieza puede dejar rastro: instalación actual, historial
// de cambios (Órdenes de Trabajo y No Rutina), compras, inventario, órdenes
// de trabajo y documentos — para que "¿dónde está instalado X?" y "¿qué le
// ha pasado a X?" tengan una respuesta real sin necesidad de abrir siete
// módulos a mano.
export type AuraSearchResult = {
  id: string;
  source: string;
  title: string;
  detail: string;
  href: string | null;
  tone: AuraTone;
};

const COMPONENT_STATUS_TONE: Record<string, AuraTone> = {
  Expired: "red",
  Critical: "red",
  Monitor: "amber",
  OK: "green",
  Removed: "neutral"
};

export async function searchAcrossSystem(rawQuery: string): Promise<AuraSearchResult[]> {
  const query = rawQuery.trim();
  if (!query || query.length < 2) return [];
  const like = `%${query}%`;

  const [
    { data: components },
    { data: componentChanges },
    { data: nonRoutineChanges },
    { data: purchaseRequests },
    { data: inventoryItems },
    { data: technicalRecords },
    { data: aircraftDocuments },
    { data: workOrders }
  ] = await Promise.all([
    supabase
      .from("components")
      .select(
        "id, helicopter_registration, component_name, part_number, serial_number, status, remaining_hours, remaining_percentage, calendar_limit_date, life_limit_hours, archived"
      )
      .or(`part_number.ilike.${like},serial_number.ilike.${like},component_name.ilike.${like}`)
      .order("remaining_hours", { ascending: true }),
    supabase
      .from("component_changes")
      .select(
        "id, helicopter_registration, to_helicopter_registration, swap_type, removed_component_name, installed_component_name, installed_part_number, installed_serial_number, removal_date, installation_date, reason, technician"
      )
      .or(
        `installed_part_number.ilike.${like},installed_serial_number.ilike.${like},removed_component_name.ilike.${like},installed_component_name.ilike.${like}`
      )
      .order("installation_date", { ascending: false }),
    supabase
      .from("non_routine_component_changes")
      .select(
        "id, description, part_number, serial_removed, serial_installed, non_routine_reports:non_routine_report_id(id, sequence_number, helicopter_registration, report_date)"
      )
      .or(`part_number.ilike.${like},serial_removed.ilike.${like},serial_installed.ilike.${like}`),
    supabase
      .from("purchase_requests")
      .select("id, item_name, part_number, quantity, status, related_helicopter, created_at")
      .or(`part_number.ilike.${like},item_name.ilike.${like}`)
      .eq("archived", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("inventory_items")
      .select("id, item_name, part_number, serial_number, quantity, storage_location, related_helicopter, vessels:vessel_id(name)")
      .or(`part_number.ilike.${like},serial_number.ilike.${like},item_name.ilike.${like}`)
      .eq("archived", false),
    supabase
      .from("technical_records")
      .select("id, title, document_number, related_helicopter, record_date, record_type")
      .or(`document_number.ilike.${like},title.ilike.${like}`)
      .eq("archived", false)
      .order("record_date", { ascending: false }),
    supabase
      .from("aircraft_documents")
      .select("id, title, document_number, helicopter_registration, category, issue_date, expiry_date")
      .or(`document_number.ilike.${like},title.ilike.${like}`)
      .eq("archived", false),
    supabase
      .from("work_orders")
      .select("id, sequence_number, helicopter_registration, aircraft_serial, engine_serial, material_notes, status")
      .or(`aircraft_serial.ilike.${like},engine_serial.ilike.${like},material_notes.ilike.${like}`)
      .eq("archived", false)
  ]);

  const results: AuraSearchResult[] = [];

  for (const c of components ?? []) {
    results.push({
      id: `component-${c.id}`,
      source: c.archived || c.status === "Removed" ? "Componente (removido)" : "Instalado actualmente",
      title: `${c.component_name} — ${c.helicopter_registration}`,
      detail: `P/N ${c.part_number || "—"} · S/N ${c.serial_number || "—"} · ${c.status}${
        c.status !== "Removed" ? `, ${Number(c.remaining_hours).toFixed(1)} hrs restantes (${Number(c.remaining_percentage).toFixed(0)}%)` : ""
      }${c.calendar_limit_date ? `, vence calendario ${c.calendar_limit_date}` : ""}`,
      href: `/helicopters/${c.helicopter_registration}`,
      tone: COMPONENT_STATUS_TONE[c.status] ?? "neutral"
    });
  }

  for (const cc of (componentChanges ?? []) as Array<{
    id: string;
    helicopter_registration: string;
    to_helicopter_registration: string | null;
    swap_type: "Transfer" | "Replacement" | null;
    removed_component_name: string | null;
    installed_component_name: string | null;
    installed_part_number: string | null;
    installed_serial_number: string | null;
    removal_date: string | null;
    installation_date: string | null;
    reason: string | null;
    technician: string | null;
  }>) {
    const isTransfer = cc.swap_type === "Transfer";
    results.push({
      id: `component-change-${cc.id}`,
      source: isTransfer ? "Transferencia entre helicópteros" : "Cambio de componente",
      title: isTransfer
        ? `${cc.installed_component_name || "Componente"} — ${cc.helicopter_registration} → ${cc.to_helicopter_registration}`
        : `${cc.helicopter_registration} — ${cc.installed_component_name || cc.removed_component_name || "Cambio de pieza"}`,
      detail: `P/N ${cc.installed_part_number || "—"}, S/N ${cc.installed_serial_number || "—"}${
        cc.installation_date ? `, ${cc.installation_date}` : ""
      }${!isTransfer && cc.removed_component_name ? `. Removido: ${cc.removed_component_name}` : ""}${
        cc.reason ? `. Motivo: ${cc.reason}` : ""
      }${cc.technician ? `. Técnico: ${cc.technician}` : ""}`,
      href: `/component-changes`,
      tone: "blue"
    });
  }

  for (const nr of (nonRoutineChanges ?? []) as unknown as Array<{
    id: string;
    description: string | null;
    part_number: string | null;
    serial_removed: string | null;
    serial_installed: string | null;
    non_routine_reports: { id: string; sequence_number: number; helicopter_registration: string | null; report_date: string } | null;
  }>) {
    const report = nr.non_routine_reports;
    results.push({
      id: `non-routine-${nr.id}`,
      source: "Cambio de componente (No Rutina)",
      title: `${report?.helicopter_registration ?? "—"} — NR-${String(report?.sequence_number ?? "?").padStart(5, "0")}`,
      detail: `P/N ${nr.part_number || "—"} · S/N removido ${nr.serial_removed || "—"} → instalado ${nr.serial_installed || "—"}${
        nr.description ? `. ${nr.description}` : ""
      }${report?.report_date ? ` (${report.report_date})` : ""}`,
      href: report ? `/non-routine/${report.id}` : null,
      tone: "blue"
    });
  }

  for (const p of (purchaseRequests ?? []) as Array<{
    id: string;
    item_name: string;
    part_number: string | null;
    quantity: number;
    status: string;
    related_helicopter: string | null;
    created_at: string;
  }>) {
    results.push({
      id: `purchase-${p.id}`,
      source: "Compras",
      title: `${p.item_name}${p.related_helicopter ? ` — ${p.related_helicopter}` : ""}`,
      detail: `P/N ${p.part_number || "—"} · Cantidad ${Number(p.quantity)} · Estado ${p.status}`,
      href: "/purchasing",
      tone: p.status === "Requested" || p.status === "Quoted" ? "amber" : "neutral"
    });
  }

  for (const item of (inventoryItems ?? []) as unknown as Array<{
    id: string;
    item_name: string;
    part_number: string | null;
    serial_number: string | null;
    quantity: number;
    storage_location: string | null;
    related_helicopter: string | null;
    vessels: { name: string } | null;
  }>) {
    results.push({
      id: `inventory-${item.id}`,
      source: "Inventario (bodega)",
      title: item.item_name,
      detail: `P/N ${item.part_number || "—"} · S/N ${item.serial_number || "—"} · Cantidad ${Number(item.quantity)} · ${
        [item.vessels?.name, item.storage_location, item.related_helicopter].filter(Boolean).join(" · ") || "Sin ubicación registrada"
      }`,
      href: item.vessels ? null : null,
      tone: Number(item.quantity) > 0 ? "green" : "neutral"
    });
  }

  for (const record of (technicalRecords ?? []) as Array<{
    id: string;
    title: string;
    document_number: string | null;
    related_helicopter: string | null;
    record_date: string | null;
    record_type: string;
  }>) {
    results.push({
      id: `technical-record-${record.id}`,
      source: "Registros Técnicos",
      title: `${record.title}${record.related_helicopter ? ` — ${record.related_helicopter}` : ""}`,
      detail: `${record.record_type}${record.document_number ? `, N° ${record.document_number}` : ""}${record.record_date ? `, ${record.record_date}` : ""}`,
      href: "/technical-records",
      tone: "neutral"
    });
  }

  for (const doc of (aircraftDocuments ?? []) as Array<{
    id: string;
    title: string;
    document_number: string | null;
    helicopter_registration: string | null;
    category: string;
    issue_date: string | null;
    expiry_date: string | null;
  }>) {
    results.push({
      id: `aircraft-document-${doc.id}`,
      source: "Centro Documental",
      title: `${doc.title}${doc.helicopter_registration ? ` — ${doc.helicopter_registration}` : ""}`,
      detail: `${doc.category}${doc.document_number ? `, N° ${doc.document_number}` : ""}${doc.expiry_date ? `, vence ${doc.expiry_date}` : ""}`,
      href: doc.helicopter_registration ? `/helicopters/${doc.helicopter_registration}/documents` : null,
      tone: "neutral"
    });
  }

  for (const wo of (workOrders ?? []) as Array<{
    id: string;
    sequence_number: number;
    helicopter_registration: string | null;
    aircraft_serial: string | null;
    engine_serial: string | null;
    material_notes: string | null;
    status: string;
  }>) {
    results.push({
      id: `work-order-${wo.id}`,
      source: "Orden de Trabajo",
      title: `OT-${String(wo.sequence_number).padStart(5, "0")}${wo.helicopter_registration ? ` — ${wo.helicopter_registration}` : ""}`,
      detail: `S/N aeronave ${wo.aircraft_serial || "—"} · S/N motor ${wo.engine_serial || "—"} · Estado ${wo.status}${
        wo.material_notes ? ` · Material: ${wo.material_notes}` : ""
      }`,
      href: `/work-orders/${wo.id}`,
      tone: "neutral"
    });
  }

  return results;
}
