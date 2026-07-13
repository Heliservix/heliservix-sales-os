# HSV-REBUILD-001 — Moving off localStorage to a real database

## Why

HSV OS 0.2/0.3 stores every record in the browser's `localStorage`. This
was flagged as a known limitation in `docs/KNOWN_ISSUES.md`, and using the
live app surfaced the real cost of that limitation:

- **Duplicate maintenance alerts.** The dashboard showed 112+ critical
  alerts and the HP1804 aircraft page showed 111 open alerts against only
  43 components. Root cause: alert de-duplication was done in frontend
  code (`reconcileMaintenanceAlerts` / `applyComponentImport` in
  `apps/web/lib/fleet-ops.ts` and `component-import.ts`) by matching on
  `componentId`. Whenever the Excel re-import matching logic produced a
  new id for what was really the same physical component (a near-certain
  outcome after several re-upload attempts), the app happily created a
  second "open" alert instead of updating the first one. There is no
  database constraint to stop this — it depends on JavaScript getting the
  match right every time.
- **No shared source of truth.** Every browser profile has its own
  isolated copy of the data. A Maintenance Chief Portal or a second
  person logging into HSV OS from another computer would not see the
  same fleet — they would see nothing, or a stale demo seed.
- **Two-way sync bugs.** Helicopters store `assignedVessel` and vessels
  store `assignedHelicopter` independently, and app code tries to keep
  both in sync by hand on every save. That is a second, avoidable source
  of "the numbers don't match what I entered."

None of this is a visual/CSS problem. Polishing the interface on top of
this foundation would not have fixed it.

## What changes

- **Database:** PostgreSQL via Supabase (`infra/database/schema.sql`).
  Constraints the frontend used to be responsible for are now enforced by
  the database itself:
  - `unique (helicopter_registration, part_number, serial_number)` on
    `components` — a repeated Excel import updates the existing row
    instead of creating a duplicate.
  - A partial unique index guarantees **at most one open alert per
    component per alert type** — the exact bug above becomes impossible,
    not just less likely.
  - Component status/remaining-percentage recalculation and alert
    open/resolve logic live in two Postgres trigger functions
    (`recalculate_component_fields`, `reconcile_component_alert`)
    instead of being duplicated across multiple places in a 2,300-line
    frontend file.
  - Vessel ⇄ helicopter assignment is stored in one place
    (`helicopters.assigned_vessel_id`), not mirrored on both sides.
- **Multi-user ready:** Supabase Auth + Row Level Security means a real
  login for you, your maintenance chief, and pilots can be added without
  re-architecting anything. RLS policies in the schema currently allow
  any authenticated HeliServiX user full access; tightening this to the
  Administrator / Maintenance Chief roles already described in
  `docs/HSV-SPEC-002_MAINTENANCE_CREW_PORTAL.md` is a policy change, not
  a rewrite.

## What is reused, not rebuilt

- **Business rules and domain knowledge** in every `docs/HSV-SPEC-*.md`
  file — the tiered pricing models, the component-control workflow, the
  campaign structure. These describe *your* business and did not change.
- **Brand system:** `apps/web/lib/brand.ts`, `apps/web/app/globals.css`
  design tokens, and the HeliServiX logo/colors carry over as-is.
- **Data model shape:** `apps/web/types/fleet.ts` was the direct source
  for the new SQL schema — the entities (helicopters, components,
  vessels, campaigns, alerts, etc.) are the same; they are just backed by
  real tables now instead of a JSON blob in the browser.

## What does not carry over

- The single 2,300-line `fleet-os-client.tsx` component. The new app
  will have one small component per page, each reading/writing the
  database directly, so a future change to (for example) the Compliance
  page cannot accidentally affect Components.
- `localStorage` persistence and the `Demo` vs `User` "source" flag
  hack used to fake multi-tenancy.

## Status

- [x] Schema designed (`infra/database/schema.sql`)
- [ ] Supabase project created (**action needed from Adolfo** — see chat)
- [ ] Schema applied to Supabase
- [ ] First real page (Helicopters) wired end-to-end against the database
- [ ] Remaining modules ported page by page
- [ ] HSV OS 0.2/0.3 (`apps/web`, localStorage) retired once parity is reached
