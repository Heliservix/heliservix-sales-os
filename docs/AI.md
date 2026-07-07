# AI

## AI Mission

The AI assistant should make commercial and intelligence work faster while keeping humans in control. It can summarize, draft, classify, compare, extract, translate, and recommend. It must not become an unsupervised decision maker for contracts, records, email sends, or operational commitments.

## Assistant Roles

### Account Brief Assistant

Creates concise account briefs using companies, owners, contacts, vessels, opportunities, interactions, contracts, and intelligence.

### Outreach Drafting Assistant

Drafts personalized emails by language, country, contact role, vessel context, opportunity stage, and approved service terms.

### Market Research Assistant

Summarizes source material, extracts entities, identifies likely company/vessel links, and suggests confidence levels for analyst review.

### Opportunity Coach

Suggests next actions, missing information, follow-up timing, and risk factors.

### Contract Preparation Assistant

Drafts term summaries, proposal outlines, and internal review checklists from approved commercial data.

### Executive Reporting Assistant

Generates narrative summaries for pipeline, country exposure, campaign performance, and intelligence alerts.

## Guardrails

AI must not:

- Send emails directly.
- Modify CRM records without explicit user approval.
- Mark intelligence as verified.
- Approve contracts.
- Change aircraft availability or maintenance records.
- Invent vessel capacity, ownership, pricing, or regulatory facts.
- Produce external claims without source context.
- Use one tenant's data in another tenant's response.

AI may:

- Draft proposed changes.
- Summarize existing records.
- Recommend next actions.
- Prepare review checklists.
- Extract structured data from uploaded documents.
- Explain why a recommendation was made.

## Context Strategy

AI responses should use retrieved context from approved tenant records:

- Companies.
- Fleet owners.
- Contacts.
- Vessels.
- Opportunities.
- Contracts.
- Helicopters.
- Maintenance status.
- Documents.
- Intelligence items.
- Email templates.
- Prior interactions.

Each response that makes a factual claim should cite the internal record or source item that supports it. Unsupported facts should be labeled as assumptions or questions.

## Human Approval Model

AI actions should move through explicit approval states:

- Drafted.
- Reviewed.
- Approved.
- Rejected.
- Applied.

High-risk actions require approval:

- Email send.
- Record update.
- Contract text generation for external use.
- Proposal generation.
- Intelligence confidence upgrade.
- Bulk import mapping.

## Prompt and Template Governance

Prompts should be versioned and tenant-aware when they contain business language. Outreach prompts must use approved claims, approved service descriptions, and approved pricing language.

Prompt inputs should include:

- User role.
- Tenant.
- Target entity.
- Requested task.
- Allowed data sources.
- Output format.
- Safety boundaries.

## AI Audit Requirements

Log:

- User.
- Tenant.
- Timestamp.
- Model/provider.
- Task type.
- Retrieved context identifiers.
- Generated output.
- Proposed actions.
- Approval outcome.
- Applied mutation if any.

## Evaluation

AI features should be evaluated against:

- Factual accuracy.
- Citation completeness.
- Tone and language quality.
- Domain fit.
- Data privacy.
- Usefulness of recommendations.
- Refusal or escalation behavior for unsupported claims.

## Initial AI Use Cases

Start with low-risk, high-value workflows:

- Account brief from existing records.
- Follow-up email draft requiring approval.
- Market intelligence summary requiring analyst review.
- Meeting prep brief.
- Opportunity missing-data checklist.

Defer higher-risk workflows until the data model, audit logs, and approval queue are mature.
