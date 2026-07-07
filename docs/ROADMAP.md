# Roadmap

## Delivery Philosophy

Build the platform in controlled phases. Each phase should produce a usable capability, reduce commercial operating risk, and strengthen the data foundation. Avoid building generic CRM features before the tuna fleet and helicopter service model is represented correctly.

## Phase 0: Product Foundation

Goal: establish the repository, documentation, data model, and operating assumptions.

Deliverables:

- Professional repository structure.
- Master product documentation.
- Domain architecture documentation.
- Initial database design.
- CRM schema and workbook alignment.
- Security, deployment, AI, fleet-maintenance, maintenance crew portal, vessel inventory, purchasing, and email automation strategy.

Exit criteria:

- The team can explain what the platform is and is not.
- The core entities and relationships are documented.
- The first implementation phase has bounded scope.

## Phase 1: Core Commercial Workspace

Goal: replace spreadsheet-only workflow with a structured commercial system of record.

Deliverables:

- Authentication and tenant model.
- Company, fleet owner, vessel, contact, opportunity, and contract records.
- Opportunity stages and next-action workflow.
- Interaction timeline for calls, emails, meetings, notes, and documents.
- Import process from the existing CRM workbook.
- Basic executive dashboard for pipeline, country exposure, and follow-up health.

Exit criteria:

- A commercial director can manage active accounts and opportunities without relying on the spreadsheet as the primary system.
- Every opportunity has a linked company, contact, vessel context when available, stage, value estimate, and next action.

## Phase 2: HSV-SPEC-001 Fleet & Maintenance Foundation

Goal: make the platform multi-helicopter from day one and connect commercial promises to aircraft readiness, component life, maintenance forecast, and reserve planning.

HSV OS 0.2 status: frontend operational MVP implemented with localStorage persistence only. The release supports local CRUD for helicopters, vessels, components, flight logs, Maintenance Crew Portal simulation, vessel inventory, purchasing, component recalculation, alert generation, and demo-data indicators. Backend, database, authentication, real audit persistence, and external services remain deferred.

Deliverables:

- Helicopter registry.
- Current Hobbs and hourmeter tracking.
- Component-control model per helicopter.
- Component part number, serial number, position, installation date, TSN, TSO, life-limit hours, remaining hours, calendar life limit, and remaining calendar time.
- Status calculation for OK, Monitor, Critical, and Expired, starting from the workbook's OK/MONITOREAR/CRÍTICO criteria.
- Import mapping for `Control Maestro`, `Resumen Ejecutivo`, and `Leyenda` from the component-control workbook.
- Flight-hour logging by helicopter and campaign.
- Automatic remaining-hour recalculation after approved flight logs.
- Maintenance alerts by hours and calendar.
- Maintenance forecast.
- Component replacement history.
- Overhaul planning.
- Maintenance reserve planning.
- Availability windows.
- Aircraft document readiness.
- Contract operational feasibility indicators.
- Alerts for conflicts between sales commitments and aircraft availability.

Exit criteria:

- Operations users can maintain multiple helicopter records and component ledgers.
- Maintenance users can see hour-based and calendar-based component status without spreadsheet recalculation.
- Commercial users can see whether a proposed campaign is operationally feasible before committing.
- Leadership can distinguish high-value opportunities from deliverable opportunities and understand maintenance reserve exposure.

## Phase 3: HSV-SPEC-002 Maintenance Crew Portal

Goal: give maintenance chiefs and authorized maintenance staff restricted operational access without exposing commercial or executive data.

Deliverables:

- Maintenance-only role set and permission matrix.
- Flight-hour registration for any helicopter.
- Maintenance log entries.
- Component removal and installation workflow.
- Evidence upload for photos, invoices, logbook pages, work orders, 8130 forms, certificates, inspection documents, and related files.
- Hourmeter update workflow with reason and audit trail.
- Component remaining-hour recalculation trigger.
- Maintenance alert generation from crew-entered events.
- Audit trail by user, date, helicopter, component, and action.

Exit criteria:

- Maintenance staff can execute approved maintenance workflows without CRM access.
- Every maintenance action has an audit event and supporting source context.
- Recalculation-triggering actions are controlled by permission and review status.

## Phase 4: HSV-SPEC-003 Vessel Inventory

Goal: establish traceable inventory control for items stored on vessels, in bodegas, on helicopters, and in the main warehouse.

Deliverables:

- Vessel inventory locations and bodegas.
- Item catalog for components, hardware, consumables, oils, filters, tools, and kits.
- Quantity, unit of measure, minimum stock, stock status, condition, serial, lot, and expiration tracking.
- Transfer workflow between vessels, bodegas, helicopters, and warehouse.
- Usage workflow against helicopter maintenance events.
- Purchase-to-storage-to-installation traceability.
- Low-stock and expiration alerts.

Exit criteria:

- Users can see what is stored on each vessel and where.
- Inventory transfers and usage are ledgered and auditable.
- Maintenance readiness can incorporate vessel stock availability.

## Phase 5: HSV-SPEC-004 Purchasing

Goal: support operational procurement and traceability without implementing full accounting.

Deliverables:

- Purchase request workflow.
- Supplier records.
- Quote tracking.
- Purchase orders and item lines.
- Cost and currency capture.
- Links to helicopter, vessel, campaign, and maintenance event.
- Status workflow from Requested through Closed.
- Attachments for quotes, invoices, packing lists, airway bills, delivery notes, certificates, and photos.
- Receipt linkage to inventory storage and maintenance usage.

Exit criteria:

- Operations can trace why an item was requested, who approved it, what was ordered, where it was shipped, where it was stored, and whether it was installed or consumed.
- No accounting, tax, payable, or Panama compliance functionality is implied.

## Phase 6: Market Intelligence System

Goal: turn market research into structured, source-based commercial signals.

Deliverables:

- Intelligence item capture.
- Source tracking and confidence scoring.
- Entity linking to companies, owners, contacts, vessels, countries, and ports.
- Review workflow for intelligence.
- Alerts and recommended actions.
- Account brief generation.

Exit criteria:

- Analysts can record market signals in a way that improves account prioritization.
- Commercial users can trace recommendations back to sources and reviewed intelligence.

## Phase 7: Email Campaign Automation

Goal: support controlled, personalized outreach with approval and compliance.

Deliverables:

- Template library by language, country, role, and campaign stage.
- Segment builder.
- Draft generation and approval queue.
- SMTP or transactional email provider integration.
- Reply and bounce tracking.
- Follow-up scheduling.
- Suppression and unsubscribe management.

Exit criteria:

- Campaigns can be executed without manual copy-paste.
- Every outbound email is approved, traceable, and linked to CRM records.

## Phase 8: AI Assistant

Goal: provide supervised AI assistance for research, drafting, summarization, and decision support.

Deliverables:

- Assistant chat within account, opportunity, contract, and intelligence contexts.
- Retrieval from approved tenant records and documents.
- Draft email generation with citations.
- Account brief and meeting prep generation.
- AI action proposal workflow with human approval.
- AI audit log.

Exit criteria:

- AI helps users work faster without silently changing records or making unsupported claims.

## Phase 9: Documents, Reports, and Executive Dashboards

Goal: make the platform useful for leadership review, proposals, and operational reporting.

Deliverables:

- Document repository.
- Proposal and contract document generation.
- Versioned document metadata.
- Scheduled reports.
- Executive dashboards for pipeline, contract exposure, fleet commitment, component constraints, maintenance reserve exposure, campaign performance, and intelligence alerts.

Exit criteria:

- Leadership can run commercial review meetings from the platform.
- Proposal and report generation is repeatable and auditable.

## Phase 10: Multi-Operation SaaS Expansion

Goal: support multiple helicopter operations across Latin America.

Deliverables:

- Tenant administration.
- Operation-specific branding, email identities, templates, aircraft records, component thresholds, maintenance reserve policies, and forecast rules.
- Fine-grained role permissions.
- Cross-operation platform administration.
- Scalable billing and subscription support if commercialized externally.
- Regional reporting by country, operation, fleet category, aircraft type, campaign hours, maintenance exposure, and aircraft availability.

Exit criteria:

- The platform can onboard a second helicopter operation without schema redesign.

## Release Governance

Every phase should include:

- Data migration plan.
- Security review.
- Acceptance criteria.
- Audit and logging requirements.
- Operational runbook updates.
- User-facing documentation.
- Rollback plan.
