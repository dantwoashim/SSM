# Identity Go-Live Assurance

Identity Go-Live Assurance is a working application for running SSO and SCIM
readiness engagements. It turns an intake request into a scoped test plan,
recorded evidence, findings, and a report that can be shared with a buyer.

[Architecture](docs/ARCHITECTURE.md) |
[Case study](docs/CASE_STUDY.md) |
[Deployment](docs/deployment.md) |
[Security](docs/security/security-overview.md)

## Product workflow

1. A vendor or delivery lead submits an identity-readiness request.
2. An operator creates an engagement for the customer and identity provider.
3. Claimed capabilities become a concrete scenario plan.
4. Reviewers execute scenarios, attach evidence, and record outcomes.
5. Failed checks become findings with ownership and remediation guidance.
6. The system drafts a buyer-safe report and exports it as PDF.
7. Publication checks execution coverage and unresolved work.
8. Invited customer contacts receive a restricted view of shared artifacts and
   published reports.

The application structures human-led assurance work. It does not claim to
autonomously certify a live Okta, Entra, Google, or custom identity tenant.

## Implemented capabilities

- public intake and founder-operated engagement management;
- reusable SSO, SAML, OIDC, SCIM, JIT, group-mapping, and lifecycle scenarios;
- evidence uploads with explicit customer visibility;
- findings, messages, report drafts, publication checks, and PDF output;
- time-bound customer invitations and scoped portal access;
- audit events, rate limits, request validation, and storage boundaries;
- provider notes that expose unsupported or manually verified behavior;
- inline jobs for simple deployments and an optional Redis-backed worker;
- PGlite for local use and Postgres for hosted deployments;
- local or S3-compatible artifact storage;
- health, readiness, operational, and browser verification paths.

## Architecture

```text
apps/web
  -> packages/service
       -> Postgres or PGlite
       -> local or S3-compatible storage
       -> inline jobs or Redis/BullMQ
  -> packages/core
packages/worker
  -> packages/service
```

| Path | Responsibility |
| --- | --- |
| `apps/web` | Next.js product, portals, API routes, PDF delivery, and seed command |
| `packages/core` | Domain types, scenario library, scoring, and report logic |
| `packages/service` | Access control, persistence, migrations, workflows, and audit records |
| `packages/worker` | Optional background execution |
| `tests/e2e` | Critical browser journeys |
| `scripts` | Packaging, hygiene, and deployment smoke tests |

## Run locally

Requirements:

- Node.js 22 or newer;
- npm.

```powershell
npm ci
Copy-Item apps/web/.env.example apps/web/.env.local
npm run seed
npm run dev
```

Open `http://localhost:3000`. The seed command creates a founder account and a
sample engagement so the complete workflow can be reviewed immediately.

The minimum local configuration is documented in
[`apps/web/.env.example`](apps/web/.env.example). With no `DATABASE_URL`, the
service uses local PGlite. With no `REDIS_URL`, jobs run inline. Object storage
and email delivery also have local/manual paths for early deployments.

## Verify

```bash
npm run verify
```

The main gate runs linting, type checks, workspace tests, storage smoke tests,
the production build, a packaged start smoke test, Playwright, and release
hygiene checks.

Useful focused commands:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run smoke:source-bundle
npm run smoke:docker
npm run package:source
```

## Deployment

The same workflow supports two operating modes:

- **Founder-operated:** local PGlite, inline jobs, local artifact storage, and
  optional Cloudflare Tunnel exposure for controlled pilots.
- **Hosted:** Postgres, Redis/BullMQ, S3-compatible storage, and transactional
  email.

See [`docs/deployment.md`](docs/deployment.md) and the
[Cloudflare Tunnel guide](docs/deployment/cloudflare-tunnel-free.md) for the
actual configuration paths.

## Evaluation path

For a short technical review, inspect:

- [`packages/core/src/lib/scenarios.ts`](packages/core/src/lib/scenarios.ts)
- [`packages/service/src/data/engagements.ts`](packages/service/src/data/engagements.ts)
- [`packages/service/src/data/reports.ts`](packages/service/src/data/reports.ts)
- [`packages/service/src/provider-adapters.ts`](packages/service/src/provider-adapters.ts)
- [`tests/e2e/app.spec.ts`](tests/e2e/app.spec.ts)

The seeded data and sample report are demonstration records. They are labelled
as such and do not represent completed customer assessments.

## License

MIT. See [`LICENSE`](LICENSE).
