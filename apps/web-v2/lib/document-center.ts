// Centro Documental — un semáforo por aeronave sobre las 12 categorías que
// Adolfo pidió (Aug 2026): "si mañana tu encargado no viene, tú debes poder
// encontrar cualquier documento importante en menos de 2 minutos". De esas
// 12, ocho ya existían como módulos propios en el sistema (Seguro, Órdenes
// de Trabajo, Componentes, AD/SB, Reparaciones, Repuestos instalados,
// Operaciones/Campañas) — este archivo NO duplica esa información, solo la
// LEE en vivo desde sus tablas y le calcula un color. Las otras cuatro
// (Certificados, Bitácoras, Facturas, ELT) son genuinamente nuevas — ver
// aircraft_documents / aircraft_elt en infra/database/schema.sql.
//
// Diseñado para llamarse en lote (una aeronave o la flota completa) sin
// caer en N+1 queries: fetchDocumentCenterData trae todo de una vez con
// .in("helicopter_registration", registrations), y computeSections es una
// función pura por aeronave sobre esos datos ya cargados.
import { supabase } from "@/lib/supabase";

export type DocumentCenterTone = "green" | "amber" | "red" | "neutral";

export type DocumentCenterSection = {
  key: string;
  label: string;
  tone: DocumentCenterTone;
  summary: string;
  href: string;
  isLibrary: boolean; // true = una de las 4 categorías nuevas (subir documentos aquí)
};

type PolicyRow = { helicopter_registration: string | null; end_date: string | null; status: string };
type PaymentRow = { policy_id: string; due_date: string; status: string; policy?: { helicopter_registration: string | null } };
type WorkOrderRow = { helicopter_registration: string | null; status: string; opened_at: string };
type ComponentRow = { helicopter_registration: string; status: string };
type ComplianceItemRow = { related_helicopter: string | null; applicability: string | null; status: string };
type NonRoutineRow = { helicopter_registration: string | null; status: string };
type MaintenanceLogRow = { helicopter_registration: string };
type ComponentChangeRow = {
  id: string;
  helicopter_registration: string;
  installed_component_name: string | null;
  installed_part_number: string | null;
  installed_serial_number: string | null;
  installation_date: string | null;
  reason: string | null;
  technician: string | null;
};
type CampaignRow = { helicopter_registration: string | null; status: string };
export type AircraftDocumentRow = {
  id: string;
  helicopter_registration: string;
  category: "Certificados" | "Bitacoras" | "Facturas";
  title: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  amount: number | null;
  currency: string;
  vendor: string | null;
  file_url: string | null;
  notes: string | null;
  archived: boolean;
};
export type AircraftEltRow = {
  helicopter_registration: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  battery_expiry_date: string | null;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  certificate_url: string | null;
  notes: string | null;
};

export type DocumentCenterData = {
  policies: PolicyRow[];
  payments: PaymentRow[];
  workOrders: WorkOrderRow[];
  components: ComponentRow[];
  complianceItems: ComplianceItemRow[];
  nonRoutineReports: NonRoutineRow[];
  maintenanceLogs: MaintenanceLogRow[];
  componentChanges: ComponentChangeRow[];
  campaigns: CampaignRow[];
  documents: AircraftDocumentRow[];
  eltByRegistration: Map<string, AircraftEltRow>;
};

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const diff = new Date(`${date}T00:00:00Z`).getTime() - new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  return Math.round(diff / 86400000);
}

function dateTone(days: number | null): DocumentCenterTone {
  if (days == null) return "neutral";
  if (days < 0) return "red";
  if (days <= 60) return "amber";
  return "green";
}

const SEVERITY: Record<DocumentCenterTone, number> = { red: 0, amber: 1, neutral: 2, green: 3 };
function worstTone(tones: DocumentCenterTone[]): DocumentCenterTone {
  if (!tones.length) return "neutral";
  return tones.sort((a, b) => SEVERITY[a] - SEVERITY[b])[0];
}

// compliance_items no siempre tiene related_helicopter lleno — los boletines
// Robinson sincronizados automáticamente suelen traer la aplicabilidad como
// texto libre ("Aplica a HP1768, HP1769..."), igual que en
// app/compliance/bulletins/page.tsx. Un ítem aplica a esta matrícula si
// coincide por cualquiera de las dos vías, o si no tiene ninguna
// aplicabilidad específica (se asume que aplica a toda la flota).
function complianceApplies(item: ComplianceItemRow, registration: string): boolean {
  if (item.related_helicopter === registration) return true;
  if (item.applicability?.includes(registration)) return true;
  return !item.related_helicopter && !item.applicability;
}

export async function fetchDocumentCenterData(registrations: string[]): Promise<DocumentCenterData> {
  const [
    { data: policyData },
    { data: paymentData },
    { data: workOrderData },
    { data: componentData },
    { data: complianceData },
    { data: nonRoutineData },
    { data: maintenanceLogData },
    { data: componentChangeData },
    { data: campaignData },
    { data: documentData },
    { data: eltData }
  ] = await Promise.all([
    supabase.from("insurance_policies").select("id, helicopter_registration, end_date, status").eq("archived", false).in("helicopter_registration", registrations),
    supabase.from("insurance_payments").select("id, policy_id, due_date, status"),
    supabase.from("work_orders").select("helicopter_registration, status, opened_at").eq("archived", false).in("helicopter_registration", registrations),
    supabase.from("components").select("helicopter_registration, status").neq("status", "Removed").in("helicopter_registration", registrations),
    supabase.from("compliance_items").select("related_helicopter, applicability, status").eq("archived", false),
    supabase.from("non_routine_reports").select("helicopter_registration, status").eq("archived", false).in("helicopter_registration", registrations),
    supabase.from("maintenance_logs").select("helicopter_registration").in("helicopter_registration", registrations),
    supabase
      .from("component_changes")
      .select("id, helicopter_registration, installed_component_name, installed_part_number, installed_serial_number, installation_date, reason, technician")
      .in("helicopter_registration", registrations),
    supabase.from("campaigns").select("helicopter_registration, status").in("helicopter_registration", registrations),
    supabase
      .from("aircraft_documents")
      .select("id, helicopter_registration, category, title, document_number, issue_date, expiry_date, amount, currency, vendor, file_url, notes, archived")
      .eq("archived", false)
      .in("helicopter_registration", registrations),
    supabase
      .from("aircraft_elt")
      .select(
        "helicopter_registration, manufacturer, model, serial_number, battery_expiry_date, last_inspection_date, next_inspection_date, certificate_url, notes"
      )
      .in("helicopter_registration", registrations)
  ]);

  const policyIds = new Set((policyData ?? []).map((p) => p.id));
  const paymentsWithPolicy = (paymentData ?? [])
    .filter((p) => policyIds.has(p.policy_id))
    .map((p) => ({ ...p, policy: (policyData ?? []).find((pol) => pol.id === p.policy_id) }));

  return {
    policies: (policyData ?? []) as PolicyRow[],
    payments: paymentsWithPolicy as unknown as PaymentRow[],
    workOrders: (workOrderData ?? []) as WorkOrderRow[],
    components: (componentData ?? []) as ComponentRow[],
    complianceItems: (complianceData ?? []) as ComplianceItemRow[],
    nonRoutineReports: (nonRoutineData ?? []) as NonRoutineRow[],
    maintenanceLogs: (maintenanceLogData ?? []) as MaintenanceLogRow[],
    componentChanges: (componentChangeData ?? []) as ComponentChangeRow[],
    campaigns: (campaignData ?? []) as CampaignRow[],
    documents: (documentData ?? []) as AircraftDocumentRow[],
    eltByRegistration: new Map(((eltData ?? []) as AircraftEltRow[]).map((row) => [row.helicopter_registration, row]))
  };
}

function libraryTone(docs: AircraftDocumentRow[], treatEmptyAsRed: boolean): { tone: DocumentCenterTone; summary: string } {
  if (!docs.length) {
    return { tone: treatEmptyAsRed ? "red" : "amber", summary: "Sin documentos cargados todavía" };
  }
  const dated = docs.filter((d) => d.expiry_date);
  const tones = dated.map((d) => dateTone(daysUntil(d.expiry_date)));
  const tone = tones.length ? worstTone(tones) : "green";
  return { tone, summary: `${docs.length} documento(s) cargado(s)` };
}

export function computeSections(registration: string, data: DocumentCenterData): DocumentCenterSection[] {
  const policy = data.policies.find((p) => p.helicopter_registration === registration && p.status === "Active");
  const policyPending = data.payments
    .filter((p) => p.policy?.helicopter_registration === registration && p.status !== "Paid")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const seguroTone: DocumentCenterTone = !policy ? "red" : worstTone([dateTone(daysUntil(policy.end_date)), policyPending ? dateTone(daysUntil(policyPending.due_date)) : "green"]);
  const seguroSummary = !policy ? "Sin póliza registrada" : `Vigente hasta ${policy.end_date ?? "?"}`;

  const openWorkOrders = data.workOrders.filter(
    (w) => w.helicopter_registration === registration && (w.status === "Abierta" || w.status === "En Progreso")
  );
  const oldOpenWorkOrder = openWorkOrders.some((w) => (daysUntil(w.opened_at) ?? 0) < -30);
  const ordenesTone: DocumentCenterTone = openWorkOrders.length === 0 ? "green" : oldOpenWorkOrder || openWorkOrders.length >= 3 ? "red" : "amber";

  const components = data.components.filter((c) => c.helicopter_registration === registration);
  const componentTones: DocumentCenterTone[] = components.map((c) =>
    c.status === "Expired" || c.status === "Critical" ? "red" : c.status === "Monitor" ? "amber" : "green"
  );
  const componentesTone = componentTones.length ? worstTone(componentTones) : "neutral";
  const criticalCount = components.filter((c) => c.status === "Critical" || c.status === "Expired").length;
  const monitorCount = components.filter((c) => c.status === "Monitor").length;

  const applicableCompliance = data.complianceItems.filter((c) => complianceApplies(c, registration));
  const overdueCompliance = applicableCompliance.filter((c) => c.status === "Overdue");
  const pendingCompliance = applicableCompliance.filter((c) => c.status === "Applicable" || c.status === "Not reviewed" || c.status === "In progress");
  const adSbTone: DocumentCenterTone = overdueCompliance.length ? "red" : pendingCompliance.length ? "amber" : applicableCompliance.length ? "green" : "neutral";

  const openNonRoutine = data.nonRoutineReports.filter((r) => r.helicopter_registration === registration && r.status !== "Cerrada");
  const reparacionesTone: DocumentCenterTone = openNonRoutine.length === 0 ? "green" : openNonRoutine.length >= 3 ? "red" : "amber";
  const maintenanceLogCount = data.maintenanceLogs.filter((m) => m.helicopter_registration === registration).length;

  const componentChanges = data.componentChanges.filter((c) => c.helicopter_registration === registration);

  const campaigns = data.campaigns.filter((c) => c.helicopter_registration === registration);

  const certificados = data.documents.filter((d) => d.helicopter_registration === registration && d.category === "Certificados");
  const bitacoras = data.documents.filter((d) => d.helicopter_registration === registration && d.category === "Bitacoras");
  const facturas = data.documents.filter((d) => d.helicopter_registration === registration && d.category === "Facturas");

  const elt = data.eltByRegistration.get(registration) ?? null;
  const eltTone: DocumentCenterTone = !elt
    ? "red"
    : worstTone([dateTone(daysUntil(elt.battery_expiry_date)), dateTone(daysUntil(elt.next_inspection_date))]);
  const eltSummary = !elt ? "Sin registro de ELT" : `Batería vence ${elt.battery_expiry_date ?? "?"}`;

  const certificadosResult = libraryTone(certificados, true);
  const bitacorasResult = libraryTone(bitacoras, true);
  const facturasResult = libraryTone(facturas, false);

  return [
    {
      key: "01",
      label: "Certificados y documentos de aeronave",
      tone: certificadosResult.tone,
      summary: certificadosResult.summary,
      href: `/helicopters/${registration}/documents`,
      isLibrary: true
    },
    { key: "02", label: "Seguro", tone: seguroTone, summary: seguroSummary, href: "/policies", isLibrary: false },
    {
      key: "03",
      label: "Órdenes de Trabajo",
      tone: ordenesTone,
      summary: openWorkOrders.length ? `${openWorkOrders.length} abierta(s)` : "Sin órdenes abiertas",
      href: "/work-orders",
      isLibrary: false
    },
    {
      key: "04",
      label: "Mantenimiento programado",
      tone: componentesTone,
      summary: criticalCount ? `${criticalCount} componente(s) críticos` : monitorCount ? `${monitorCount} por vigilar` : "Al día",
      href: `/helicopters/${registration}`,
      isLibrary: false
    },
    {
      key: "05",
      label: "Control de Componentes",
      tone: componentesTone,
      summary: `${components.length} componente(s) registrados`,
      href: `/helicopters/${registration}`,
      isLibrary: false
    },
    {
      key: "06",
      label: "AD / SB",
      tone: adSbTone,
      summary: overdueCompliance.length
        ? `${overdueCompliance.length} vencido(s)`
        : pendingCompliance.length
          ? `${pendingCompliance.length} por revisar`
          : applicableCompliance.length
            ? "Al día"
            : "Sin ítems aplicables",
      href: "/compliance/bulletins",
      isLibrary: false
    },
    {
      key: "07",
      label: "Bitácoras",
      tone: bitacorasResult.tone,
      summary: bitacorasResult.summary,
      href: `/helicopters/${registration}/documents`,
      isLibrary: true
    },
    {
      key: "08",
      label: "Reparaciones",
      tone: reparacionesTone,
      summary: openNonRoutine.length ? `${openNonRoutine.length} No Rutina abierta(s)` : `Sin pendientes${maintenanceLogCount ? ` · ${maintenanceLogCount} en historial de hangar` : ""}`,
      href: "/non-routine",
      isLibrary: false
    },
    {
      key: "09",
      label: "Repuestos instalados",
      tone: componentChanges.length ? "green" : "neutral",
      summary: componentChanges.length ? `${componentChanges.length} registro(s)` : "Sin registros todavía",
      href: `/helicopters/${registration}/documents`,
      isLibrary: false
    },
    {
      key: "10",
      label: "Facturas relacionadas",
      tone: facturasResult.tone,
      summary: facturasResult.summary,
      href: `/helicopters/${registration}/documents`,
      isLibrary: true
    },
    {
      key: "11",
      label: "Operaciones / Campañas",
      tone: campaigns.length ? "green" : "neutral",
      summary: campaigns.length ? `${campaigns.length} faena(s) registradas` : "Sin historial de faenas",
      href: "/campaigns",
      isLibrary: false
    },
    { key: "12", label: "ELT Status", tone: eltTone, summary: eltSummary, href: `/helicopters/${registration}/documents`, isLibrary: true }
  ];
}

// El color general de la aeronave ignora las dos categorías puramente
// informativas (Repuestos instalados, Operaciones/Campañas) — no representan
// un riesgo ni una acción pendiente, así que no deben "ensuciar" el semáforo
// general con ámbar solo por no tener aún historial.
export function overallTone(sections: DocumentCenterSection[]): DocumentCenterTone {
  const relevant = sections.filter((s) => s.key !== "09" && s.key !== "11").map((s) => s.tone);
  return worstTone(relevant);
}
