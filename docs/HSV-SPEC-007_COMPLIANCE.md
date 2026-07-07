# HSV-SPEC-007 — Compliance

## Spec Status

Product: HeliServiX OS

Module: Compliance

Status: Product and architecture specification. No application code, backend, database, authentication, external regulatory feed, or certified compliance attestation is included in this scope.

## Purpose

Compliance tracks regulatory, manufacturer, and operational requirements that may affect helicopters, components, campaigns, countries, and vessel deployments. The goal is operational awareness and alerting, not legal certification or regulator filing in the first release.

## Compliance Scope

The module must support:

- AAC Panama requirements.
- DGAC Ecuador requirements.
- FAA references where relevant.
- Robinson Service Bulletins.
- Airworthiness Directives.
- Service Letters.
- Manual revisions.
- Life-limit compliance.
- Operational regulatory requirements.
- Country-specific deployment requirements.

## Core Concepts

### Compliance Item

A compliance item represents a regulatory, manufacturer, manual, or operational requirement.

Fields include:

- Authority or source.
- Item type.
- Reference number.
- Title.
- Revision.
- Effective date.
- Applicability basis.
- Severity.
- Compliance due basis.
- Required action.
- Status.
- Source document.
- Notes.

### Compliance Alert

A compliance alert is generated when a compliance item affects a helicopter, component, campaign, vessel operation, or country.

Alert examples:

- New AD may affect a helicopter model or serial range.
- Robinson Service Bulletin applies to an installed component.
- Manual revision changes maintenance procedure.
- Life-limit compliance issue is detected.
- Country operational requirement affects campaign readiness.
- Required proof document is missing.

## Workflows

### Register Compliance Item

1. Compliance or maintenance user records the item source, reference, title, revision, effective date, and applicability.
2. User links source technical record or external reference.
3. User defines affected aircraft models, serial ranges, components, countries, operations, or campaigns.
4. System evaluates affected helicopters and components.
5. Alerts are generated for applicable records.

### Resolve Compliance Alert

1. User opens alert from helicopter, component, campaign, or compliance dashboard.
2. User reviews applicability and required action.
3. User links maintenance event, technical record, inspection evidence, or waiver/decision record.
4. Authorized reviewer marks alert as complied, not applicable, deferred, or superseded.
5. System records audit event and updates readiness signals.

### Manual Revision Review

1. User records manual revision.
2. System identifies affected procedures, aircraft models, components, or campaigns.
3. Responsible users review operational impact.
4. Required training, document replacement, or maintenance workflow updates are tracked.

## Data Model

### `compliance_items`

Fields:

- `tenant_id`
- `authority`
- `item_type`
- `reference_number`
- `title`
- `revision`
- `effective_date`
- `source_document_id`
- `applicability_basis`
- `affected_country`
- `affected_model`
- `affected_serial_range`
- `affected_component_category`
- `affected_part_number`
- `severity`
- `due_basis`
- `due_date`
- `due_hours`
- `required_action`
- `status`
- `notes`

### `compliance_alerts`

Fields:

- `tenant_id`
- `compliance_item_id`
- `helicopter_id`
- `component_id`
- `campaign_id`
- `maintenance_event_id`
- `alert_type`
- `severity`
- `status`
- `due_date`
- `due_hours`
- `generated_at`
- `assigned_to`
- `resolved_by`
- `resolved_at`
- `resolution_reason`
- `supporting_document_id`

## Permissions

- `compliance.items.view`
- `compliance.items.manage`
- `compliance.alerts.view`
- `compliance.alerts.resolve`
- `compliance.applicability.review`
- `compliance.readiness.override`
- `compliance.audit.view`

## Business Rules

- Compliance applicability should be computed from structured data where possible: aircraft model, serial number, component part number, component serial number, country, campaign, and operation type.
- Compliance alerts must link back to the item that generated them.
- Compliance status can affect helicopter availability and campaign readiness.
- A compliance item marked not applicable requires reason and reviewer.
- Superseded items must preserve historical status and link to the replacing item.
- Compliance proof should link to technical records.
- The system must preserve the distinction between FAA reference material, AAC Panama requirements, DGAC Ecuador requirements, Robinson manufacturer guidance, and internal operational policy.

## Acceptance Criteria

- Users can register AD, SB, service letter, manual revision, and regulator items.
- Alerts can identify affected helicopters, components, campaigns, or countries.
- Compliance proof can be linked through technical records.
- Campaign readiness reflects unresolved critical compliance alerts.
- Compliance actions are auditable by user, date, item, helicopter, component, campaign, and resolution.

## Future Enhancements

- Regulator and manufacturer source monitoring.
- AI-assisted applicability extraction with human review.
- Country-specific compliance checklists.
- Compliance calendar.
- Training acknowledgement for manual revisions.
- Compliance impact dashboard by fleet and campaign.
