// Per-faena narrative report — everything Adolfo asked for in one place:
// operations summary, payroll breakdown, técnico report-quality grading,
// maintenance advisories, and a synthesized management opinion.
//
// This is deliberately built the same way AURA is (lib/aura.ts): a
// deterministic, template-based prose generator over real numbers, NOT a
// call to an external language model. Adolfo explicitly put "real LLM
// narrative layer" on standby (cost/API-key decision deferred) — this gives
// the same "reads like an analyst wrote it" report without that recurring
// cost or new dependency. If a real LLM gets wired in later, it should sit
// ON TOP of this (rephrase/expand these sentences), not replace the numbers.
import { supabase } from "@/lib/supabase";
import { calculatePayroll, type PayrollBreakdown } from "@/lib/payroll";
import { ROBINSON_R44_AVGAS_SPEC, isRobinsonR44 } from "@/lib/aura";
import { fetchFaenaData, computeFaenaMetrics, vesselKey, type FaenaMetrics } from "@/lib/faena-metrics";

const CLOSED_CAMPAIGN_STATUSES = new Set(["Completed", "Archived"]);

export type PersonPayroll = { name: string; role: "Piloto" | "Mecánico"; breakdown: PayrollBreakdown };

export type ReportFuelAnomaly = {
  weekNumber: number | null;
  flightDate: string;
  actualGalPerHour: number;
  direction: "Above" | "Below";
};

export type FaenaReport = {
  campaignId: string;
  campaignName: string;
  campaignCode: string | null;
  vesselName: string;
  helicopterRegistration: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  metrics: FaenaMetrics;
  vesselComparison: {
    peerAvgTonsPerHour: number | null;
    peerAvgTonsPerDay: number | null;
    peerCount: number;
    vsPeerTonsPerHourPct: number | null;
  };
  payroll: {
    people: PersonPayroll[];
    totalPaid: number | null;
  };
  reportQuality: {
    weeksReported: number;
    expectedWeeks: number | null;
    missingWeeks: number[];
    fuelReportedWeeks: number;
    oilReportedWeeks: number;
    completenessScore: number | null;
    assessment: "Excelente" | "Buena" | "Regular" | "Deficiente" | "Sin datos";
  };
  maintenance: {
    maintenanceLogsCount: number;
    nonRoutineCount: number;
    filterChangesCount: number;
    componentChangesCount: number;
    openAlertsNow: { componentName: string | null; severity: string; description: string | null }[];
    fuelAnomalies: ReportFuelAnomaly[];
  };
  advisories: string[];
  managementOpinion: string[];
};

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export async function buildFaenaReport(campaignId: string): Promise<FaenaReport | null> {
  // The shared FaenaCampaignRow shape (lib/faena-metrics.ts) only selects the
  // columns the Resumen de Faenas / AURA operations engine need. This report
  // needs more (pilot_id, mechanic_id, start_date, end_date) so it fetches
  // the full campaign row separately, and uses fetchFaenaData()/
  // computeFaenaMetrics() only for the shared tons/hour math and vessel peer
  // comparison — the two never need to disagree since they're built from
  // the same underlying tables.
  const { data: fullCampaign } = await supabase
    .from("campaigns")
    .select("*, vessels:vessel_id(name)")
    .eq("id", campaignId)
    .maybeSingle();
  if (!fullCampaign) return null;

  const { campaigns, flightLogs } = await fetchFaenaData();
  const allMetrics = computeFaenaMetrics(campaigns, flightLogs);
  const row = allMetrics.find((m) => m.campaign.id === campaignId);
  if (!row) return null;

  const vesselName = vesselKey(row);

  // Peer faenas on the SAME vessel — same "compare against its own history"
  // logic as AURA's Operations panel (lib/aura.ts), just scoped to one faena
  // here instead of scanning all of them for anomalies.
  const peers = allMetrics.filter(
    (m) => m !== row && vesselKey(m) === vesselName && CLOSED_CAMPAIGN_STATUSES.has(m.campaign.status) && m.tonsPerHour != null
  );
  const peerAvgTonsPerHour = peers.length ? peers.reduce((sum, p) => sum + (p.tonsPerHour ?? 0), 0) / peers.length : null;
  const peerDayPeers = peers.filter((p) => p.tonsPerDay != null);
  const peerAvgTonsPerDay = peerDayPeers.length ? peerDayPeers.reduce((sum, p) => sum + (p.tonsPerDay ?? 0), 0) / peerDayPeers.length : null;
  const vsPeerTonsPerHourPct =
    row.tonsPerHour != null && peerAvgTonsPerHour != null && peerAvgTonsPerHour > 0
      ? ((row.tonsPerHour - peerAvgTonsPerHour) / peerAvgTonsPerHour) * 100
      : null;

  // The campaign's own flight_logs (dedup by campaign_id or marea+registration,
  // same union used on the campaign detail page — bulk-loaded historical
  // faenas only match on the second key).
  const campaignLogs = flightLogs.filter(
    (log) =>
      log.campaign_id === campaignId ||
      (row.campaign.code != null && row.campaign.helicopter_registration != null && log.marea_code === row.campaign.code && log.helicopter_registration === row.campaign.helicopter_registration)
  );
  const seenLogIds = new Set<string>();
  const dedupedLogs = campaignLogs.filter((log) => (seenLogIds.has(log.id) ? false : (seenLogIds.add(log.id), true)));

  const startBound = fullCampaign.start_date ?? "1900-01-01";
  const endBound = fullCampaign.end_date ?? new Date().toISOString().slice(0, 10);
  const registration = fullCampaign.helicopter_registration as string | null;

  const [{ data: pilotPerson }, { data: mechanicPerson }, { data: helicopter }, { data: maintenanceLogs }, { data: componentChanges }, { data: openAlerts }] =
    await Promise.all([
      fullCampaign.pilot_id
        ? supabase.from("personnel").select("full_name, monthly_salary, rate_per_ton").eq("id", fullCampaign.pilot_id).maybeSingle()
        : Promise.resolve({ data: null }),
      fullCampaign.mechanic_id
        ? supabase.from("personnel").select("full_name, monthly_salary, rate_per_ton").eq("id", fullCampaign.mechanic_id).maybeSingle()
        : Promise.resolve({ data: null }),
      registration ? supabase.from("helicopters").select("model").eq("registration", registration).maybeSingle() : Promise.resolve({ data: null }),
      registration
        ? supabase
            .from("maintenance_logs")
            .select("id, maintenance_type, log_date")
            .eq("helicopter_registration", registration)
            .gte("log_date", startBound)
            .lte("log_date", endBound)
        : Promise.resolve({ data: [] as { id: string; maintenance_type: string; log_date: string | null }[] }),
      registration
        ? supabase
            .from("component_changes")
            .select("id")
            .eq("helicopter_registration", registration)
            .gte("installation_date", startBound)
            .lte("installation_date", endBound)
        : Promise.resolve({ data: [] as { id: string }[] }),
      registration
        ? supabase.from("maintenance_alerts").select("component_name, severity, description").eq("helicopter_registration", registration).neq("status", "Resolved")
        : Promise.resolve({ data: [] as { component_name: string | null; severity: string; description: string | null }[] })
    ]);

  const people: PersonPayroll[] = [];
  if (pilotPerson) {
    people.push({
      name: pilotPerson.full_name,
      role: "Piloto",
      breakdown: calculatePayroll({
        monthlySalary: pilotPerson.monthly_salary != null ? Number(pilotPerson.monthly_salary) : null,
        ratePerTon: pilotPerson.rate_per_ton != null ? Number(pilotPerson.rate_per_ton) : null,
        fishingDays: row.fishingDays,
        tonsCapturedEstimate: row.campaign.tons_captured_estimate != null ? Number(row.campaign.tons_captured_estimate) : null,
        tonsCapturedFinal: row.tonsFinal,
        extraAdvance: null
      })
    });
  }
  if (mechanicPerson) {
    people.push({
      name: mechanicPerson.full_name,
      role: "Mecánico",
      breakdown: calculatePayroll({
        monthlySalary: mechanicPerson.monthly_salary != null ? Number(mechanicPerson.monthly_salary) : null,
        ratePerTon: mechanicPerson.rate_per_ton != null ? Number(mechanicPerson.rate_per_ton) : null,
        fishingDays: row.fishingDays,
        tonsCapturedEstimate: row.campaign.tons_captured_estimate != null ? Number(row.campaign.tons_captured_estimate) : null,
        tonsCapturedFinal: row.tonsFinal,
        extraAdvance: null
      })
    });
  }
  const totalPaid = people.length ? people.reduce((sum, p) => sum + (p.breakdown.total ?? 0), 0) : null;

  // Técnico report-quality: how many weeks were actually reported vs how
  // many should have been (fishing_days / 7, rounded up), and how complete
  // each report was (fuel + oil fields filled in). This is a data-hygiene
  // signal, not a judgment of the person — a gap here often just means a
  // week's report never made it into the system.
  const weeksReported = dedupedLogs.length;
  const expectedWeeks = row.fishingDays != null && row.fishingDays > 0 ? Math.ceil(row.fishingDays / 7) : null;
  const reportedWeekNumbers = new Set(dedupedLogs.map((l) => l.week_number).filter((n): n is number => n != null));
  const missingWeeks: number[] = [];
  if (expectedWeeks != null) {
    for (let w = 1; w <= expectedWeeks; w++) {
      if (!reportedWeekNumbers.has(w)) missingWeeks.push(w);
    }
  }
  const fuelReportedWeeks = dedupedLogs.filter((l) => l.fuel_consumption_gals != null).length;
  const oilReportedWeeks = dedupedLogs.filter((l) => (l as unknown as { oil_consumption_qts?: number | null }).oil_consumption_qts != null).length;

  let completenessScore: number | null = null;
  if (weeksReported > 0) {
    const coverageScore = expectedWeeks != null && expectedWeeks > 0 ? Math.min(1, weeksReported / expectedWeeks) : 1;
    const fuelScore = fuelReportedWeeks / weeksReported;
    const oilScore = oilReportedWeeks / weeksReported;
    completenessScore = Math.round((coverageScore * 0.5 + fuelScore * 0.3 + oilScore * 0.2) * 100);
  }
  const assessment: FaenaReport["reportQuality"]["assessment"] =
    completenessScore == null ? "Sin datos" : completenessScore >= 90 ? "Excelente" : completenessScore >= 70 ? "Buena" : completenessScore >= 50 ? "Regular" : "Deficiente";

  // Fuel-vs-Robinson-manual anomalies, scoped to just this faena's weeks.
  const fuelAnomalies: ReportFuelAnomaly[] = [];
  if (isRobinsonR44(helicopter?.model ?? null)) {
    for (const log of dedupedLogs) {
      const hours = Number(log.flight_hours);
      if (!(hours > 0) || log.fuel_consumption_gals == null) continue;
      const actual = Number(log.fuel_consumption_gals) / hours;
      const low = ROBINSON_R44_AVGAS_SPEC.minGalPerHour - ROBINSON_R44_AVGAS_SPEC.toleranceGalPerHour;
      const high = ROBINSON_R44_AVGAS_SPEC.maxGalPerHour + ROBINSON_R44_AVGAS_SPEC.toleranceGalPerHour;
      if (actual < low || actual > high) {
        fuelAnomalies.push({ weekNumber: log.week_number, flightDate: log.flight_date, actualGalPerHour: actual, direction: actual > high ? "Above" : "Below" });
      }
    }
  }

  const maintenanceLogsList = (maintenanceLogs ?? []) as { id: string; maintenance_type: string; log_date: string | null }[];
  const nonRoutineCount = maintenanceLogsList.filter((l) => l.maintenance_type === "No Rutina").length;
  const filterChangesCount = maintenanceLogsList.filter((l) => l.maintenance_type === "Cambio de Filtro").length;
  const openAlertsNow = ((openAlerts ?? []) as { component_name: string | null; severity: string; description: string | null }[]).map((a) => ({
    componentName: a.component_name,
    severity: a.severity,
    description: a.description
  }));

  // --- Advisories (concrete "watch out for this" bullets) ---
  const advisories: string[] = [];
  if (row.tonsFinal == null || row.fishingDays == null) {
    advisories.push("Faltan toneladas finales o días de pesca — completar en \"Editar\" para que este informe sea exacto.");
  }
  if (missingWeeks.length) {
    advisories.push(`Semana(s) sin reporte recibido: ${missingWeeks.join(", ")} — verificar con el técnico si realmente no hubo actividad esas semanas.`);
  }
  if (weeksReported > 0 && maintenanceLogsList.length === 0) {
    advisories.push("No se registró ningún mantenimiento (inspección, no-rutina o cambio de filtro) durante esta faena — verificar si falta cargar información.");
  }
  if (fuelAnomalies.length) {
    advisories.push(
      `${fuelAnomalies.length} semana(s) con consumo de AVGAS fuera del rango del manual Robinson R44 (${ROBINSON_R44_AVGAS_SPEC.minGalPerHour}-${ROBINSON_R44_AVGAS_SPEC.maxGalPerHour} gal/hora).`
    );
  }
  const criticalAlerts = openAlertsNow.filter((a) => a.severity === "Critical" || a.severity === "Grounding");
  if (criticalAlerts.length) {
    advisories.push(`El helicóptero tiene actualmente ${criticalAlerts.length} alerta(s) crítica(s)/en tierra abierta(s) — resolver antes de la próxima faena.`);
  }
  if (!advisories.length) {
    advisories.push("No se detectaron banderas de datos ni de mantenimiento para esta faena.");
  }

  // --- Management opinion (2-5 sentences synthesizing everything above) ---
  const managementOpinion: string[] = [];
  if (vsPeerTonsPerHourPct != null) {
    managementOpinion.push(
      vsPeerTonsPerHourPct >= 0
        ? `Esta faena rindió ${vsPeerTonsPerHourPct.toFixed(0)}% por encima del promedio histórico de ${vesselName} en toneladas por hora de vuelo (${peers.length} faena(s) de referencia).`
        : `Esta faena rindió ${Math.abs(vsPeerTonsPerHourPct).toFixed(0)}% por debajo del promedio histórico de ${vesselName} (${peers.length} faena(s) de referencia) — vale la pena revisar condiciones de pesca, zona y disponibilidad del helicóptero.`
    );
  } else {
    managementOpinion.push(`Todavía no hay suficientes faenas cerradas de ${vesselName} para comparar el rendimiento de esta contra un promedio propio.`);
  }
  if (completenessScore != null) {
    managementOpinion.push(
      `La calidad de los reportes semanales fue "${assessment}" (${completenessScore}% de completitud) — ${
        completenessScore >= 70
          ? "los datos de esta faena son confiables para tomar decisiones."
          : "conviene reforzar con el técnico la disciplina de reporte semanal antes de confiar plenamente en estos números."
      }`
    );
  }
  managementOpinion.push(
    criticalAlerts.length
      ? `Mantenimiento: hay ${criticalAlerts.length} alerta(s) crítica(s) abierta(s) en este helicóptero que deben resolverse antes de asignarlo a la próxima faena.`
      : "Mantenimiento: no hay alertas críticas abiertas para este helicóptero en este momento."
  );
  if (totalPaid != null) {
    managementOpinion.push(`Costo de nómina de esta faena: $${totalPaid.toFixed(2)} entre piloto y mecánico asignados.`);
  }
  managementOpinion.push(
    vsPeerTonsPerHourPct != null && vsPeerTonsPerHourPct < -20
      ? "Recomendación: investigar esta faena antes de repetir las mismas condiciones en la próxima marea de este barco."
      : criticalAlerts.length || fuelAnomalies.length
        ? "Recomendación: atender las alertas de mantenimiento/combustible señaladas antes de la próxima faena; el rendimiento operativo en sí no muestra problemas."
        : "Recomendación: continuar con la misma operación — no se detectan señales de alerta relevantes en esta faena."
  );

  return {
    campaignId: row.campaign.id,
    campaignName: row.campaign.name,
    campaignCode: row.campaign.code,
    vesselName,
    helicopterRegistration: row.campaign.helicopter_registration,
    status: row.campaign.status,
    startDate: fullCampaign.start_date ?? null,
    endDate: fullCampaign.end_date ?? null,
    metrics: row,
    vesselComparison: { peerAvgTonsPerHour, peerAvgTonsPerDay, peerCount: peers.length, vsPeerTonsPerHourPct },
    payroll: { people, totalPaid },
    reportQuality: { weeksReported, expectedWeeks, missingWeeks, fuelReportedWeeks, oilReportedWeeks, completenessScore, assessment },
    maintenance: { maintenanceLogsCount: maintenanceLogsList.length, nonRoutineCount, filterChangesCount, componentChangesCount: (componentChanges ?? []).length, openAlertsNow, fuelAnomalies },
    advisories,
    managementOpinion
  };
}

export { round as roundFaenaReportValue };
