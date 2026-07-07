# HSV-SPEC-008 — AI Assistant MVP

## Spec Status

Product: HeliServiX OS

Module: AI Assistant MVP

Current product baseline: HSV OS 0.2 Operational MVP

Status: Documentation specification only. No application code, backend, database, authentication, or external AI service implementation is included in this task.

## Purpose

The HeliServiX OS AI Assistant MVP provides focused operational support for the existing MVP scope: Fleet, Maintenance, Excel import, Vessel Inventory, Flight Hours, and Component Status.

This is not a broad commercial AI assistant. It is a conservative operational assistant designed to help HeliServiX users review data quality, understand fleet readiness, identify maintenance priorities, and draft bilingual internal reports from existing system records.

The assistant must improve speed and clarity without replacing maintenance judgment, mechanic review, IA approval, management approval, or official aviation records.

## MVP Capabilities

### 1. Excel Import Analysis

The assistant may analyze imported component workbook data before final import.

Allowed analysis:

- Identify missing required fields.
- Detect inconsistent hour values.
- Detect expired, critical, or monitor components.
- Compare workbook status against HeliServiX OS recalculated status.
- Summarize import quality.
- Highlight duplicate component matches.
- Flag rows with invalid dates or negative hour values.
- Suggest corrections before final import.

Required behavior:

- The assistant must reference workbook rows, mapped columns, and validation findings.
- The assistant must distinguish blocking errors from warnings.
- The assistant must not silently correct imported data.
- The assistant must not approve an import.
- The assistant must present corrections as suggestions for user review.

Example output:

> Import review found 42 component rows for HP-1804. Two rows are missing position, one row has workbook status OK but recalculates as Monitor, and no blocking registration or component-name errors were detected. Review rows 14, 18, and 29 before final import.

### 2. Fleet Daily Brief

The assistant may generate a daily operational brief from local system data.

The brief should summarize:

- Fleet status.
- Operational helicopters.
- Helicopters in maintenance, grounded, unavailable, or with open readiness concerns.
- Maintenance alerts.
- Upcoming due components.
- Campaign readiness risks.
- Vessel inventory risks.
- Flight-hour changes since the prior brief when available.
- Components that changed status after recent logs or imports.

Required behavior:

- The brief must identify the source records used.
- The brief must state when data is missing, demo-only, stale, or not connected to a backend.
- The brief must avoid operational certainty when source records are incomplete.
- The brief must separate facts, warnings, and recommended review actions.

### 3. Maintenance Assistant

The assistant may answer maintenance-oriented questions using local HeliServiX OS records.

Example questions:

- What should I review this week?
- Which components are critical?
- Which helicopter has the highest maintenance risk?
- What expires next?
- Which maintenance alerts are still open?
- Which components have the lowest remaining percentage?
- Which vessel inventory items may affect maintenance readiness?

Required behavior:

- Answers must be conservative and audit-friendly.
- Answers must reference underlying records such as helicopter registration, component name, part number, serial number, alert ID, due date, remaining hours, or inventory item.
- The assistant must state when it cannot answer from available data.
- The assistant must not fabricate missing records.
- The assistant must not replace mechanic, maintenance chief, IA, or authorized approver review.
- The assistant must not decide airworthiness, release to service, regulatory compliance, or dispatch approval.

### 4. Report Drafting

The assistant may draft internal operational reports from existing system data.

Supported reports:

- Fleet status report.
- Maintenance report.
- Component due report.
- Vessel inventory report.
- Management summary.

Language requirements:

- Reports must support English and Spanish.
- The product name HeliServiX OS must not be translated.
- Aviation terminology must follow `HSV-CORE-003_I18N_BILINGUAL_UI.md`.
- User-entered data such as registrations, component names, serial numbers, vessel names, notes, and document titles must not be translated unless the user explicitly requests a translated narrative version.

Required behavior:

- Reports must be clearly marked as AI-drafted.
- Reports must include source-record references.
- Reports must distinguish actual records from recommendations.
- Reports must be editable before sharing.
- Reports must not be sent externally without human approval.

## User Experience

The AI Assistant MVP should appear as an operational helper inside existing workflows, not as a separate strategic module expansion.

Recommended entry points:

- Excel import preview: Analyze import quality.
- Fleet dashboard: Generate daily brief.
- Maintenance alerts: Ask maintenance question.
- Aircraft Operations Center: Summarize aircraft risk.
- Vessel Inventory: Draft inventory risk summary.
- Reports area: Draft operational report.

Interaction principles:

- Keep answers short, structured, and actionable.
- Always show the records used.
- Show confidence or completeness warnings when data is missing.
- Offer next review actions, not autonomous decisions.
- Avoid sales, legal, accounting, and regulatory decision language.

## Data Sources

MVP data sources are limited to local HeliServiX OS records already represented in the operational MVP:

- Helicopters.
- Helicopter components.
- Component categories.
- Flight logs.
- Maintenance alerts.
- Maintenance logs.
- Component replacements and changes.
- Vessels.
- Vessel inventory items.
- Inventory movements.
- Purchase requests when they affect maintenance readiness or inventory risk.
- Campaign records when they affect readiness.
- Technical records when linked to components or aircraft.
- Compliance items only as existing decision-support records, not as final compliance determinations.
- Excel import preview rows and validation findings.

The MVP must not retrieve external web data, public sales intelligence, legal references, accounting records, or regulatory updates unless explicitly approved in a future scope.

## Safety Rules

- AI never becomes the source of truth.
- AI may summarize, classify, compare, and draft.
- AI may not create, update, archive, approve, or delete operational records without explicit user action.
- AI may not approve flight logs.
- AI may not approve imports.
- AI may not override component status.
- AI may not determine airworthiness.
- AI may not release aircraft to service.
- AI may not make regulatory compliance decisions.
- AI may not approve purchases or initiate purchasing actions.
- AI may not infer real fleet, vessel, component, or assignment data that is not present in system records.
- AI must clearly mark demo data, local-only data, imported data, and user-entered data when relevant.
- AI must disclose missing or incomplete source data.
- AI-drafted reports must be reviewed before use.

## Audit Trail

Each AI interaction should be auditable in production.

Audit fields:

- User.
- Tenant or operation.
- Timestamp.
- Assistant capability used.
- Prompt or user question.
- Language requested.
- Source record identifiers retrieved.
- Output summary.
- Warnings shown.
- User action taken after output.
- Whether output was copied, exported, or used in a report.

AI audit logs should not store unnecessary sensitive data beyond what is required for traceability, troubleshooting, and safety review.

## Prompt Governance

Prompts must be versioned and controlled like business rules.

Prompt rules:

- Use approved system instructions per capability.
- Keep separate prompts for Excel import analysis, daily brief, maintenance Q&A, and report drafting.
- Include hard safety boundaries in every prompt.
- Require source-record references.
- Require missing-data disclosure.
- Require bilingual output handling for reports.
- Prevent workbook text, user-entered notes, or document content from overriding system policy.
- Record prompt version in AI audit logs.

Prompt changes that affect recommendations, safety language, or report format require review before release.

## Explicitly Out of Scope for MVP

The AI Assistant MVP does not include:

- Sales prospecting AI.
- Market-intelligence research AI.
- Contract legal drafting.
- Accounting AI.
- Autonomous purchasing.
- Supplier negotiation.
- Regulatory compliance decisions.
- Airworthiness decisions.
- Release-to-service decisions.
- Predictive failure modeling.
- External web browsing.
- Email campaign generation.
- Autonomous record mutation.
- Backend vector search.
- Fine-tuning.
- Cross-tenant analytics.
- Chat over unrelated documents.

## Future Expansion

Future AI work may be considered only after the operational MVP is stable and explicitly approved.

Potential future expansion:

- Backend retrieval with tenant isolation.
- Technical-record summarization.
- Evidence packet drafting.
- Maintenance forecast explanation.
- Inventory reorder recommendation with human approval.
- Compliance applicability support as decision support only.
- Executive readiness summaries across operations.
- Structured report export.

Future expansion must preserve the same safety model: source references, human review, no autonomous operational decisions, and no replacement of authorized aviation judgment.

## Acceptance Criteria

- The AI Assistant MVP is limited to existing operational MVP workflows.
- The assistant supports Excel import analysis, fleet daily brief, maintenance Q&A, and bilingual report drafting.
- Every answer references underlying records or states that records are missing.
- The assistant never approves operational actions.
- The assistant never replaces mechanic, maintenance chief, IA, or authorized approver review.
- Reports support English and Spanish.
- Prompt governance and audit requirements are documented.
- Sales, legal, accounting, autonomous purchasing, regulatory decisions, and predictive failure modeling remain out of scope.
