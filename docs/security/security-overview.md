# Security overview

## Baseline controls

- Invite-only portal with signed session cookies
- Founder-seeded access with customer invites for named engagements
- Database-backed audit log for lead conversion, report publication, and artifact uploads
- Local artifact storage for founder-operated mode, with S3-compatible object storage for hosted mode
- Background notification outbox records instead of synchronous request-path delivery
- Founder-operated backup steps for local mode, plus deployment and readiness checks for hosted mode
- Request correlation through `x-request-id` response headers

## Data handling

- Engagement data is scoped to a named company and target customer
- Evidence artifacts should be uploaded only to scoped engagement records
- Reports are generated from structured findings and can be exported as PDFs

## Current compliance position

- Practical security baseline for a service-led product
- SOC 2 preparation deferred until initial revenue
- No public claim of certification, attestation, or third-party audit

Operational expectations are documented in [docs/operations.md](../operations.md).
