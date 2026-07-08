# HSV OS 0.2 RC1 Known Issues

## Scope-Limited Issues

1. Backend services are not connected.

   All operational data is stored in browser localStorage. Data entered in one browser profile is not available to another user, device, or browser unless manually exported or migrated later.

2. Authentication is not active.

   Role concepts such as Administrator and Maintenance Chief are represented in the interface, but access restrictions are not enforced by a server or identity provider in RC1.

3. Demo records are present.

   Demo fleet, vessel, component, campaign, inventory, purchasing, technical-record, and compliance records exist to validate the interface. They must not be used as operational truth.

4. Excel imports are local only.

   Aircraft Migration Center imports component-control data into localStorage. Imported records are real user data in the browser, but they are not stored in a backend database.

5. Technical documents are placeholders.

   Attachment fields capture document references or placeholder descriptions. Actual file storage, document versioning, and evidence retention are future backend work.

6. Compliance decisions are not automated.

   Compliance records and alerts support review workflows only. RC1 does not determine legal airworthiness, regulatory applicability, or release-to-service approval.

7. HeliServiX Copilot is local and conservative.

   Copilot reads local application data and generates deterministic operational summaries. It does not call an external AI model, and it does not replace mechanic, inspector, or management approval.

8. Accounting is out of scope.

   Purchasing supports operational traceability only. Panama-compliant accounting, invoicing, tax handling, and financial statements are not included in RC1.

## Operational Cautions

- Do not use RC1 as the system of record for live maintenance release decisions.
- Do not rely on browser localStorage as a backup mechanism.
- Do not clear browser data if imported or entered records must be preserved.
- Do not treat demo aircraft/vessel assignments as HeliServiX operational data.
- Review imported workbook mappings before committing import results.

## Deferred Fixes

- Backend database and API persistence.
- Authentication and role-based authorization.
- Server-side audit trail.
- File storage for technical records and maintenance evidence.
- Production observability and error reporting.
- Formal data export/import recovery workflow.
