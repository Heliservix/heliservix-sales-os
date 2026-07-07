# Database

## Database Objective

The database must represent the commercial and operational reality of helicopter-supported tuna fleet services. It should be normalized enough to prevent duplicate records, flexible enough to support imperfect market data, and auditable enough for contract, campaign, AI, and document workflows.

## Core Design Principles

- Every tenant-owned record includes `tenant_id`.
- Important records include `created_at`, `updated_at`, `created_by`, and `updated_by`.
- Destructive deletes should be rare; use archive states for business records.
- Market intelligence and AI output remain traceable to sources.
- Contracts and documents require version history.
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

### Helicopter Operations

`helicopters`

- Aircraft records by tenant.
- Fields include registration, model, serial number, base location, status, operating notes, and ownership/lease status.

`maintenance_events`

- Scheduled and completed maintenance, inspections, service windows, component constraints, and return-to-service status.

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
- A helicopter can be linked to maintenance events, availability windows, documents, and contract assignments.
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

## Data Quality Rules

- Company names require normalization and duplicate checks.
- Contacts require communication consent and source tracking when used for campaigns.
- Vessel capacity estimates must distinguish verified values from estimated values.
- Market intelligence must include source and access date.
- AI-generated fields must be marked as generated until reviewed.
- Contract values must separate estimated, proposed, signed, invoiced, and realized amounts.
