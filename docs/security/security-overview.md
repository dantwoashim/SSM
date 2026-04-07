# Security overview

## Baseline controls

- Invite-only portal with signed session cookies
- Founder-seeded access with customer invites for named engagements
- Database-backed audit log for lead conversion, report publication, and artifact uploads
- Local artifact storage for founder-operated mode, with S3-compatible object storage for hosted mode
- Background notification outbox records instead of synchronous request-path delivery
- Founder-operated backup steps for local mode, plus deployment and readiness checks for hosted mode
- Request correlation through `x-request-id` response headers
- Audit rows now preserve actor/request context when the web layer has that information

## Data handling

- Engagement data is scoped to a named company and target customer
- Evidence artifacts should be uploaded only to scoped engagement records
- Artifacts that trigger lightweight safety heuristics are marked for internal review and are not downloadable by customer contacts until cleared
- Reports are generated from structured findings and can be exported as PDFs
- Customer-visible findings and report output are intentionally separate from operator notes

## Current compliance position

- Practical security baseline for a service-led product
- SOC 2 preparation deferred until initial revenue
- No public claim of certification, attestation, or third-party audit

## Secret handling expectations

- Treat `apps/web/.env.local` as machine-local only
- Rotate founder credentials and `SESSION_SECRET` before any public launch
- Use the clean source bundle from `npm run package:source` when sharing the codebase outside the working machine

Operational expectations are documented in [docs/operations.md](../operations.md).
