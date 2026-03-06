# Launch Checklist

## Company and commercial

- Finalize entity, banking, invoicing, and tax setup.
- Prepare NDA, MSA, Deal Rescue SOW, DPA, and privacy policy.
- Confirm pilot pricing, scope boundaries, and retest policy.

## Product and operations

- Set production `APP_URL`, `SESSION_SECRET`, `FOUNDER_EMAIL`, and `FOUNDER_PASSWORD`.
- Provision Postgres, Redis, and S3-compatible object storage.
- Configure `RESEND_API_KEY`, `MAIL_FROM`, and `MAIL_REPLY_TO`.
- Verify `/api/healthz` and `/api/readyz` return healthy responses in production.
- Seed founder access and confirm customer invite acceptance flow works end-to-end.
- Run one dry-run engagement from intake to published report.

## GTM readiness

- Publish redacted sample report and top-failures resource.
- Prepare outbound list of 100 target SaaS companies.
- Prepare first-call discovery script and Deal Rescue scoping checklist.
- Prepare pilot close assets: pricing sheet, sample deliverable, security page, and launch timeline.

## Acceptance gate

- One engagement can be created in under 15 minutes.
- One customer contact can be invited and onboarded without manual database edits.
- One report can be drafted, published, and downloaded from the portal.
- One queued job can be processed through the worker against the shared production database.
