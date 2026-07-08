# HeliServiX OS 0.2 RC1 Release Notes

## Release Identity

Product: HeliServiX OS

Release: HSV OS 0.2 RC1

Release type: Operational MVP release candidate

Primary audience: HeliServiX administrators, maintenance leadership, fleet operations staff, and internal product reviewers.

## Release Purpose

HSV OS 0.2 RC1 packages the current operational MVP into a reviewable release candidate focused on fleet readiness, component control, flight-hour updates, vessel inventory, purchasing traceability, Excel-based aircraft migration, and local operational decision support.

This release candidate is not a full production deployment. It is a frontend-only SaaS interface using browser localStorage for persistence. It is intended to validate workflows, data-entry ergonomics, business-rule behavior, and operational readiness before backend, authentication, database, and multi-user services are introduced.

## Included Operational Areas

- Dashboard with HeliServiX OS branding, bilingual interface, demo-data policy, and operational shortcuts.
- Helicopter registry with create, edit, archive, delete, search, filters, sorting, and detail views.
- Vessel management with assignment fields and local helicopter synchronization.
- Component control with hour, calendar, percentage, status, and alert recalculation.
- Aircraft Migration Center for Excel-based component import using smart header mapping.
- Flight-hour logging with hourmeter updates and component-hour deduction.
- Maintenance Crew Portal simulation for maintenance logs and component changes.
- Vessel Inventory for item tracking, stock status, and movement-based quantity updates.
- Purchasing for operational purchase requests and received-item inventory creation.
- Campaigns for deployment-centered operations.
- Aircraft Operations Center for helicopter operational summaries and maintenance timeline.
- Technical Records for aviation evidence links.
- Compliance tracking and compliance alerts.
- HeliServiX Copilot MVP using only local application data.
- Reports and forecast previews using local state.

## Business Rules Confirmed For RC1

- Flight logs update the selected helicopter hourmeter.
- Flight logs deduct hours from active components assigned to the selected helicopter.
- Component status is recalculated from remaining hours, calendar days, and remaining percentage.
- Maintenance alerts are reconciled when components move into monitor, critical, or expired status.
- Inventory movements update local stock quantities.
- Received purchasing records create local inventory readiness records.
- Campaign saves synchronize helicopter and vessel assignment preview fields.
- Excel import can detect Spanish component-control headers and create user-owned aircraft/component records.

## Data Policy

Demo records remain interface-testing data only. Real fleet, vessel, component, campaign, inventory, purchasing, technical-record, and compliance data must be entered by HeliServiX or imported through approved workflows.

Imported Excel records and user-entered records are treated as user data inside the local browser store. They are not synchronized to a backend in RC1.

## Verification Summary

The RC preparation verified:

- Page route availability across all current static, dynamic, create, detail, and edit routes.
- Responsive behavior at desktop, tablet, and phone widths.
- CRUD form behavior for representative fleet, vessel, component, flight-log, campaign, inventory, purchasing, technical-record, and compliance workflows.
- Excel import parser behavior with Spanish headers, duplicate detection, helicopter detection, import creation, and post-flight recalculation.
- Lint, TypeScript, and production build checks.

## Release Constraints

- No backend is connected.
- No authentication or role-based enforcement is connected.
- No external AI API is connected.
- No regulatory source integration is connected.
- No accounting module is included.
- No multi-user synchronization is included.

## Release Decision

HSV OS 0.2 RC1 is ready for controlled internal review as an operational MVP release candidate.
