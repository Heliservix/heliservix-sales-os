# Deployment

## Deployment Objective

Deploy the platform as a reliable SaaS system with secure environments, repeatable releases, observable operations, and tenant-safe data handling.

No hosting provider has been selected yet. The architecture should support deployment to a managed cloud platform or a controlled VPS environment, but production should favor managed services for database, object storage, backups, secrets, and observability.

## Environments

### Local

Used for development and testing. Local environments should use seeded sample data that does not contain sensitive production contacts or contracts.

### Preview

Created for pull requests or feature branches when application code exists. Preview environments should use disposable data and limited integration credentials.

### Staging

Production-like environment used for release validation, migration testing, email sandbox testing, AI workflow testing, and operational rehearsals.

### Production

Live tenant environment with strict access, backups, monitoring, rate limits, audit logs, and change controls.

## Release Strategy

- Use version-controlled migrations.
- Run automated tests before deployment.
- Validate migrations against staging data before production.
- Require approval for production deploys.
- Keep rollback plan for every release.
- Separate application deployment from long-running data migrations when needed.
- Use feature flags for high-risk workflows such as email automation and AI record updates.

## Configuration

Configuration should be environment-specific and secret-free in the repository.

Required configuration categories:

- Database connection.
- Auth provider.
- Object storage.
- Email provider.
- AI provider.
- Background job queue.
- Observability keys.
- Tenant sender domains.
- Rate limits.

Secrets must be stored in a managed secret store or deployment platform secret manager.

## Background Jobs

Jobs should handle:

- Email sending.
- Follow-up scheduling.
- Webhook processing.
- Intelligence ingestion.
- Document processing.
- AI summarization.
- Report generation.
- Import validation.

Job requirements:

- Idempotency key.
- Retry policy.
- Dead-letter handling.
- Structured logs.
- Audit linkage for business actions.

## Storage

Object storage should hold:

- Uploaded documents.
- Generated reports.
- Proposal exports.
- Contract versions.
- Source documents.
- Email attachments when retained.

Storage paths must include tenant scope and should not expose internal identifiers directly in public URLs.

## Backups and Recovery

Production must include:

- Automated database backups.
- Point-in-time recovery where available.
- Object storage versioning or retention policy.
- Documented restore procedure.
- Restore testing.
- Export procedure for tenant data.

## Observability

Minimum production observability:

- Request logs with request IDs.
- Error tracking.
- Uptime checks.
- Database performance metrics.
- Queue depth and job failure metrics.
- Email send failure alerts.
- AI provider failure alerts.
- Audit event monitoring for high-risk actions.

## Operational Runbooks

Runbooks should cover:

- Failed deployment rollback.
- Database migration failure.
- Email provider outage.
- AI provider outage.
- Background queue backlog.
- Tenant data export.
- User access incident.
- Suspected credential exposure.
- Restore from backup.

## Production Readiness Checklist

- Authentication configured.
- Tenant isolation tested.
- Database migrations reversible or safely forward-fixable.
- Backups enabled and restore tested.
- Secrets stored outside repository.
- Email domain authentication complete.
- Audit logs enabled.
- Error monitoring enabled.
- Rate limits configured.
- Security headers configured.
- Admin access reviewed.
- Incident response contacts defined.
