# HSV-SPEC-005 — Campaigns

## Spec Status

Product: HeliServiX OS

Module: Campaigns

Status: Product and architecture specification. No application code, backend, database, authentication, or external services are included in this scope.

## Purpose

Campaigns are the central operating entity of HeliServiX OS. HeliServiX does not only manage helicopters, contacts, vessels, or maintenance records in isolation. It manages helicopter deployments within tuna-vessel campaigns.

A campaign is the structured operational commitment that connects a client or fleet owner, vessel, contract, helicopter, pilot, mechanic, flight logs, maintenance events, inventory usage, purchases, documents, compliance status, and future billing or profitability analysis.

Campaign UI labels, statuses, forms, and tables must support English and Spanish through `HSV-CORE-003_I18N_BILINGUAL_UI.md`. Campaign names, contract references, vessel names, notes, and other user-entered data must remain in the language entered by the user.

## Operating Model

The campaign-centric model ensures that commercial promises are evaluated against operational reality before and during execution.

A campaign connects:

- Client or fleet owner.
- Operating company when different from owner.
- Vessel.
- Contract.
- Helicopter.
- Pilot.
- Mechanic.
- Flight logs.
- Maintenance events.
- Vessel inventory usage.
- Operational purchases.
- Technical records.
- Compliance obligations.
- Aircraft Operations Center readiness state.
- Future billing, margin, reserve, and profitability reporting.

Campaigns must support tuna purse seine deployments across Panama, Ecuador, and other Latin American markets where vessel operations, aircraft readiness, personnel assignments, and regulatory requirements vary by country.

## Core Concepts

### Campaign

Represents a planned, active, completed, cancelled, or archived helicopter deployment for a vessel or fleet owner.

Required fields:

- Campaign name or generated campaign code.
- Tenant.
- Client company.
- Fleet owner.
- Vessel.
- Contract.
- Country and operating area.
- Home port or primary port.
- Campaign type.
- Planned start date.
- Planned end date.
- Actual start date.
- Actual end date.
- Status.
- Assigned helicopter.
- Assigned pilot.
- Assigned mechanic.
- Operational notes.
- Commercial notes.

### Campaign Assignment

Represents time-bound assignment of aircraft, crew, vessel, and contract resources.

Assignment fields:

- Campaign.
- Helicopter.
- Vessel.
- Pilot.
- Mechanic.
- Contract.
- Assignment start.
- Assignment end.
- Status.
- Assignment reason.
- Reassignment reason.
- Approved by.
- Notes.

### Campaign Status

Recommended statuses:

- Draft.
- Planned.
- Readiness review.
- Approved.
- Active.
- Suspended.
- Completed.
- Cancelled.
- Archived.

## Workflows

### Create Campaign

1. Commercial or operations user selects client, fleet owner, vessel, and contract or opportunity.
2. User enters campaign dates, country, operating area, and expected utilization.
3. System creates a draft campaign and requests readiness review.
4. Operations selects candidate helicopter and crew.
5. Fleet, maintenance, inventory, purchasing, technical records, and compliance checks run.
6. Campaign is approved only when required operational blockers are resolved or explicitly accepted by authorized users.

### Campaign Readiness Review

Readiness review must include:

- Helicopter current operational status.
- Current hourmeter and flight-hour trend.
- Next limiting components.
- Open maintenance alerts.
- Forecasted due events during campaign window.
- Required technical records and document readiness.
- Compliance items affecting the helicopter, component, vessel, or operating country.
- Vessel inventory readiness.
- Open purchases required before deployment.
- Crew assignment readiness.
- Contract and insurance readiness.

### Active Campaign Operations

During an active campaign:

- Flight logs post to the campaign.
- Maintenance events are linked to the campaign when they occur during deployment.
- Inventory usage is recorded against the campaign.
- Purchases can be justified by campaign need.
- Technical records and evidence attach to the relevant campaign context.
- Alerts identify campaign impact when aircraft readiness changes.

### Campaign Closure

Campaign closure should capture:

- Actual operating period.
- Total flight hours.
- Maintenance events and downtime.
- Components replaced or consumed.
- Inventory used.
- Purchases related to campaign.
- Contract performance signals.
- Future billing and profitability inputs.
- Lessons learned and operational notes.

## Data Model

### `campaigns`

Fields:

- `tenant_id`
- `campaign_code`
- `name`
- `client_company_id`
- `fleet_owner_id`
- `vessel_id`
- `contract_id`
- `opportunity_id`
- `country`
- `operating_area`
- `home_port`
- `campaign_type`
- `planned_start_date`
- `planned_end_date`
- `actual_start_date`
- `actual_end_date`
- `status`
- `expected_monthly_hours`
- `commercial_owner_user_id`
- `operations_owner_user_id`
- `notes`

### `campaign_assignments`

Fields:

- `tenant_id`
- `campaign_id`
- `helicopter_id`
- `vessel_id`
- `pilot_user_id`
- `mechanic_user_id`
- `contract_id`
- `assignment_start`
- `assignment_end`
- `status`
- `assignment_type`
- `approved_by`
- `approved_at`
- `reason`
- `notes`

## Business Rules

- A campaign cannot become Active without a vessel and operating country.
- A campaign cannot become Active without a helicopter assignment unless explicitly marked as commercial-only planning.
- A grounded helicopter cannot be assigned to an active campaign.
- Expired components block active campaign assignment unless an approved maintenance resolution exists.
- Campaign assignment changes must create vessel assignment history and audit events.
- Flight logs must link to campaign when the helicopter is operating under a vessel deployment.
- Inventory consumption and purchases should link to campaign when the operational reason is campaign readiness or campaign execution.
- Campaign readiness warnings must be derived from Fleet, Maintenance, Inventory, Purchasing, Technical Records, and Compliance data.

## Permissions

- `campaigns.view`
- `campaigns.create`
- `campaigns.update`
- `campaigns.archive`
- `campaigns.assign_resources`
- `campaigns.approve_readiness`
- `campaigns.close`
- `campaigns.view_financial_inputs`
- `campaigns.audit.view`

## Acceptance Criteria

- Users can explain every active helicopter deployment as a campaign.
- A campaign links commercial, vessel, aircraft, crew, maintenance, inventory, purchasing, technical records, and compliance context.
- Readiness review exposes operational blockers before approval.
- Flight logs, maintenance events, inventory movements, and purchase requests can be traced back to campaign.
- Future billing and profitability can be added without redesigning core campaign relationships.

## Future Enhancements

- Campaign profitability dashboard.
- Contract-to-billing preparation.
- Crew rotation planning.
- Campaign risk scoring.
- Country-specific regulatory readiness workflows.
- AI-generated campaign closeout summaries with human review.
