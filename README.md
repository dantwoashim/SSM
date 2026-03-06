# Identity Go-Live Assurance

Launch-ready starter for a service-led enterprise SSO / SCIM assurance product.

## What is included

- `apps/web`: Next.js marketing site, founder portal, invite-only workflow, intake forms, engagement management, report generation, and PDF export.
- `packages/core`: shared types, scenario library, report helpers, and sample data.
- `packages/worker`: BullMQ worker skeleton for future async automation.
- `docs`: security, GTM, commercial, legal, and operational runbooks needed for launch.

## Quick start

1. Copy `.env.example` to `.env.local` in `apps/web`.
2. Run `npm install`.
3. Run `npm run seed`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

## Demo credentials

Use the seeded founder credentials from `apps/web/.env.example`.

## Production notes

- Set `DATABASE_URL` to Postgres or allow the local `PGlite` fallback for development.
- Set `REDIS_URL` to enable BullMQ-backed job orchestration.
- Set S3-compatible storage variables to move artifacts off local disk.
- Set `SESSION_SECRET`, `FOUNDER_EMAIL`, and `FOUNDER_PASSWORD` before deploying production.
- Set `RESEND_API_KEY`, `MAIL_FROM`, and `MAIL_REPLY_TO` to enable invite and lead-notification emails.
- Provision the worker with the same `DATABASE_URL` as the web service so queued jobs update the shared operational database.
