# Email Automation

## Purpose

Email automation should help HeliServiX communicate consistently with fleet owners, operators, and contacts while preserving relationship quality, compliance, and human approval. The system should support commercial outreach, follow-ups, proposal sends, campaign updates, and executive communication without turning the platform into an uncontrolled bulk sender.

## Core Principles

- Every outbound email is linked to a company and contact.
- Campaign recipients must pass suppression and consent checks.
- Personalization must use approved data fields.
- Human approval is required before sending external outreach.
- Replies, bounces, unsubscribes, and failures must be written back to the CRM timeline.
- Templates must be versioned.
- Sender identities must be tenant-specific.

## Campaign Types

- First-contact prospecting.
- Follow-up sequence.
- Proposal follow-up.
- Seasonal availability notice.
- Account reactivation.
- Intelligence-triggered outreach.
- Executive introduction.
- Contract renewal reminder.

## Segmentation

Segments should support:

- Country.
- Port.
- Company role.
- Fleet size.
- Vessel capacity estimate.
- Contact language.
- Contact seniority.
- Opportunity stage.
- Last contact date.
- Priority score.
- Relationship status.
- Suppression status.

## Template Governance

Templates should include:

- Language.
- Region.
- Contact role.
- Campaign type.
- Subject.
- Body.
- Required variables.
- Approved service claims.
- Compliance footer.
- Version.
- Approval status.

Approved variables:

- Contact name.
- Company name.
- Country.
- Port.
- Vessel or fleet reference when verified.
- HeliServiX contact identity.
- Service description.
- Follow-up context.

Unverified market intelligence should not be inserted into outbound messages as fact.

## Approval Workflow

1. User creates or selects campaign.
2. System builds recipient preview.
3. System validates required fields and suppression status.
4. Drafts are generated.
5. User reviews sample or every message depending on campaign risk.
6. Approver confirms send.
7. Background worker sends messages.
8. Events write back to CRM.
9. Follow-up tasks are created according to cadence.

## Sending Architecture

Initial provider can be SMTP through Hostinger Email if reliability and deliverability are acceptable. As volume grows, use a transactional email provider with stronger event webhooks, deliverability tooling, suppression management, and domain authentication support.

Required configuration:

- Tenant sender identity.
- SMTP host or provider API credentials.
- DKIM, SPF, and DMARC alignment.
- Rate limits.
- Bounce handling.
- Reply handling.
- Suppression list.

## Follow-Up Cadence

Default sequence:

- Day 0: first contact.
- Day 7: follow-up.
- Day 15: second follow-up.
- Day 30: final follow-up or recycle.

The cadence should pause when:

- A reply is received.
- Contact opts out.
- Opportunity moves into negotiation.
- Contact is marked invalid.
- Company is marked do not contact.

## Compliance and Relationship Protection

The platform must support:

- Unsubscribe handling.
- Do-not-contact status.
- Bounce suppression.
- Manual suppression.
- Consent/source notes.
- Audit log for every send.
- Clear sender identity.
- Low-volume relationship-focused campaigns.

## Metrics

Track:

- Drafts generated.
- Messages approved.
- Messages sent.
- Delivery failures.
- Bounces.
- Replies.
- Unsubscribes.
- Opportunities created or advanced.
- Follow-up compliance.

Email metrics should be interpreted carefully. For high-value B2B relationships, reply quality and opportunity movement matter more than open rates.
