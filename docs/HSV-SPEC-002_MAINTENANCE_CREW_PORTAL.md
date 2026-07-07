# HSV-SPEC-002 — Maintenance Crew Portal

## Spec Status

Product: HeliServiX OS

Module: Maintenance Crew Portal

Status: Architecture and product specification. Do not implement application code from this document until the workflow and permission model are approved.

## Purpose

The Maintenance Crew Portal gives maintenance chiefs and authorized maintenance staff restricted access to the operational maintenance workflows inside HeliServiX OS. It exists so maintenance data can be captured close to the work while protecting commercial, CRM, pricing, AI, and executive-only information.

The portal is not a certified maintenance record replacement in the first release. It is an auditable operational layer for flight-hour entry, maintenance activity capture, component movement, evidence attachment, recalculation triggers, and alert generation.

## Users and Roles

### Maintenance Chief

- Can register flight hours for any helicopter in assigned operations.
- Can create and review maintenance log entries.
- Can record component removals and installations.
- Can attach and review maintenance evidence.
- Can update helicopter hourmeter values with reason.
- Can trigger component remaining-hour recalculation.
- Can acknowledge, assign, and resolve maintenance alerts.
- Can view audit trails for maintenance actions.

### Maintenance Staff

- Can create draft flight-hour entries when permitted.
- Can create maintenance log entries.
- Can upload maintenance evidence.
- Can propose component removal or installation records.
- Cannot approve recalculation, override status, or close critical alerts unless explicitly granted.

### Maintenance Approver

- Can approve flight logs, hourmeter corrections, component changes, and recalculation jobs.
- Can reject entries with reason.
- Can request additional evidence.

### Operations Manager

- Can view approved maintenance readiness impact.
- Can see whether maintenance actions affect vessel assignments and campaign availability.
- Cannot alter maintenance evidence or component records without maintenance permission.

## Permissions

- `maintenance_portal.access`
- `maintenance.flight_hours.create`
- `maintenance.flight_hours.approve`
- `maintenance.logs.create`
- `maintenance.logs.review`
- `maintenance.evidence.upload`
- `maintenance.evidence.review`
- `maintenance.components.remove`
- `maintenance.components.install`
- `maintenance.hourmeter.update`
- `maintenance.recalculation.trigger`
- `maintenance.alerts.manage`
- `maintenance.audit.view`

Permissions must be tenant-scoped and operation-scoped. Users with maintenance-only permissions must not see CRM contacts, opportunity values, contract pricing, email campaigns, or AI commercial briefings.

## Core Workflows

### Flight-Hour Registration

1. User selects helicopter.
2. User enters flight date, pilot, mechanic, vessel or campaign when known, Hobbs start, Hobbs end, and notes.
3. System calculates flight hours.
4. System validates that values are not negative and do not conflict with latest approved meter reading.
5. Entry is saved as draft or submitted.
6. Authorized approver approves or rejects the entry.
7. Approved flight hours update helicopter meter state and trigger component-life recalculation.
8. Recalculation creates alerts when thresholds are reached.

### Maintenance Log Entry

1. User selects helicopter and optional component.
2. User selects log type: inspection, discrepancy, corrective action, service, cleaning, replacement, overhaul, oil/filter change, or note.
3. User enters date, description, work performed, personnel, meter reading, and operational impact.
4. User attaches supporting evidence.
5. Entry is submitted for review when required.
6. Approved entry becomes part of the helicopter maintenance timeline.

### Component Removal and Installation

1. User selects helicopter.
2. User selects removed component or creates a controlled component placeholder pending validation.
3. User enters removal date, removal meter reading, reason, and evidence.
4. User enters installed component part number, serial number, position, installation date, installation meter reading, TSN, TSO, life limit, and calendar limit.
5. System validates required controlled-component fields.
6. Authorized approver approves the component action.
7. System posts component life ledger entries and triggers recalculation.
8. System updates alerts and forecast exposure.

### Evidence Attachment

Supported evidence:

- Photos.
- Invoices.
- Logbook pages.
- Work orders.
- FAA 8130 forms where applicable.
- Certificates.
- Inspection documents.
- Delivery or service documents.

Every evidence file must record uploader, timestamp, source workflow, linked helicopter, linked component when applicable, checksum, document type, and review status.

### Hourmeter Update

1. User enters helicopter, reading type, current reading, reading date, source, and reason.
2. System compares reading against latest approved value.
3. Corrections that decrease values require approval and reason.
4. Approved updates create immutable meter-reading records.
5. If the reading affects component life, recalculation is required.

## Data Model Additions

- `maintenance_crew_profiles`
- `maintenance_logs`
- `maintenance_evidence`
- `maintenance_component_actions`
- `maintenance_recalculation_jobs`
- Extensions to `flight_logs`, `helicopter_meter_readings`, `component_life_ledger`, `maintenance_alerts`, `documents`, and `audit_logs`.

## Audit Trail

Every portal action must write an audit event with:

- Tenant.
- User.
- Role at action time.
- Action.
- Timestamp.
- Helicopter.
- Component when applicable.
- Maintenance event or log entry when applicable.
- Previous value and new value for changed fields.
- Evidence identifiers.
- Approval status.
- IP/session metadata when available.

Audit logs must be append-only from the application perspective.

## MVP Scope

- Maintenance-only login route and navigation.
- Role-gated access to maintenance workflows.
- Flight-hour entry form.
- Maintenance log creation.
- Component removal and installation form.
- Evidence upload metadata model.
- Hourmeter update workflow.
- Recalculation trigger event.
- Maintenance alert generation hook.
- Maintenance audit trail view.

## Acceptance Criteria

- Maintenance-only users cannot access CRM, contracts, email campaigns, AI commercial context, or admin settings.
- A maintenance chief can submit and approve flight-hour entries for any authorized helicopter.
- Component removal and installation records require part, serial, position, date, meter reading, and evidence status.
- Hourmeter updates are immutable meter-reading events.
- Recalculation jobs identify affected helicopter and components.
- Alerts generated by maintenance activity link back to the triggering action.
- Evidence files are linked to the correct helicopter, component, and maintenance action.
- Every high-risk action is auditable by user, date, helicopter, component, and action.

## Future Enhancements

- Offline-capable maintenance capture.
- Mobile photo capture with automatic evidence metadata.
- QR or barcode scanning for component serials and inventory.
- Two-person approval for critical component installation.
- Digital signature workflow.
- Integration with certified maintenance record systems.
- Maintenance chief dashboard by vessel campaign.
- AI-assisted evidence extraction and discrepancy summarization with human review.
