# Demo Script: SSM

## 30-second explanation

SSM is a full-stack TypeScript platform for SSO/SCIM go-live assurance. It helps a team turn identity rollout checks into intake records, test plans, evidence, findings, remediation, reports, and customer-facing artifacts.

## 2-minute walkthrough

1. Start with the README problem statement.
2. Show the product workflow: intake, engagement, test plan, evidence, findings, remediation, report, customer portal.
3. Open the monorepo layout and explain `apps/web`, `packages/core`, `packages/service`, and `packages/worker`.
4. Show one Playwright E2E test.
5. Show the sample report or report generation path.

## 5-minute technical walkthrough

Explain identity readiness concepts in plain English, then walk through the data flow from intake to engagement to scenario plan to findings and report publication. Emphasize customer-scoped visibility and why incomplete coverage should not look like a clean go-live.

## What to show in an interview

- Product workflow
- Monorepo package boundaries
- Playwright E2E tests
- Report output
- Local/dev setup commands

## What not to overclaim

- Do not call it a compliance certification product.
- Do not claim real customers unless you have them.
- Do not imply the sample evidence is real customer data.

## Likely interviewer questions

### What are SSO and SCIM?

SSO lets users authenticate through an identity provider. SCIM automates user and group provisioning/deprovisioning. Go-live assurance checks whether those flows behave correctly in a real customer rollout.

### Why separate the core package?

The domain model and reporting helpers can be reused outside the full workflow app, including examples and future integrations.

### What would you improve next?

More provider-specific scenarios, richer demo data, stronger deployment guides, and more screenshots/video demos.

