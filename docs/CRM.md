# CRM

## CRM Positioning

The CRM module is not a generic sales pipeline. It is the commercial operating core for helicopter services sold to tuna purse seine vessel owners, operators, and fleet decision makers.

The CRM must answer four questions for every account:

1. Who controls or influences the fleet?
2. Which vessels and ports matter commercially?
3. What helicopter service opportunity exists?
4. Can HeliServiX deliver the service safely, profitably, and on time?
5. Which helicopter or helicopters can support the campaign without violating component-life, calendar-life, maintenance, or reserve constraints?

## Core Records

### Companies

Companies represent fishing companies, vessel operators, fleet managers, holding companies, ship agencies, service partners, and relevant commercial organizations.

Required capabilities:

- Country and port context.
- Industry role classification.
- Fleet size and vessel capacity indicators.
- Commercial priority.
- Relationship status.
- Source and confidence notes.
- Duplicate detection.
- Links to contacts, owners, vessels, opportunities, contracts, documents, and intelligence.

### Fleet Owners

Fleet owners may be individuals, families, corporate groups, or beneficial ownership structures. Ownership information may be incomplete or uncertain, so the system must allow confidence levels and review states.

Required capabilities:

- Link owners to companies and vessels.
- Track influence and decision-making authority.
- Preserve source references.
- Support many-to-many relationships.

### Contacts

Contacts are people who can influence commercial discussions, approve service contracts, introduce fleet owners, coordinate operations, or receive campaign communications.

Required capabilities:

- Name, title, company, email, phone, WhatsApp, language, LinkedIn, and role.
- Consent and suppression status for outreach.
- Contact quality and verification status.
- Interaction history.
- Preferred communication channel.

### Vessels

Vessel context is essential because helicopter service value depends on vessel type, capacity, region, port, and fishing operation.

Required capabilities:

- Vessel name, flag, registry/IMO when available, home port, tuna capacity estimate, owner/operator links, and status.
- Link to opportunities and contracts.
- Track source confidence for vessel metadata.

### Opportunities

Opportunities represent potential helicopter service engagements.

Recommended stages:

- Researching
- Qualified
- Contacted
- Meeting Scheduled
- Proposal Needed
- Proposal Sent
- Negotiation
- Operational Review
- Contract Drafting
- Won
- Lost
- Dormant

Required fields:

- Company.
- Primary contact.
- Country and port.
- Vessel or fleet scope.
- Estimated contract value.
- Campaign type.
- Probability.
- Stage.
- Next action and due date.
- Commercial owner.
- Operational feasibility status.
- Candidate helicopter or fleet assignment.
- Required campaign hours.
- Maintenance forecast impact.
- Maintenance reserve estimate.
- Linked intelligence.

### Contracts

Contracts represent signed or draft commercial commitments. They must connect pricing terms to operational delivery assumptions.

Required capabilities:

- Contract type: faena, seasonal, annual, vessel-specific, fleet-wide, or custom.
- Start and end dates.
- Advance amount.
- Included hours.
- Tiered rate model.
- Exclusions for fuel, oils, port fees, special logistics, and other pass-through costs.
- Aircraft and crew assumptions.
- Selected helicopter or fleet pool.
- Maintenance feasibility approval.
- Reserve cost assumption.
- Status and renewal signal.
- Document versions.

## Commercial Priority Scoring

Priority should be computed from structured factors and editable management judgment.

Suggested factors:

- Fleet size.
- Vessel capacity.
- Country and port relevance.
- Known decision maker.
- Recent market signal.
- Contract timing.
- Relationship strength.
- Operational feasibility.
- Helicopter availability and component-life constraints.
- Maintenance reserve exposure.
- Expected value.
- Probability of response.

The score should explain itself. Users should see which factors pushed an account up or down.

## Follow-Up Discipline

Every active opportunity must have a next action. No active opportunity should sit without an owner, due date, and stage.

Default cadence:

- Day 0: first contact.
- Day 7: follow-up.
- Day 15: second follow-up.
- Day 30: final follow-up or recycle.

The cadence can change by relationship quality, country, contact seniority, active negotiation, or seasonality.

## Account Timeline

The timeline should include:

- Calls.
- Emails.
- Meetings.
- WhatsApp summaries.
- Tasks.
- Notes.
- Uploaded documents.
- Campaign events.
- AI-generated drafts.
- Intelligence items.
- Stage changes.
- Contract changes.

Timeline events must be filterable by type and visible from company, contact, vessel, opportunity, and contract views.

## CRM Governance

- Contacts used for outreach require source and permission status.
- AI-drafted notes must be labeled until approved.
- Stage changes should preserve history.
- Lost opportunities require a loss reason.
- Won opportunities should create or link a contract.
- Operational review is required before marking a high-value opportunity ready for contract.
- Opportunities that consume helicopter hours must request an HSV-SPEC-001 Fleet & Maintenance feasibility signal before proposal release.
- Commercial users should see clear OK, Monitor, Critical, or Expired-derived feasibility guidance without being able to alter technical component records.
