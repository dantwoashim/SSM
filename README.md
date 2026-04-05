# Identity Go-Live Assurance

Enterprise deals rarely fall apart because a vendor forgot to say "Supports SAML" on a pricing page.

They fall apart when a real customer rollout hits the parts nobody exercised properly: IdP-initiated login, group-to-role mapping, JIT edge cases, SCIM deprovisioning, duplicate accounts, tenant bleed, certificate rollover, and all the assumptions sitting between "it worked in staging" and "the buyer's IAM team signed off."

This repository is the product built around that problem.

It is a service-backed application for running named enterprise identity engagements and producing the document that actually gets passed around in the deal thread: an assurance report with scope, evidence, findings, remediation guidance, and a plain readiness signal.

## What lives here

The repository is split by responsibility, not by buzzwords.

- `apps/web`
  The actual product surface. Marketing pages, intake flow, founder portal, customer access, engagement workflow, findings, reports, PDF export, attachments, and invite flow all live here.

- `packages/core`
  The domain model. Scenario definitions, identity feature taxonomy, report helpers, scoring, and shared sample data.

- `packages/worker`
  Background execution path for queued jobs. The system runs fine without it in founder-operated mode, but the hook is there when you want Redis-backed job execution.

- `docs`
  The short set of docs that still matter in the public repo: deployment notes and security posture.

## What this product actually does

From a user point of view, the workflow is simple:

1. A prospect or customer request comes in through intake.
2. The founder converts that request into an engagement.
3. The engagement gets a scenario plan based on claimed features and target IdP.
4. Scenarios are reviewed, findings are recorded, and evidence is attached.
5. The system generates a report and a PDF that can be shared with the buyer.
6. Customer contacts can be invited into a scoped portal view without exposing internal-only notes or artifacts.

This is not a magic black box. It is an operating tool for a founder or small team doing real enterprise readiness work.

## Local setup

Requirements:

- Node.js 22+
- npm
- Windows PowerShell if you want to use the bundled helper scripts

Install and run:

```powershell
npm install
Copy-Item apps/web/.env.example apps/web/.env.local
npm run seed
npm run dev
```

Then open:

```text
http://localhost:3000
```

The seed step creates a founder account and demo engagement data so you can inspect the full flow without fabricating records by hand.

## Environment basics

The smallest useful local configuration is in:

- [`apps/web/.env.example`](apps/web/.env.example)

For a local run, the important values are:

- `APP_URL`
- `SESSION_SECRET`
- `FOUNDER_EMAIL`
- `FOUNDER_PASSWORD`
- `FOUNDER_NAME`

Everything else can stay unset while you are running the founder-operated path.

The application is intentionally tolerant of missing infrastructure in local mode:

- no `DATABASE_URL` -> local `PGlite`
- no `REDIS_URL` -> inline job execution
- no email provider -> manual link-sharing fallback
- no S3 -> local file storage

That is intentional. The product should still be usable before the infrastructure budget catches up.

## Running modes

There are two realistic ways to use this repository.

### 1. Founder-operated local mode

This is the lowest-cost way to run the system.

You run the app on your own machine, optionally expose it through Cloudflare Tunnel, and operate the engagements directly. It is good enough for early pilots and internal validation, as long as you accept the obvious tradeoff: your machine is the server.

Useful references:

- [`docs/deployment/cloudflare-tunnel-free.md`](docs/deployment/cloudflare-tunnel-free.md)

Helper scripts:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-prod.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\run-cloudflare-tunnel.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\backup-local-data.ps1
```

### 2. Hosted mode

When you are ready to stop using a laptop as the server, the codebase already supports the usual upgrades:

- Postgres instead of local `PGlite`
- Redis/BullMQ instead of inline jobs
- S3-compatible object storage instead of local disk
- Resend for transactional mail
- a standalone Next.js build for deployment

You do not need to redesign the application to make that move. You just need to supply the missing infrastructure.

## Common commands

From the repository root:

```powershell
npm run dev
npm run seed
npm run lint
npm run typecheck
npm run test
npm run build
npm run worker
```

## Notes for visitors evaluating the project

This codebase was built around a specific commercial reality:

- enterprise identity failures block revenue
- buyers want proof, not protocol marketing
- the first useful version of this business is a service with software behind it

That is why the strongest parts of the repository are the scenario model, engagement workflow, report structure, access controls, and operating docs. Those are the parts that matter first in a real business.

If you are reading this as an engineer, the design bias is intentional:

- strong domain types
- founder-usable defaults
- security and auditability before fancy abstractions
- infrastructure that can degrade gracefully in local mode

## Documentation worth reading first

- [`docs/deployment.md`](docs/deployment.md)
- [`docs/deployment/cloudflare-tunnel-free.md`](docs/deployment/cloudflare-tunnel-free.md)
- [`docs/security/security-overview.md`](docs/security/security-overview.md)

## Current state

This is a working product, not a landing page wrapped around a backlog.

It is also honest about what it is today: a solid service-backed system for running enterprise identity assurance engagements, with more execution work that can be automated later.
