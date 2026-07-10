import { supabase } from "@/lib/supabase";

// There is no fixed Excel or master list for hangar-driven maintenance — the
// technician works through the Robinson maintenance manual's hour-based
// inspections (25/50/100 HRS, etc.) as each aircraft accumulates hours. We
// don't hard-code those intervals: instead we read them straight out of the
// inspection history that's already flowing in from the weekly report
// importer (maintenance_logs.maintenance_type, e.g. "25 HRS", "50 HRS",
// "100 HRS") and detect the interval from the label itself. Whatever
// intervals actually show up in real logs are the ones tracked — if the
// manual's cycle changes, or a helicopter uses a different cycle, this
// adapts automatically instead of needing a code change.

type MaintenanceLogRow = {
  helicopter_registration: string;
  maintenance_type: string;
  hourmeter: number | null;
  log_date: string | null;
};

type HelicopterRow = {
  registration: string;
  model: string;
  current_hourmeter: number;
};

export type ScheduledInspection = {
  helicopterRegistration: string;
  maintenanceType: string;
  intervalHours: number;
  lastDoneAtHourmeter: number;
  lastDoneDate: string | null;
  nextDueAtHourmeter: number;
  hoursRemaining: number;
  status: "OK" | "Due soon" | "Overdue";
};

/** Extracts the hour interval from a label like "25 HRS", "100hrs", "50 Hour". Returns null if it doesn't match. */
function parseHourInterval(maintenanceType: string): number | null {
  const match = maintenanceType.match(/^(\d+)\s*hrs?/i);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function buildMaintenanceSchedule(): Promise<ScheduledInspection[]> {
  const [{ data: helicopters }, { data: logs }] = await Promise.all([
    supabase.from("helicopters").select("registration, model, current_hourmeter").eq("archived", false),
    supabase
      .from("maintenance_logs")
      .select("helicopter_registration, maintenance_type, hourmeter, log_date")
      .not("hourmeter", "is", null)
      .order("log_date", { ascending: false })
  ]);

  const helicopterRows = (helicopters ?? []) as HelicopterRow[];
  const logRows = (logs ?? []) as MaintenanceLogRow[];
  const hourmeterByRegistration = new Map(helicopterRows.map((h) => [h.registration, h.current_hourmeter]));

  // Keep only the most recent (highest hourmeter) entry per (helicopter, type).
  const latestByKey = new Map<string, MaintenanceLogRow>();
  for (const log of logRows) {
    const interval = parseHourInterval(log.maintenance_type);
    if (interval == null || log.hourmeter == null) continue;
    const key = `${log.helicopter_registration}::${log.maintenance_type}`;
    const existing = latestByKey.get(key);
    if (!existing || (log.hourmeter ?? 0) > (existing.hourmeter ?? 0)) {
      latestByKey.set(key, log);
    }
  }

  const schedule: ScheduledInspection[] = [];
  for (const log of latestByKey.values()) {
    const interval = parseHourInterval(log.maintenance_type);
    const currentHourmeter = hourmeterByRegistration.get(log.helicopter_registration);
    if (interval == null || log.hourmeter == null || currentHourmeter == null) continue;

    const nextDueAtHourmeter = log.hourmeter + interval;
    const hoursRemaining = nextDueAtHourmeter - currentHourmeter;
    const status: ScheduledInspection["status"] = hoursRemaining <= 0 ? "Overdue" : hoursRemaining <= interval * 0.2 ? "Due soon" : "OK";

    schedule.push({
      helicopterRegistration: log.helicopter_registration,
      maintenanceType: log.maintenance_type,
      intervalHours: interval,
      lastDoneAtHourmeter: log.hourmeter,
      lastDoneDate: log.log_date,
      nextDueAtHourmeter,
      hoursRemaining,
      status
    });
  }

  const statusRank = (status: ScheduledInspection["status"]) => (status === "Overdue" ? 0 : status === "Due soon" ? 1 : 2);
  return schedule.sort((left, right) => statusRank(left.status) - statusRank(right.status) || left.hoursRemaining - right.hoursRemaining);
}
