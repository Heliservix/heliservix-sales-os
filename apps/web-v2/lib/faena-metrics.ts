// Shared per-faena / per-vessel efficiency math — the single source of truth
// for "tons per flight hour", "tons per fishing day", and "gallons per hour"
// used by both the Faenas summary page (app/campaigns/resumen) and AURA's
// operations analysis (lib/aura.ts). Extracted so the two never drift apart
// with slightly different formulas.
import { supabase } from "@/lib/supabase";

export type FaenaCampaignRow = {
  id: string;
  code: string | null;
  name: string;
  vessel_id: string | null;
  vessels: { name: string } | null;
  helicopter_registration: string | null;
  status: string;
  start_date: string | null;
  tons_captured_final: number | null;
  tons_captured_estimate: number | null;
  fishing_days: number | null;
  total_flight_hours: number | null;
};

export type FaenaFlightLogRow = {
  id: string;
  campaign_id: string | null;
  marea_code: string | null;
  helicopter_registration: string | null;
  week_number: number | null;
  flight_date: string;
  flight_hours: number;
  fuel_consumption_gals: number | null;
};

export type FaenaMetrics = {
  campaign: FaenaCampaignRow;
  hours: number;
  fuel: number;
  fuelWeeksReported: number;
  weeksTotal: number;
  tonsFinal: number | null;
  fishingDays: number | null;
  tonsPerHour: number | null;
  tonsPerDay: number | null;
  hoursPerDay: number | null;
  galsPerHour: number | null;
};

export type VesselSummary = {
  name: string;
  faenas: number;
  totalHours: number;
  totalTons: number;
  totalDays: number;
  totalFuel: number;
  tonsPerHour: number | null;
  tonsPerDay: number | null;
  galsPerHour: number | null;
};

function matchLogsForCampaign(campaign: FaenaCampaignRow, flightLogs: FaenaFlightLogRow[]): FaenaFlightLogRow[] {
  const matched = flightLogs.filter(
    (log) =>
      log.campaign_id === campaign.id ||
      (campaign.code != null &&
        campaign.helicopter_registration != null &&
        log.marea_code === campaign.code &&
        log.helicopter_registration === campaign.helicopter_registration)
  );
  const seen = new Set<string>();
  return matched.filter((log) => {
    if (seen.has(log.id)) return false;
    seen.add(log.id);
    return true;
  });
}

export async function fetchFaenaData(): Promise<{
  campaigns: FaenaCampaignRow[];
  flightLogs: FaenaFlightLogRow[];
  error: string | null;
}> {
  const [{ data: campaignData, error: campaignError }, { data: flightLogData, error: flightLogError }] = await Promise.all([
    // Deliberately does NOT filter archived=false: "Archivar" on the campaign
    // detail page is how the office closes out a finished faena, and a
    // finished faena is exactly the one with real tons_captured_final and
    // total hours data — the numbers this summary and AURA's operations
    // analysis most need. Excluding archived faenas here silently dropped
    // every completed faena from the comparison the moment it was closed
    // (real bug found 2026-07-14: dashboard/resumen totals were missing most
    // history). The active /campaigns list still filters archived=false —
    // that page is "what's open right now", not historical reporting.
    supabase
      .from("campaigns")
      .select(
        "id, code, name, vessel_id, vessels:vessel_id(name), helicopter_registration, status, start_date, tons_captured_final, tons_captured_estimate, fishing_days, total_flight_hours"
      )
      .order("code"),
    supabase
      .from("flight_logs")
      .select("id, campaign_id, marea_code, helicopter_registration, week_number, flight_date, flight_hours, fuel_consumption_gals")
  ]);

  return {
    campaigns: (campaignData ?? []) as unknown as FaenaCampaignRow[],
    flightLogs: (flightLogData ?? []) as FaenaFlightLogRow[],
    error: campaignError?.message ?? flightLogError?.message ?? null
  };
}

export function computeFaenaMetrics(campaigns: FaenaCampaignRow[], flightLogs: FaenaFlightLogRow[]): FaenaMetrics[] {
  return campaigns.map((campaign) => {
    const matched = matchLogsForCampaign(campaign, flightLogs);
    const loggedHours = matched.reduce((sum, log) => sum + Number(log.flight_hours), 0);
    // total_flight_hours is the manually-entered hours flown BEFORE this
    // faena started getting weekly reports uploaded through the system (a
    // bulk-imported historical faena with zero flight_logs, or the first
    // few weeks of a live faena that were never uploaded). It always ADDS
    // to whatever flight_logs have been logged since — it must not be
    // treated as an either/or fallback, or the total silently drops back
    // down to just the most recent week the moment the first real weekly
    // report gets uploaded (that was a real bug: uploading week 5 of a
    // faena made the office-entered running total for weeks 1-4 disappear
    // from every ratio on this page).
    const hours = loggedHours + Number(campaign.total_flight_hours ?? 0);
    const fuel = matched.reduce((sum, log) => sum + Number(log.fuel_consumption_gals ?? 0), 0);
    const fuelWeeksReported = matched.filter((log) => log.fuel_consumption_gals != null).length;
    const tonsFinal = campaign.tons_captured_final != null ? Number(campaign.tons_captured_final) : null;
    const fishingDays = campaign.fishing_days != null ? Number(campaign.fishing_days) : null;

    return {
      campaign,
      hours,
      fuel,
      fuelWeeksReported,
      weeksTotal: matched.length,
      tonsFinal,
      fishingDays,
      tonsPerHour: tonsFinal != null && hours > 0 ? tonsFinal / hours : null,
      tonsPerDay: tonsFinal != null && fishingDays != null && fishingDays > 0 ? tonsFinal / fishingDays : null,
      hoursPerDay: fishingDays != null && fishingDays > 0 ? hours / fishingDays : null,
      galsPerHour: fuel > 0 && hours > 0 ? fuel / hours : null
    };
  });
}

export type YearSummary = {
  year: string;
  faenas: number;
  totalHours: number;
  totalTons: number;
  totalDays: number;
};

function yearKey(row: FaenaMetrics): string {
  return row.campaign.start_date ? row.campaign.start_date.slice(0, 4) : "Sin fecha";
}

/** Same idea as computeVesselSummaries, grouped by the faena's start year
 * instead of by vessel — answers "how many faenas / hours / tons / fishing
 * days per year" for the operations dashboard. */
export function computeYearlySummaries(rows: FaenaMetrics[]): YearSummary[] {
  const years = Array.from(new Set(rows.map(yearKey))).sort((a, b) => (a === "Sin fecha" ? 1 : b === "Sin fecha" ? -1 : b.localeCompare(a)));
  return years.map((year) => {
    const yearRows = rows.filter((row) => yearKey(row) === year);
    return {
      year,
      faenas: yearRows.length,
      totalHours: yearRows.reduce((sum, row) => sum + row.hours, 0),
      totalTons: yearRows.reduce((sum, row) => sum + (row.tonsFinal ?? 0), 0),
      totalDays: yearRows.reduce((sum, row) => sum + (row.fishingDays ?? 0), 0)
    };
  });
}

export function vesselKey(row: FaenaMetrics): string {
  return row.campaign.vessels?.name ?? "Sin barco";
}

export function computeVesselSummaries(rows: FaenaMetrics[]): VesselSummary[] {
  const names = Array.from(new Set(rows.map(vesselKey))).sort();
  return names.map((name) => {
    const vesselRows = rows.filter((row) => vesselKey(row) === name);
    const totalHours = vesselRows.reduce((sum, row) => sum + row.hours, 0);
    const totalTons = vesselRows.reduce((sum, row) => sum + (row.tonsFinal ?? 0), 0);
    const totalDays = vesselRows.reduce((sum, row) => sum + (row.fishingDays ?? 0), 0);
    const totalFuel = vesselRows.reduce((sum, row) => sum + row.fuel, 0);
    return {
      name,
      faenas: vesselRows.length,
      totalHours,
      totalTons,
      totalDays,
      totalFuel,
      tonsPerHour: totalTons > 0 && totalHours > 0 ? totalTons / totalHours : null,
      tonsPerDay: totalTons > 0 && totalDays > 0 ? totalTons / totalDays : null,
      galsPerHour: totalFuel > 0 && totalHours > 0 ? totalFuel / totalHours : null
    };
  });
}
