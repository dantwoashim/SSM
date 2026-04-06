# Deployment notes

## Lowest-cost setup

Use local self-hosting with Cloudflare Tunnel:

- [Cloudflare Tunnel Free Deployment](deployment/cloudflare-tunnel-free.md)

## Hosted baseline

- Web app deploys as a Node service running the production Next server built by `next build`
- Worker deploys as a separate long-running process
- Postgres is mandatory in production
- Redis is recommended if you want queued background work
- S3-compatible artifact storage is required for production uploads
- Transactional email is optional but strongly recommended for lead and invite response time

## Health endpoints

- `/api/healthz` for process-level liveness
- `/api/readyz` for database and runtime readiness

`/api/readyz` is the authoritative deploy gate. It fails when the database, required artifact storage, Redis, or the worker heartbeat is not healthy for the configured mode.

## Required environment variables

- Web:
  - `APP_URL`
  - `SESSION_SECRET`
  - `FOUNDER_EMAIL`
  - `FOUNDER_PASSWORD`
  - `DATABASE_URL`
- Worker:
  - `DATABASE_URL`
  - `REDIS_URL`
- Optional but recommended:
  - `NOTIFICATION_EMAIL`
  - `RESEND_API_KEY`
  - `MAIL_FROM`
  - `MAIL_REPLY_TO`
  - `S3_ENDPOINT`
  - `S3_BUCKET`
  - `S3_ACCESS_KEY_ID`
  - `S3_SECRET_ACCESS_KEY`

## Render blueprint

Use [render.yaml](../render.yaml) as the starting deployment manifest for a web service, worker, Postgres database, and Redis instance.

## Release verification

Before a hosted deploy, run:

```powershell
npm run lint
npm run typecheck
npm run test
npm run smoke:storage
npm run build
npm run smoke:start
npm run test:e2e
npm run check:hygiene
```

`npm run smoke:start` boots the production server with local-production safeguards and verifies `healthz`, `readyz`, and the login route before the deploy is treated as credible.

## Backup and restore

If you are using local state during pilot work, use the operational scripts documented in [docs/operations.md](operations.md) before and after any risky deploy or machine migration.
