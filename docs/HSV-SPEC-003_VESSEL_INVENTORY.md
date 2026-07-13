# HSV-SPEC-003 — Vessel Inventory

## Spec Status

Product: HeliServiX OS

Module: Vessel Inventory

Status: HSV OS 0.2 frontend localStorage MVP. No backend inventory ledger, authentication, barcode scanning, or production audit persistence is implemented yet.

## HSV OS 0.2 Frontend MVP Scope

- Create and edit inventory items.
- Assign inventory to vessel and bodega/storage location.
- Track item type, name, part number, serial number, lot/batch, quantity, unit of measure, minimum stock, condition, expiration date, related helicopter, and notes.
- Record stock movements: Received, Transferred, Used, Installed, Consumed, and Adjusted.
- Update local quantity after stock movement.
- Detect low stock and expiration status in the frontend.
- Link movements to maintenance event placeholders.

Durable ledger storage, warehouse permissions, transfer approvals, barcode scanning, and backend traceability are deferred.

## Purpose

Vessel Inventory tracks aviation-related parts, consumables, tools, kits, and maintenance materials stored aboard tuna vessels, in vessel bodegas, on helicopters, and in the main warehouse. The goal is maintenance readiness and traceability, not accounting valuation.

The module must answer four operational questions:

- What is stored on each vessel?
- Where exactly is it stored?
- Is it usable, expired, low, serialized, or reserved?
- How did it move from purchase to storage to installation or consumption?

Inventory must operate in the campaign-centric model. Vessel stock readiness affects active and planned campaigns, and inventory usage should link to campaign when materials are consumed, installed, transferred, or reserved for a helicopter deployment.

## Scope

Supported inventory categories:

- Components.
- Hardware.
- Consumables.
- Oils.
- Filters.
- Tools.
- Kits.

Supported locations:

- Main warehouse.
- Vessel.
- Vessel bodega or storage location.
- Helicopter.
- In transit.
- Quarantine or inspection hold.

## Users and Roles

### Inventory Manager

- Manages item catalog.
- Creates and updates inventory locations.
- Sets minimum stock levels.
- Approves transfers and adjustments.
- Reviews stock status and exception alerts.

### Inventory User

- Records counts, transfers, receipts, and usage when permitted.
- Views vessel stock and bodega locations.
- Cannot approve high-risk adjustments unless granted.

### Maintenance Chief

- Reserves or consumes inventory against maintenance events.
- Confirms installed components and consumed materials.
- Reviews stock readiness for active vessel campaigns.

### Purchasing User

- Receives purchased items into warehouse, vessel, or transit locations.
- Links receipts to purchase orders and attachments.

## Permissions

- `inventory.locations.manage`
- `inventory.items.manage`
- `inventory.stock.view`
- `inventory.stock.receive`
- `inventory.stock.transfer`
- `inventory.stock.adjust`
- `inventory.stock.consume`
- `inventory.stock.install`
- `inventory.minimums.manage`
- `inventory.alerts.manage`
- `inventory.audit.view`

## Data Model

### `inventory_locations`

Stores main warehouse, vessels, bodegas, helicopters, transit, and quarantine locations.

Required fields:

- Tenant.
- Location type.
- Name.
- Parent location.
- Vessel when applicable.
- Helicopter when applicable.
- Country or port when applicable.
- Status.
- Notes.

### `inventory_items`

Stores catalog records.

Required fields:

- Item type.
- Name.
- Part number.
- Manufacturer when known.
- Description.
- Unit of measure.
- Serialized flag.
- Lot-tracked flag.
- Expiration-tracked flag.
- Default minimum stock.
- Notes.

### `inventory_stock_lots`

Represents physically traceable stock at a location.

Required fields:

- Item.
- Location.
- Quantity.
- Unit of measure.
- Condition.
- Serial number when applicable.
- Lot or batch number when applicable.
- Expiration date when applicable.
- Source purchase order or receipt.
- Status.

### `inventory_movements`

Immutable stock ledger.

Movement types:

- Received.
- Transferred.
- Adjusted.
- Reserved.
- Installed.
- Consumed.
- Returned.
- Quarantined.
- Disposed.

Required fields:

- Item.
- Stock lot.
- From location.
- To location.
- Quantity.
- Unit of measure.
- Related helicopter.
- Related vessel.
- Related campaign.
- Related maintenance event.
- Related purchase order.
- Performed by.
- Approved by when required.
- Movement date.
- Notes.

### `inventory_minimums`

Minimum stock policies by item and location.

### `inventory_stock_alerts`

Low-stock, out-of-stock, near-expiration, expired, missing-serial, condition, and transfer-exception alerts.

## Workflows

### HSV OS 0.2 RC1 Inventory Excel Import

The Vessel Inventory module supports bulk import from `.xlsx` workbooks so a maintenance chief or inventory user does not need to enter each vessel stock item one by one.

The import action is available from:

- Vessel Inventory.
- Vessel detail.
- Campaign detail when a weekly vessel report is tied to a faena.

AURA analyzes the workbook as operational inventory evidence before any localStorage changes are applied. It must detect columns semantically, not by fixed position. Supported headers include English and Spanish variants for item name, description, P/N, serial number, quantity, unit, bodega/storage location, vessel, helicopter, and observations.

Observaciones are optional. Missing observations must never block import, reduce confidence, or create an error. When present, observations are stored as notes.

Import preview must show:

- Vessel detected.
- Helicopter detected.
- Bodega detected.
- Items detected.
- Valid rows.
- Warnings.
- Errors.
- Possible duplicates.
- Existing stock matches.

Inventory rows are reconciled against existing localStorage inventory before saving and classified as:

- New item.
- Existing item update.
- Quantity adjustment.
- Possible duplicate.
- Missing part number.
- Missing serial number.
- Manual review required.

User actions available in the preview:

- Import all valid rows.
- Import valid rows only.
- Update existing inventory.
- Replace inventory for selected bodega.
- Merge with existing inventory.
- Skip duplicates.
- Review differences.

If bodega is missing in the workbook, the user must select or enter the bodega before importing those rows. Imported inventory is linked to vessel, bodega/storage location, campaign when available, and helicopter when applicable. Imported records are real user data and must be marked `User`, not `Demo`.

### Inventory PDF Export

The Vessel Inventory module supports an `Export Inventory PDF` action for the current inventory context. The current frontend implementation opens a clean HeliServiX OS branded print document that the browser can save as PDF.

The export must include:

- HeliServiX OS branding.
- Vessel name.
- Bodega/storage location.
- Helicopter when applicable.
- Campaign/faena when applicable.
- Report date.
- Inventory table with item name, P/N, S/N, quantity, unit, condition/status, notes, and source.
- Generated by HeliServiX OS.
- Demo/real data indicator.

PDF export is for operational review and sharing. It is not an accounting inventory valuation document.

### Receive Inventory

1. User selects purchase order or manual receipt source.
2. User selects item, quantity, unit, condition, serial or lot data, expiration date, and receiving location.
3. System validates required traceability fields.
4. System creates stock lot and receipt movement.
5. If location is a vessel or bodega, vessel stock becomes visible immediately.

### Transfer Inventory

1. User selects item and source location.
2. User selects destination: vessel, bodega, helicopter, warehouse, transit, or quarantine.
3. User enters quantity, reason, related campaign or maintenance event, and notes.
4. System validates available quantity.
5. Approval is required for serialized items, controlled components, high-value tools, or corrective adjustments.
6. System writes immutable movement events.

### Use Inventory Against Maintenance Event

1. Maintenance user selects maintenance event.
2. User selects item from vessel, helicopter, or warehouse location.
3. User records installed or consumed quantity.
4. Serialized components require serial number confirmation.
5. System links usage to helicopter, component action, and maintenance evidence.
6. System links usage to campaign when the maintenance event is part of a vessel deployment.
7. Technical records are linked when certificates, photos, invoices, 8130 forms, or release documents support the movement.
8. Stock status and minimum stock alerts refresh.

### Stock Count and Adjustment

1. User performs count by location.
2. Differences are saved as pending adjustment.
3. Inventory manager approves or rejects adjustment.
4. Approved adjustment creates ledger event with reason and audit trail.

## Stock Status Rules

- OK: quantity is above minimum and no expiration/condition issue exists.
- Low: quantity is at or below minimum.
- Out of stock: quantity is zero.
- Expiring soon: expiration date is within configured threshold.
- Expired: expiration date is past.
- Hold: item is quarantined, damaged, pending inspection, or missing required traceability.

## Audit Trail

Inventory audit events must capture:

- User.
- Timestamp.
- Item.
- Quantity.
- Unit.
- Source location.
- Destination location.
- Vessel.
- Helicopter.
- Campaign.
- Maintenance event.
- Purchase order.
- Technical record or document link when evidence supports the movement.
- Reason.
- Approval status.
- Previous and resulting stock balance.

## MVP Scope

- Location hierarchy for vessels and bodegas.
- Item catalog.
- Stock lots with quantity, UOM, condition, serial, lot, and expiration fields.
- Transfer workflow.
- Usage against maintenance events.
- Campaign-linked usage for vessel deployments.
- Low-stock and expiration status.
- Purchase-to-storage-to-usage traceability links.
- Inventory audit log.

## Acceptance Criteria

- Users can view inventory by vessel and bodega.
- Users can track multiple storage locations per vessel.
- Serialized items cannot be installed without serial confirmation.
- Lot-tracked and expiration-tracked items expose required fields.
- Transfers between vessels, bodegas, helicopters, and warehouse are ledgered.
- Maintenance usage reduces stock and links to the maintenance event.
- Stock status is derived from quantity, minimum stock, condition, and expiration.
- Purchase order receipts can be traced to vessel storage and later installation or consumption.

## Future Enhancements

- Barcode or QR scanning.
- Mobile offline stock count.
- Vendor-managed stock recommendations.
- Automatic reorder suggestions from minimum stock.
- Tool calibration and return tracking.
- Kit assembly and kit consumption workflows.
- AI-assisted packing list reconciliation.
