import { supabase } from "@/lib/supabase";

// Fleet health (lib/aura.ts's buildFleetHealthEngine) only ever computes
// "as of right now" — nothing before this recorded what it was yesterday or
// last month, so there was no way to see whether the fleet is trending up or
// down. This writes one row per calendar day (upsert on snapshot_date, so
// loading the dashboard twice in the same day never creates duplicates) and
// reads back the recent history for a trend chart.

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Fire-and-forget: records today's fleet health score if it hasn't been
 * recorded yet. Safe to call on every dashboard load — the unique
 * constraint on snapshot_date plus onConflict "ignore" means this is a
 * no-op after the first call each day. Never throws: a failure here should
 * never break the dashboard render. */
export async function recordFleetHealthSnapshot(score: number, aircraftCount: number): Promise<void> {
  try {
    const { error } = await supabase
      .from("fleet_health_history")
      .upsert({ snapshot_date: todayIso(), score: Math.round(score * 10) / 10, aircraft_count: aircraftCount }, { onConflict: "snapshot_date", ignoreDuplicates: true });
    if (error) console.warn("[fleet-health-history] no se pudo guardar el snapshot de hoy:", error.message);
  } catch (err) {
    console.warn("[fleet-health-history] no se pudo guardar el snapshot de hoy:", err);
  }
}

export type FleetHealthPoint = { date: string; score: number };

/** Last `days` calendar days of recorded fleet health, oldest first — ready
 * to feed straight into TrendLineChart. */
export async function fetchFleetHealthTrend(days = 60): Promise<FleetHealthPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from("fleet_health_history")
    .select("snapshot_date, score")
    .gte("snapshot_date", since.toISOString().slice(0, 10))
    .order("snapshot_date", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({ date: row.snapshot_date as string, score: Number(row.score) }));
}
