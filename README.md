# Identity Go-Live Assurance

Enterprise identity failures do not look dramatic in a slide deck. They look like a deal that stops moving.

A vendor says it supports SSO and SCIM. The buyer's IAM team asks a few boring questions. Then the rollout hits the parts nobody exercised properly: IdP-initiated login, group-to-role mapping, JIT provisioning, deprovisioning, duplicate identities, tenant isolation, certificate rollover, or some customer-specific edge case that never showed up in the happy path.

That is the problem this repository is built to solve.

Identity Go-Live Assurance is a service-backed application for running enterprise identity readiness engagements and producing the report that buyers, security teams, and implementation owners actually need: clear scope, tested scenarios, evidence, findings, remediation guidance, and a defensible readiness signal.

## What the product does

In practical terms, the system supports the full operating loop:

1. Capture a real prospect or customer request through intake.
2. Turn that request into a named engagement.
3. Generate a scenario plan from the target IdP and required features.
4. Record execution results, findings, evidence, and operator notes.
5. Generate a structured assurance report and export it as a PDF.
6. Invite customer contacts into a scoped portal view without exposing internal-only material.

This is not a generic auth boilerplate repo. It is an operating system for a founder or small delivery team doing real enterprise identity work under real deadlines.

## Repository layout

The repository is split along operational boundaries.

- `apps/web`
  The product surface. Marketing pages, intake flow, founder portal, customer portal, report export, attachments, invite flow, and API routes all live here.

- `packages/core`
  Shared domain logic. Identity scenario definitions, taxonomy, report scoring, report rendering helpers, and sample snapshots.

- `packages/service`
  Shared application and data layer. Database access, migrations, audit logging, RBAC, background job execution, rate limiting, and service-level workflows.

- `packages/worker`
  Optional queued execution path for Redis/BullMQ-backed job processing.

- `tests/e2e`
  Browser coverage for the critical flows: intake, engagement creation, report/test-plan flow, invite issuance, artifact handling, and customer access.

## Running it locally

Requirements:

- Node.js 22 or newer
- npm
- PowerShell if you want the bundled Windows helper scripts

Install dependencies and start the app:

```powershell
npm install
Copy-Item apps/web/.env.example apps/web/.env.local
npm run seed
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The seed step creates a founder account and demo data so you can inspect the system without inventing records from scratch.

## Environment model

The smallest useful local configuration lives in [apps/web/.env.example](apps/web/.env.example).

For local work, these values matter:

- `APP_URL`
- `SESSION_SECRET`
- `FOUNDER_EMAIL`
- `FOUNDER_PASSWORD`
- `FOUNDER_NAME`

Everything else is optional in founder-operated mode.

The application is intentionally tolerant of missing infrastructure during early operation:

- no `DATABASE_URL` -> local PGlite
- no `REDIS_URL` -> inline execution
- no email provider -> manual invite sharing
- no S3-compatible storage -> local artifact storage

That is by design. The system should be usable before the infrastructure budget catches up.

## Common commands

From the repository root:

```powershell
npm run dev
npm run seed
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run worker
```

## Running modes

There are two sensible ways to operate this repository.

### Founder-operated mode

Run the app on a local machine, optionally expose it with Cloudflare Tunnel, and operate engagements directly. This is the cheapest path and the right one for early pilots, as long as you are honest about the tradeoff: the machine is the server.

See [docs/deployment/cloudflare-tunnel-free.md](docs/deployment/cloudflare-tunnel-free.md).

### Hosted mode

When the workflow is proven and uptime matters more than thrift, the codebase already supports the normal upgrades:

- Postgres instead of local PGlite
- Redis-backed jobs instead of inline execution
- S3-compatible object storage instead of local disk
- transactional email delivery

No redesign is required to make that move. The application model stays the same.

## Notes for engineers evaluating the code

The design bias here is deliberate.

- Strong domain types matter more than framework cleverness.
- The product should degrade cleanly when infrastructure is missing.
- Auditability and access control come before cosmetic abstractions.
- The critical path is the engagement workflow and the report, not a dashboard for its own sake.

If you are reading this as a software project, the most important parts are not the landing page or the queue setup. They are the scenario model, the report structure, the access boundaries, and the operating flow from intake to buyer-facing artifact.

## Documentation

The public repo keeps a short set of docs that are worth reading:

- [docs/deployment.md](docs/deployment.md)
- [docs/deployment/cloudflare-tunnel-free.md](docs/deployment/cloudflare-tunnel-free.md)
- [docs/security/security-overview.md](docs/security/security-overview.md)

## Current state

This repository is a working product with real operator workflows, not a speculative scaffold.

It is also honest about what it is today: software that supports a service-led business. The system already handles the operational core of that business. More execution can be automated later, but the useful part exists now.
