# Identity Go-Live Assurance

Most enterprise deals do not die because a vendor forgot to check a box on a pricing page.

They die when the buyer's identity team tries to wire the product into the real world and finds the messy parts: group mapping that does not line up with roles, SCIM deprovisioning that never quite lands, JIT provisioning with duplicate users, IdP-initiated login edge cases, tenant isolation problems, certificate rollover surprises, and all the quiet assumptions hiding behind "we support SAML and SCIM."

This repository is built around that moment.

Identity Go-Live Assurance is the application behind a service business for enterprise identity readiness. It gives a delivery team one place to intake a customer request, open an engagement, run a test plan, collect evidence, record findings, generate a buyer-safe report, and share only the right information with the customer.

The output is not another dashboard nobody asked for. The output is the report that gets forwarded into the procurement thread.

This repository will make the most sense to:

- engineers building or evaluating enterprise identity workflows
- founders moving a SaaS product upmarket
- solutions teams that need a cleaner way to run identity readiness work

## Why this exists

Enterprise identity work has an unpleasant shape.

The protocols are standardized enough for everyone to say they support them, but not standardized enough for real rollouts to behave the same way across tenants, providers, group models, and customer policies. That gap is where deals slow down.

This codebase exists to close that gap with something concrete:

- a scoped engagement
- a scenario plan
- recorded evidence
- structured findings
- a report a buyer can actually use

## What the product does

From the outside, the workflow is simple.

1. A SaaS vendor or implementation lead submits an intake request.
2. The request becomes a named engagement for a specific customer and IdP.
3. The system builds a plan from the required identity features.
4. Reviewers execute scenarios, attach evidence, and record outcomes.
5. Failed scenarios become findings with remediation guidance.
6. The application drafts an assurance report and exports a PDF.
7. Customer contacts get a restricted portal view with shared artifacts and published reports, not internal notes.

That is the whole point of the product. It should be possible to go from "the buyer needs proof this week" to a defensible package without juggling spreadsheets, screenshots, and email threads.

## What lives in this repository

The repository is split by responsibility.

- `apps/web`
  The actual product surface: intake, founder portal, customer portal, reports, attachments, invites, and API routes.

- `packages/core`
  Shared domain logic: scenario definitions, identity feature taxonomy, report scoring, report rendering helpers, and sample report data.

- `packages/service`
  The application and data layer: migrations, database access, audit logging, access control, rate limits, service workflows, and direct job execution.

- `packages/worker`
  Optional queue-backed execution for deployments that use Redis/BullMQ.

- `tests/e2e`
  Browser coverage for the paths that matter: intake, engagement creation, test-plan generation, invite flow, artifact access, and customer-scoped visibility.

## What is good about this system

It is built for the real operating constraints of an early product.

- It runs in a cheap founder-operated mode without pretending that everything must be enterprise infrastructure on day one.
- It keeps the domain model explicit. The scenario library, finding structure, report shape, and visibility rules are first-class.
- It treats audit trails and scoped access as product features, not cleanup work.
- It supports a low-cost path now and a more formal deployment path later without changing the product model.

In other words: this is not a toy landing page wrapped around a backlog. The useful part is already here.

It is also opinionated in the right places. Customer contacts do not get internal notes. Evidence can be linked back to scenarios, findings, and reports. Background execution is optional, not required. The system can start cheap and get more formal later without turning into a rewrite.

## Running it locally

Requirements:

- Node.js 22+
- npm
- PowerShell if you want the bundled Windows helper scripts

Quick start:

```powershell
npm install
Copy-Item apps/web/.env.example apps/web/.env.local
npm run seed
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The seed step creates a founder account and sample engagement data so you can walk the system end to end without fabricating records by hand.

## Five-minute tour

If you want to understand the product quickly, do this:

1. Run the seed step.
2. Open the founder portal.
3. Inspect the seeded engagement.
4. Generate a test plan.
5. Review a scenario, attach evidence, and draft the report.
6. Open the customer access section and issue an invite.

That path shows the product's center of gravity better than reading every route in the codebase. You will see the engagement model, the evidence model, the visibility boundaries, and the report output in a few minutes.

## Environment model

The minimum local configuration lives in [apps/web/.env.example](apps/web/.env.example).

For local use, these values matter:

- `APP_URL`
- `SESSION_SECRET`
- `FOUNDER_EMAIL`
- `FOUNDER_PASSWORD`
- `FOUNDER_NAME`

The rest is optional in founder-operated mode.

The system is intentionally tolerant of missing infrastructure in that mode:

- no `DATABASE_URL` means local PGlite
- no `REDIS_URL` means inline execution
- no email provider means manual invite sharing
- no S3-compatible storage means local artifact storage

That is deliberate. The product should still work before the infra budget shows up.

## Common commands

From the repository root:

```powershell
npm run dev
npm run seed
npm run verify
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run worker
```

## Deployment notes

There are two realistic operating modes.

### Founder-operated mode

Run it on your own machine, optionally publish it through Cloudflare Tunnel, and use it directly for pilots and early delivery. That path is cheap and honest about the tradeoff: the machine is the server.

See [docs/deployment/cloudflare-tunnel-free.md](docs/deployment/cloudflare-tunnel-free.md).

### Hosted mode

When uptime matters more than thrift, the codebase already supports the usual upgrades:

- Postgres instead of local PGlite
- Redis-backed workers instead of inline execution
- S3-compatible object storage instead of local disk
- transactional email delivery

No redesign is required to make that move. The workflow stays the same.

## What to look at if you are evaluating the implementation

If you care about the product mechanics, start here:

- [packages/core/src/lib/scenarios.ts](packages/core/src/lib/scenarios.ts) for the scenario library
- [packages/service/src/data/engagements.ts](packages/service/src/data/engagements.ts) for the core engagement workflow
- [packages/service/src/data/reports.ts](packages/service/src/data/reports.ts) for report drafting and publication
- [apps/web/src/app/app/engagements/[id]/page.tsx](apps/web/src/app/app/engagements/[id]/page.tsx) for the operator and customer-facing engagement experience
- [tests/e2e/app.spec.ts](tests/e2e/app.spec.ts) for the browser coverage around the critical user journeys

## Documentation

If you want the short version first, read these:

- [docs/deployment.md](docs/deployment.md)
- [docs/deployment/cloudflare-tunnel-free.md](docs/deployment/cloudflare-tunnel-free.md)
- [docs/operations.md](docs/operations.md)
- [docs/security/security-overview.md](docs/security/security-overview.md)

## Current state

This repository is a working product for a service-led business.

It does not pretend the delivery work is fully automated. It does the more important thing: it gives that work a rigorous operating system, a clean evidence trail, and a report that can survive contact with a buyer's identity team.

The seeded records and sample report pages are clearly marked demo content. They exist so you can evaluate the workflow quickly, not to imply that the repository ships with live customer evidence.
