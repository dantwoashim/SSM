# Identity Go-Live Assurance

Enterprise deals do not usually die because a vendor forgot to add "Supports SAML" to a pricing page.

They die because the first real customer rollout finds the parts that never got exercised properly: IdP-initiated login, group-to-role mapping, JIT edge cases, SCIM deprovisioning, duplicate accounts, tenant bleed, certificate rollover, and the hundred small assumptions hiding between "it works in staging" and "the buyer's IAM team trusts it."

This repository is a working product for that problem.

It is a service-led platform for running named enterprise identity engagements and producing the artifact that actually matters in the deal thread: a buyer-shareable assurance report with scope, evidence, findings, remediation guidance, and a clear readiness signal.

## What lives here

The repository is split by responsibility, not by buzzwords.

- `apps/web`
  The actual product surface. Marketing pages, intake flow, founder portal, customer access, engagement workflow, findings, reports, PDF export, attachments, and invite flow all live here.

- `packages/core`
  The domain model. Scenario definitions, identity feature taxonomy, report helpers, scoring, and shared sample data.

- `packages/worker`
  Background execution path for queued jobs. The system runs fine without it in founder-operated mode, but the hook is there when you want Redis-backed job execution.

- `docs`
  The operational side of the business: launch runbooks, deployment notes, legal templates, GTM docs, security notes, and the founder-facing setup guides.

## What this product actually does

From a user point of view, the workflow is simple:

1. A prospect or customer request comes in through intake.
2. The founder converts that request into an engagement.
3. The engagement gets a scenario plan based on claimed features and target IdP.
4. Scenarios are reviewed, findings are recorded, and evidence is attached.
5. The system generates a report and a PDF that can be shared with the buyer.
6. Customer contacts can be invited into a scoped portal view without exposing internal-only notes or artifacts.

This is not pretending to be a fully autonomous identity testing robot. It is a serious operational tool for a founder or small team running real enterprise readiness work.

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

That is deliberate. The point is to let the product operate before the infrastructure budget exists.

## Running modes

There are two realistic ways to use this repository.

### 1. Founder-operated local mode

This is the practical zero-budget path.

You run the app on your own machine, optionally expose it through Cloudflare Tunnel, and operate the engagements directly. It is good enough for early pilots and internal validation, as long as you accept the obvious tradeoff: your machine is the server.

Useful references:

- [`docs/deployment/cloudflare-tunnel-free.md`](docs/deployment/cloudflare-tunnel-free.md)
- [`docs/runbooks/founder-launch-guide.md`](docs/runbooks/founder-launch-guide.md)

Helper scripts:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-prod.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\run-cloudflare-tunnel.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\backup-local-data.ps1
```

### 2. Hosted mode

When you are ready to stop using a laptop as the server, this codebase already supports the normal upgrades:

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

This codebase was built around a very specific commercial reality:

- enterprise identity failures block revenue
- buyers want proof, not protocol marketing
- the first useful product is a service with leverage, not a fake "AI platform"

That is why the strongest parts of the repository are the scenario model, engagement workflow, report structure, access controls, and operating docs. Those are the parts that matter first in a real business.

If you are reading this as an engineer, the design bias is intentional:

- strong domain types
- founder-usable defaults
- security and auditability before fancy abstractions
- infrastructure that can degrade gracefully in local mode

## Documentation worth reading first

- [`docs/runbooks/founder-launch-guide.md`](docs/runbooks/founder-launch-guide.md)
- [`docs/runbooks/launch-checklist.md`](docs/runbooks/launch-checklist.md)
- [`docs/deployment.md`](docs/deployment.md)
- [`docs/deployment/cloudflare-tunnel-free.md`](docs/deployment/cloudflare-tunnel-free.md)

## Current state

This is a real working product, not a marketing shell.

It is also honest about what it is today: a strong service-led system for running enterprise identity assurance engagements, with room to automate more of the execution path over time.
