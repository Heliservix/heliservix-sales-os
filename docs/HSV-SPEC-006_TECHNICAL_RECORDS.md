# HSV-SPEC-006 — Technical Records

## Spec Status

Product: HeliServiX OS

Module: Technical Records

Status: Product and architecture specification. No application code, backend, database, authentication, storage provider, or certified maintenance-record replacement is included in this scope.

## Purpose

Technical Records manages the aviation evidence and document graph that supports fleet readiness, maintenance traceability, component control, purchasing, inventory, campaigns, and compliance. It is not a generic document folder. It is the structured technical record layer for helicopter operations supporting tuna-vessel campaigns.

## Supported Record Types

Technical records must support:

- FAA 8130 forms where applicable.
- Logbook pages.
- Work orders.
- Invoices.
- Photos.
- Release to service documents.
- Certificates.
- Maintenance evidence.
- Component documents.
- Aircraft documents.
- Inspection documents.
- Supplier documents relevant to airworthiness or traceability.

## Linkage Requirements

Documents must be linkable to:

- Helicopter.
- Component.
- Maintenance event.
- Maintenance log.
- Component replacement or action.
- Campaign.
- Purchase request.
- Purchase order.
- Supplier quote.
- Vessel inventory item or stock lot when applicable.
- Compliance item when the record proves compliance.
- Vessel when the document supports vessel deployment readiness.

## Core Workflows

### Upload Technical Record

1. User selects technical record type.
2. User uploads file or registers an external document reference.
3. System captures title, source, document date, received date, confidentiality level, and responsible reviewer.
4. User links the record to helicopter, component, maintenance event, campaign, purchase, inventory, or compliance context.
5. System calculates checksum, creates version metadata, and stores review status.
6. Authorized reviewer approves, rejects, or requests correction.

### Link Record to Maintenance Event

1. Maintenance user opens a maintenance log, component action, inspection, replacement, or overhaul event.
2. User attaches evidence such as logbook page, work order, photo, certificate, invoice, or release to service.
3. System records document link with evidence role.
4. The maintenance event is incomplete until required evidence is present and reviewed when policy requires it.

### Technical Record Readiness Check

Readiness checks identify missing, expired, unreviewed, or conflicting documents before a helicopter is assigned to a campaign.

Checks include:

- Aircraft required document set.
- Component certificates or release documents.
- Recent maintenance evidence.
- Compliance proof for applicable SB, AD, or regulatory item.
- Purchase-to-inventory-to-installation traceability when applicable.

## Data Model

### `technical_records`

Fields:

- `tenant_id`
- `record_type`
- `title`
- `document_id`
- `record_date`
- `received_date`
- `source_type`
- `source_reference`
- `review_status`
- `reviewed_by`
- `reviewed_at`
- `confidentiality_level`
- `expiration_date`
- `notes`

### `document_links`

Fields:

- `tenant_id`
- `document_id`
- `technical_record_id`
- `linked_entity_type`
- `linked_entity_id`
- `link_role`
- `required_for_readiness`
- `created_by`
- `created_at`
- `notes`

## Permissions

- `technical_records.view`
- `technical_records.upload`
- `technical_records.link`
- `technical_records.review`
- `technical_records.archive`
- `technical_records.download_confidential`
- `technical_records.audit.view`

## Business Rules

- Technical records must preserve version history and checksums.
- A technical record may link to multiple entities, but every link must describe its role.
- Required campaign readiness documents must be reviewed before final readiness approval unless explicitly waived by an authorized user.
- Expired documents must generate alerts when they affect helicopter readiness, component validity, campaign readiness, or compliance status.
- Airworthiness-sensitive documents must be visible only to authorized maintenance, operations, compliance, and executive roles.
- AI may extract metadata from technical records only as draft data requiring human review.

## Acceptance Criteria

- Users can trace every critical maintenance or component action to supporting technical records.
- Documents can be found from helicopter, component, maintenance event, campaign, purchase, inventory item, and compliance item views.
- Missing or expired required technical records can block or warn campaign readiness.
- Technical documents remain versioned, permissioned, and auditable.

## Future Enhancements

- OCR and metadata extraction with human approval.
- Mobile photo capture.
- Digital signature support.
- Document expiration alerts.
- Required document-set templates by aircraft model, country, campaign type, and component category.
- Integration with certified maintenance record systems.
