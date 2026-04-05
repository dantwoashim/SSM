# Deployment Notes

## Best zero-budget option

Use local self-hosting plus Cloudflare Tunnel:

- [Cloudflare Tunnel Free Deployment](deployment/cloudflare-tunnel-free.md)

## Production baseline

- Web app deploys as a Node service running the standalone server produced by `next build`
- Worker deploys as a separate long-running process
- Postgres is mandatory in production
- Redis is recommended for BullMQ-backed async work
- S3-compatible artifact storage is required for production uploads
- Transactional email is optional but strongly recommended for lead and invite response time

## Health endpoints

- `/api/healthz` for process-level liveness
- `/api/readyz` for database and runtime readiness

## Required environment variables

- Web:
  - `APP_URL`
  - `SESSION_SECRET`
  - `JOB_EXECUTOR_TOKEN` when `REDIS_URL` is enabled
  - `FOUNDER_EMAIL`
  - `FOUNDER_PASSWORD`
  - `DATABASE_URL`
- Worker:
  - `REDIS_URL`
  - `WEB_APP_URL`
  - `JOB_EXECUTOR_TOKEN`
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
