# HSV-CORE-002 — Helicopter Digital Twin

## Core Status

Product: HeliServiX OS

Core capability: Helicopter Digital Twin

Status: Architecture specification. No application code, backend, database, authentication, or external services are included in this scope.

User-facing module name:

- English: Aircraft Operations Center.
- Spanish: Centro de Operaciones de la Aeronave.

The phrase digital twin remains valid for the internal technical concept and architecture. Navigation, page titles, user-facing labels, and help text must use Aircraft Operations Center.

## Purpose

Each helicopter in HeliServiX OS must have a digital twin: a governed operational profile that represents the aircraft's current state, installed component configuration, maintenance condition, campaign history, records, costs, and forecast.

The digital twin is not a 3D model. It is the operational truth graph for a helicopter.

## Digital Twin Contents

Each helicopter digital twin must include:

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
- Compliance status.
- Market value and asset profile in a future phase.

## Source Systems Inside HeliServiX OS

The digital twin is assembled from:

- Helicopter registry.
- Helicopter meter readings.
- Flight logs.
- Component catalog.
- Installed component records.
- Component life ledger.
- Maintenance logs.
- Maintenance events.
- Component replacements.
- Maintenance alerts.
- Maintenance forecasts.
- Campaigns and campaign assignments.
- Vessel assignment history.
- Inventory movements.
- Purchase requests and purchase orders.
- Technical records and document links.
- Compliance items and alerts.
- Future finance and asset valuation records.

## Aircraft Operations Center Views

### Operational View

Shows whether the aircraft is available, assigned, in campaign, maintenance scheduled, unscheduled maintenance, grounded, or retired.

### Component View

Shows installed components, part numbers, serial numbers, positions, life limits, remaining hours, calendar limits, status, and next limiting components.

### Timeline View

Shows installations, removals, inspections, overhauls, annuals, SB/AD compliance, maintenance events, flight events, vessel assignments, campaign assignments, technical record uploads, and forecasted due events.

### Campaign View

Shows current and historical deployments by vessel, client, country, contract, campaign dates, flight hours, downtime, maintenance impact, and future profitability inputs.

### Document View

Shows aircraft documents, component documents, photos, certificates, logbook pages, release-to-service records, work orders, and compliance proof.

### Forecast View

Shows expected due dates, component exposure, overhaul planning, reserve exposure, procurement timing, compliance exposure, and campaign conflicts.

## Data Model

### `helicopter_digital_twins`

This table stores computed snapshot metadata, not the entire source of truth.

Fields:

- `tenant_id`
- `helicopter_id`
- `snapshot_at`
- `operational_status`
- `current_hourmeter`
- `current_campaign_id`
- `current_vessel_id`
- `next_limiting_component_id`
- `open_alert_count`
- `critical_alert_count`
- `expired_component_count`
- `compliance_alert_count`
- `document_readiness_status`
- `forecast_status`
- `maintenance_reserve_exposure`
- `currency`
- `data_quality_status`
- `snapshot_source`

### `maintenance_timeline_events`

Fields:

- `tenant_id`
- `helicopter_id`
- `event_type`
- `event_date`
- `meter_reading`
- `component_id`
- `campaign_id`
- `vessel_id`
- `maintenance_event_id`
- `compliance_item_id`
- `technical_record_id`
- `title`
- `description`
- `severity`
- `source_entity_type`
- `source_entity_id`
- `forecasted`

### `vessel_assignment_history`

Fields:

- `tenant_id`
- `helicopter_id`
- `vessel_id`
- `campaign_id`
- `contract_id`
- `assignment_start`
- `assignment_end`
- `status`
- `country`
- `operating_area`
- `changed_by`
- `change_reason`
- `notes`

## Business Rules

- Digital twin snapshots are derived from authoritative ledgers and records.
- A digital twin snapshot must never override source records.
- Snapshot generation must be repeatable for a given source state.
- Vessel assignment history updates when campaign assignments change.
- Maintenance timeline events must link back to source entities.
- Forecasted timeline events must be clearly marked as forecasted, not completed.
- Costs shown in the twin are planning or operational exposure until future accounting is implemented.

## Acceptance Criteria

- A user can open a helicopter and understand its current operating state without checking multiple spreadsheets.
- Installed components, maintenance history, flight history, campaign history, vessel assignment history, documents, compliance alerts, and forecast are connected.
- Timeline events explain what happened, when, at what hourmeter, and why it matters.
- Future market value and asset profile can be added without changing the core twin identity.

## Future Enhancements

- Asset valuation profile.
- Market resale profile.
- Cost-per-flight-hour analytics.
- Digital twin comparison across helicopters.
- Predictive maintenance risk model.
- Exportable aircraft readiness packet.
