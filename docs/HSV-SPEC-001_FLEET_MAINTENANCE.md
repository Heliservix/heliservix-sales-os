# HSV-SPEC-001 — Fleet & Maintenance

## Spec Status

Priority: Highest

Product: HeliServiX OS

Module: Fleet & Maintenance

Audience: Executive, operations, maintenance, commercial, finance, and product engineering teams

Implementation status: HSV OS 0.2 frontend operational MVP. Local CRUD and recalculation workflows use browser `localStorage`; backend, database, authentication, and production persistence are deferred.

## Executive Summary

HSV-SPEC-001 Fleet & Maintenance is the first operational backbone of HeliServiX OS. The module must support multiple helicopters from day one and must not be hardcoded around HP1804. It will track helicopter registry data, component life, flight hours, maintenance alerts, forecasted expirations, component replacements, documents, vessel assignments, and maintenance reserve planning for helicopter operations supporting tuna purse seine vessels across Panama, Ecuador, and other Latin American markets.

The current component-control workbook, `Heliservix_Control_Componentes_FINAL_PRO.xlsx`, is the reference model for the first import and data-mapping workflow. Its `Control Maestro`, `Control Maestro (2)`, `Resumen Ejecutivo`, and `Leyenda` sheets define the current operating language for aircraft metadata, controlled components, remaining life calculations, executive status summaries, and component-control criteria. HeliServiX OS must preserve that operational value while replacing spreadsheet fragility with governed workflows, auditability, user permissions, recalculation logic, and production-grade data integrity.

## Goals

- Support a multi-helicopter fleet including HP1804, HP1782, HP1783, HP1768, HP1769, and future aircraft.
- Maintain a helicopter registry with operational, ownership, vessel-assignment, country, and hourmeter context.
- Track components independently per helicopter.
- Calculate remaining hours, remaining calendar time, remaining percentage, and status.
- Log flight hours by helicopter and vessel/campaign.
- Treat campaign as the primary deployment context for flight logs, maintenance events, inventory usage, purchasing, technical records, and future profitability.
- Recalculate component life after approved flight logs.
- Generate maintenance alerts automatically.
- Forecast maintenance exposure using monthly flight-hour trends.
- Support component replacement and overhaul planning.
- Estimate maintenance reserve requirements by helicopter, campaign, and contract.
- Build a helicopter digital twin for every aircraft from authoritative operational records.
- Maintain a visual maintenance timeline for installations, removals, inspections, overhauls, annuals, SB/AD compliance, and forecasted due events.
- Import data safely from the current workbook through preview and approval.

## Non-Goals

- Do not replace official aviation maintenance records in the first release.
- Do not provide regulatory sign-off or certified airworthiness authorization.
- Do not implement accounting, payroll, or inventory purchasing as full systems.
- Do not treat HSV OS 0.2 localStorage records as authoritative production records.
- Do not add backend, database, authentication, Supabase, or external services in HSV OS 0.2.

## HSV OS 0.2 Frontend MVP Scope

HSV OS 0.2 moves Fleet & Maintenance from a visual demo into an operational frontend MVP. It is still local-only and demo-data governed.

Implemented frontend capabilities:

- Helicopter create, edit, detail, and archive actions.
- Vessel create, edit, detail, archive, and helicopter assignment actions.
- Component create, edit, detail, archive, and helicopter assignment actions.
- Flight-hour logging with automatic flight-hour calculation from Hobbs start and end.
- Local helicopter hourmeter update after saved flight log.
- Local deduction of flight hours from assigned hour-controlled components.
- Remaining-hour, remaining-percentage, and component-status recalculation.
- Local maintenance alert creation when thresholds are reached.
- Maintenance Crew Portal role simulation for Admin View and Maintenance Chief View.
- Maintenance log entry creation.
- Component removal and installation workflow with replacement-history update.
- Vessel Inventory MVP with item creation/editing, bodega assignment, stock movement, low-stock detection, and maintenance-event linkage.
- Purchasing MVP with request creation/editing, status tracking, operational entity links, and attachment placeholders.

Deferred capabilities:

- Server-side persistence.
- Database schema implementation.
- Authentication and real role enforcement.
- Production audit-log storage.
- Document upload storage.
- Supabase or other backend integration.
- Certified maintenance-record replacement.

## HSV OS 0.4 Bilingual UI Alignment

Fleet & Maintenance user-facing screens must use the i18n system defined in `HSV-CORE-003_I18N_BILINGUAL_UI.md`.

Rules:

- English is the default language.
- Spanish is supported.
- Aviation terms such as Registration, Aircraft, Current Hourmeter, Component, Remaining Hours, Calendar Limit, Maintenance Alert, Forecast, Technical Records, Compliance, Vessel, Campaign, Inventory, and Purchasing must follow the governed terminology list.
- User-entered aircraft, vessel, campaign, component, document, and note data must not be translated.
- The user-facing aircraft profile module must be Aircraft Operations Center in English and Centro de Operaciones de la Aeronave in Spanish.

## Campaign-Centric Alignment

Fleet & Maintenance must support the HeliServiX OS campaign-centric operating model. A helicopter is not only an asset record; it is assigned into tuna-vessel campaigns where its readiness affects client delivery, vessel operations, contract performance, maintenance exposure, inventory usage, purchasing urgency, and future profitability.

Campaign context should be captured or inferred for:

- Flight logs.
- Maintenance events.
- Component removals and installations.
- Maintenance alerts that affect deployment readiness.
- Inventory consumption and installed parts.
- Purchases triggered by campaign readiness.
- Technical records created during campaign operations.
- Compliance alerts affecting the aircraft, component, vessel, country, or operation.
- Maintenance reserve and future finance inputs.

## Helicopter Digital Twin

Each helicopter must have a digital twin as defined in `HSV-CORE-002_DIGITAL_TWIN.md`.

The user-facing name for this capability is Aircraft Operations Center / Centro de Operaciones de la Aeronave.

The digital twin includes:

- Current operational status.
- Current hourmeter.
- Installed components.
- Component life remaining.
- Maintenance history.
- Flight history.
- Campaign history.
- Vessel assignment history.
- Technical documents.
- Photos.
- Costs.
- Forecast.
- Compliance exposure.
- Future market value or asset profile.

The digital twin is computed from authoritative ledgers and records. It must not become a separate manually edited source of truth.

## Maintenance Timeline

Each helicopter should have a visual maintenance timeline containing:

- Installations.
- Removals.
- Inspections.
- Overhauls.
- Annuals.
- SB/AD compliance.
- Technical record uploads when relevant.
- Compliance actions.
- Forecasted due events.

Timeline events must link back to their source records: maintenance event, component action, flight log, compliance item, technical record, forecast, or campaign assignment.

## Demo Data Policy

The Fleet & Maintenance MVP may use demo records to validate layout, workflow, routing, and user experience. Demo records must never be presented as operational truth.

Required UI language:

> Demo records are for interface testing only. Real fleet, vessel, and component data must be imported or entered by HeliServiX.

Policy rules:

- All demo records must be visibly marked as demo data in the application shell or page context.
- Neutral labels such as `Demo Vessel A` are acceptable for interface testing.
- Invented vessel names, invented owner companies, invented ports, and invented helicopter-to-vessel assignments are not acceptable unless they are clearly labeled as demo data.
- HP1782, HP1783, HP1768, HP1769, HP1770, and future aircraft must not receive invented real-world assignments, serial numbers, maintenance statuses, or component histories.
- HP1804 workbook-derived component examples may be used only as reference import examples until verified by HeliServiX.
- Demo flight logs must not update aircraft hourmeters, component remaining hours, alerts, forecasts, or reserve calculations.
- Production data must include source, import timestamp or entry timestamp, responsible user, validation status, and audit trail.

## Real Data Onboarding Workflow

Real Fleet & Maintenance data enters the system through governed import or manual entry. The workflow must protect operational confidence before any record is used for assignment, maintenance planning, or commercial commitments.

1. Source identification
   - Identify whether the record comes from the current component-control workbook, official maintenance records, aircraft documents, vessel owner records, campaign records, or direct HeliServiX entry.
   - Record the source type, source owner, received date, and responsible reviewer.

2. Staging
   - Import or enter data into a staging state.
   - Do not expose staged records as operationally available.
   - Flag missing values, conflicting hourmeters, incomplete component fields, calendar-limit gaps, and unverified vessel assignments.

3. Review
   - Maintenance reviews aircraft and component data.
   - Operations reviews vessel, campaign, country, and assignment context.
   - Commercial reviews owner/company linkage when the vessel affects opportunity or contract readiness.

4. Approval
   - Approved records move from staging to active demo-replacement records.
   - Approval must capture approver, timestamp, source evidence, and affected entities.

5. Activation
   - Active records may be used in dashboards, assignment workflows, alerts, forecasts, and reporting.
   - Any later correction must preserve previous values in audit history.

## Aircraft Migration Center Workflow

HSV OS supports a frontend Aircraft Migration Center so HeliServiX users can migrate helicopter component-control data from Excel without manually entering each component row.

Reference workbook:

- `HSV-IMPORT-COMPONENTS-v1.xlsx`.
- Official parser profile: `HSV_IMPORT_COMPONENTS_V1`.
- Official sheet of record: `Control Maestro`.
- Legacy workbook structures such as `Control Maestro`, `Control Maestro (2)`, `Resumen Ejecutivo`, and `Leyenda` remain supported as migration source patterns.
- The wizard must automatically detect worksheets and helicopter registrations.
- Users choose which detected helicopters to import before committing local data.

### Excel Format

The Aircraft Migration Center must accept `.xlsx` files and parse them client-side during the frontend-only MVP. Production backend import may later move parsing server-side for audit, virus scanning, and permanent import logs.

Supported workbook fields:

- Aircraft metadata from Row 4 headers and Row 5 values:
  - Matrícula maps to helicopter registration.
  - Modelo maps to helicopter model.
  - Fecha Fabricación maps to helicopter manufacture date.
  - S/N Aeronave maps to helicopter serial number.
  - Fecha Revisión maps to last review date.
  - Horómetro maps to current hourmeter.
- Component header row: Row 7.
- Component data rows: Row 8 and below.
- Component name / Componente.
- Reference / Ref. #.
- Part Number / P/N.
- Serial Number / S/N.
- Position / Posición.
- Installation date / Fecha instalación.
- TSN.
- TSO.
- Life limit hours / Límite vida horas.
- Remaining hours / Horas remanentes.
- Calendar limit date / Límite calendario.
- Remaining percentage / `% remanente`.
- Status / Estado.
- Notes / Observaciones.

`Observaciones` is optional. Observations must never be treated as required, must not affect import validation, and must not block import.

### Smart Column Mapping

The importer must detect English and Spanish headers even when labels vary slightly. It must not depend on fixed column positions. The mapping engine should normalize case, accents, punctuation, common abbreviations, and workbook-specific header formats such as `TSN (HRS)`, `TSO (HRS)`, `Límite vida (HRS)`, `Remanente (HRS)`, `% remanente horas`, and `Observaciones`.

For the official `HSV_IMPORT_COMPONENTS_V1` parser, aircraft metadata and component columns are intentionally separate:

- Aircraft metadata must be read only from Row 4 headers and Row 5 values.
- Aircraft metadata must not be inferred from component rows, component names, notes, or observations.
- `S/N Aeronave` must map to aircraft serial number, not component serial number.
- Component `S/N` must map only from the component table.
- `Control Maestro` must be preferred over `Control Maestro (2)` unless the user manually selects another sheet.

The mapping engine must use fuzzy matching for similar names and operational abbreviations. Supported examples include:

- `MATRICULA`, `Registration`, `Aircraft`, `Helicopter`, and `REG` mapping to aircraft registration.
- `TSN` and `TSN Hours` mapping to TSN hours.
- `TSO` and `TSO Hours` mapping to TSO hours.
- `Hours Remaining`, `Remaining Hours`, and `Life Remaining` mapping to remaining hours.
- `Calendar`, `Expiration`, `Expiry`, and `Límite Calendario` mapping to calendar limit date.
- `Status` and `Estado` mapping to component status.

The wizard must display a confidence score for each mapped field before import. Low-confidence mappings must remain visible to the user and must be correctable through a manual column selector. Manual corrections rebuild the detected helicopter preview, component preview, validation findings, duplicate analysis, and import summary before records can be saved.

The wizard must include manual metadata correction for registration, model, aircraft serial number, manufacture date, review date, and current hourmeter before final import.

### Wizard Steps

The migration workflow is:

1. Select Excel.
2. Detect helicopters.
3. Preview components.
4. Validate.
5. Import.

Before saving, users must review the wizard output showing:

- Worksheets detected.
- Helicopters detected.
- Component count by selected helicopter.
- Warnings.
- Errors.
- Duplicates.
- Missing data.
- Missing required fields.
- Duplicate components.
- Invalid dates.
- Invalid hour values.
- Status inconsistencies between workbook status and recalculated HeliServiX OS status.
- Mapped workbook columns.
- Mapping confidence scores.
- Manual mapping corrections, when needed.
- Aircraft metadata panel with registration, model, aircraft serial number, manufacture date, review date, and current hourmeter.
- Row-level result status: Valid, Warning, or Error.
- Clean issues table with row number, field, issue type, current value, and suggested fix.
- A sample component row preview.

The wizard must make clear that imported Excel records are real user data and must not be marked as demo data.

### Validation

Blocking validation:

- Helicopter registration is required.
- Aircraft hourmeter is required and must parse to a valid number.
- Component name is required.
- At least one of Part Number or Serial Number is required for component import.
- At least one component limit is required: life limit hours, remaining hours, or calendar limit.
- Dates must parse into valid ISO dates.
- Hour values must not be negative.

Warning validation:

- Position is missing.
- Installation date is missing.
- TSN, TSO, status, or remaining percentage are missing or inconsistent.
- Duplicate match exists in the workbook or current local data.
- Workbook status differs from recalculated status.

Warnings do not block import, but they must be visible before save. Row errors block affected rows. The wizard may allow “Force import valid rows only” when aircraft metadata is valid; invalid rows remain skipped.

### Duplicate Handling

Component matching uses:

- Helicopter registration.
- Component name.
- Part Number.
- Serial Number.
- Position.

Migration options:

- Create helicopter.
- Update helicopter.
- Replace components.
- Merge components.
- Skip duplicates.
- Replace mode archives current component records for selected helicopters before importing workbook rows.
- Merge mode updates matching components and adds clean new rows.
- Skip duplicates mode imports only clean new rows and leaves matching components unchanged.

### Safety Rules

- Imported Excel records are real user data.
- Imported records must use source `User`, not `Demo`.
- Demo records must remain visibly separated from imported records.
- Migration must save to `localStorage` only until backend persistence is implemented.
- Production migration must later capture user, timestamp, source workbook, workbook hash, selected helicopters, validation summary, approved options, and affected records.
- Migration must recalculate remaining percentage and component status after parsing rather than blindly trusting workbook status.
- Migration must generate maintenance alerts for Monitor, Critical, and Expired components.
- Migration must never invent vessel assignments, owner data, aircraft serial numbers, or component history that is not present in the workbook or entered by HeliServiX.

## Vessel Management Workflow

Vessel records are first-class Fleet & Maintenance entities because helicopter availability depends on vessel assignments, campaign geography, owner context, and operating commitments.

Required vessel fields:

- Vessel name.
- Owner company.
- Country.
- Home port.
- Capacity tons.
- Current campaign.
- Assigned helicopter.
- Status.
- Notes.

Workflow:

1. Create vessel
   - User enters vessel identity, owner company, country, home port, capacity, campaign, status, and notes.
   - System marks new records as draft or pending verification until reviewed.

2. Validate vessel
   - Operations validates vessel name, owner, country, and home port.
   - Commercial validates owner-company relationship and campaign relevance.
   - Capacity tons should be numeric and sourced from a reliable vessel or owner record.

3. Maintain vessel
   - Users can edit campaign, status, notes, and assignment readiness.
   - Identity changes such as vessel name or owner require audit history.

4. Archive vessel
   - Inactive or obsolete vessels remain searchable for historical campaigns but cannot receive active helicopter assignments.

## Helicopter-To-Vessel Assignment Workflow

Assignments must be deliberate because they affect fleet readiness, maintenance exposure, and commercial commitments.

Assignment pre-checks:

- Helicopter record is active and verified.
- Current hourmeter has been reviewed.
- No grounding alerts exist.
- Critical alerts have a documented operational decision.
- Required documents are present.
- Vessel record is verified.
- Campaign dates, country, and operating area are known.
- Contract or opportunity linkage is recorded when applicable.

Workflow:

1. Select vessel and campaign.
2. Select candidate helicopter.
3. Review helicopter status, current hourmeter, open alerts, next limiting component, forecast exposure, and reserve requirement.
4. Review vessel owner, country, home port, capacity, campaign, and contract context.
5. Confirm assignment start date and expected utilization.
6. Save assignment as planned, active, completed, or cancelled.
7. Record all assignment changes in audit history.

Rules:

- A grounded helicopter cannot be assigned to an active vessel campaign.
- A helicopter with expired components cannot be assigned until the maintenance condition is resolved.
- Demo records cannot be used for operational assignment decisions.
- HP1782, HP1783, HP1768, HP1769, and HP1770 assignments must remain blank or demo-labeled until real HeliServiX data is provided.

## Reference Workbook Model

Reference workbook: `Heliservix_Control_Componentes_FINAL_PRO.xlsx`

Observed sheets:

- `Control Maestro`: primary component-control sheet with aircraft metadata and detailed component rows.
- `Control Maestro (2)`: alternate component-control sheet with similar fields and formulas.
- `Resumen Ejecutivo`: aircraft summary, total controlled components, critical count, missing calendar-limit count, and normalized reference count.
- `Leyenda`: definitions for TSN, TSO, life limits, remaining hours, calendar limits, and status criteria.

Important workbook concepts to preserve:

- Aircraft metadata lives above the component table.
- HP-1804 is represented as aircraft metadata, not as an application assumption.
- Component rows include reference number, component, part number, serial number, position, installation date, TSN, TSO, life-limit hours, remaining hours, calendar limit, calendar remaining value, percentage remaining by hours, status, and observations.
- Workbook formulas calculate remaining hours as life limit minus TSO.
- Workbook formulas calculate remaining percentage from remaining hours divided by life-limit hours.
- Workbook summary counts total controlled components and critical components.
- Workbook legend defines CRÍTICO, MONITOREAR, and OK criteria.

Production extension:

- HeliServiX OS must add an explicit `Expired` state for components with zero remaining hours, zero remaining calendar days, or past calendar limits.
- HeliServiX OS must support multiple helicopters, multiple vessels, campaigns, contracts, and operations.
- HeliServiX OS must store workbook-imported values as opening balances and use approved operational events for future changes.

## Core Personas

### Executive

Needs a trusted view of fleet readiness, maintenance exposure, revenue risk, and aircraft availability before approving contracts.

### Operations Manager

Needs to assign helicopters to vessels and campaigns while understanding current hourmeter, availability, component constraints, and upcoming maintenance windows.

### Maintenance Coordinator

Needs accurate component control, alerts, calendar limits, replacement history, overhaul planning, and document references.

### Commercial Manager

Needs clear feasibility status before sending proposals or committing to campaign dates.

### Finance or Administration

Needs maintenance reserve estimates and exposure by helicopter, campaign, contract, and forecast horizon.

## User Stories

### Helicopter Registry

- As an operations manager, I can create and manage multiple helicopter records.
- As an operations manager, I can see each helicopter's registration, model, serial number, manufacturing year or date, current hourmeter, status, owner company, assigned vessel, country or operation area, and notes.
- As an executive, I can see which helicopters are active, assigned, available, in maintenance, grounded, or retired.
- As a commercial manager, I can see whether a helicopter is currently assigned to a vessel or campaign before proposing it for another opportunity.

### Component Control

- As a maintenance coordinator, I can view all components installed on a specific helicopter.
- As a maintenance coordinator, I can track part number, serial number, position, installation date, TSN, TSO, life limit, remaining hours, calendar limit date, remaining calendar days, remaining percentage, status, notes, and documents.
- As a maintenance coordinator, I can identify missing component data and flag incomplete records.
- As an executive, I can see component risks without reading technical spreadsheets.

### Flight Hour Logging

- As an operations user, I can log a flight by helicopter and campaign.
- As an operations user, I can enter flight date, pilot, mechanic, Hobbs start, Hobbs end, and notes.
- As the system, I calculate flight hours from Hobbs end minus Hobbs start.
- As the system, I reject negative or impossible hour values.
- As the system, I update the helicopter hourmeter after a flight log is approved.
- As the system, I deduct flight hours from hour-controlled components and recalculate status.

### Maintenance Alerts

- As a maintenance coordinator, I receive alerts when components approach hour limits or calendar limits.
- As a maintenance coordinator, I receive alerts for expired components and missing component data.
- As an operations manager, I receive warnings when a component issue affects campaign readiness.
- As a commercial manager, I see a simplified feasibility warning when maintenance risk affects an opportunity.

### Maintenance Forecast

- As an operations manager, I can forecast upcoming component due dates based on monthly utilization.
- As an executive, I can see engine overhaul exposure and maintenance reserve requirements.
- As a maintenance coordinator, I can see recommended procurement timing before components become critical.

### Vessel Link

- As a commercial manager, I can link a helicopter to a tuna vessel, vessel owner, capacity, campaign, country, and contract.
- As an operations manager, I can see which aircraft are committed to which vessel campaigns.
- As an executive, I can understand exposure by country, fleet owner, vessel, and contract.

## Functional Requirements

## 1. Helicopter Registry

The system must support helicopter records independent of any one aircraft.

Required fields:

- Registration.
- Model.
- Serial number.
- Year or manufacture date.
- Current hourmeter.
- Status.
- Owner company.
- Assigned vessel.
- Country or operation area.
- Notes.

Recommended additional fields:

- Internal fleet code.
- Manufacturer.
- Base location.
- Current Hobbs source.
- Last hourmeter verification date.
- Insurance status.
- Document readiness status.
- Availability status.
- Retired or archived date.

Supported initial fleet:

- HP1804.
- HP1782.
- HP1783.
- HP1768.
- HP1769.
- Future helicopters.

Helicopter status options:

- Active.
- Available.
- Assigned.
- In campaign.
- Maintenance scheduled.
- Maintenance unscheduled.
- Monitor.
- Grounded.
- Retired.

Rules:

- Registration must be unique per tenant.
- Current hourmeter cannot decrease except through a formal correction workflow.
- Assigned vessel is optional, but if present it must link to a vessel record.
- A grounded helicopter cannot be assigned to a new active campaign.

## 2. Component Control

Each helicopter has many components.

Required fields:

- Helicopter registration.
- Component category.
- Component name.
- Part number.
- Serial number.
- Position.
- Installation date.
- TSN hours.
- TSO hours.
- Life limit hours.
- Remaining hours.
- Calendar limit date.
- Remaining calendar days.
- Remaining percentage.
- Status.
- Notes.
- Documents attached.

Component category examples:

- Airframe.
- Engine.
- Main rotor.
- Tail rotor.
- Transmission.
- MRGB.
- Gearbox.
- Servo.
- Hydraulic.
- Avionics.
- Landing gear.
- Electrical.
- Calendar-controlled.
- Other.

Position examples:

- N/A.
- Left.
- Right.
- Forward.
- Aft.
- Upper.
- Lower.
- Main rotor.
- Tail rotor.
- Engine.
- Transmission.
- Custom.

Rules:

- A component belongs to one active helicopter installation at a time.
- A component may have historical installations across helicopters if removed and reinstalled.
- Part number and serial number should be required when known.
- Missing part number, serial number, life limit, calendar limit, TSN, or TSO must be flagged.
- Remaining hours should be calculated by the system when life limit and TSO are present.
- Remaining calendar days should be calculated by the system when calendar limit date is present.
- Remaining percentage should be calculated by the system when life limit and remaining hours are present.
- Status should be computed, not manually maintained as the source of truth.

## 3. Status Rules

The system must calculate component status automatically using:

- Remaining hours.
- Remaining calendar time.
- Remaining percentage.

Required status values:

- OK.
- Monitor.
- Critical.
- Expired.

Suggested thresholds:

- OK: more than 25% remaining and not inside calendar warning range.
- Monitor: 10% to 25% remaining, or inside configured calendar warning range.
- Critical: less than 10% remaining, or inside configured calendar critical range.
- Expired: 0 hours remaining, 0 days remaining, negative remaining value, or past calendar limit.

Status precedence:

1. Expired.
2. Critical.
3. Monitor.
4. OK.

Calendar rules:

- If calendar limit date is in the past, status is Expired.
- If calendar limit date is today, status is Expired.
- If remaining calendar days are within the critical calendar threshold, status is Critical unless already Expired.
- If remaining calendar days are within the monitor calendar threshold, status is Monitor unless already Critical or Expired.

Default calendar thresholds:

- Monitor: 90 days or less remaining.
- Critical: 30 days or less remaining.
- Expired: 0 days or past due.

Workbook compatibility:

- The workbook's `Leyenda` uses CRÍTICO, MONITOREAR, and OK.
- Imported statuses should be stored as source status for audit.
- Production status should be recalculated into OK, Monitor, Critical, or Expired.
- Differences between workbook source status and system-calculated status should be shown in the import preview.

## 4. Flight Hour Logging

Workflow:

1. Select helicopter.
2. Select vessel or campaign.
3. Enter flight date.
4. Enter pilot.
5. Enter mechanic.
6. Enter Hobbs start.
7. Enter Hobbs end.
8. Calculate flight hours.
9. Add notes.
10. Save as draft or submit for approval.
11. Approve flight log.
12. Post recalculation.

Required flight log fields:

- Helicopter.
- Vessel or campaign.
- Flight date.
- Pilot.
- Mechanic.
- Hobbs start.
- Hobbs end.
- Flight hours.
- Notes.
- Created by.
- Approval status.
- Approved by.
- Approved at.

Validation rules:

- Hobbs end must be greater than Hobbs start.
- Flight hours must equal Hobbs end minus Hobbs start unless manually overridden.
- Manual override requires reason and approval.
- Flight date cannot be in the future unless marked as planned.
- Approved flight logs are immutable except through correction/reversal.

After saving an approved flight log:

- Update helicopter hourmeter.
- Deduct hours from all hour-controlled components.
- Recalculate remaining hours.
- Recalculate remaining percentage.
- Recalculate status.
- Generate alerts if needed.
- Update maintenance forecast.
- Update maintenance reserve accrual.
- Record audit event.

Correction workflow:

- Original flight log remains stored.
- Correction record links to the original.
- Recalculation runs from authoritative ledger.
- User must provide correction reason.

## 5. Maintenance Alerts

The system must generate alerts for:

- Components close to hourly limit.
- Components close to calendar limit.
- Expired components.
- Missing component data.
- Upcoming overhaul planning.

Alert fields:

- Alert type.
- Severity.
- Helicopter.
- Component.
- Vessel or campaign if relevant.
- Trigger basis.
- Due hours.
- Due date.
- Remaining hours.
- Remaining calendar days.
- Assigned user.
- Status.
- Acknowledged by.
- Resolved by.
- Notes.

Alert types:

- Hour limit monitor.
- Hour limit critical.
- Hour limit expired.
- Calendar monitor.
- Calendar critical.
- Calendar expired.
- Missing data.
- Overhaul planning.
- Procurement timing.
- Campaign conflict.
- Reserve exposure.

Alert statuses:

- Open.
- Acknowledged.
- In progress.
- Deferred.
- Resolved.
- Dismissed.

Rules:

- Expired component alerts must not be dismissible without a maintenance override or replacement event.
- Critical alerts must be visible on helicopter detail and fleet dashboard.
- Missing data alerts must block full readiness confidence.
- Commercial users should see feasibility language, not all technical fields.

## 6. Forecast

The system must forecast:

- Component due dates based on monthly flight-hour trend.
- Engine overhaul exposure.
- Servo/component expiry.
- Maintenance reserve required.
- Recommended procurement timing.

Forecast inputs:

- Current hourmeter.
- Component remaining hours.
- Component calendar limit date.
- Historical monthly flight hours.
- Planned campaign flight hours.
- Assigned vessel schedule.
- Contract duration.
- Replacement lead times.
- Overhaul lead times.
- Maintenance reserve rates.

Forecast outputs:

- Estimated due date by component.
- Estimated due hours by component.
- Projected status by horizon.
- Engine overhaul exposure.
- Servo/component expiry exposure.
- Aircraft downtime windows.
- Maintenance reserve required.
- Procurement recommendation date.
- Campaign conflict warning.

Forecast horizons:

- 30 days.
- 60 days.
- 90 days.
- 180 days.
- 12 months.
- Campaign duration.
- Custom range.

Trend calculation:

- Default monthly trend should use average approved flight hours over the last 3 months.
- If less than 3 months of data exists, use available approved logs and show low-confidence forecast.
- Planned campaign hours should override historical trend for the campaign period when entered.
- Forecast confidence should be visible.

## 7. Multi-Fleet Use

The module must support:

- HP1804.
- HP1782.
- HP1783.
- HP1768.
- HP1769.
- Future helicopters.

Rules:

- Every table must be tenant-scoped.
- Every component must belong to a helicopter.
- Every flight log must belong to a helicopter.
- Every forecast must be generated per helicopter and optionally consolidated across the fleet.
- Each helicopter may have different component sets, thresholds, utilization patterns, and vessel assignments.
- UI filters must support registration, model, status, country, vessel, and campaign.

## 8. Vessel Link

Helicopters may be assigned to tuna vessels.

Required vessel-link fields:

- Vessel name.
- Owner.
- Capacity tons.
- Campaign.
- Country.
- Contract.

Recommended additional fields:

- Vessel flag.
- Port.
- Campaign start date.
- Campaign end date.
- Expected monthly flight hours.
- Operating region.
- Commercial opportunity.

Rules:

- A helicopter can have one active vessel assignment at a time unless the operation explicitly allows shared assignment.
- A vessel can have multiple helicopter assignments over time.
- Campaign assignments must be date-bound.
- Contract linkage is optional during planning and required after contract execution.
- Vessel assignment should influence forecast and maintenance reserve planning.

## UI Screens Needed

## 1. Fleet Dashboard

Purpose: executive and operations overview of fleet readiness.

Content:

- Total helicopters.
- Available helicopters.
- Assigned helicopters.
- Grounded helicopters.
- Components in Monitor, Critical, and Expired status.
- Next component due per helicopter.
- Maintenance reserve exposure.
- Upcoming procurement windows.
- Forecasted downtime.

Primary actions:

- Open helicopter detail.
- Review maintenance alerts.
- Open forecast.
- Start import from Excel.

## 2. Helicopters List

Purpose: searchable fleet registry.

Columns:

- Registration.
- Model.
- Serial number.
- Current hourmeter.
- Status.
- Owner company.
- Assigned vessel.
- Country/operation area.
- Open alerts.
- Next due component.

Filters:

- Status.
- Model.
- Country.
- Assigned vessel.
- Alert severity.

## 3. Helicopter Detail

Purpose: single-aircraft operational record.

Sections:

- Aircraft identity.
- Current hourmeter.
- Assignment.
- Readiness status.
- Component summary.
- Flight-hour trend.
- Alerts.
- Forecast.
- Documents.
- Replacement history.

Primary actions:

- Edit registry data.
- Add flight log.
- Add component.
- Import component table.
- View documents.
- Generate forecast.

## 4. Components Table

Purpose: component-control grid for one helicopter or all helicopters.

Columns:

- Helicopter registration.
- Category.
- Component name.
- Part number.
- Serial number.
- Position.
- Installation date.
- TSN.
- TSO.
- Life limit hours.
- Remaining hours.
- Calendar limit date.
- Remaining calendar days.
- Remaining percentage.
- Status.
- Documents.
- Notes.

Interactions:

- Sort by remaining hours.
- Sort by calendar date.
- Filter by status.
- Filter by category.
- Open component detail.
- Export controlled list.

## 5. Component Detail

Purpose: complete component lifecycle view.

Sections:

- Component identity.
- Installation details.
- Current life values.
- Calendar values.
- Status calculation explanation.
- Documents.
- Alerts.
- Replacement history.
- Overhaul plan.
- Audit history.

## 6. Flight Log

Purpose: record helicopter flight hours by campaign.

Fields:

- Helicopter.
- Vessel/campaign.
- Flight date.
- Pilot.
- Mechanic.
- Hobbs start.
- Hobbs end.
- Calculated flight hours.
- Notes.

Actions:

- Save draft.
- Submit for approval.
- Approve.
- Reject.
- Correct approved log.

## 7. Maintenance Alerts

Purpose: manage active maintenance warnings.

Columns:

- Severity.
- Alert type.
- Helicopter.
- Component.
- Remaining hours.
- Remaining calendar days.
- Due date.
- Assigned user.
- Status.

Actions:

- Acknowledge.
- Assign.
- Resolve.
- Link replacement.
- Link procurement.
- Open forecast.

## 8. Maintenance Forecast

Purpose: forecast component expiry, overhaul exposure, and reserve needs.

Inputs:

- Helicopter.
- Forecast horizon.
- Monthly flight-hour trend.
- Planned campaign hours.
- Reserve rate.

Outputs:

- Components due.
- Estimated due dates.
- Overhaul exposure.
- Procurement timing.
- Reserve required.
- Campaign conflicts.

## 9. Component Replacement History

Purpose: preserve installed and removed component history.

Columns:

- Helicopter.
- Removed component.
- Installed component.
- Removal date.
- Installation date.
- Removal Hobbs.
- Installation Hobbs.
- Reason.
- Documents.
- Approved by.

## 10. Documents

Purpose: maintain component, aircraft, maintenance, and campaign documents.

Document types:

- Component certificate.
- Maintenance record.
- Overhaul record.
- Installation record.
- Removal record.
- Procurement quote.
- Vendor invoice.
- Aircraft document.
- Campaign document.

## Database Design

All tables must include tenant scoping, audit fields, and soft-delete or archive support where appropriate.

Common fields:

- `id`.
- `tenant_id`.
- `created_at`.
- `updated_at`.
- `created_by`.
- `updated_by`.
- `archived_at`.

## `helicopters`

Purpose: helicopter registry.

Fields:

- `id`.
- `tenant_id`.
- `registration`.
- `model`.
- `serial_number`.
- `manufacture_year`.
- `manufacture_date`.
- `current_hourmeter`.
- `status`.
- `owner_company_id`.
- `assigned_vessel_id`.
- `country_operation_area`.
- `base_location`.
- `notes`.

Indexes:

- Unique `tenant_id, registration`.
- Index `tenant_id, status`.
- Index `tenant_id, assigned_vessel_id`.

## `helicopter_digital_twins`

Purpose: computed helicopter operational snapshot for dashboard and detail views.

Fields:

- `id`.
- `tenant_id`.
- `helicopter_id`.
- `snapshot_at`.
- `operational_status`.
- `current_hourmeter`.
- `current_campaign_id`.
- `current_vessel_id`.
- `next_limiting_component_id`.
- `open_alert_count`.
- `critical_alert_count`.
- `expired_component_count`.
- `compliance_alert_count`.
- `document_readiness_status`.
- `forecast_status`.
- `maintenance_reserve_exposure`.
- `currency`.
- `data_quality_status`.
- `snapshot_source`.

Rules:

- Snapshot values are computed from source ledgers and records.
- Snapshot generation must be repeatable.
- Snapshot values must not override helicopter, component, flight, maintenance, document, or compliance source records.

## `maintenance_timeline_events`

Purpose: timeline events for helicopter digital twin history and forecast.

Fields:

- `id`.
- `tenant_id`.
- `helicopter_id`.
- `event_type`.
- `event_date`.
- `meter_reading`.
- `component_id`.
- `campaign_id`.
- `vessel_id`.
- `maintenance_event_id`.
- `compliance_item_id`.
- `technical_record_id`.
- `title`.
- `description`.
- `severity`.
- `source_entity_type`.
- `source_entity_id`.
- `forecasted`.

Timeline event types:

- Installation.
- Removal.
- Inspection.
- Overhaul.
- Annual.
- SB compliance.
- AD compliance.
- Manual revision.
- Forecasted due event.
- Campaign assignment.
- Vessel assignment.
- Technical record.

## `component_categories`

Purpose: normalized component category list.

Fields:

- `id`.
- `tenant_id`.
- `name`.
- `description`.
- `default_life_limit_hours`.
- `default_calendar_limit_days`.
- `requires_serial_number`.
- `is_active`.

Indexes:

- Unique `tenant_id, name`.

## `helicopter_components`

Purpose: installed component records.

Fields:

- `id`.
- `tenant_id`.
- `helicopter_id`.
- `category_id`.
- `component_name`.
- `part_number`.
- `serial_number`.
- `position`.
- `installation_date`.
- `installation_hourmeter`.
- `tsn_hours`.
- `tso_hours`.
- `life_limit_hours`.
- `remaining_hours`.
- `calendar_limit_date`.
- `remaining_calendar_days`.
- `remaining_percentage`.
- `status`.
- `source_status`.
- `notes`.
- `documents_attached_count`.

Indexes:

- Index `tenant_id, helicopter_id`.
- Index `tenant_id, status`.
- Index `tenant_id, calendar_limit_date`.
- Index `tenant_id, part_number, serial_number`.

## `vessels`

Purpose: tuna vessel records used for helicopter assignment and campaign planning.

Fields:

- `id`.
- `tenant_id`.
- `vessel_name`.
- `owner_company_id`.
- `capacity_tons`.
- `country`.
- `flag`.
- `home_port`.
- `notes`.

Indexes:

- Index `tenant_id, vessel_name`.
- Index `tenant_id, owner_company_id`.

## `campaigns`

Purpose: central operational campaign records linking client, fleet owner, vessel, contract, helicopter deployment, maintenance, inventory, purchasing, technical records, compliance, and future finance inputs. Full campaign specification is defined in `HSV-SPEC-005_CAMPAIGNS.md`.

Fields:

- `id`.
- `tenant_id`.
- `campaign_code`.
- `name`.
- `client_company_id`.
- `fleet_owner_id`.
- `vessel_id`.
- `contract_id`.
- `opportunity_id`.
- `country`.
- `operating_area`.
- `home_port`.
- `campaign_type`.
- `planned_start_date`.
- `planned_end_date`.
- `actual_start_date`.
- `actual_end_date`.
- `expected_monthly_hours`.
- `status`.
- `commercial_owner_user_id`.
- `operations_owner_user_id`.
- `notes`.

Indexes:

- Index `tenant_id, vessel_id`.
- Index `tenant_id, contract_id`.
- Index `tenant_id, status`.

## `campaign_assignments`

Purpose: time-bound aircraft, crew, vessel, and contract assignments for campaigns.

Fields:

- `id`.
- `tenant_id`.
- `campaign_id`.
- `helicopter_id`.
- `vessel_id`.
- `pilot_user_id`.
- `mechanic_user_id`.
- `contract_id`.
- `assignment_start`.
- `assignment_end`.
- `assignment_type`.
- `status`.
- `approved_by`.
- `approved_at`.
- `reason`.
- `notes`.

Indexes:

- Index `tenant_id, campaign_id`.
- Index `tenant_id, helicopter_id, assignment_start`.
- Index `tenant_id, vessel_id, assignment_start`.

## `vessel_assignment_history`

Purpose: immutable or append-only assignment history for helicopter-to-vessel deployment context.

Fields:

- `id`.
- `tenant_id`.
- `helicopter_id`.
- `vessel_id`.
- `campaign_id`.
- `contract_id`.
- `assignment_start`.
- `assignment_end`.
- `status`.
- `country`.
- `operating_area`.
- `changed_by`.
- `change_reason`.
- `notes`.

Indexes:

- Index `tenant_id, helicopter_id, assignment_start`.
- Index `tenant_id, vessel_id, assignment_start`.
- Index `tenant_id, campaign_id`.

## `flight_logs`

Purpose: approved and draft flight-hour events.

Fields:

- `id`.
- `tenant_id`.
- `helicopter_id`.
- `vessel_id`.
- `campaign_id`.
- `flight_date`.
- `pilot_name`.
- `mechanic_name`.
- `hobbs_start`.
- `hobbs_end`.
- `flight_hours`.
- `approval_status`.
- `approved_by`.
- `approved_at`.
- `notes`.

Indexes:

- Index `tenant_id, helicopter_id, flight_date`.
- Index `tenant_id, campaign_id`.
- Index `tenant_id, approval_status`.

## `maintenance_alerts`

Purpose: hour, calendar, missing-data, and forecast alerts.

Fields:

- `id`.
- `tenant_id`.
- `helicopter_id`.
- `component_id`.
- `campaign_id`.
- `alert_type`.
- `severity`.
- `trigger_basis`.
- `remaining_hours`.
- `remaining_calendar_days`.
- `due_date`.
- `status`.
- `assigned_to`.
- `acknowledged_at`.
- `resolved_at`.
- `notes`.

Indexes:

- Index `tenant_id, helicopter_id`.
- Index `tenant_id, component_id`.
- Index `tenant_id, severity, status`.

## `component_replacements`

Purpose: component removal and installation history.

Fields:

- `id`.
- `tenant_id`.
- `helicopter_id`.
- `removed_component_id`.
- `installed_component_id`.
- `removal_date`.
- `installation_date`.
- `removal_hourmeter`.
- `installation_hourmeter`.
- `reason`.
- `approved_by`.
- `approved_at`.
- `notes`.

Indexes:

- Index `tenant_id, helicopter_id`.
- Index `tenant_id, removed_component_id`.
- Index `tenant_id, installed_component_id`.

## `maintenance_documents`

Purpose: documents attached to helicopters, components, alerts, replacements, and forecasts.

Fields:

- `id`.
- `tenant_id`.
- `document_type`.
- `title`.
- `storage_key`.
- `helicopter_id`.
- `component_id`.
- `replacement_id`.
- `alert_id`.
- `uploaded_by`.
- `uploaded_at`.
- `expires_at`.
- `notes`.

Indexes:

- Index `tenant_id, helicopter_id`.
- Index `tenant_id, component_id`.
- Index `tenant_id, document_type`.

## `maintenance_forecasts`

Purpose: forecast snapshots.

Fields:

- `id`.
- `tenant_id`.
- `helicopter_id`.
- `campaign_id`.
- `forecast_date`.
- `horizon_start`.
- `horizon_end`.
- `monthly_hour_trend`.
- `planned_campaign_hours`.
- `components_due_count`.
- `critical_components_count`.
- `expired_components_count`.
- `engine_overhaul_exposure`.
- `servo_expiry_exposure`.
- `maintenance_reserve_required`.
- `recommended_procurement_date`.
- `confidence_level`.
- `notes`.

Indexes:

- Index `tenant_id, helicopter_id, forecast_date`.
- Index `tenant_id, campaign_id`.

## Import from Excel

The import process must support the current workbook while being flexible enough for future aircraft workbooks.

## Import Sources

Workbook sheets:

- `Control Maestro`.
- `Control Maestro (2)`.
- `Resumen Ejecutivo`.
- `Leyenda`.

## Import Workflow

1. User uploads or selects workbook.
2. System identifies workbook sheets.
3. System prefers `Control Maestro` and allows manual worksheet selection.
4. System reads helicopter metadata from Row 4 headers and Row 5 values.
5. System reads component headers from Row 7 and component rows from Row 8 and below.
6. System validates missing data.
7. System calculates system status from imported values.
8. System flags incomplete records.
9. System presents import preview.
10. User approves import.
11. System commits helicopter, component, document, and alert records.
12. System stores import audit log.

## Workbook Column Mapping

Helicopter metadata:

- `Matrícula` maps to `helicopters.registration`.
- `Modelo` maps to `helicopters.model`.
- `Fecha Fabricación` maps to `helicopters.manufacture_year` or `manufacture_date`.
- `S/N Aeronave` maps to `helicopters.serial_number`.
- `Fecha Revisión` maps to import review metadata.
- `Horómetro` maps to `helicopters.current_hourmeter`.

Component table:

- `Ref. #` maps to component source reference.
- `Componente` maps to `helicopter_components.component_name`.
- `P/N` maps to `helicopter_components.part_number`.
- `S/N` maps to `helicopter_components.serial_number`.
- `Posición` maps to `helicopter_components.position`.
- `Fecha instalación` maps to `helicopter_components.installation_date`.
- `TSN (HRS)` maps to `helicopter_components.tsn_hours`.
- `TSO (HRS)` maps to `helicopter_components.tso_hours`.
- `Límite vida (HRS)` maps to `helicopter_components.life_limit_hours`.
- `Remanente (HRS)` maps to `helicopter_components.remaining_hours`.
- `Límite calendario (AÑOS)` and calendar date fields map to `calendar_limit_date` or calculated calendar fields.
- `Remanente calendario (AÑOS)` maps to source calendar remaining value.
- `% remanente horas` maps to `remaining_percentage`.
- `Estado` maps to imported/source status for reference only; HeliServiX OS recalculates operational status.
- `Observaciones` maps to notes when present, but it is optional and never affects validation.

## Import Validation

Validation checks:

- Missing or invalid aircraft registration from metadata.
- Missing or invalid aircraft hourmeter from metadata.
- Missing aircraft model or serial number as warnings.
- Duplicate helicopter registration or duplicate component match.
- Missing component name.
- Missing both part number and serial number.
- Missing all component limit fields: life limit hours, remaining hours, and calendar limit.
- Missing position, installation date, TSN, TSO, status, or remaining percentage as warnings.
- Remaining hours mismatch.
- Remaining percentage mismatch.
- Status mismatch between workbook and system rules.
- Invalid date format.
- Non-numeric hour fields.
- Observations/notes must not be validated as required.

Import preview must show:

- Records to create.
- Records to update.
- Records with warnings.
- Records blocked from import.
- Workbook status.
- System calculated status.
- Difference explanations.

Commit rules:

- User must approve before commit.
- Import writes audit events.
- Import creates opening balances, not flight logs.
- Existing components are not overwritten without explicit matching and confirmation.

## Recalculation Logic

Remaining hours:

```text
remaining_hours = life_limit_hours - tso_hours
```

Remaining percentage:

```text
remaining_percentage = remaining_hours / life_limit_hours * 100
```

Flight hours:

```text
flight_hours = hobbs_end - hobbs_start
```

After approved flight log:

```text
new_helicopter_hourmeter = previous_hourmeter + flight_hours
new_component_tso = previous_component_tso + flight_hours
new_remaining_hours = life_limit_hours - new_component_tso
new_remaining_percentage = new_remaining_hours / life_limit_hours * 100
```

Calendar remaining:

```text
remaining_calendar_days = calendar_limit_date - current_date
```

Status:

```text
if remaining_hours <= 0 or remaining_calendar_days <= 0:
  status = Expired
else if remaining_percentage < 10 or remaining_calendar_days <= critical_calendar_days:
  status = Critical
else if remaining_percentage <= 25 or remaining_calendar_days <= monitor_calendar_days:
  status = Monitor
else:
  status = OK
```

## Build Readiness

## MVP Scope

MVP must deliver:

- Helicopter registry for HP1804, HP1782, HP1783, HP1768, HP1769, and future records.
- Component table per helicopter.
- Import from `Control Maestro`.
- Status calculation using OK, Monitor, Critical, and Expired.
- Manual flight log entry.
- Automatic recalculation after approved flight log.
- Maintenance alerts for component status.
- Basic helicopter detail and components table screens.
- Basic import preview and commit.

## v0.1 Scope

v0.1 should include:

- Fleet dashboard.
- Helicopters list.
- Helicopter detail.
- Vessel list.
- Vessel detail.
- Vessel create and edit screens.
- Components table.
- Component detail.
- Helicopter, component, and flight-log create/edit UI actions.
- Visible demo-data policy across Fleet & Maintenance screens.
- Flight log workflow.
- Maintenance alerts screen.
- Excel import preview.
- Core database tables.
- Audit logging for imports and flight logs.

## v0.2 Scope

v0.2 should include:

- Maintenance forecast.
- Monthly flight-hour trend analysis.
- Engine overhaul exposure.
- Servo/component expiry analysis.
- Maintenance reserve planning.
- Component replacement history.
- Documents attached to components.
- Vessel/campaign/contract linkage.
- Procurement timing recommendations.

## Future Enhancements

- Automated document extraction from maintenance PDFs.
- Vendor and purchase-order planning.
- Parts inventory.
- Mechanic approval workflows.
- Offline flight log capture.
- Mobile maintenance inspection mode.
- Calendar integration for maintenance events.
- AI-assisted maintenance briefing.
- Cross-fleet benchmarking.
- Regulatory compliance package generation.

## Risks

- Workbook formulas may not represent all operational edge cases.
- Component data may be incomplete or inconsistent.
- Calendar-limit interpretation may vary by component and maintenance authority.
- Flight logs require approval discipline to avoid corrupting component life calculations.
- Maintenance reserve assumptions may be commercially sensitive.
- Users may treat the system as official maintenance authority before certification scope is defined.
- Multi-country operations may require different document, language, and regulatory handling.

## Acceptance Criteria

The epic is ready for implementation when:

- Product requirements are approved.
- Database model is accepted by engineering.
- Import mapping is validated against the workbook.
- Status thresholds are approved by operations and maintenance leadership.
- Flight-log approval workflow is approved.
- Alert severities and routing are approved.
- MVP, v0.1, and v0.2 scope are accepted.

The MVP is accepted when:

- Users can create multiple helicopter records.
- Users can create and edit vessel records.
- Users can link verified helicopters to verified vessels through an assignment workflow.
- Users can import HP1804 component data from the workbook.
- Users can view components by helicopter.
- The system calculates OK, Monitor, Critical, and Expired statuses.
- Users can log flight hours for a helicopter and campaign.
- Approved flight logs update hourmeter and component remaining hours.
- Alerts are generated for Monitor, Critical, Expired, missing data, and calendar warnings.
- Import preview shows missing data and status mismatches before commit.
- No helicopter-specific logic assumes HP1804 as the only aircraft.
- Demo data is visibly identified and cannot be mistaken for authoritative HeliServiX operating data.
- HP1782, HP1783, HP1768, HP1769, and HP1770 do not contain invented real-world vessel assignments.
- All critical mutations are audit logged.

## Open Questions

- What are the official maintenance authority boundaries for HeliServiX OS in production?
- Should calendar thresholds remain fixed or configurable per component category?
- Should flight logs require two-person approval before recalculation?
- Which document types are mandatory before a helicopter is considered operationally available?
- Should maintenance reserve rates be global, per helicopter, per component category, or per campaign?
- What is the authoritative source for HP1782, HP1783, HP1768, and HP1769 opening component balances?
