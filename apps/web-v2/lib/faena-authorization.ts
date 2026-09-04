// Carta de "Autorización de Pago" (80% / 20%) + cuadro de nómina por persona,
// para reemplazar el proceso manual en Word/Excel que Adolfo usa hoy para
// pedirle a la oficina principal que libere fondos a cada pesquera/armador.
//
// Contexto real (Adolfo, sept 2026): al cerrar una faena se paga al piloto y
// mecánico el 80% del bono por tonelada (sobre el estimado) más los días
// laborados según su contrato. Cuando la planta pesa la captura y llega la
// autorización oficial del 20% restante, se calcula el saldo (bono sobre el
// peso final, menos lo ya adelantado en el 80%, menos cualquier anticipo
// extra dado). Cada paso genera una carta firmada dirigida a "Departamento
// de Nóminas" en el membrete del dueño del barco — dos PDFs de ejemplo reales
// (PESQUERA CARONI, C.A.) sirvieron de plantilla exacta para el texto legal.
//
// La aritmética NO se reinventa aquí: usa calculatePayroll() de lib/payroll.ts,
// la misma función ya verificada centavo a centavo contra los contratos reales
// y usada en la ficha de campaña y el informe de faena.
import { supabase } from "@/lib/supabase";
import { calculatePayroll, resolveWorkDays, type PayrollBreakdown } from "@/lib/payroll";

export type AuthorizationTranche = "80" | "20";

export type AuthorizationPersonRow = {
  role: "Piloto" | "Mecánico";
  name: string;
  lineItems: { label: string; amount: number | null }[];
  anticipo: number;
  totalToPay: number | null;
};

export type FaenaAuthorization = {
  campaignId: string;
  campaignCode: string | null;
  campaignName: string;
  vesselName: string;
  vesselId: string | null;
  helicopterRegistration: string | null;
  startDate: string | null;
  endDate: string | null;
  dischargePort: string | null;
  tranche: AuthorizationTranche;
  tonsEstimate: number | null;
  tonsFinal: number | null;
  tonsAlreadyPaidIn80: number | null;
  tonsToPayThisTranche: number | null;
  missingData: string | null;
  letterhead: {
    companyName: string;
    address: string | null;
    city: string;
    signers: string | null;
  };
  dateLine: string;
  people: AuthorizationPersonRow[];
  totalToPayAllPeople: number | null;
};

const SPANISH_MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

function formatSpanishDate(date: Date): string {
  return `${date.getUTCDate()} de ${SPANISH_MONTHS[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

function personRows(
  tranche: AuthorizationTranche,
  role: "Piloto" | "Mecánico",
  name: string,
  breakdown: PayrollBreakdown,
  campaignLabel: string,
  tonsEstimate: number | null,
  tonsFinal: number | null,
  startDate: string | null,
  endDate: string | null
): AuthorizationPersonRow {
  if (tranche === "80") {
    return {
      role,
      name,
      lineItems: [
        { label: `80% ${campaignLabel}${tonsEstimate != null ? `, ${tonsEstimate} toneladas aprox.` : ""}`, amount: breakdown.tonBonusAdvance },
        { label: `Días laborados${startDate && endDate ? ` del ${startDate} al ${endDate}` : ""}`, amount: breakdown.proratedSalary }
      ],
      anticipo: 0,
      totalToPay: breakdown.firstPayment
    };
  }
  return {
    role,
    name,
    lineItems: [
      { label: `20% ${campaignLabel}${tonsFinal != null ? `, ${tonsFinal} toneladas finales` : ""}`, amount: breakdown.tonBonusRemainder }
    ],
    anticipo: breakdown.extraAdvance,
    totalToPay: breakdown.finalPayment
  };
}

export async function buildFaenaAuthorization(campaignId: string, tranche: AuthorizationTranche): Promise<FaenaAuthorization | null> {
  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      "*, vessels:vessel_id(id, name, owner, letterhead_company_name, letterhead_address, letterhead_phone, letterhead_signers, letterhead_city)"
    )
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return null;

  const [{ data: pilotPerson }, { data: mechanicPerson }] = await Promise.all([
    campaign.pilot_id
      ? supabase.from("personnel").select("full_name, monthly_salary, rate_per_ton").eq("id", campaign.pilot_id).maybeSingle()
      : Promise.resolve({ data: null }),
    campaign.mechanic_id
      ? supabase.from("personnel").select("full_name, monthly_salary, rate_per_ton").eq("id", campaign.mechanic_id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  // Días laborados por persona: no siempre coinciden con las fechas de la
  // faena (el mecánico a veces llega antes o se queda después) — usa el
  // rango propio de cada uno si se guardó uno, si no cae de vuelta a las
  // fechas de la faena. Ver lib/payroll.ts.
  const pilotWork = resolveWorkDays(campaign.pilot_start_date, campaign.pilot_end_date, campaign.start_date, campaign.end_date);
  const mechanicWork = resolveWorkDays(campaign.mechanic_start_date, campaign.mechanic_end_date, campaign.start_date, campaign.end_date);

  const tonsEstimate = campaign.tons_captured_estimate != null ? Number(campaign.tons_captured_estimate) : null;
  const tonsFinal = campaign.tons_captured_final != null ? Number(campaign.tons_captured_final) : null;
  const tonsAlreadyPaidIn80 = tonsEstimate != null ? tonsEstimate * 0.8 : null;
  const tonsToPayThisTranche =
    tranche === "80" ? tonsAlreadyPaidIn80 : tonsFinal != null && tonsAlreadyPaidIn80 != null ? tonsFinal - tonsAlreadyPaidIn80 : null;

  let missingData: string | null = null;
  if (tranche === "80" && tonsEstimate == null) {
    missingData = "Falta la tonelada estimada de esta faena — complétala en \"Editar\" antes de generar esta carta.";
  } else if (tranche === "20" && (tonsFinal == null || tonsEstimate == null)) {
    missingData = "Falta el peso final y/o la tonelada estimada de esta faena — complétalos en \"Editar\" antes de generar esta carta.";
  }

  const vessel = campaign.vessels as {
    id: string;
    name: string;
    owner: string | null;
    letterhead_company_name: string | null;
    letterhead_address: string | null;
    letterhead_phone: string | null;
    letterhead_signers: string | null;
    letterhead_city: string | null;
  } | null;

  const vesselName = vessel?.name ?? campaign.name;
  const campaignLabel = `Marea ${campaign.code ?? campaign.name} — M/N ${vesselName}`;

  const people: AuthorizationPersonRow[] = [];
  if (pilotPerson) {
    const breakdown = calculatePayroll({
      monthlySalary: pilotPerson.monthly_salary != null ? Number(pilotPerson.monthly_salary) : null,
      ratePerTon: pilotPerson.rate_per_ton != null ? Number(pilotPerson.rate_per_ton) : null,
      workDays: pilotWork.days,
      tonsCapturedEstimate: tonsEstimate,
      tonsCapturedFinal: tonsFinal,
      extraAdvance: campaign.pilot_anticipos != null ? Number(campaign.pilot_anticipos) : null
    });
    people.push(
      personRows(tranche, "Piloto", pilotPerson.full_name, breakdown, campaignLabel, tonsEstimate, tonsFinal, pilotWork.startDate, pilotWork.endDate)
    );
  }
  if (mechanicPerson) {
    const breakdown = calculatePayroll({
      monthlySalary: mechanicPerson.monthly_salary != null ? Number(mechanicPerson.monthly_salary) : null,
      ratePerTon: mechanicPerson.rate_per_ton != null ? Number(mechanicPerson.rate_per_ton) : null,
      workDays: mechanicWork.days,
      tonsCapturedEstimate: tonsEstimate,
      tonsCapturedFinal: tonsFinal,
      extraAdvance: campaign.mechanic_anticipos != null ? Number(campaign.mechanic_anticipos) : null
    });
    people.push(
      personRows(
        tranche,
        "Mecánico",
        mechanicPerson.full_name,
        breakdown,
        campaignLabel,
        tonsEstimate,
        tonsFinal,
        mechanicWork.startDate,
        mechanicWork.endDate
      )
    );
  }

  const totalToPayAllPeople = people.length ? people.reduce((sum, p) => sum + (p.totalToPay ?? 0), 0) : null;

  return {
    campaignId: campaign.id,
    campaignCode: campaign.code,
    campaignName: campaign.name,
    vesselName,
    vesselId: vessel?.id ?? null,
    helicopterRegistration: campaign.helicopter_registration,
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    dischargePort: campaign.discharge_port,
    tranche,
    tonsEstimate,
    tonsFinal,
    tonsAlreadyPaidIn80,
    tonsToPayThisTranche,
    missingData,
    letterhead: {
      companyName: vessel?.letterhead_company_name || vessel?.owner || vesselName,
      address: vessel?.letterhead_address ?? null,
      city: vessel?.letterhead_city || "Panamá",
      signers: vessel?.letterhead_signers ?? null
    },
    dateLine: formatSpanishDate(new Date()),
    people,
    totalToPayAllPeople
  };
}
