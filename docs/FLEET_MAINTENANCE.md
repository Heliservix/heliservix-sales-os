# Fleet & Maintenance Operations

## Purpose

Fleet & Maintenance Operations is a day-one core module of HeliServiX OS. It exists to make commercial commitments trustworthy by connecting tuna-vessel campaigns to real helicopter availability, component life, calendar limits, maintenance forecast, replacement history, overhaul planning, and maintenance reserve exposure.

The module must support a fleet of helicopters operating across Panama, Ecuador, and other Latin American markets. HP1804 is the first known aircraft context, not a hardcoded product assumption.

## Reference Model

The module is modeled on the component-control structure from `Heliservix_Control_Componentes_FINAL_PRO.xlsx`. The workbook contains:

- `Control Maestro`: primary component-control table with aircraft header, reference number, component, part number, serial number, position, installation date, TSN, TSO, hour limit, remaining hours, calendar limit, calendar remaining value, percent remaining by hours, status, and observations.
- `Control Maestro (2)`: alternate component-control view with the same aircraft header and component life calculations.
- `Resumen Ejecutivo`: executive summary with aircraft identity, total controlled components, critical component count, missing calendar-limit count, and normalized reference count.
- `Leyenda`: definitions and status criteria for TSN, TSO, life limit, remaining hours, calendar limit, CRÍTICO, MONITOREAR, and OK.

The production data model should preserve the workbook's operating intent while moving calculations, validations, auditability, and workflow approvals into the application:

- Multiple helicopters.
- Helicopter registry, model, serial number, current Hobbs or hourmeter.
- Per-helicopter component control.
- Component part number, serial number, position, installation date.
- TSN, TSO, life-limit hours, remaining hours.
- Calendar life limit and remaining calendar time.
- Status calculation: OK, Monitor, Critical, Expired.
- Flight-hour logging by helicopter and campaign.
- Automatic remaining-hour recalculation after each flight log.
- Maintenance alerts by hours and calendar.
- Maintenance forecast.
- Component replacement history.
- Overhaul planning.
- Maintenance reserve planning.

During implementation, the workbook's sheet names, column names, formulas, thresholds, and status rules should be mapped into the database import layer and reconciled against this document. The workbook-specific HP-1804 header should become one helicopter record; the component table rows should become installed component records and component life ledger opening balances.

## Core User Stories

### Executive

- As an executive, I need to know whether the fleet can support the commercial pipeline before approving proposals.
- As an executive, I need maintenance reserve exposure by helicopter, campaign, and forecast horizon.
- As an executive, I need to see which helicopters are limiting revenue because of component life, calendar expiry, or overhaul planning.

### Commercial Manager

- As a commercial manager, I need every opportunity to show whether a helicopter is available and maintenance-safe for the campaign window.
- As a commercial manager, I need warnings before sending a proposal that depends on a helicopter near a life limit.
- As a commercial manager, I need alternate aircraft options when the preferred helicopter is constrained.

### Operations Manager

- As an operations manager, I need a helicopter registry with model, serial number, current Hobbs, current hourmeter, base, status, and operating notes.
- As an operations manager, I need flight hours logged by helicopter, campaign, vessel, port, and date.
- As an operations manager, I need the system to recalculate component remaining life automatically after each approved flight log.

### Maintenance Coordinator

- As a maintenance coordinator, I need component control per helicopter, including part number, serial number, position, installation date, TSN, TSO, life-limit hours, calendar limit, remaining hours, and remaining calendar time.
- As a maintenance coordinator, I need status calculation for each component: OK, Monitor, Critical, or Expired.
- As a maintenance coordinator, I need replacement history and overhaul planning that preserve previous installed components.
- As a maintenance coordinator, I need maintenance alerts by hour limit and calendar limit.

### Analyst

- As an analyst, I need forecasted maintenance constraints to inform opportunity scoring and campaign timing.
- As an analyst, I need maintenance reserve assumptions to support profitability analysis by aircraft and contract.

## Helicopter Registry

Each helicopter must be represented independently. The system must never assume one aircraft, one registration, or one maintenance profile.

Required registry fields:

- Registration.
- Internal fleet code.
- Model.
- Manufacturer.
- Serial number.
- Current Hobbs.
- Current hourmeter.
- Total time since new.
- Base location.
- Current country.
- Operational status.
- Ownership or lease status.
- Insurance/document readiness.
- Notes and limitations.

Operational status should distinguish:

- Active.
- Available with restrictions.
- In campaign.
- Scheduled maintenance.
- Unscheduled maintenance.
- Grounded.
- Retired or archived.

## Component Control

Components are controlled per helicopter. The same part type may exist across many helicopters, but each installed component instance has its own serial number, installation history, life consumption, and status.

Required component fields:

- Helicopter.
- Component category.
- Component name.
- Part number.
- Serial number.
- Position.
- Installation date.
- Installation Hobbs or hourmeter.
- TSN: time since new.
- TSO: time since overhaul.
- Life limit hours.
- Remaining hours.
- Calendar life limit.
- Calendar expiration date.
- Remaining calendar time.
- Status.
- Maintenance notes.

Position should support values such as left, right, forward, aft, main rotor, tail rotor, engine, transmission, airframe, avionics, cabin, and custom positions where the model requires it.

## Status Calculation

Status must be derived from hour and calendar rules, not typed manually as the source of truth.

Workbook-derived thresholds:

- Critical: less than 20% remaining life by hours.
- Monitor: between 20% and 35% remaining life by hours, or one year of calendar life remaining.
- OK: no immediate alert according to the loaded data.

Production status should extend the workbook with an explicit Expired state so hour or calendar overruns are impossible to miss:

- OK: remaining hours and remaining calendar time are above monitor thresholds.
- Monitor: remaining hours are between 20% and 35% remaining, or calendar life is within the configured planning window.
- Critical: remaining hours are below 20%, or calendar life is inside the configured dispatch-risk window.
- Expired: hour limit or calendar expiration has been reached or passed.

Each tenant should be able to configure thresholds by operation and component class. Baseline policy:

- Monitor: 20% to 35% remaining by hours, or one year calendar remaining.
- Critical: less than 20% remaining by hours, or the tenant-defined short calendar warning window.
- Expired: 0 hours or 0 days remaining.

The effective component status is the most severe status produced by hour-life and calendar-life calculations.

## Flight Hour Logging

Flight logs are the operational event that consumes aircraft and component life.

Required flight log fields:

- Helicopter.
- Campaign or contract.
- Vessel when applicable.
- Company or fleet owner when applicable.
- Departure location.
- Arrival location.
- Country and operating region.
- Flight date.
- Start Hobbs or hourmeter.
- End Hobbs or hourmeter.
- Flight hours.
- Pilot.
- Mechanic or technician when relevant.
- Approval status.
- Notes.

Flight-hour calculations should use validated meter deltas where available. Manual hour entry should require justification and approval.

## Automatic Recalculation

When an approved flight log is posted:

1. Add flight hours to the helicopter current Hobbs or hourmeter.
2. Add applicable hours to installed component TSN and TSO.
3. Recalculate remaining hours for each affected component.
4. Recalculate status using hour thresholds.
5. Recalculate calendar status from current date and expiration date.
6. Create alerts for newly Monitor, Critical, or Expired components.
7. Update maintenance forecast.
8. Write immutable audit events for the flight log and recalculation.

If a flight log is corrected, the system must preserve the correction event and recalculate from the authoritative flight-log ledger rather than editing component totals silently.

## Maintenance Alerts

Alerts must support both hour-based and calendar-based triggers.

Alert types:

- Component approaching monitor threshold.
- Component approaching critical threshold.
- Component expired by hours.
- Component expired by calendar.
- Overhaul planning due.
- Replacement part needed.
- Maintenance reserve exposure changed.
- Aircraft availability conflict with campaign.

Alert severity:

- Info.
- Monitor.
- Critical.
- Grounding.

Alerts should be assigned to maintenance or operations users and may be visible to commercial users as feasibility warnings without exposing unnecessary technical detail.

## Maintenance Forecast

Forecasting should project maintenance constraints over a selected horizon:

- 30 days.
- 60 days.
- 90 days.
- 180 days.
- Campaign period.
- Custom date range.

Forecast inputs:

- Current component life.
- Scheduled campaign hours.
- Historical average utilization.
- Planned flight logs.
- Calendar expirations.
- Replacement lead times.
- Overhaul lead times.

Forecast outputs:

- Components expected to reach Monitor, Critical, or Expired.
- Helicopter availability risk.
- Recommended maintenance dates.
- Campaign conflict warnings.
- Reserve cost planning.
- Replacement or overhaul planning needs.

## Executive Summary Model

The workbook includes a summary sheet that should become an executive fleet-maintenance dashboard. Production should compute the summary from normalized records rather than manually maintaining a separate sheet.

Summary metrics:

- Aircraft registration.
- Aircraft model.
- Aircraft serial number.
- Review date.
- Current Hobbs or hourmeter.
- Total controlled components.
- Critical components by hour-life threshold.
- Components missing calendar limits in source data.
- Normalized component references.
- Next limiting component by hours.
- Next limiting component by calendar.
- Fleet readiness status.

## Component Replacement History

Component replacement must preserve full lifecycle history:

- Removed component.
- Installed component.
- Removal date.
- Installation date.
- Removal Hobbs or hourmeter.
- Installation Hobbs or hourmeter.
- Reason for removal.
- Work order or maintenance event.
- Technician or approving user.
- Supporting document links.

Replacement history is critical for auditability, aircraft resale value, operational trust, and future maintenance planning.

## Overhaul Planning

Overhaul planning should track:

- Component due basis: hours, calendar, condition, or inspection.
- Due date or due hours.
- Lead time.
- Vendor or shop.
- Estimated cost.
- Reserve policy.
- Planned downtime.
- Campaign conflicts.
- Replacement alternatives.

The system should show overhaul exposure by helicopter and across the fleet.

## Maintenance Reserve Planning

Maintenance reserve planning connects technical life consumption to commercial profitability.

Required reserve capabilities:

- Reserve rate per flight hour by helicopter or component category.
- Reserve accrual from approved flight logs.
- Reserve exposure by campaign, contract, helicopter, and month.
- Forecasted reserve demand for upcoming campaigns.
- Comparison of expected reserve cost against contract economics.

Commercial reports should show maintenance reserve assumptions without requiring commercial users to manage technical component records.

## Workflow Boundaries

Fleet & Maintenance Operations is not a full maintenance, repair, and overhaul system in Version 0.1. The product should not attempt to replace certified maintenance records, regulatory filings, or mechanic sign-off systems until explicitly designed and validated for that purpose.

The module should provide operational decision support, component-control visibility, commercial feasibility signals, and auditable planning records. Legal maintenance authority remains with approved aviation maintenance personnel and official maintenance records.

## Dashboard Requirements

Key views:

- Fleet overview.
- Helicopter detail.
- Component control table.
- Flight-hour ledger.
- Maintenance alerts.
- Maintenance forecast.
- Replacement history.
- Overhaul plan.
- Maintenance reserve dashboard.
- Campaign feasibility view.

Key metrics:

- Active helicopters.
- Available helicopters.
- Grounded helicopters.
- Components in Monitor, Critical, and Expired status.
- Next limiting component by helicopter.
- Flight hours by campaign.
- Forecasted downtime.
- Maintenance reserve exposure.

## Integration With Commercial Workflow

Opportunities and contracts must consume fleet-maintenance signals:

- Campaign feasibility status.
- Candidate helicopters.
- Required campaign hours.
- Forecasted component constraints.
- Maintenance reserve estimate.
- Aircraft downtime risk.
- Required maintenance review before proposal.

Commercial users should see clear statuses and recommended actions. Maintenance users should see the technical details that produce those statuses.
