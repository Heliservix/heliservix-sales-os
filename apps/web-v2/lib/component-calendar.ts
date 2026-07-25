// The shop's standard rule per the maintenance manual: unless a component
// has its own documented calendar limit, or is a genuine LIFE / ON CONDITION
// part (hours-only, no calendar limit at all), it gets a 12-year calendar
// limit counted from its installation date. Shared by the manual component
// form (app/helicopters/[registration]/components/actions.ts) and the bulk
// Excel importer (lib/component-import.ts) so the rule is applied the same
// way everywhere a component's calendar limit gets set.
export const DEFAULT_CALENDAR_LIMIT_YEARS = 12;

/** installationDate + `years` years, as an ISO date string, or null if
 * there's no installation date to count from (nothing to default). */
export function defaultCalendarLimitDate(installationDate: string | null, years: number = DEFAULT_CALENDAR_LIMIT_YEARS): string | null {
  if (!installationDate) return null;
  const d = new Date(`${installationDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}
