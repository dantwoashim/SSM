# Operations

This repository can run in a low-cost founder-operated mode, but it still needs a few real operational habits if you are using it with live customer work.

## Backups

Local mode stores state in two places:

- `.pglite`
- `storage`

Create a backup archive:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-local-data.ps1
```

Restore the latest backup archive:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-local-data.ps1
```

The restore script replaces the current local database and storage directories with the contents of the latest backup archive in `backups/`.

## Pre-release checks

Run the full verification stack before changing the deployment or sharing a new hosted build:

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

## Runtime expectations

`/api/readyz` is the authoritative readiness check.

It fails when:

- the database is unavailable
- required artifact storage is unavailable
- Redis is configured but unavailable
- queue mode is expected and there is no healthy worker heartbeat

## Logs and request tracking

Every response includes an `x-request-id` header generated in middleware. Keep that header when collecting failure details from the browser, reverse proxy, or application logs.

## Founder-operated mode

If you are running the app on your own machine:

- keep the machine awake
- keep regular backups
- use a stable public URL if you are sharing it with customers
- treat email and storage failures as operational incidents, not minor warnings
