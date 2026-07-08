# Project Status

## Current Version

Current product version: HSV OS 0.2 Operational MVP.

HSV OS 0.2 is the active baseline for stabilization. It includes the existing operational MVP scope for Fleet & Maintenance, helicopter registry, vessels, components, flight logs, maintenance alerts, maintenance crew workflows, vessel inventory, purchasing, campaign-oriented views, Aircraft Operations Center views, technical records, compliance views, bilingual UI foundations, and official HeliServiX OS branding that already exist in the repository.

## Feature Freeze Policy

Feature Freeze is active.

No new modules, product domains, architecture expansions, major workflow redesigns, or speculative capabilities may be added while the freeze is active.

Allowed work during freeze:

- Stability improvements.
- Usability improvements.
- Performance improvements.
- Data integrity improvements.
- Business rule hardening.
- UX polish inside existing modules.
- Bug fixes.
- Documentation updates that clarify existing approved scope.
- Test coverage and verification improvements.
- Refactoring that reduces risk without changing product scope.

Disallowed work during freeze:

- New modules.
- New strategic architecture.
- New product domains.
- New workflows unless explicitly requested by the user.
- Rebranding or visual redesign beyond approved brand-system alignment.
- Backend, database, authentication, or external service expansion unless explicitly requested by the user.
- Placeholder features that imply future behavior not yet approved.

## Definition of Done

A change is done only when it satisfies all applicable rules below:

- The change improves stability, usability, performance, data integrity, business rules, or UX.
- The change stays inside existing approved modules and workflows.
- User-facing text follows the bilingual UI system where practical.
- Imported, entered, demo, and generated records remain clearly separated.
- Demo data is never presented as operational truth.
- Business rules produce deterministic, explainable outcomes.
- Edge cases are handled without silent data loss.
- Existing localStorage behavior remains backward compatible unless a migration is documented.
- The UI remains responsive on desktop and mobile.
- The change does not introduce unrelated refactors.
- Lint, typecheck, and build pass when application code changes.
- Documentation is updated when behavior, rules, or operating policy changes.
- The commit contains only files relevant to the approved task.

## Release Checklist

Before any release candidate:

- Confirm the release version and scope.
- Confirm Feature Freeze exceptions, if any, were explicitly approved.
- Run lint.
- Run typecheck.
- Run production build.
- Review browser console for runtime errors in core screens.
- Verify dashboard, navigation, and responsive layout.
- Verify Fleet & Maintenance screens.
- Verify helicopter detail and Aircraft Operations Center views.
- Verify component status calculations.
- Verify Aircraft Migration Center using `HSV-IMPORT-COMPONENTS-v1.xlsx`, including `Control Maestro`, metadata rows 4 and 5, component header row 7, component data rows 8+, optional Observaciones, manual metadata correction, and manual column confirmation.
- Verify flight-hour logging and local recalculation.
- Verify maintenance alerts.
- Verify vessel, inventory, and purchasing screens.
- Verify technical records and compliance screens if included in the release build.
- Verify English and Spanish UI switching.
- Verify demo-data notices.
- Verify no imported or user-entered data is marked as demo.
- Review documentation changed in the release.
- Review git diff for unrelated files.
- Commit with a clear release or stabilization message.

## Development Rules

- Default to improving existing modules.
- Keep changes small, reviewable, and tied to the requested outcome.
- Do not add product scope unless the user explicitly requests it.
- Do not expand architecture during Feature Freeze.
- Do not redesign approved workflows during Feature Freeze.
- Do not create new data models unless required to fix an approved existing workflow.
- Do not invent HeliServiX fleet, vessel, component, assignment, or maintenance data.
- Keep demo records neutral and visibly labeled.
- Treat user-entered and imported records as real user data.
- Use existing project patterns before adding abstractions.
- Preserve bilingual terminology and Aircraft Operations Center naming.
- Preserve the official HeliServiX OS brand system.
- Prefer validation and clear feedback over silent failure.
- Prefer deterministic local business rules over ad hoc UI-only calculations.

## Acceptance Rules

A task is acceptable only when:

- It respects Feature Freeze.
- It clearly improves one or more approved quality goals.
- It does not create hidden future obligations outside approved scope.
- It can be verified by a reviewer.
- It does not reduce trust in operational data.
- It does not blur demo data and real data.
- It does not make the app harder to operate for aviation, maintenance, or campaign users.
- It is documented when it changes behavior, rules, or release policy.

Any task that would violate these rules must stop and wait for explicit user approval before implementation.
