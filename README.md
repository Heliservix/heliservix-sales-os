# HeliServiX Commercial Intelligence Platform

Enterprise commercial intelligence platform for helicopter operations serving tuna purse seine vessels across Latin America.

This repository is the foundation for a production SaaS product. It is not a generic CRM. The platform will combine sales pipeline management, fleet-owner intelligence, helicopter availability, maintenance awareness, contract operations, document control, email campaigns, AI-assisted research, dashboards, and reports for commercial aviation services in the tuna fishing sector.

## Operating Domain

HeliServiX supports helicopter companies that provide aerial fish-spotting and operational support to tuna purse seine vessels. The first market focus is Panama, Ecuador, Colombia, Mexico, Costa Rica, El Salvador, Peru, and the wider Eastern Pacific tuna corridor.

Core commercial model:

- Service: aerial tuna school location with Robinson R44 helicopter support.
- Commercial audience: fleet owners, vessel operators, fishing companies, ship managers, and decision makers for tuna purse seine operations.
- Delivery context: campaign-based, seasonal, annual, or vessel-specific contracts.
- Operational dependencies: helicopter availability, pilot and mechanic readiness, maintenance status, documents, vessel capacity, port location, and market events.

## Repository Structure

```text
.
|-- apps/
|   |-- api/
|   `-- web/
|-- assets/
|   `-- reference/
|-- data/
|   `-- crm/
|-- docs/
|-- infra/
|-- packages/
|   `-- shared/
`-- scripts/
```

## Documentation Map

- [Master Plan](docs/MASTER_PLAN.md): product vision, scope, domain model, and success criteria.
- [Architecture](docs/ARCHITECTURE.md): system boundaries, application layers, integrations, and architectural principles.
- [Roadmap](docs/ROADMAP.md): phased delivery plan from foundation to multi-operation SaaS.
- [Database](docs/DATABASE.md): production data model and entity relationships.
- [CRM](docs/CRM.md): commercial operating model for companies, fleet owners, contacts, opportunities, and contracts.
- [Market Intelligence](docs/MARKET_INTELLIGENCE.md): intelligence ingestion, verification, scoring, and workflows.
- [AI](docs/AI.md): AI assistant roles, guardrails, context strategy, and approval boundaries.
- [Email Automation](docs/EMAIL_AUTOMATION.md): campaign, approval, SMTP, unsubscribe, and tracking architecture.
- [Deployment](docs/DEPLOYMENT.md): environments, release strategy, observability, and operations.
- [Security](docs/SECURITY.md): access control, data protection, auditability, and compliance posture.

Legacy planning notes from the initial repository remain in `docs/` and original CRM artifacts remain in `data/crm/`.

## Current Foundation Artifacts

- `data/crm/CRM_SCHEMA.json`: initial CRM field contract.
- `data/crm/CRM_HeliserviX_v1.xlsx`: working CRM spreadsheet used as the first operational data artifact.
- `docs/EMAIL_TEMPLATES.md`: initial outreach copy.
- `docs/N8N_WORKFLOW_PLAN.md`: early automation plan.
- `docs/PROJECT_SPEC.md`: early functional specification.
- `assets/reference/`: visual reference material retained from the original repository.

## Product Standard

Every future implementation decision should preserve three product qualities:

1. Domain specificity: workflows must reflect helicopter-supported tuna operations, not broad CRM assumptions.
2. Operational trust: commercial users must understand why an opportunity, risk, recommendation, or AI output exists.
3. Multi-operation readiness: the platform must eventually support multiple helicopter companies, countries, teams, aircraft, and fleets without redesigning the core model.
