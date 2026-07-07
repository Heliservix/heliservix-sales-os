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
- Security, deployment, AI, fleet-maintenance, and email automation strategy.

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

## Phase 2: Fleet & Maintenance Operations Foundation

Goal: make the platform multi-helicopter from day one and connect commercial promises to aircraft readiness, component life, maintenance forecast, and reserve planning.

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

## Phase 3: Market Intelligence System

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

## Phase 4: Email Campaign Automation

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

## Phase 5: AI Assistant

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

## Phase 6: Documents, Reports, and Executive Dashboards

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

## Phase 7: Multi-Operation SaaS Expansion

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
