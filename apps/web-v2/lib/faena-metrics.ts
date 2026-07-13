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
    supabase
      .from("campaigns")
      .select(
        "id, code, name, vessel_id, vessels:vessel_id(name), helicopter_registration, status, tons_captured_final, tons_captured_estimate, fishing_days, total_flight_hours"
      )
      .eq("archived", false)
      .order("code"),
    supabase
      .from("flight_logs")
      .select("id, campaign_id, marea_code, helicopter_registration, flight_date, flight_hours, fuel_consumption_gals")
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
    // Bulk-loaded historical faenas have no linked flight_logs — fall back to
    // the manually-entered total so ratios still compute (see campaign
    // detail page for why this never goes through flight_logs itself).
    const hours = loggedHours > 0 ? loggedHours : Number(campaign.total_flight_hours ?? 0);
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
