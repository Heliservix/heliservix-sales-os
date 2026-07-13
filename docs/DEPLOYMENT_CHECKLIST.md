# HSV OS 0.2 RC1 Deployment Checklist

## Release Gate

- Confirm feature freeze remains active.
- Confirm the release candidate scope is limited to the approved operational MVP.
- Confirm all user-facing text follows HeliServiX OS bilingual and branding conventions.
- Confirm demo-data policy remains visible in the application shell.

## Code Verification

- Run `npm run lint` from `apps/web`.
- Run `npm run typecheck` from `apps/web`.
- Run `npm run build` from `apps/web`.
- Confirm no TypeScript errors.
- Confirm no lint errors.
- Confirm production build completes.

## Route Verification

Verify the following routes render without broken pages, hydration errors, or console errors:

- `/`
- `/copilot`
- `/helicopters`
- `/helicopters/new`
- `/helicopters/[registration]`
- `/helicopters/[registration]/edit`
- `/vessels`
- `/vessels/new`
- `/vessels/[id]`
- `/vessels/[id]/edit`
- `/components`
- `/components/new`
- `/components/[id]`
- `/components/[id]/edit`
- `/flight-log`
- `/flight-log/new`
- `/flight-log/[id]/edit`
- `/crew-portal`
- `/inventory`
- `/purchasing`
- `/campaigns`
- `/campaigns/new`
- `/campaigns/[id]`
- `/campaigns/[id]/edit`
- `/digital-twin`
- `/digital-twin/[registration]`
- `/technical-records`
- `/technical-records/new`
- `/technical-records/[id]`
- `/technical-records/[id]/edit`
- `/compliance`
- `/compliance/new`
- `/compliance/[id]`
- `/compliance/[id]/edit`
- `/compliance/alerts`
- `/alerts`
- `/forecast`

## Functional Verification

- Create a helicopter record and confirm it persists after reload.
- Edit a helicopter record and confirm the updated values persist.
- Create a vessel record and confirm assignment fields persist.
- Create a component with low remaining percentage and confirm calculated status.
- Save a flight log and confirm helicopter hourmeter and component remaining hours update.
- Confirm maintenance alerts appear for monitor, critical, or expired components.
- Create an inventory item and confirm low-stock status.
- Record an inventory movement and confirm quantity changes.
- Create a received purchase request and confirm inventory readiness record creation.
- Create a campaign and confirm helicopter/vessel assignment preview.
- Create a technical record and confirm it appears in linked-record summaries.
- Create a compliance item and confirm compliance alert behavior.
- Run Aircraft Migration Center with an approved `.xlsx` workbook and review preview before import.
- Confirm HeliServiX Copilot uses local records only.

## Responsive Verification

- Desktop width: confirm no page-level horizontal overflow.
- Tablet width: confirm forms, tables, and shell remain usable.
- Mobile width: confirm the module selector is available and sidebar is hidden.
- Confirm dense tables scroll inside their own containers.

## Release Tag

- Commit release candidate changes.
- Create Git tag `hsv-os-0.2-rc1`.
- Use release display title `HSV OS 0.2 RC1`.

## Deployment Decision

Deploy only for controlled internal review unless backend persistence, authentication, backup, and production observability are added and approved.
