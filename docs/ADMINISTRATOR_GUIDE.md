# HeliServiX OS 0.2 RC1 Administrator Guide

## Administrator Responsibilities

Administrators are responsible for controlling demo data, validating user-entered records, managing release-candidate review, and preparing the path toward backend-backed production operations.

## Local Data Model

RC1 stores application state in browser localStorage under the HeliServiX OS fleet store key. This is suitable for interface validation and controlled demonstrations only.

Administrator rule: do not treat localStorage as durable enterprise storage.

## Demo Data Governance

- Keep demo records clearly separated from real HeliServiX records.
- Do not rename demo records into real operational records.
- Use User source records for entered or imported data.
- When reviewing screens with operations staff, remind users that demo assignments are not operational truth.

## Import Governance

Approved Excel import should follow this sequence:

1. Use the Aircraft Migration Center.
2. Confirm workbook source and version.
3. Review detected worksheet names.
4. Confirm detected helicopter registrations.
5. Review column mapping confidence.
6. Correct mapping manually when needed.
7. Review validation warnings and errors.
8. Import selected helicopters only.
9. Confirm imported records are marked as User data.

## Release Candidate Validation

Before approving a later production release:

- Confirm backend persistence is implemented.
- Confirm authentication and role-based authorization are implemented.
- Confirm audit trail cannot be edited from the client.
- Confirm technical documents have durable storage.
- Confirm imported workbook data can be backed up and recovered.
- Confirm production telemetry, error reporting, and deployment rollback are available.

## User Support

For RC1, support issues should be classified as:

- Route/rendering issue.
- Form validation issue.
- LocalStorage persistence issue.
- Business-rule calculation issue.
- Excel import mapping issue.
- Responsive layout issue.
- Documentation or terminology issue.

## Release Tag

The RC1 Git tag is `hsv-os-0.2-rc1`.

The release display title is `HSV OS 0.2 RC1`.
