# Architecture

## Architectural Goal

Build HeliServiX OS as a modular SaaS platform that can start as a focused HeliServiX commercial and operational system and grow into a multi-operation operating platform for helicopter companies across Latin America.

The architecture should keep commercial workflows, fleet and maintenance operations, maintenance crew workflows, vessel inventory, operational purchasing, intelligence workflows, automation, and AI assistant capabilities separated enough to evolve independently while sharing one governed data model.

The next strategic operating model is campaign-centric. Campaigns are the operating spine that connect commercial commitments to helicopter deployments on tuna vessels, including aircraft, crew, contract, flight logs, maintenance, inventory, purchasing, technical records, compliance, and future profitability.

## Recommended Repository Architecture

```text
apps/
  web/      Browser application for commercial, operations, and executive users.
  api/      Backend application exposing domain APIs, workflows, auth, and integrations.
packages/
  shared/   Shared domain types, validation contracts, constants, and reusable utilities.
data/
  crm/      Seed CRM artifacts and migration references.
docs/       Product, architecture, security, deployment, and domain documentation.
infra/      Infrastructure-as-code, deployment manifests, environment templates.
scripts/    Operational scripts for migrations, imports, exports, and validation.
assets/     Reference media, product assets, and domain source material.
```

The current `apps/web` implementation uses Next.js, TypeScript, and TailwindCSS for the HSV OS 0.2 frontend MVP. Backend, database, authentication, document storage, and external service decisions remain open for production architecture.

## System Boundaries

### Web Application

The web application will serve authenticated users through role-based navigation. It should provide commercial workspace views, campaign operations, account intelligence, opportunity boards, contract records, multi-helicopter fleet readiness, helicopter digital twins, component-control views, maintenance forecasts, technical records, compliance alerts, document management, campaign approvals, assistant chat, dashboards, and report exports.

### API Application

The API owns authentication enforcement, tenant isolation, domain validation, workflow orchestration, audit logging, integration calls, and AI tool execution. The API should expose stable resource-oriented endpoints and internal service boundaries for high-risk operations.

### Database

The database is the system of record for tenants, users, companies, owners, vessels, contacts, opportunities, contracts, campaigns, campaign assignments, helicopters, helicopter digital twins, components, flight logs, maintenance events, maintenance timeline events, maintenance alerts, replacement history, overhaul plans, reserve plans, technical records, compliance items, compliance alerts, documents, intelligence items, assistant sessions, audit logs, dashboards, and reports.

### Background Workers

Background workers should handle email sending, scheduled follow-ups, intelligence ingestion, document processing, report generation, AI summarization jobs, flight-hour recalculation, digital twin snapshot refreshes, maintenance timeline generation, maintenance alert generation, compliance alert generation, maintenance forecast refreshes, reserve accrual updates, and integration retries. These jobs must be idempotent and auditable.

### Integration Layer

Integrations should be isolated behind clear adapters:

- SMTP or transactional email provider for outbound campaigns.
- Document storage for files and generated proposals.
- AI model provider for assistant and extraction workflows.
- Calendar or task systems for follow-up scheduling when required.
- External market data sources when approved and legally usable.

## Domain Modules

### Identity and Tenancy

Manages tenants, operations, users, roles, permissions, invitations, sessions, and audit identity.

### Commercial CRM

Manages companies, fleet owners, contacts, vessels, opportunities, interactions, tasks, and contracts.

### HSV-SPEC-005 Campaigns

Manages helicopter deployments within tuna-vessel campaigns. Campaigns connect client, fleet owner, vessel, contract, helicopter, pilot, mechanic, flight logs, maintenance events, inventory usage, purchases, technical records, compliance obligations, and future billing or profitability. Campaign readiness is a derived operational review, not a manually typed confidence note.

### HSV-SPEC-001 Fleet & Maintenance

Manages multiple helicopters, aircraft registry, current Hobbs/hourmeter, component control, TSN, TSO, life limits, calendar limits, status calculation, flight-hour logging by campaign, maintenance alerts, maintenance forecast, component replacement history, overhaul planning, maintenance reserve planning, operational constraints, pilot/mechanic assignment references, and document readiness.

### HSV-SPEC-002 Maintenance Crew Portal

Provides restricted maintenance-only access for maintenance chiefs and authorized maintenance staff. It exposes only the workflows required to register flight hours, create maintenance logs, post hourmeter updates, record component removals and installations, attach maintenance evidence, trigger component recalculation, generate maintenance alerts, and review maintenance audit trails. It must not expose commercial pipeline, pricing, CRM outreach, or executive-only data.

### HSV-SPEC-003 Vessel Inventory

Manages inventory stored across vessels, vessel bodegas, helicopters, and the main warehouse. It tracks components, hardware, consumables, oils, filters, tools, kits, quantities, minimum stock, stock status, item condition, serial numbers, lot or batch numbers, expiration dates, transfers, and maintenance-event usage. Inventory ledgers must preserve traceability from purchase to storage to installation or consumption.

### HSV-SPEC-004 Purchasing

Manages operational purchasing from request through closure. It supports purchase requests, suppliers, quotes, purchase orders, item lines, cost, currency, related helicopter, vessel, campaign, maintenance event, workflow status, and attachments. It does not implement accounting, tax reporting, accounts payable, bank reconciliation, or Panama compliance workflows in the current scope.

### HSV-SPEC-006 Technical Records

Manages structured aviation evidence: 8130 forms, logbook pages, work orders, invoices, photos, release-to-service documents, certificates, inspection documents, maintenance evidence, component documents, and aircraft documents. Technical records link to helicopters, components, maintenance events, campaigns, purchases, inventory items, and compliance items.

### HSV-SPEC-007 Compliance

Manages AAC Panama, DGAC Ecuador, FAA references where relevant, Robinson Service Bulletins, Airworthiness Directives, Service Letters, manual revisions, life-limit compliance, and operational regulatory requirements. Compliance alerts must identify when a regulation, AD, SB, or manual revision affects a helicopter, component, campaign, or operation.

### HSV-CORE-001 Business Rules Engine

Owns production rules for flight-hour deduction, component status, calendar expiry, campaign assignment, inventory consumption, purchase-to-inventory traceability, maintenance event creation, compliance alerts, and forecasting. UI implementations may preview results, but production calculations must be governed, versioned, server-side, and auditable.

### HSV-CORE-002 Helicopter Digital Twin

Builds each helicopter's operational truth graph from registry, meter readings, installed components, component life, maintenance history, flight history, campaign history, vessel assignment history, technical records, photos, costs, forecast, compliance exposure, and future asset profile.

### Market Intelligence

Manages intelligence sources, items, confidence scores, reviews, alerts, entity links, and resulting recommended actions.

### Documents

Manages uploaded documents, generated proposals, contracts, insurance documents, aircraft documents, certificates, and version history.

### Email Automation

Manages templates, campaign segments, approval queues, send events, replies, suppression lists, and follow-up automation.

### AI Assistant

Manages assistant sessions, tool calls, retrieved context, generated drafts, citations, human approvals, and safety limits.

### Dashboards and Reports

Manages saved dashboard definitions, metrics, exports, scheduled reports, and executive summaries.

## Data Flow Principles

- Commercial records are created manually, imported from reviewed files, or generated through approved workflows.
- Market intelligence enters as unverified until reviewed or assigned a confidence level.
- AI can draft, summarize, classify, and recommend but cannot silently become the source of truth.
- Email sends require approved templates, approved recipients, and suppression checks.
- Contract updates must preserve history and audit metadata.
- Operational feasibility signals must be derived from aircraft and maintenance records, not typed casually into opportunity notes.
- Campaign readiness signals must be derived from commercial, contract, aircraft, crew, maintenance, inventory, purchasing, technical-record, and compliance data.
- Helicopter digital twins must be computed from authoritative ledgers and records. Digital twin snapshots are summaries, not independent sources of truth.
- Flight logs are authoritative operating events. Approved flight logs must recalculate helicopter totals, component remaining hours, component status, maintenance alerts, reserve accrual, and campaign feasibility.
- Component status must be derived from hour and calendar rules. Manual status overrides require reason, approval, expiration, and audit history.
- Workbook imports must separate opening balances from ongoing flight-ledger events. Imported TSN, TSO, life limits, calendar limits, and status criteria initialize the aircraft/component state; future changes come from approved flight logs, replacements, inspections, and maintenance events.
- Maintenance crew actions must be permission-scoped, audited, and tied to helicopter, component, maintenance event, and evidence records.
- Inventory movement must be ledger-based. Transfers between vessels, bodegas, helicopters, and warehouse locations cannot silently overwrite balances.
- Purchasing events must link to inventory receipt and maintenance usage without becoming accounting postings.
- Technical records must preserve checksums, versions, confidentiality, review state, and entity links.
- Compliance alerts must preserve applicability basis and supporting evidence or resolution reason.

## Multi-Tenant Strategy

Use tenant-scoped records for every business entity. Every query path must enforce tenant identity. Cross-tenant administrative access should be explicit, logged, and limited to platform operators.

Recommended baseline:

- `tenant_id` on all tenant-owned tables.
- Row-level security or equivalent enforcement where supported.
- Tenant-aware background jobs.
- Tenant-specific email identities and templates.
- Tenant-scoped document storage prefixes.
- Tenant-scoped helicopter registries, component ledgers, maintenance thresholds, reserve assumptions, and forecast rules.
- Tenant-scoped campaign assignment policies, technical record requirements, compliance applicability rules, and digital twin snapshots.

## API Design Principles

- Resource APIs should be predictable and versioned.
- Mutations should validate domain rules server-side.
- High-risk actions require explicit commands: send campaign, approve draft, update contract status, archive intelligence, generate proposal, approve flight log, replace component, override maintenance status, and publish maintenance forecast.
- Bulk imports must run through preview, validation, approval, and commit phases.
- Every important mutation must write an audit event.

## Observability

Production must include structured logs, request IDs, job IDs, audit events, metrics, error tracking, and operational dashboards. Commercial actions, email sends, AI generations, document changes, login events, permission changes, and export events are audit-worthy.

## Architecture Decisions to Make Before Coding

- Web framework and design system.
- API runtime and service packaging.
- Database engine and migration tool.
- Authentication provider.
- File storage provider.
- Email provider.
- AI provider and retrieval architecture.
- Maintenance threshold policy, flight-hour posting rules, and component import mapping from `Control Maestro`, `Resumen Ejecutivo`, and `Leyenda` in the component-control workbook.
- Campaign readiness policy and required approval roles.
- Business Rules Engine implementation strategy, rule versioning, and execution audit model.
- Helicopter digital twin snapshot refresh cadence and timeline event generation model.
- Technical Records storage provider, document classification, required record sets, and retention policy.
- Compliance source-management policy for AAC Panama, DGAC Ecuador, FAA references, Robinson SBs, ADs, Service Letters, and manual revisions.
- Maintenance crew portal role boundaries and offline evidence-capture needs.
- Inventory location hierarchy, serialization policy, and transfer approval requirements.
- Purchasing approval limits, supplier validation rules, and future accounting integration boundaries for Panama compliance.
- Hosting platform and deployment strategy.
- Analytics and observability stack.
