# HSV-CORE-001 — Business Rules Engine

## Core Status

Product: HeliServiX OS

Core capability: Business Rules Engine

Status: Architecture specification. No application code, backend, database, or external services are included in this scope.

## Purpose

The Business Rules Engine is the governed calculation and decision layer for HeliServiX OS. It prevents critical operational decisions from being hidden inside spreadsheets, ad hoc notes, or page-specific UI logic.

The engine must support auditable rules for fleet readiness, campaign assignment, component life, inventory, purchasing, compliance, forecasting, and future financial exposure.

## Rule Domains

### Flight Hour Deduction

Rules:

- Approved flight logs update helicopter hourmeter state.
- Approved flight logs deduct hours from active hour-controlled components installed on the helicopter at the time of flight.
- Flight-log corrections post reversal or delta ledger events rather than silently rewriting history.
- Flight hours should link to campaign when the flight occurred under a vessel deployment.
- Recalculation must identify affected helicopter, components, alerts, forecasts, reserve ledgers, and campaign readiness.

### Component Status

Rules:

- Status is computed from remaining hours, calendar time, and remaining percentage.
- Status precedence is Expired, Critical, Monitor, OK.
- OK means more than 25% remaining and no calendar warning.
- Monitor means 10% to 25% remaining or inside configured monitor calendar window.
- Critical means less than 10% remaining or inside configured critical calendar window.
- Expired means zero or negative remaining hours, zero or negative remaining days, or past calendar limit.
- Manual overrides require permission, reason, expiration, and audit event.

### Calendar Expiry

Rules:

- Calendar limits are evaluated by local operation date policy.
- Past due or due today is Expired.
- Default Critical threshold is 30 days or less remaining.
- Default Monitor threshold is 90 days or less remaining.
- Missing calendar data creates a missing-data alert when the component category requires calendar control.

### Campaign Assignment

Rules:

- Active campaign requires vessel, country or operating area, planned operating dates, and responsible owner.
- Active campaign requires helicopter assignment unless explicitly marked as commercial-only planning.
- Grounded helicopters cannot be assigned to active campaigns.
- Expired components block assignment.
- Critical components require documented operational decision before assignment.
- Campaign changes create assignment history and audit events.

### Inventory Consumption

Rules:

- Inventory balances are derived from movement ledger events.
- Installed, consumed, disposed, or transferred quantities cannot exceed available usable quantity.
- Serialized controlled components require serial confirmation before installation.
- Inventory usage against maintenance event links stock lot, component action, helicopter, campaign when applicable, and evidence.
- Low stock and expiration alerts refresh after movements.

### Purchase-To-Inventory Traceability

Rules:

- Purchase request can link to helicopter, vessel, campaign, maintenance event, and inventory need.
- Purchase order receipts create inventory stock lots when operationally received.
- Certificates, invoices, airway bills, and delivery notes link to technical records or purchasing attachments.
- Installed or consumed purchased items should trace from request to PO to receipt to storage to usage.
- Purchasing records do not create accounting postings in current scope.

### Maintenance Event Creation

Rules:

- Maintenance events can be created by scheduled plan, flight-log alert, component status change, compliance alert, crew log, or manual operations action.
- Maintenance events affecting availability update helicopter digital twin state.
- Component removals and installations must post component life ledger events.
- Required evidence can block maintenance event closure.
- Return-to-service indicators require authorized review.

### Compliance Alerts

Rules:

- Compliance applicability is evaluated against helicopter model, serial number, component category, part number, serial number, country, campaign, and operation type.
- Applicable compliance items generate alerts.
- Critical unresolved compliance alerts affect helicopter readiness and campaign approval.
- Compliance resolution must link evidence or reason.

### Forecasting

Rules:

- Forecasts use current component state, historical monthly flight trend, planned campaign utilization, open maintenance events, lead times, and purchasing status.
- Forecast outputs are snapshots with input assumptions.
- Forecasts must identify next limiting component, due basis, expected due date, reserve exposure, procurement timing, and campaign conflicts.
- Forecasts are decision support, not certified maintenance release.

## Data Model

Recommended rule tables:

- `business_rules`
- `business_rule_versions`
- `business_rule_executions`
- `business_rule_results`
- `maintenance_recalculation_jobs`

Rule execution records should capture:

- Trigger entity.
- Trigger action.
- Rule version.
- Input snapshot reference.
- Output records created or updated.
- Warnings.
- Errors.
- Executed by.
- Executed at.

## Governance

- Rule changes require versioning.
- Critical rule changes require review before activation.
- Rule execution should be deterministic for the same inputs and rule version.
- UI may display rule outputs but must not become the source of truth for production calculations.
- Imports from spreadsheets initialize opening state; ongoing calculations come from rules and ledgers.

## Acceptance Criteria

- Core operational rules are documented, versioned, and testable.
- Flight logs, component status, calendar expiry, inventory movements, purchasing traceability, maintenance events, compliance alerts, and forecasts share a consistent rule framework.
- Rule outputs can be audited back to input data and rule version.
- Future backend implementation can move calculations server-side without rewriting product logic.
