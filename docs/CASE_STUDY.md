# Case Study: SSM / Identity Go-Live Assurance

## Summary

SSM is a full-stack TypeScript platform for SSO/SCIM go-live assurance. It helps a delivery team manage intake, engagements, test plans, evidence, findings, remediation, reports, and customer portal access.

## Problem

Enterprise SaaS vendors often say they support SSO and SCIM, but real go-lives fail in tenant-specific details: group mapping, deprovisioning, JIT provisioning, IdP/SP login paths, certificate rollover, auditability, and customer evidence expectations.

## Why this project matters

The project turns an identity readiness review into a structured workflow rather than a spreadsheet, inbox, and screenshots scattered across tools.

## My role

I designed and implemented the product workflow, monorepo structure, domain packages, service layer, reporting path, and E2E test coverage.

## Tech stack

- Frontend/app: TypeScript, web app workspace
- Core/domain: TypeScript packages
- Data/service: PostgreSQL/PGlite-style local modes where configured
- Worker: optional queue-backed execution
- Testing: Playwright E2E and workspace tests
- Infrastructure: Docker-oriented deployment modes and GitHub Actions

## Architecture

```text
apps/web -> packages/service -> database/storage/email adapters
        -> packages/core    -> scenarios, findings, report model
        -> packages/worker  -> optional async execution
tests/e2e -> browser verification for critical workflows
```

## Key features

- Intake workflow for customer/vendor requests
- Engagement creation and test-plan generation
- Evidence capture and findings management
- Remediation tracking and buyer-safe report generation
- Customer portal with scoped visibility
- Audit-aware workflows and safety checks for sensitive artifacts

## Hard technical problems

- Explaining identity concepts clearly for non-identity reviewers
- Keeping internal notes separate from customer-visible artifacts
- Designing workflow states that do not fake readiness
- Testing multi-step B2B flows end to end

## Important decisions and tradeoffs

- The product emphasizes defensible reports over dashboard aesthetics.
- The core identity scenario logic is separated into reusable packages.
- A founder-operated mode is supported before heavier infrastructure is required.
- Customer-visible publication is gated when coverage is incomplete.

## Testing and validation

The repo includes workspace tests and Playwright E2E coverage for important flows such as intake, engagement creation, test-plan generation, invite flow, artifact access, and customer-scoped visibility.

## Security and limitations

This is an early product/workflow implementation, not a compliance certification system. Identity evidence can be sensitive, so production deployments need strict storage, audit, access-control, and retention policies.

## What I learned

- Full-stack workflow modeling
- B2B product domain design
- Identity readiness and SSO/SCIM edge cases
- Monorepo package boundaries
- Playwright testing for multi-step workflows

## What I would improve with more time

- Add richer demo data and screenshots
- Add deeper deployment hardening docs
- Add more provider-specific test scenarios
- Improve report templates and export options

## What this project proves to employers

SSM proves I can design and implement a full-stack SaaS-style workflow with domain logic, access boundaries, tests, and practical deployment thinking.

## Resume bullets

- Built a full-stack TypeScript identity assurance platform for intake, engagement planning, test execution, evidence capture, findings, reports, and customer portal access.
- Designed monorepo packages for web workflows, domain logic, service/data access, and optional worker execution.
- Added Playwright E2E coverage for core B2B workflows including intake, engagement creation, invite flow, and customer-scoped visibility.

