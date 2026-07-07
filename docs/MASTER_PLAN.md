# Master Plan

## Product Identity

HeliServiX OS is a production SaaS operating system for helicopter companies that sell, operate, and manage aerial tuna school location services for purse seine fleets.

The platform is built around a narrow, high-value operating model: commercial teams must understand fishing companies, fleet ownership, vessel capacity, seasonal operations, port geography, aircraft readiness, contract economics, and market signals before proposing helicopter support. A generic CRM records names and deals. This platform connects commercial intelligence to aviation operations.

## Strategic Objective

Create a commercial and operational system that helps helicopter operators identify the best tuna fleet opportunities, manage relationships, prepare compliant proposals, track contracts, understand market movement, coordinate commercial commitments with multi-helicopter fleet availability, and maintain operational traceability across maintenance, vessel inventory, and purchasing.

The first business line is HeliServiX support for tuna purse seine vessels in Latin America. The architecture must allow future helicopter operations, territories, aircraft, and commercial teams to run from the same platform with strict data separation.

## Campaign-Centric Operating Model

Campaigns are now the central operating entity of HeliServiX OS. HeliServiX does not only manage helicopters; it manages helicopter deployments within tuna-vessel campaigns.

A campaign connects the client or fleet owner, vessel, contract, helicopter, pilot, mechanic, flight logs, maintenance events, inventory usage, purchases, technical records, compliance obligations, and future billing or profitability analysis. This model gives leadership one operating spine for understanding whether a commercial commitment can be delivered safely, profitably, and with full traceability.

## Product Domains

HeliServiX OS product domains are:

- Commercial.
- Campaigns.
- Flight Operations.
- Fleet.
- Maintenance.
- Vessel Inventory.
- Purchasing.
- Technical Records.
- Compliance.
- Intelligence.
- Finance future.
- Administration.

## Primary Users

- Executive leadership reviewing pipeline, revenue exposure, fleet relationships, and strategic opportunities.
- Commercial directors managing owners, operators, contacts, proposals, follow-ups, and negotiations.
- Operations managers checking aircraft, pilot, mechanic, maintenance, and document readiness before commitments.
- Campaign managers coordinating client, vessel, aircraft, crew, contract, inventory, purchasing, and readiness across active deployments.
- Maintenance coordinators maintaining aircraft status, scheduled service windows, airworthiness records, and operational constraints.
- Maintenance chiefs and authorized maintenance staff using a restricted portal to post flight hours, maintenance events, component changes, and supporting evidence.
- Inventory coordinators tracking parts, consumables, tools, kits, and serialized items stored aboard vessels and in warehouses.
- Purchasing users requesting, approving, ordering, receiving, and tracing operational purchases without turning HeliServiX OS into an accounting platform.
- Analysts collecting market intelligence about vessels, companies, ports, ownership, regulations, fishing activity, and competitor signals.
- Administrative users managing documents, templates, permissions, campaign approvals, and reporting.

## Core Capabilities

### Commercial Intelligence

The platform maintains structured records for companies, fleet owners, vessels, contacts, opportunities, contracts, and interactions. It must support ownership chains, operating companies, vessel-level metadata, market events, and commercial priority scoring.

### HSV-SPEC-001 Fleet & Maintenance

Commercial workflows must understand a fleet of helicopters from day one, not only HP1804. The platform must manage helicopter registry records, model and serial data, current Hobbs or hourmeter, component control, TSN, TSO, life limits, remaining hours, calendar limits, maintenance alerts, flight-hour logging by campaign, replacement history, overhaul planning, maintenance reserve planning, operating limitations, document readiness, and assigned personnel. A contract cannot be evaluated only as a sales opportunity; it must be evaluated as a delivery commitment against real aircraft and component constraints.

### HSV-SPEC-002 Maintenance Crew Portal

Maintenance chiefs and authorized maintenance staff need restricted access to operational maintenance workflows without exposing full CRM, commercial, or administrative data. The portal must support flight-hour registration, maintenance log entries, component removals and installations, maintenance evidence attachments, hourmeter updates, component-life recalculation triggers, alert generation, and audit trails by user, date, helicopter, component, and action.

### HSV-SPEC-003 Vessel Inventory

HeliServiX OS must track inventory stored on tuna vessels, in vessel bodegas, on helicopters, and in the main warehouse. The module must support parts, components, hardware, consumables, oils, filters, tools, kits, quantities, minimum stock, condition, serial or lot tracking, expiration dates, transfers, usage against maintenance events, and traceability from purchase to vessel storage to installation or consumption.

### HSV-SPEC-004 Purchasing

Purchasing is operational procurement, not full accounting. The module must manage purchase requests, suppliers, quotes, purchase orders, purchased items, quantities, cost, currency, related helicopter, vessel, campaign, maintenance event, workflow status, and supplier or logistics attachments. Panama-compliant accounting will be designed later as a separate capability.

### HSV-SPEC-005 Campaigns

Campaigns represent helicopter deployments within tuna-vessel operations. They connect commercial records, vessel context, contract terms, assigned helicopter, crew, flight logs, maintenance events, inventory usage, purchases, technical records, compliance readiness, and future financial analysis.

### HSV-SPEC-006 Technical Records

Technical Records manages aviation evidence and documents such as 8130 forms, logbook pages, work orders, invoices, photos, release-to-service documents, certificates, component documents, aircraft documents, and maintenance evidence. Records must link to helicopters, components, maintenance events, campaigns, purchases, and vessel inventory items when applicable.

### HSV-SPEC-007 Compliance

Compliance tracks AAC Panama, DGAC Ecuador, FAA references where relevant, Robinson Service Bulletins, Airworthiness Directives, Service Letters, manual revisions, life-limit compliance, and operational regulatory requirements. It must later alert when a regulation, AD, SB, or manual revision affects a helicopter, component, campaign, or operation.

### HSV-CORE-001 Business Rules Engine

The Business Rules Engine governs flight-hour deduction, component status, calendar expiry, campaign assignment, inventory consumption, purchase-to-inventory traceability, maintenance event creation, compliance alerts, and forecasting. Rules must be versioned, auditable, and server-side in production.

### HSV-CORE-002 Helicopter Digital Twin

Each helicopter must have a digital twin: current operational status, current hourmeter, installed components, component life remaining, maintenance history, flight history, campaign history, vessel assignment history, technical documents, photos, costs, forecast, compliance exposure, and future market value or asset profile.

### Market Intelligence

Market intelligence includes company news, fleet movement, port activity, vessel additions, regulatory changes, fishery seasonality, competitor activity, safety incidents, and procurement signals. Intelligence must be source-tracked, scored, reviewed, and linked to the relevant commercial entities.

### Email Campaigns

Campaigns must support personalized outreach by country, vessel capacity, fleet role, language, contact seniority, and opportunity stage. Sending must require approval, respect opt-out rules, and write every event back to the CRM timeline.

### AI Assistant

AI should assist with research summarization, account briefs, opportunity next actions, draft emails, call preparation, document extraction, and report generation. AI must not directly mutate commercial records, send emails, approve contracts, or produce unsupported factual claims without attribution.

### Dashboards and Reports

Dashboards must serve executives, commercial teams, operations, and analysts. Reports should explain pipeline value, weighted opportunity health, country exposure, aircraft commitment risk, campaign performance, follow-up compliance, intelligence alerts, and contract status.

## Product Boundaries

The first product should not become a certified maintenance record system, full accounting platform, payroll platform, or generic vessel tracking platform. It should integrate with specialized systems when needed and maintain enough fleet, component, maintenance, inventory, purchasing, and planning context to protect operational readiness and commercial decision quality.

The platform should not scrape or store sensitive personal data without a lawful business purpose. Public intelligence must remain source-based and reviewable.

## Multi-Operation Model

The product must support multiple helicopter operations across Latin America. Each operation can have its own aircraft, personnel, countries, contacts, documents, templates, email identities, permissions, and reporting views.

The recommended model is multi-tenant at the application layer with strong tenant isolation in the database. Cross-tenant analytics should only use anonymized or explicitly shared data.

## Success Criteria

- Commercial users can identify and prioritize high-value fleet owners and vessels.
- Every opportunity has a clear company, owner, vessel, contact, stage, value estimate, next action, and operational feasibility signal.
- Contract proposals reflect aircraft availability, component-life constraints, maintenance forecast, included hours, campaign type, maintenance reserve assumptions, and excluded cost assumptions.
- Campaigns provide a single operational view connecting client, vessel, contract, helicopter, crew, flight logs, maintenance, inventory, purchasing, technical records, compliance, and future profitability.
- Each helicopter has a digital twin that makes current status, component life, maintenance timeline, assignment history, documents, costs, and forecast understandable from one profile.
- Operations users can track multiple helicopters, component status, flight hours, maintenance alerts, replacement history, overhaul planning, and forecasted downtime.
- Market intelligence can trigger account updates and opportunity recommendations without becoming unverified rumor.
- Email campaigns are personalized, approved, compliant, and fully traceable.
- AI outputs cite internal records or source references and remain human-approved for external communication.
- Leadership can see pipeline, risk, and operational commitment in one place.

## Near-Term Foundation Decisions

- Keep the product domain centered on helicopter-enabled tuna fleet services.
- Treat companies, fleet owners, vessels, contacts, opportunities, contracts, campaigns, flight operations, fleet and maintenance operations, maintenance crew workflows, vessel inventory, purchasing, technical records, compliance, documents, market intelligence, AI interactions, dashboards, and reports as first-class domains.
- Design the helicopter model for multiple aircraft on day one, with HP1804 represented as one aircraft record rather than a system-wide assumption.
- Make campaign context mandatory for deployment analysis and recommended for flight logs, maintenance events, inventory usage, and purchases whenever operationally known.
- Build helicopter digital twins from authoritative ledgers and technical records instead of maintaining disconnected dashboard summaries.
- Treat the current component-control workbook as a migration/reference model: aircraft header becomes helicopter registry data, component rows become installed component records, workbook formulas become governed application rules, and the executive summary becomes a computed dashboard.
- Build an auditable data model before building user interface screens.
- Design every workflow around future multi-operation support.
- Require human approval for outbound messages, contract changes, and AI-assisted commercial recommendations.
