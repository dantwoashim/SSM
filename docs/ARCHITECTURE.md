# Architecture

SSM is organized as a TypeScript monorepo with clear ownership boundaries.

```text
apps/web          Product surface, API routes, portals, reports, and web workflows
packages/core     Identity scenarios, feature taxonomy, findings, report model
packages/service  Data access, audit logging, access control, workflows, adapters
packages/worker   Optional queue-backed execution for async jobs
tests/e2e         Playwright coverage for important browser workflows
```

## Data flow

1. A vendor or operator submits an intake request.
2. The request becomes an engagement for a customer, provider, and feature scope.
3. The core package selects relevant SSO/SCIM scenarios.
4. Reviewers execute scenarios, attach evidence, and record outcomes.
5. Failures become findings with remediation guidance.
6. The report path summarizes readiness and customer-safe artifacts.
7. Customer contacts see only scoped shared content in the portal.

## Deployment modes

- Local development with lightweight services and seeded demo data.
- Founder-operated deployment with minimal infrastructure.
- More formal deployment with persistent database, object storage, email, queue/worker, and monitoring.

## Design choices

- Keep domain concepts explicit instead of hiding them in UI-only state.
- Separate reusable identity logic from the web application.
- Treat customer visibility and auditability as core product behavior.
- Gate publication when evidence or coverage is incomplete.

