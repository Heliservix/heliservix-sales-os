# Architecture

## Architectural Goal

Build a modular SaaS platform that can start as a focused HeliServiX commercial system and grow into a multi-operation commercial intelligence product for helicopter companies across Latin America.

The architecture should keep the commercial domain, fleet and maintenance operations, intelligence workflows, automation, and AI assistant separated enough to evolve independently while sharing one governed data model.

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

No application framework is selected yet. The foundation should remain technology-neutral until the first implementation decision is made.

## System Boundaries

### Web Application

The web application will serve authenticated users through role-based navigation. It should provide commercial workspace views, account intelligence, opportunity boards, contract records, multi-helicopter fleet readiness, component-control views, maintenance forecasts, document management, campaign approvals, assistant chat, dashboards, and report exports.

### API Application

The API owns authentication enforcement, tenant isolation, domain validation, workflow orchestration, audit logging, integration calls, and AI tool execution. The API should expose stable resource-oriented endpoints and internal service boundaries for high-risk operations.

### Database

The database is the system of record for tenants, users, companies, owners, vessels, contacts, opportunities, contracts, helicopters, components, flight logs, maintenance events, maintenance alerts, replacement history, overhaul plans, reserve plans, documents, intelligence items, campaigns, assistant sessions, audit logs, dashboards, and reports.

### Background Workers

Background workers should handle email sending, scheduled follow-ups, intelligence ingestion, document processing, report generation, AI summarization jobs, flight-hour recalculation, maintenance alert generation, maintenance forecast refreshes, reserve accrual updates, and integration retries. These jobs must be idempotent and auditable.

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

### Fleet & Maintenance Operations

Manages multiple helicopters, aircraft registry, current Hobbs/hourmeter, component control, TSN, TSO, life limits, calendar limits, status calculation, flight-hour logging by campaign, maintenance alerts, maintenance forecast, component replacement history, overhaul planning, maintenance reserve planning, operational constraints, pilot/mechanic assignment references, and document readiness.

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
- Flight logs are authoritative operating events. Approved flight logs must recalculate helicopter totals, component remaining hours, component status, maintenance alerts, reserve accrual, and campaign feasibility.
- Component status must be derived from hour and calendar rules. Manual status overrides require reason, approval, expiration, and audit history.
- Workbook imports must separate opening balances from ongoing flight-ledger events. Imported TSN, TSO, life limits, calendar limits, and status criteria initialize the aircraft/component state; future changes come from approved flight logs, replacements, inspections, and maintenance events.

## Multi-Tenant Strategy

Use tenant-scoped records for every business entity. Every query path must enforce tenant identity. Cross-tenant administrative access should be explicit, logged, and limited to platform operators.

Recommended baseline:

- `tenant_id` on all tenant-owned tables.
- Row-level security or equivalent enforcement where supported.
- Tenant-aware background jobs.
- Tenant-specific email identities and templates.
- Tenant-scoped document storage prefixes.
- Tenant-scoped helicopter registries, component ledgers, maintenance thresholds, reserve assumptions, and forecast rules.

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
- Hosting platform and deployment strategy.
- Analytics and observability stack.
