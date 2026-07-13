# HSV OS 0.2 Foundation Release Checklist

## Release Candidate

Release: HSV OS 0.2 Foundation RC1

Next planned version: HSV OS 0.3 Operations Command Center

Feature Freeze: Active

## Scope Control

- [x] Release candidate keeps the current product as HeliServiX OS.
- [x] Positioning remains Aircraft Operations Intelligence Platform.
- [x] No new modules added.
- [x] No architecture expansion added.
- [x] No workflow redesign added.
- [x] No visual redesign started.
- [x] Existing work preserved.

## Functional Smoke Checklist

- [x] App opens locally.
- [x] Dashboard loads.
- [x] Fleet works.
- [x] Helicopters work.
- [x] Components work.
- [x] Importer opens.
- [x] Inventory works.
- [x] Purchasing works.
- [x] Campaigns work.
- [x] Technical Records work.
- [x] Compliance works.
- [x] Language switch works.
- [x] Demo data notice visible.

## Quality Checklist

- [x] Navigation routes reviewed against existing app routes.
- [x] Runtime smoke test returned HTTP 200 for dashboard, fleet, importer-adjacent, inventory, purchasing, campaigns, records, compliance, AURA / Copilot, vessel, and crew portal routes.
- [x] Dynamic detail routes provide not-found handling for missing local records.
- [x] localStorage usage remains client-side and browser-guarded.
- [x] Aircraft Migration / Importer remains `.xlsx` client-side only.
- [x] Importer keeps imported Excel records separate from demo data.
- [x] Bilingual UI foundation remains active for English and Spanish.
- [x] Known limitations documented.
- [x] Rollback instructions documented.

## Verification Commands

- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run build` passes.

## Release Gate

HSV OS 0.2 Foundation RC1 may be reviewed as the stable foundation release candidate once this checklist, the RC release notes, and the git tag are present.
