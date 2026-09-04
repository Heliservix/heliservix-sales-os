// Costo real de una faena más allá de la nómina — Adolfo (sept 2026): "en
// cada informe de faena solo está tomando en cuenta el costo de planilla,
// no está tomando en cuenta el costo de los items consumidos reportados en
// cada reporte semanal, así como también el costo de la póliza prorrateado
// en cantidad de días de faena."
//
// Tres piezas nuevas, cada una con su propia fuente de verdad:
//   1. Material consumido: stock_movements (movement_type='Consumed') de
//      esta faena × inventory_items.unit_cost (el costo promedio, que se
//      actualiza al confirmar una factura — ver app/invoices/actions.ts).
//      Los movimientos viejos (antes de sept 2026) no tienen campaign_id,
//      así que también se buscan por related_maintenance_event = código de
//      marea, como respaldo.
//   2. Póliza de seguro prorrateada: días de la faena que caen DENTRO de la
//      vigencia de cada póliza del helicóptero asignado, sobre el total de
//      días de esa póliza, aplicado a premium_amount. Si el helicóptero
//      tiene varias pólizas (casco + responsabilidad civil, etc.) todas
//      aplican y se suman.
//   3. Facturas subidas directamente a la faena (app/invoices): Adolfo
//      decidió que estas se suman APARTE del total, para gastos que no
//      necesariamente pasan por Compras/Inventario (o como respaldo
//      adicional) — no se cruzan con el cálculo de material consumido para
//      evitar contar el mismo gasto dos veces si el ítem YA se sumó ahí.
import { supabase } from "@/lib/supabase";

export type FaenaCostBreakdown = {
  payrollCost: number | null;
  materialsCost: number;
  materialsMissingCostCount: number;
  insuranceProrated: number;
  insuranceBreakdown: { insurer: string | null; coverageType: string | null; amount: number; days: number }[];
  invoicesTotal: number;
  invoicesCount: number;
  totalCost: number | null;
};

function daysBetweenInclusive(start: string, end: string): number {
  const diff = Math.round((new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / 86400000) + 1;
  return diff > 0 ? diff : 0;
}

function overlapDays(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (start > end) return 0;
  return daysBetweenInclusive(start, end);
}

export async function computeFaenaCost(params: {
  campaignId: string;
  campaignCode: string | null;
  helicopterRegistration: string | null;
  startDate: string | null;
  endDate: string | null;
  payrollCost: number | null;
}): Promise<FaenaCostBreakdown> {
  const { campaignId, campaignCode, helicopterRegistration, startDate, endDate, payrollCost } = params;

  // --- 1. Material consumido ---
  const [byCampaignId, byMareaCode] = await Promise.all([
    supabase
      .from("stock_movements")
      .select("id, quantity, inventory_items:inventory_item_id(unit_cost, item_name)")
      .eq("movement_type", "Consumed")
      .eq("campaign_id", campaignId),
    campaignCode
      ? supabase
          .from("stock_movements")
          .select("id, quantity, inventory_items:inventory_item_id(unit_cost, item_name)")
          .eq("movement_type", "Consumed")
          .is("campaign_id", null)
          .eq("related_maintenance_event", campaignCode)
      : Promise.resolve({ data: [] as never[] })
  ]);

  const seen = new Set<string>();
  const consumedRows = [...(byCampaignId.data ?? []), ...(byMareaCode.data ?? [])].filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  }) as unknown as Array<{ id: string; quantity: number; inventory_items: { unit_cost: number | null; item_name: string } | null }>;

  let materialsCost = 0;
  let materialsMissingCostCount = 0;
  for (const row of consumedRows) {
    const unitCost = row.inventory_items?.unit_cost;
    if (unitCost != null) {
      materialsCost += Number(unitCost) * Number(row.quantity);
    } else {
      materialsMissingCostCount += 1;
    }
  }

  // --- 2. Póliza prorrateada ---
  const insuranceBreakdown: FaenaCostBreakdown["insuranceBreakdown"] = [];
  let insuranceProrated = 0;
  if (helicopterRegistration && startDate && endDate) {
    const { data: policies } = await supabase
      .from("insurance_policies")
      .select("insurer, coverage_type, start_date, end_date, premium_amount")
      .eq("helicopter_registration", helicopterRegistration)
      .eq("archived", false);

    for (const policy of policies ?? []) {
      if (!policy.start_date || !policy.end_date || policy.premium_amount == null) continue;
      const days = overlapDays(startDate, endDate, policy.start_date, policy.end_date);
      if (days <= 0) continue;
      const policyTotalDays = daysBetweenInclusive(policy.start_date, policy.end_date);
      if (policyTotalDays <= 0) continue;
      const amount = (Number(policy.premium_amount) / policyTotalDays) * days;
      insuranceProrated += amount;
      insuranceBreakdown.push({ insurer: policy.insurer, coverageType: policy.coverage_type, amount, days });
    }
  }

  // --- 3. Facturas subidas a la faena (costo aparte, por decisión de Adolfo) ---
  const { data: invoices } = await supabase
    .from("invoices")
    .select("total_amount")
    .eq("campaign_id", campaignId)
    .eq("archived", false);
  const invoicesTotal = (invoices ?? []).reduce((sum, inv) => sum + (inv.total_amount != null ? Number(inv.total_amount) : 0), 0);
  const invoicesCount = (invoices ?? []).length;

  const totalCost = payrollCost != null || materialsCost > 0 || insuranceProrated > 0 || invoicesTotal > 0
    ? (payrollCost ?? 0) + materialsCost + insuranceProrated + invoicesTotal
    : null;

  return { payrollCost, materialsCost, materialsMissingCostCount, insuranceProrated, insuranceBreakdown, invoicesTotal, invoicesCount, totalCost };
}
