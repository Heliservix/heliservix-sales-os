# Master Plan

## Product Identity

HeliServiX Commercial Intelligence Platform is a production SaaS application for helicopter companies that sell, operate, and manage aerial tuna school location services for purse seine fleets.

The platform is built around a narrow, high-value operating model: commercial teams must understand fishing companies, fleet ownership, vessel capacity, seasonal operations, port geography, aircraft readiness, contract economics, and market signals before proposing helicopter support. A generic CRM records names and deals. This platform connects commercial intelligence to aviation operations.

## Strategic Objective

Create a commercial operating system that helps helicopter operators identify the best tuna fleet opportunities, manage relationships, prepare compliant proposals, track contracts, understand market movement, and coordinate commercial commitments with helicopter availability and maintenance reality.

The first business line is HeliServiX support for tuna purse seine vessels in Latin America. The architecture must allow future helicopter operations, territories, aircraft, and commercial teams to run from the same platform with strict data separation.

## Primary Users

- Executive leadership reviewing pipeline, revenue exposure, fleet relationships, and strategic opportunities.
- Commercial directors managing owners, operators, contacts, proposals, follow-ups, and negotiations.
- Operations managers checking aircraft, pilot, mechanic, maintenance, and document readiness before commitments.
- Maintenance coordinators maintaining aircraft status, scheduled service windows, airworthiness records, and operational constraints.
- Analysts collecting market intelligence about vessels, companies, ports, ownership, regulations, fishing activity, and competitor signals.
- Administrative users managing documents, templates, permissions, campaign approvals, and reporting.

## Core Capabilities

### Commercial Intelligence

The platform maintains structured records for companies, fleet owners, vessels, contacts, opportunities, contracts, and interactions. It must support ownership chains, operating companies, vessel-level metadata, market events, and commercial priority scoring.

### Helicopter Operations Context

Commercial workflows must understand helicopter inventory, maintenance status, availability windows, operating limitations, document readiness, and assigned personnel. A contract cannot be evaluated only as a sales opportunity; it must be evaluated as a delivery commitment.

### Market Intelligence

Market intelligence includes company news, fleet movement, port activity, vessel additions, regulatory changes, fishery seasonality, competitor activity, safety incidents, and procurement signals. Intelligence must be source-tracked, scored, reviewed, and linked to the relevant commercial entities.

### Email Campaigns

Campaigns must support personalized outreach by country, vessel capacity, fleet role, language, contact seniority, and opportunity stage. Sending must require approval, respect opt-out rules, and write every event back to the CRM timeline.

### AI Assistant

AI should assist with research summarization, account briefs, opportunity next actions, draft emails, call preparation, document extraction, and report generation. AI must not directly mutate commercial records, send emails, approve contracts, or produce unsupported factual claims without attribution.

### Dashboards and Reports

Dashboards must serve executives, commercial teams, operations, and analysts. Reports should explain pipeline value, weighted opportunity health, country exposure, aircraft commitment risk, campaign performance, follow-up compliance, intelligence alerts, and contract status.

## Product Boundaries

The first product should not become a full aviation maintenance management system, accounting platform, payroll platform, or vessel tracking platform. It should integrate with specialized systems when needed and maintain enough operational context to protect commercial decision quality.

The platform should not scrape or store sensitive personal data without a lawful business purpose. Public intelligence must remain source-based and reviewable.

## Multi-Operation Model

The product must support multiple helicopter operations across Latin America. Each operation can have its own aircraft, personnel, countries, contacts, documents, templates, email identities, permissions, and reporting views.

The recommended model is multi-tenant at the application layer with strong tenant isolation in the database. Cross-tenant analytics should only use anonymized or explicitly shared data.

## Success Criteria

- Commercial users can identify and prioritize high-value fleet owners and vessels.
- Every opportunity has a clear company, owner, vessel, contact, stage, value estimate, next action, and operational feasibility signal.
- Contract proposals reflect aircraft availability, included hours, campaign type, and excluded cost assumptions.
- Market intelligence can trigger account updates and opportunity recommendations without becoming unverified rumor.
- Email campaigns are personalized, approved, compliant, and fully traceable.
- AI outputs cite internal records or source references and remain human-approved for external communication.
- Leadership can see pipeline, risk, and operational commitment in one place.

## Near-Term Foundation Decisions

- Keep the product domain centered on helicopter-enabled tuna fleet services.
- Treat companies, fleet owners, vessels, contacts, opportunities, contracts, helicopters, maintenance, documents, market intelligence, campaigns, AI interactions, dashboards, and reports as first-class domains.
- Build an auditable data model before building user interface screens.
- Design every workflow around future multi-operation support.
- Require human approval for outbound messages, contract changes, and AI-assisted commercial recommendations.
