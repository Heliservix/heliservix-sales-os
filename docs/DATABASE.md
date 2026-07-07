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
- Maintenance crew actions, evidence uploads, inventory movements, and purchasing workflow changes require immutable audit history.
- Inventory balances must be derived from ledger events, not manually overwritten quantities.
- Purchasing supports operational traceability only; it does not create accounting postings in the current scope.
- Campaigns are the central operating entity for helicopter deployments on tuna vessels.
- Helicopter digital twins are computed from authoritative source records and snapshots, not manually maintained as separate truth.
- Technical records and compliance evidence must link to the operational entities they support.
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
- Must include maintenance-only roles, inventory roles, and purchasing roles with least-privilege permissions.

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

### HSV-SPEC-005 Campaigns

`campaigns`

- Central operating records for helicopter deployments within tuna-vessel campaigns.
- Fields include tenant, campaign code, name, client company, fleet owner, vessel, contract, opportunity, country, operating area, home port, campaign type, planned dates, actual dates, status, expected monthly hours, commercial owner, operations owner, and notes.

`campaign_assignments`

- Time-bound resource assignments for campaigns.
- Fields include campaign, helicopter, vessel, pilot, mechanic, contract, assignment start, assignment end, assignment type, status, reason, approved_by, approved_at, and notes.

`vessel_assignment_history`

- Historical assignment ledger connecting helicopters, vessels, campaigns, contracts, countries, operating areas, dates, status, change reason, and user.
- Supports helicopter digital twin history, campaign review, and commercial traceability.

### HSV-SPEC-001 Fleet & Maintenance

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

`maintenance_timeline_events`

- Timeline events for each helicopter digital twin.
- Fields include helicopter, event type, event date, meter reading, component, campaign, vessel, maintenance event, compliance item, technical record, title, description, severity, source entity, and forecasted flag.

`helicopter_digital_twins`

- Computed snapshot metadata for each helicopter.
- Fields include helicopter, snapshot time, operational status, current hourmeter, current campaign, current vessel, next limiting component, alert counts, compliance alert count, document readiness status, forecast status, maintenance reserve exposure, currency, data quality status, and snapshot source.

### HSV-SPEC-002 Maintenance Crew Portal

`maintenance_crew_profiles`

- Links authorized maintenance users to employee/vendor identity, certification context, permitted operations, and active status.
- Fields include tenant, user, role type, authorization scope, license or credential reference when applicable, active_from, active_until, and notes.

`maintenance_logs`

- Maintenance entries created by authorized crew.
- Fields include helicopter, maintenance event, log type, log date, entered_by, reviewed_by, review status, description, corrective action, hourmeter value, component references, and return-to-service indicator when applicable.

`maintenance_evidence`

- Evidence attached to maintenance logs, component changes, flight-hour entries, or purchasing receipts.
- Supports photos, invoices, logbook pages, work orders, 8130 forms, certificates, inspection documents, and related files.
- Fields include document, evidence type, source entity, uploaded_by, captured_at, checksum, confidentiality level, and review status.

`maintenance_component_actions`

- Crew-recorded removals, installations, inspections, overhauls, and corrections.
- Fields include helicopter, removed component, installed component, action type, action date, meter reading, reason, performed_by, approved_by, evidence set, and recalculation status.

`maintenance_recalculation_jobs`

- Tracks recalculation runs triggered by flight logs, hourmeter updates, component changes, or corrections.
- Fields include trigger event, requested_by, started_at, completed_at, status, affected helicopter, affected components, alerts generated, and errors.

### HSV-SPEC-003 Vessel Inventory

`inventory_locations`

- Hierarchical locations for main warehouse, vessels, bodegas, helicopters, and temporary transfer locations.
- Fields include location type, vessel, helicopter, parent location, name, country, port, status, and notes.

`inventory_items`

- Item catalog for components, hardware, consumables, oils, filters, tools, and kits.
- Fields include item type, name, part number, manufacturer, description, unit of measure, serialized flag, lot-tracked flag, expiration-tracked flag, hazardous/material notes, and default minimum stock.

`inventory_stock_lots`

- Physical stock groupings by item, location, serial number, lot or batch, condition, expiration date, and source receipt.
- Fields include item, location, quantity, unit of measure, condition, serial number, lot number, expiration date, purchase order line, received date, and status.

`inventory_movements`

- Immutable inventory ledger for receipts, transfers, adjustments, maintenance usage, installation, consumption, quarantine, and disposal.
- Fields include movement type, item, stock lot, from location, to location, quantity, unit of measure, related helicopter, related vessel, related maintenance event, related purchase order, performed_by, approved_by, movement_date, and notes.

`inventory_minimums`

- Minimum stock policies by item and location.
- Fields include item, location, minimum quantity, reorder quantity, criticality, preferred supplier, and review cadence.

`inventory_stock_alerts`

- Low-stock, expired, near-expiration, condition, missing-serial, or transfer-exception alerts.

### HSV-SPEC-004 Purchasing

`suppliers`

- Supplier records for operational purchasing.
- Fields include name, country, contact details, supplier type, preferred status, payment notes, document requirements, and status.

`purchase_requests`

- Operational request records for parts, tools, consumables, services, or logistics.
- Fields include requester, request date, priority, related helicopter, vessel, campaign, maintenance event, justification, status, required_by, approved_by, and notes.

`purchase_request_items`

- Requested item lines with item, description, quantity, unit of measure, estimated cost, currency, required date, and source urgency.

`supplier_quotes`

- Supplier quote records linked to purchase requests or suppliers.
- Fields include supplier, quote date, validity date, currency, lead time, freight terms, status, and attachment references.

`supplier_quote_items`

- Quote line items with item, description, quantity, unit price, currency, lead time, certificate availability, and notes.

`purchase_orders`

- Operational purchase orders, not accounting documents.
- Fields include supplier, purchase request, order date, approved_by, status, currency, expected delivery, ship_to location, related vessel, related helicopter, related campaign, related maintenance event, and notes.

`purchase_order_items`

- Ordered items with item, description, quantity, unit cost, currency, received quantity, stored quantity, installed quantity, consumed quantity, and status.

`purchasing_attachments`

- Attachments for supplier quotes, invoices, packing lists, airway bills, delivery notes, certificates, and photos.

`purchasing_status_events`

- Immutable workflow status history from Requested, Quoted, Approved, Ordered, Received, Shipped to vessel, Stored, Installed, Consumed, and Closed.

### HSV-SPEC-006 Technical Records

`technical_records`

- Structured aviation evidence records linked to documents.
- Supports 8130 forms, logbook pages, work orders, invoices, photos, release-to-service documents, certificates, inspection documents, maintenance evidence, component documents, aircraft documents, and supplier traceability documents.
- Fields include record type, title, document, record date, received date, source type, source reference, review status, reviewed_by, reviewed_at, confidentiality level, expiration date, and notes.

`document_links`

- Links documents and technical records to operational entities.
- Fields include document, technical record, linked entity type, linked entity id, link role, required-for-readiness flag, created_by, created_at, and notes.

### HSV-SPEC-007 Compliance

`compliance_items`

- Regulatory, manufacturer, manual, and operational requirements.
- Supports AAC Panama, DGAC Ecuador, FAA references where relevant, Robinson Service Bulletins, Airworthiness Directives, Service Letters, manual revisions, life-limit compliance, and operational regulatory requirements.
- Fields include authority, item type, reference number, title, revision, effective date, source document, applicability basis, affected country, affected model, affected serial range, affected component category, affected part number, severity, due basis, due date, due hours, required action, status, and notes.

`compliance_alerts`

- Applicability and readiness alerts generated from compliance items.
- Fields include compliance item, helicopter, component, campaign, maintenance event, alert type, severity, status, due date, due hours, generated_at, assigned_to, resolved_by, resolved_at, resolution reason, and supporting document.

### HSV-CORE-001 Business Rules Engine

`business_rules`

- Tenant and platform rule definitions for operational calculations and decisions.

`business_rule_versions`

- Versioned rule logic, thresholds, status, effective dates, and approval metadata.

`business_rule_executions`

- Execution audit records with trigger entity, trigger action, rule version, input snapshot reference, executed_by, executed_at, status, warnings, and errors.

`business_rule_results`

- Output references created by rule executions, including alerts, ledger entries, forecasts, digital twin snapshots, campaign readiness results, and timeline events.

### Documents

`documents`

- Metadata for uploaded and generated files.
- Fields include tenant, document type, title, storage key, owner entity, version, status, confidentiality level, and expiration date.

`document_versions`

- Immutable versions with checksum, created_by, created_at, and source.

Document-to-entity linkage is handled by the canonical `document_links` model defined under HSV-SPEC-006 Technical Records.

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

`email_campaigns`

- Email campaign definitions, segments, approval status, sender identity, schedule, and objective. This table is separate from operational `campaigns`.

`email_campaign_recipients`

- Recipient membership, personalization variables, approval state, suppression checks, and send status.

`email_events`

- Immutable send, delivery, bounce, reply, open, click, unsubscribe, and failure events when available. Events link to `email_campaigns`, not operational `campaigns`.

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
- A campaign should link client, fleet owner, vessel, contract, helicopter assignment, crew, flight logs, maintenance events, inventory movements, purchases, technical records, compliance alerts, and future finance inputs.
- A helicopter can be linked to components, meter readings, flight logs, maintenance events, maintenance alerts, availability windows, documents, and contract assignments.
- A helicopter digital twin is derived from helicopter registry, meter readings, components, flight logs, maintenance events, campaign assignments, vessel assignment history, technical records, compliance alerts, inventory usage, purchasing links, and forecasts.
- A component can be installed on only one active helicopter position at a time, while replacement history preserves prior installations.
- A flight log can consume component life for all active installed components on the helicopter.
- A maintenance forecast can link to opportunities and contracts when forecasted component limits affect campaign feasibility.
- A technical record may link to multiple entities, but every link must define its operational role.
- A compliance alert must link back to the compliance item and affected helicopter, component, campaign, or operation.
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
- Digital twin snapshots must be recomputable from source records and must not override source ledgers.
- Campaign readiness must be computed from verified operational, technical-record, inventory, purchasing, maintenance, and compliance data.
- Technical records require document type, source, review status, checksum, confidentiality, and links to affected entities.
- Compliance items require source authority, reference, revision, applicability basis, and resolution evidence when closed.
- Flight-log corrections must preserve original values, correction reason, approver, and recalculated downstream effects.
- Expired components must block aircraft availability unless an authorized maintenance override exists with expiration and audit trail.
