# HeliServiX OS 0.2 RC1 Maintenance Guide

## Maintenance Module Purpose

The RC1 maintenance workflow supports operational review of helicopter component life, flight-hour effects, alerts, maintenance entries, component changes, and forecast exposure.

It does not replace formal maintenance control, certified inspection, mechanic approval, inspector authorization, or regulatory release-to-service requirements.

## Component Status Rules

Component status is calculated from remaining hours, remaining calendar days, and remaining percentage:

- OK: more than 25 percent remaining.
- Monitor: 10 percent to 25 percent remaining.
- Critical: less than 10 percent remaining.
- Expired: 0 hours, 0 calendar days, or 0 percent remaining.
- Removed: component has been removed or archived from active control.

## Flight Log Procedure

1. Confirm selected helicopter registration.
2. Confirm vessel or campaign context.
3. Enter flight date.
4. Enter pilot and mechanic.
5. Enter Hobbs start and Hobbs end.
6. Save locally.
7. Review helicopter hourmeter.
8. Review affected component remaining hours and status.
9. Review generated maintenance alerts.

## Maintenance Alert Review

Maintenance alerts should be reviewed when:

- A component enters Monitor status.
- A component enters Critical status.
- A component expires by hours or calendar.
- Imported workbook data contains missing required fields.
- A compliance item is due or overdue.

## Component Change Procedure

1. Open Maintenance Crew Portal.
2. Select the helicopter.
3. Select removed component when applicable.
4. Enter installed component name, P/N, S/N, position, life limit, and calendar fields.
5. Enter removal and installation dates.
6. Enter reason and technician.
7. Add supporting document placeholder.
8. Save locally.
9. Confirm replacement history and maintenance timeline update.

## Evidence Handling

RC1 accepts evidence placeholders only. Actual documents such as 8130 forms, logbook pages, work orders, certificates, release-to-service records, photos, invoices, and inspection documents must be stored outside RC1 until backend document storage is implemented.

## Excel Component Import Review

Before importing:

- Confirm helicopter registration.
- Confirm model and aircraft serial number when available.
- Confirm hourmeter.
- Review component name, category, P/N, S/N, position, installation date, TSN, TSO, life limit, remaining hours, calendar limit, and notes.
- Resolve blocking errors.
- Review duplicate warnings.
- Confirm status recalculation.

After importing:

- Review Aircraft Operations Center for the helicopter.
- Review Components table.
- Review Maintenance Alerts.
- Review Forecast.

## Release Candidate Caution

RC1 is a local operational MVP. It is not approved as an official maintenance system of record until backend persistence, authentication, audit trail, document storage, and production validation are completed.
