# HSV-SPEC-004 — Purchasing

## Spec Status

Product: HeliServiX OS

Module: Purchasing

Status: Architecture and product specification. This module is operational purchasing only. It is not accounting, tax compliance, accounts payable, or bank reconciliation.

## Product Decision

HeliServiX OS must support purchasing because maintenance readiness depends on requested, quoted, ordered, received, shipped, stored, installed, and consumed items. Full accounting is explicitly out of scope for this phase.

Future accounting must be designed later for Panama compliance. Current purchasing records should preserve enough structure to support future integration without pretending to be an accounting ledger.

## Users and Roles

### Purchasing Requester

- Creates purchase requests.
- Links request to helicopter, vessel, campaign, or maintenance event.
- Adds required date, justification, and attachments.

### Purchasing Manager

- Manages suppliers.
- Requests and records quotes.
- Creates purchase orders.
- Tracks status and logistics.
- Links receipts to inventory.

### Purchasing Approver

- Approves or rejects purchase requests and purchase orders.
- Reviews cost, currency, urgency, maintenance impact, and supplier choice.

### Maintenance Chief

- Initiates urgent maintenance-related requests.
- Confirms technical suitability of parts, components, consumables, and certificates.
- Confirms installed or consumed status after receipt.

### Inventory Manager

- Receives items into warehouse, vessel, bodega, helicopter, transit, or quarantine locations.
- Links purchase order items to inventory stock lots.

## Permissions

- `purchasing.requests.create`
- `purchasing.requests.approve`
- `purchasing.suppliers.manage`
- `purchasing.quotes.manage`
- `purchasing.purchase_orders.create`
- `purchasing.purchase_orders.approve`
- `purchasing.status.update`
- `purchasing.attachments.upload`
- `purchasing.receipts.create`
- `purchasing.costs.view`
- `purchasing.audit.view`

## Status Workflow

Required statuses:

1. Requested.
2. Quoted.
3. Approved.
4. Ordered.
5. Received.
6. Shipped to vessel.
7. Stored.
8. Installed.
9. Consumed.
10. Closed.

Status changes must be recorded as immutable workflow events with user, timestamp, previous status, next status, reason, and linked entity.

## Data Model

### `suppliers`

Fields:

- Supplier name.
- Country.
- Contact name.
- Email.
- Phone.
- Website.
- Supplier type.
- Preferred supplier flag.
- Certificate capability.
- Notes.
- Status.

### `purchase_requests`

Fields:

- Request number.
- Requested by.
- Request date.
- Priority.
- Required by.
- Related helicopter.
- Related vessel.
- Related campaign.
- Related maintenance event.
- Justification.
- Status.
- Approved by.
- Approval timestamp.
- Notes.

### `purchase_request_items`

Fields:

- Item or free-text description.
- Part number.
- Quantity.
- Unit of measure.
- Estimated cost.
- Currency.
- Required certificate or document.
- Technical notes.

### `supplier_quotes`

Fields:

- Supplier.
- Purchase request.
- Quote date.
- Valid until.
- Currency.
- Lead time.
- Freight terms.
- Quote status.
- Attachments.

### `purchase_orders`

Fields:

- PO number.
- Supplier.
- Purchase request.
- Ordered by.
- Approved by.
- Order date.
- Currency.
- Status.
- Related helicopter.
- Related vessel.
- Related campaign.
- Related maintenance event.
- Ship-to location.
- Expected delivery date.
- Notes.

### `purchase_order_items`

Fields:

- Item.
- Description.
- Part number.
- Quantity.
- Unit of measure.
- Unit cost.
- Currency.
- Received quantity.
- Stored quantity.
- Installed quantity.
- Consumed quantity.
- Status.

### `purchasing_attachments`

Supported attachment types:

- Supplier quote.
- Invoice.
- Packing list.
- Airway bill.
- Delivery note.
- Certificate.
- Photos.

### `purchasing_status_events`

Immutable status history for purchase requests and purchase orders.

## Workflows

### Purchase Request

1. User creates request with item, quantity, reason, urgency, and operational linkage.
2. User links request to helicopter, vessel, campaign, maintenance event, or inventory location when known.
3. Request enters Requested status.
4. Approver reviews operational need, cost estimate, urgency, and readiness impact.
5. Approved requests can move to quote or direct order depending on policy.

### Quote Management

1. Purchasing manager records supplier quote.
2. Quote includes supplier, currency, cost, lead time, freight terms, validity, and attachments.
3. Maintenance chief confirms technical suitability when the item affects airworthiness or component control.
4. Purchasing approver selects quote or requests alternatives.

### Purchase Order

1. Purchasing manager creates PO from approved request and quote.
2. PO includes item lines, quantities, cost, currency, related operational entities, and ship-to location.
3. Approver approves PO.
4. Status moves to Ordered.
5. Supplier documents and logistics attachments are added as they arrive.

### Receive, Ship, Store, Install, Consume

1. Received items are linked to PO line items.
2. Inventory manager records receipt and condition.
3. Items shipped to vessel move through transit and vessel/bodega locations.
4. Stored items create inventory stock lots.
5. Installed or consumed items are linked to maintenance events.
6. Closed status requires all ordered quantities to be received, cancelled, installed, consumed, or otherwise reconciled operationally.

## Audit Trail

Purchasing audit events must include:

- User.
- Timestamp.
- Request or PO.
- Supplier.
- Status change.
- Cost and currency changes.
- Quantity changes.
- Related helicopter, vessel, campaign, and maintenance event.
- Attachment additions.
- Approval or rejection reason.

## MVP Scope

- Supplier list.
- Purchase request creation and approval.
- Quote record and attachment upload.
- Purchase order creation.
- Item lines with quantity, cost, and currency.
- Status workflow from Requested through Closed.
- Links to helicopter, vessel, campaign, and maintenance event.
- Attachments for quote, invoice, packing list, airway bill, delivery note, certificate, and photos.
- Receipt handoff to inventory.

## Acceptance Criteria

- Users can create purchase requests with operational linkage.
- Approvers can approve or reject requests with reason.
- Suppliers and quotes are tracked with attachments.
- Purchase orders include item lines, quantity, cost, currency, and related operational entities.
- Every status transition is audited.
- Received items can be linked to vessel inventory or warehouse storage.
- Installed or consumed items can be linked to maintenance events.
- The module does not create accounting postings, tax reports, invoices for customers, payment schedules, or bank reconciliation.

## Future Enhancements

- Panama-compliant accounting design and integration.
- Approval thresholds by amount, currency, item category, and urgency.
- Supplier performance scoring.
- Lead-time forecasting.
- Automated reorder suggestions from vessel inventory minimums.
- Certificate validation workflow.
- Freight tracking integrations.
- Multi-currency cost normalization for reporting only.
