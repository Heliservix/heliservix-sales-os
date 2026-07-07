# Database

## Database Objective

The database must represent the commercial and operational reality of helicopter-supported tuna fleet services. It should be normalized enough to prevent duplicate records, flexible enough to support imperfect market data, and auditable enough for contract, campaign, fleet-maintenance, AI, and document workflows.

## Core Design Principles

- Every tenant-owned record includes `tenant_id`.
- Important records include `created_at`, `updated_at`, `created_by`, and `updated_by`.
- Destructive deletes should be rare; use archive states for business records.
- Market intelligence and AI output remain traceable to sources.
- Contracts and documents require version history.
- Helicopter component life, flight logs, maintenance alerts, replacements, overhauls, and reserve calculations require audit history.
- Email and assistant actions require immutable event logs.
- External identifiers are stored separately from internal primary keys.

## Entity Groups

### Identity and Tenancy

`tenants`

- Represents each helicopter operation or commercial organization using the platform.
- Owns data, branding, email identities, templates, users, aircraft, and reports.

`users`

- Authenticated platform users.
- Stores identity provider reference, name, email, status, and default tenant.

`tenant_users`

- Joins users to tenants with role and status.
- Supports consultants, executives, and platform admins with multi-tenant access.

`roles` and `permissions`

- Defines access control for commercial, operations, maintenance, documents, campaigns, AI, reports, and administration.

### Commercial Entities

`companies`

- Legal or operating entities in the tuna fishing ecosystem.
- Fields include name, country, headquarters city, website, industry role, priority, status, notes, and source confidence.

`fleet_owners`

- Individuals, families, holding entities, or ownership groups connected to companies and vessels.
- Must allow uncertain or partially verified ownership relationships.

`company_relationships`

- Represents parent companies, operators, managers, subsidiaries, joint ventures, and ownership links.

`vessels`

- Tuna purse seine vessels or relevant support vessels.
- Fields include vessel name, flag, IMO or registry number when available, capacity estimate, home port, status, and notes.

`vessel_company_links`

- Links vessels to owners, operators, managers, and charterers over time.

`contacts`

- People associated with companies, owners, vessels, ports, or suppliers.
- Fields include name, title, email, phone, WhatsApp, LinkedIn, language, decision role, consent status, and status.

`contact_relationships`

- Links contacts to companies and owners with role, seniority, influence level, and validity dates.

### Sales Execution

`opportunities`

- Potential commercial engagements.
- Fields include company, owner, vessel, country, port, campaign type, stage, estimated value, probability, expected start, expected end, next action, priority, and owner user.

`opportunity_stage_history`

- Tracks stage changes, probability changes, reason, and actor.

`interactions`

- Timeline of calls, emails, meetings, notes, WhatsApp summaries, document sends, and campaign events.

`tasks`

- Follow-ups, research tasks, document preparation, approval tasks, and operational review actions.

`contracts`

- Commercial agreements for vessel, campaign, annual, seasonal, or custom service.
- Fields include company, vessel, operation, contract type, status, start, end, advance amount, rate model, included hours, exclusions, renewal terms, and risk notes.

`contract_terms`

- Structured pricing and delivery terms, including tiered tuna tonnage rates, included hours, excluded fuel/oil costs, crew assumptions, and billing rules.

### Fleet & Maintenance Operations

`helicopters`

- Aircraft records by tenant.
- Fields include registration, internal fleet code, manufacturer, model, serial number, current Hobbs, current hourmeter, total time since new, base location, current country, operational status, operating notes, and ownership/lease status.

`helicopter_meter_readings`

- Immutable readings for Hobbs, hourmeter, total time, and reading source.
- Supports corrections, inspections, imports, and reconciliations without silently rewriting aircraft totals.

`component_catalog`

- Reusable component definitions by model or operation.
- Fields include reference number, component category, component name, eligible aircraft model, default part number, default life-limit hours, default calendar limit, source workbook/sheet reference, and planning notes.

`helicopter_components`

- Installed component instances per helicopter.
- Fields include helicopter, component catalog reference, component name, part number, serial number, position, installation date, installation meter reading, TSN, TSO, life-limit hours, remaining hours, calendar life limit, calendar expiration date, remaining calendar time, status, and notes.

`component_life_rules`

- Tenant and component-class rules for OK, Monitor, Critical, and Expired status.
- Supports hour thresholds, percent-remaining thresholds, calendar thresholds, severity, grounding rules, and alert routing.
- Baseline workbook-derived thresholds are Critical below 20% remaining by hours, Monitor from 20% to 35% remaining by hours or one year calendar remaining, OK when no alert applies, and production Expired when the hour or calendar limit is reached or passed.

`flight_logs`

- Approved operating-hour records by helicopter and campaign.
- Fields include helicopter, campaign, contract, vessel, company, country, departure location, arrival location, flight date, start Hobbs/hourmeter, end Hobbs/hourmeter, calculated flight hours, pilot, mechanic, approval status, and notes.

`component_life_ledger`

- Immutable life-consumption ledger produced by flight logs, corrections, replacements, inspections, and imports.
- Supports recalculating remaining hours from authoritative events.

`maintenance_alerts`

- Hour-based and calendar-based alerts for component status, overhaul planning, aircraft availability conflicts, and reserve exposure changes.
- Fields include helicopter, component, alert type, severity, status, due hours, due date, assigned user, acknowledged_at, resolved_at, and source event.

`maintenance_events`

- Scheduled and completed maintenance, inspections, service windows, component constraints, and return-to-service status.

`component_replacements`

- Replacement history linking removed component, installed component, maintenance event, removal reason, removal date, installation date, meter readings, approving user, and supporting documents.

`overhaul_plans`

- Planned overhauls by component or helicopter.
- Fields include due basis, due hours, due date, vendor, lead time, estimated cost, planned downtime, reserve policy, campaign conflicts, and status.

`maintenance_reserve_policies`

- Reserve assumptions by tenant, helicopter, model, component class, or contract type.
- Fields include reserve rate per flight hour, currency, effective dates, and calculation basis.

`maintenance_reserve_ledger`

- Reserve accrual and consumption records linked to flight logs, campaigns, contracts, components, and maintenance events.

`maintenance_forecasts`

- Forecast snapshots over a selected horizon.
- Stores generated_at, forecast inputs, expected component constraints, aircraft availability risk, planned maintenance windows, reserve exposure, and campaign conflicts.

`fleet_maintenance_summaries`

- Computed summary snapshots comparable to the workbook's `Resumen Ejecutivo`.
- Stores aircraft identity, review date, total controlled components, critical component count, missing calendar-limit count, normalized reference count, next limiting components, and fleet readiness status.

`availability_windows`

- Time windows when aircraft and required personnel are available for commercial commitment.

`operation_assignments`

- Links helicopters, pilots, mechanics, vessels, ports, and contracts during a campaign.

### Documents

`documents`

- Metadata for uploaded and generated files.
- Fields include tenant, document type, title, storage key, owner entity, version, status, confidentiality level, and expiration date.

`document_versions`

- Immutable versions with checksum, created_by, created_at, and source.

`document_links`

- Links documents to companies, contacts, vessels, helicopters, opportunities, contracts, intelligence items, and reports.

### Market Intelligence

`intelligence_items`

- Source-based signals about companies, vessels, owners, regulations, ports, competitors, and fishing activity.

`intelligence_sources`

- Source metadata including URL, publication, author, access date, source type, reliability, and license/use notes.

`intelligence_entity_links`

- Links intelligence to commercial entities and records relevance, confidence, and analyst review status.

`intelligence_actions`

- Recommended commercial actions created from intelligence, assigned to users, and linked to opportunities or tasks.

### Email Campaigns

`email_templates`

- Versioned templates by language, region, contact role, stage, and campaign type.

`campaigns`

- Campaign definitions, segments, approval status, sender identity, schedule, and objective.

`campaign_recipients`

- Recipient membership, personalization variables, approval state, suppression checks, and send status.

`email_events`

- Immutable send, delivery, bounce, reply, open, click, unsubscribe, and failure events when available.

`suppression_list`

- Tenant-level and global opt-out or do-not-contact records.

### AI Assistant

`assistant_sessions`

- User sessions scoped to tenant and optionally to account, opportunity, contract, document, or report.

`assistant_messages`

- User and assistant messages, model metadata, safety flags, and token accounting when available.

`assistant_context_items`

- Retrieved records, documents, intelligence items, and citations used in an assistant response.

`assistant_actions`

- Proposed AI actions requiring human approval, such as draft email, create task, update opportunity, or generate report.

### Dashboards and Reports

`dashboard_definitions`

- Saved dashboard layouts and metric configurations by tenant and role.

`report_definitions`

- Report templates for pipeline review, account brief, contract exposure, campaign performance, and intelligence digest.

`report_runs`

- Generated reports with parameters, output document link, status, and requester.

### Audit and Operations

`audit_events`

- Immutable records of security, data, workflow, email, AI, document, and contract actions.

`integration_jobs`

- Background job state, retry counts, external provider references, and failure details.

`imports`

- Tracks bulk imports, validation results, preview decisions, and committed records.

## Relationship Priorities

- A company can have many contacts, vessels, owners, opportunities, contracts, documents, and intelligence items.
- A fleet owner can relate to multiple companies and vessels.
- A vessel can have changing owner/operator relationships over time.
- An opportunity can link to a company, contact, fleet owner, vessel, helicopter feasibility view, campaign, documents, and intelligence.
- A contract should trace back to the opportunity that created it when applicable.
- A helicopter can be linked to components, meter readings, flight logs, maintenance events, maintenance alerts, availability windows, documents, and contract assignments.
- A component can be installed on only one active helicopter position at a time, while replacement history preserves prior installations.
- A flight log can consume component life for all active installed components on the helicopter.
- A maintenance forecast can link to opportunities and contracts when forecasted component limits affect campaign feasibility.
- Intelligence should never exist as unlinked text if a relevant company, vessel, owner, or country can be identified.

## Initial Migration Source

The current spreadsheet and JSON schema in `data/crm/` are seed artifacts, not the final database design. They should be used to map early commercial records into the production model.

Important mapping notes:

- `Empresas` maps into `companies`.
- `Contactos` maps into `contacts` and `contact_relationships`.
- `Oportunidades` maps into `opportunities`.
- `Contratos` maps into `contracts` and selected `contract_terms`.
- `Correos` maps into `interactions` and later `email_events`.
- `Inteligencia` maps into `intelligence_items`.

The component-control workbook `Heliservix_Control_Componentes_FINAL_PRO.xlsx` should map into:

- `Control Maestro` aircraft header into `helicopters` and `helicopter_meter_readings`.
- `Control Maestro` component rows into `component_catalog`, `helicopter_components`, and opening `component_life_ledger` balances.
- `Control Maestro (2)` into an alternate import profile or reconciliation source for component-control data.
- `Resumen Ejecutivo` into computed `fleet_maintenance_summaries`.
- `Leyenda` into `component_life_rules`, data dictionary documentation, and user-facing help text.
- Flight-hour sheets into `flight_logs` and `component_life_ledger`.
- Alert/status formulas into `component_life_rules` and `maintenance_alerts`.
- Replacement or overhaul sheets into `component_replacements` and `overhaul_plans`.
- Reserve or cost planning sheets into `maintenance_reserve_policies` and `maintenance_reserve_ledger`.

## Data Quality Rules

- Company names require normalization and duplicate checks.
- Contacts require communication consent and source tracking when used for campaigns.
- Vessel capacity estimates must distinguish verified values from estimated values.
- Market intelligence must include source and access date.
- AI-generated fields must be marked as generated until reviewed.
- Contract values must separate estimated, proposed, signed, invoiced, and realized amounts.
- Component status must be computed from current life rules and authoritative flight/component ledgers.
- Flight-log corrections must preserve original values, correction reason, approver, and recalculated downstream effects.
- Expired components must block aircraft availability unless an authorized maintenance override exists with expiration and audit trail.
