# HeliServiX OS 0.2 RC1 User Guide

## Purpose

HeliServiX OS helps review helicopter operational readiness for tuna-vessel campaigns. RC1 is a local frontend release candidate for validating workflows before production backend services are connected.

## Navigation

Use the sidebar on desktop or the module selector on smaller screens to move between:

- Dashboard
- HeliServiX Copilot
- Campaigns
- Aircraft Operations Center
- Helicopters
- Vessels
- Components
- Flight Log
- Maintenance Crew
- Vessel Inventory
- Purchasing
- Technical Records
- Compliance
- Alerts
- Forecast

## Data Types

Records are marked as Demo or User.

Demo records are for interface testing only. User records are created by form entry or Excel import in the current browser.

## Creating Records

1. Open the relevant module.
2. Select the create action.
3. Enter required fields.
4. Review values before saving.
5. Select Save locally.
6. Confirm the record appears in the list after reload.

## Editing Records

1. Open the list view.
2. Select Edit on the target record.
3. Change the required fields.
4. Save locally.
5. Confirm the updated record appears in the list or detail page.

## Archiving And Deleting Records

Archive hides a record while preserving it in localStorage.

Delete removes the local record from the current browser store. Use delete only for incorrect local test records.

## Flight Hour Logging

1. Open Flight Log.
2. Select the helicopter.
3. Select vessel or campaign context.
4. Enter flight date, pilot, mechanic, Hobbs start, and Hobbs end.
5. Save locally.

After save, the system updates the helicopter hourmeter, deducts component hours, recalculates component status, and refreshes maintenance alerts.

## Aircraft Migration Center

Use Aircraft Migration Center to import component-control data from an approved `.xlsx` workbook.

Workflow:

1. Select Excel.
2. Review detected worksheets and helicopters.
3. Review component preview.
4. Validate missing data, duplicates, dates, hour values, and status differences.
5. Choose import mode.
6. Import selected helicopters.

Imported records are treated as user data in localStorage.

## Inventory

Use Vessel Inventory to record parts, tools, consumables, oils, filters, kits, and other vessel-held operational stock.

Stock status is calculated from quantity, minimum stock, and expiration date.

## Purchasing

Use Purchasing for operational purchase requests and traceability. When a purchase reaches received or later workflow status, HeliServiX OS can create a local inventory readiness record.

## HeliServiX Copilot

Copilot summarizes local data only. It can answer:

- What expires next?
- What should I inspect?
- Which helicopter has highest maintenance risk?
- Which inventory is low?

Copilot output must be reviewed against underlying records before action.

## Bilingual Interface

Use the language selector in the top navigation to switch between English and Spanish. User-entered data is not translated.
