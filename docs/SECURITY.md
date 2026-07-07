# Security

## Security Objective

Protect commercial relationships, contact data, contracts, aircraft records, documents, AI context, and tenant separation. The platform will handle sensitive business information even when it does not process regulated financial or medical data.

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
- Maintenance coordinator.
- Analyst.
- Document manager.
- Read-only viewer.

Sensitive permissions:

- Manage users.
- Export data.
- Send email campaigns.
- Approve AI-generated external text.
- Modify contracts.
- Modify aircraft or maintenance records.
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

## Audit Logging

Audit events should include:

- Login and failed login.
- User invitation and role changes.
- Permission changes.
- Record creation, update, archive, and restore.
- Contract status changes.
- Document upload, download, and version changes.
- Email approval and send events.
- AI-generated draft approval and application.
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
- Document access tests.
- Audit event verification.
- Backup and restore validation.
