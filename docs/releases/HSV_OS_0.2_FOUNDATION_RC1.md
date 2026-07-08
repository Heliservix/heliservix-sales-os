# HSV OS 0.2 Foundation RC1

## Release Name

HSV OS 0.2 Foundation RC1

## Release Purpose

HSV OS 0.2 Foundation RC1 is the first stable foundation release candidate for HeliServiX OS, positioned as an Aircraft Operations Intelligence Platform.

This release is not the final product. It freezes the approved operational foundation before the HSV OS 0.3 Operations Command Center visual redesign begins. The objective is to provide a stable, reviewable baseline for existing modules, local operational workflows, bilingual UI structure, and the Aircraft Migration / Importer workflow.

## Feature Freeze Status

Feature Freeze is active for this release candidate.

No new modules, architecture expansion, workflow redesign, business-model changes, backend services, authentication, database connections, or external integrations are included in this RC.

## Included Modules

- Dashboard foundation.
- Fleet and helicopter registry.
- Aircraft Operations Center user-facing views.
- Components and component detail views.
- Flight logs and hour-based recalculation utilities.
- Maintenance alerts.
- Maintenance forecast views.
- Aircraft Migration / Importer for `.xlsx` component-control workbooks.
- Vessel management.
- Vessel inventory.
- Purchasing.
- Campaigns.
- Technical records.
- Compliance and compliance alerts.
- Maintenance Crew Portal placeholder workflow surface.
- HeliServiX Copilot / AURA placeholder surface using only local application data.
- Bilingual UI foundation for English and Spanish.
- Official HeliServiX OS branding.
- Demo data indicators and local data policy notices.

## Known Limitations

- Frontend-only release: no backend, database, authentication, role enforcement, or server-side audit trail is connected.
- Data is stored in browser localStorage and is not shared across devices or users.
- Imported Excel records are treated as real user data in the browser where they are imported, but they are not persisted to a central system.
- Aircraft Migration / Importer supports the current client-side workflow only; no server-side validation, approval queue, or import audit ledger exists yet.
- AURA / HeliServiX Copilot is a local-data MVP surface and does not connect to external AI services.
- Inventory and purchasing workflows are operational prototypes and do not perform accounting, tax, or Panama-compliance financial posting.
- Compliance screens organize references and status tracking, but they do not make regulatory determinations.
- Browser console verification is practical only during local runtime review; automated browser-console regression testing is not yet part of the repository.

## Known Issues

- No blocking lint, TypeScript, or production build issues were found during RC1 preparation.
- The production build may fail inside restricted sandboxes when Turbopack cannot spawn or bind its internal worker process. Running the same build with normal local permissions completed successfully.
- Dynamic detail routes depend on existing local demo or user-entered records. If a record is archived, deleted, or absent from localStorage, the app shows the existing not-found state.
- localStorage data can be cleared by browser settings, private browsing, or manual user action.

## Not Included In This Release

- HSV OS 0.3 Operations Command Center visual redesign.
- Backend API.
- Production database.
- Authentication.
- Role-based server authorization.
- Multi-user synchronization.
- Accounting.
- External AI integration.
- Email sending.
- Regulatory decision automation.
- Autonomous purchasing.
- Predictive failure modeling.
- Final production deployment.

## Testing Checklist

- App opens locally.
- Dashboard route renders.
- Sidebar navigation lists existing approved modules.
- Dashboard module cards and operational summaries render.
- Fleet views render.
- Helicopter list, create, edit, detail, archive, and delete flows are available.
- Components list, create, edit, detail, archive, and delete flows are available.
- Aircraft Migration / Importer opens and accepts `.xlsx` upload.
- Import preview displays detected helicopters, component counts, warnings, errors, duplicates, and missing data.
- Import options allow create, update, replace, merge, and duplicate skipping.
- Imported data is saved to localStorage as real user data.
- Flight log pages render and support local hour-entry workflow.
- Maintenance alerts render.
- Forecast page renders.
- Vessel list, create, edit, detail, archive, and delete flows are available.
- Vessel inventory page renders.
- Purchasing page renders.
- Campaign list, create, edit, detail, archive, and delete flows are available.
- Technical records list, create, edit, detail, archive, and delete flows are available.
- Compliance list, create, edit, detail, alerts, archive, and delete flows are available.
- HeliServiX Copilot / AURA placeholder renders with local-only data boundaries.
- Language switch updates visible English and Spanish labels.
- Demo data notice is visible where demo records are used.
- Missing-record states are handled without application crashes.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

## Acceptance Checklist

- The release stays inside approved HSV OS 0.2 Foundation scope.
- Feature Freeze remains active.
- No new modules were added.
- No approved architecture was expanded.
- No visual redesign work was started.
- Existing modules remain accessible through navigation.
- Aircraft Migration / Importer remains client-side and localStorage-based.
- Demo data and imported user data remain clearly separated.
- Bilingual UI behavior remains available.
- Known limitations are documented.
- Rollback path is documented.
- Git tag `hsv-os-v0.2-foundation-rc1` exists for this RC.

## Rollback Instructions

To return to the stable foundation snapshot before this RC documentation pass:

```bash
git fetch --tags origin
git checkout hsv-os-v0.2-foundation
```

To return to this release candidate:

```bash
git fetch --tags origin
git checkout hsv-os-v0.2-foundation-rc1
```

If a branch rollback is required, create a recovery branch from the desired tag:

```bash
git checkout -b recovery/hsv-os-v0.2-foundation hsv-os-v0.2-foundation
```

## Next Planned Version

HSV OS 0.3 Operations Command Center.

HSV OS 0.3 is planned as the next visual and operational command-center iteration after HSV OS 0.2 Foundation RC1 is accepted. No HSV OS 0.3 redesign work is included in this release candidate.
