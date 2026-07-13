# Security

## Security Objective

Protect commercial relationships, contact data, contracts, aircraft records, component-control records, flight logs, maintenance forecasts, reserve assumptions, documents, AI context, and tenant separation. The platform will handle sensitive business information even when it does not process regulated financial or medical data.

## Security Principles

- Deny by default.
- Enforce tenant isolation everywhere.
- Apply least privilege.
- Log high-risk actions.
- Store secrets outside the repository.
- Require human approval for external communication and contract changes.
- Treat AI context as sensitive tenant data.
- Prefer reversible business actions over destructive deletes.

## Authentication

Use a managed identity provider or a mature authentication framework. Production should support:

- Strong password policy or passwordless login.
- Multi-factor authentication for administrators.
- Session expiration.
- Secure password reset.
- Invitation-based tenant onboarding.
- Disabled-user enforcement.

## Authorization

Role-based access control should cover:

- Platform administrator.
- Tenant administrator.
- Executive.
- Commercial manager.
- Sales user.
- Operations manager.
- Campaign manager.
- Maintenance coordinator.
- Maintenance approver.
- Maintenance chief.
- Maintenance staff.
- Inventory manager.
- Inventory user.
- Purchasing manager.
- Purchasing requester.
- Purchasing approver.
- Analyst.
- Document manager.
- Technical records manager.
- Compliance manager.
- Read-only viewer.

Sensitive permissions:

- Manage users.
- Export data.
- Send email campaigns.
- Approve AI-generated external text.
- Modify contracts.
- Create, approve, suspend, close, or archive campaigns.
- Assign helicopters, pilots, mechanics, vessels, or contracts to campaigns.
- Modify aircraft or maintenance records.
- Approve flight logs.
- Replace controlled components.
- Override computed maintenance status.
- Access maintenance crew portal.
- Upload maintenance evidence.
- Update helicopter hourmeter values.
- Trigger component-life recalculation.
- Manage vessel inventory locations.
- Transfer inventory between vessels, bodegas, helicopters, and warehouse.
- Consume inventory against maintenance events.
- Create and approve purchase requests.
- Manage suppliers, quotes, and purchase orders.
- Receive, ship, store, install, or consume purchased items.
- Upload, review, link, download, or archive technical records.
- Manage compliance items and resolve compliance alerts.
- Override campaign readiness, technical-record readiness, or compliance readiness warnings.
- View helicopter digital twins and cost exposure.
- View maintenance reserve assumptions.
- View confidential documents.
- Delete or archive records.
- Configure integrations.

## Tenant Isolation

Every tenant-owned query must be scoped by tenant. Background jobs, AI retrieval, document access, reports, exports, and webhook processing must all enforce tenant context.

Recommended controls:

- Tenant ID in every business table.
- Server-side authorization checks.
- Row-level security where available.
- Tenant-scoped object storage paths.
- Tenant-scoped email identities.
- Automated tests for cross-tenant access.

## Data Protection

Data categories:

- Public business data.
- Contact data.
- Commercial pipeline data.
- Contract and pricing data.
- Aircraft and maintenance data.
- Campaign assignment and readiness data.
- Component serial numbers, life limits, and replacement history.
- Flight logs and campaign-hour ledgers.
- Maintenance reserve assumptions.
- Helicopter digital twin snapshots.
- Vessel inventory quantities, item condition, serial numbers, lot numbers, and transfer history.
- Supplier quotes, purchase orders, invoices, airway bills, delivery notes, certificates, and purchasing attachments.
- Technical records including 8130 forms, logbook pages, work orders, photos, release-to-service documents, certificates, component documents, and aircraft documents.
- Compliance items, compliance applicability decisions, and compliance alert resolutions.
- Maintenance evidence including logbook pages, work orders, inspection documents, certificates, photos, and invoices.
- Documents.
- AI conversation data.
- Audit logs.

Protection requirements:

- Encrypt data in transit.
- Encrypt managed storage at rest.
- Restrict document downloads.
- Limit exports by permission.
- Track access to confidential documents.
- Avoid storing unnecessary personal data.

## Email Safety

Email automation must prevent:

- Sending to suppressed contacts.
- Sending unapproved drafts.
- Sending from unauthorized tenant identity.
- Using unverified intelligence as fact.
- Exceeding provider limits.
- Continuing follow-up after a reply or opt-out.

All sends must be logged with sender, recipient, template version, campaign, status, and timestamp.

## AI Security

AI workflows must:

- Retrieve only tenant-authorized context.
- Log retrieved context identifiers.
- Keep human approval for external actions.
- Prevent prompt instructions from documents or web content from overriding platform policy.
- Mark AI-generated output.
- Avoid training or external retention when provider settings allow control.
- Redact secrets from prompts.
- Limit MVP assistant context to Fleet, Maintenance, Excel import, Vessel Inventory, Flight Hours, Component Status, and directly related operational records.
- Prevent AI from approving imports, flight logs, maintenance actions, component overrides, purchasing actions, compliance decisions, or release-to-service decisions.
- Require AI answers to reference source records or disclose that supporting data is missing.
- Treat AI-drafted reports as editable drafts requiring human review.

## Audit Logging

Audit events should include:

- Login and failed login.
- User invitation and role changes.
- Permission changes.
- Record creation, update, archive, and restore.
- Contract status changes.
- Campaign creation, approval, assignment change, suspension, completion, closure, archive, and readiness override.
- Helicopter digital twin snapshot refreshes when they create material readiness status changes.
- Helicopter meter-reading changes.
- Flight-log creation, approval, correction, and reversal.
- Component installation, removal, replacement, and overhaul status changes.
- Maintenance alert acknowledgement, override, and resolution.
- Maintenance reserve policy changes.
- Maintenance crew portal access, maintenance log creation, evidence upload, component removal, component installation, and recalculation trigger.
- Inventory receipt, transfer, adjustment, quarantine, installation, consumption, disposal, and minimum-stock changes.
- Supplier creation, quote upload, purchase request approval, purchase order status changes, receipt, shipment to vessel, storage, installation, consumption, and closure.
- Technical record upload, review, link, unlink, download, version change, expiration change, and archive.
- Compliance item creation, applicability review, alert generation, resolution, not-applicable decision, deferral, supersession, and readiness override.
- Document upload, download, and version changes.
- Email approval and send events.
- AI-generated draft approval and application.
- AI Assistant MVP prompt, retrieved source record identifiers, generated daily brief, maintenance answer, import analysis, and report draft events.
- Export events.
- Integration credential changes.

Audit logs should be append-only from the application perspective.

## Secrets Management

Never commit:

- SMTP passwords.
- API keys.
- Database URLs.
- AI provider keys.
- Auth provider secrets.
- Private certificates.
- Production export files.

Use environment-specific secret management. Rotate credentials after suspected exposure.

## Compliance Posture

The platform should be designed for responsible B2B data handling:

- Maintain lawful purpose for contact data.
- Respect opt-outs.
- Provide tenant data export capability.
- Document data retention rules.
- Limit personal data collection.
- Keep source references for intelligence.

Operational aviation compliance tracking must be treated as decision support until approved by authorized HeliServiX personnel. The system may track AAC Panama, DGAC Ecuador, FAA references, Robinson Service Bulletins, Airworthiness Directives, Service Letters, manual revisions, and life-limit requirements, but it must not imply regulator filing, legal certification, or airworthiness release without an explicit approved workflow and supporting technical records.

## Incident Response

Minimum incident process:

1. Identify and contain.
2. Preserve logs.
3. Disable compromised credentials.
4. Assess tenant and data impact.
5. Notify responsible stakeholders.
6. Remediate root cause.
7. Document lessons learned.

## Security Review Before Production

- Cross-tenant access tests.
- Role permission tests.
- Authentication review.
- Secret scanning.
- Dependency scanning.
- Email suppression tests.
- AI context isolation tests.
- Flight-log approval and correction tests.
- Component status override tests.
- Maintenance crew portal permission tests.
- Inventory movement permission and ledger immutability tests.
- Purchasing approval workflow tests.
- Campaign assignment and readiness approval tests.
- Technical record permission and confidential download tests.
- Compliance applicability and alert resolution tests.
- Digital twin snapshot tenant-isolation and source-traceability tests.
- Cross-tenant fleet-maintenance isolation tests.
- Document access tests.
- Audit event verification.
- Backup and restore validation.
