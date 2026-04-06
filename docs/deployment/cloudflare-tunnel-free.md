# Cloudflare Tunnel free deployment

This is the cheapest workable setup for the current codebase.

It keeps the existing Node/Next.js app, local `PGlite` database, local artifact storage, and inline job execution. Cloudflare Tunnel exposes the app publicly over HTTPS without opening inbound ports.

## Why use this setup

- No paid hosting bill
- No platform rewrite
- No Vercel Hobby commercial-use problem
- Keeps the current app behavior almost unchanged

## Tradeoffs

- Your machine must stay on
- Windows sleep/hibernate must be disabled while serving customers
- Local disk is now your database and artifact store
- You must back up `.pglite` and `storage`

## Official Cloudflare guidance

- Cloudflare Tunnel is available on all plans: https://developers.cloudflare.com/tunnel/
- For production use, create a named tunnel and route it to `http://localhost:3000`: https://developers.cloudflare.com/tunnel/setup/
- Tunnel tokens for remotely-managed tunnels: https://developers.cloudflare.com/tunnel/advanced/tunnel-tokens/

## One-time setup

1. Copy `apps/web/.env.example` to `apps/web/.env.local`
2. Set these values in `apps/web/.env.local`

```env
APP_URL=https://app.yourdomain.com
SESSION_SECRET=replace-with-a-long-random-secret
FOUNDER_EMAIL=you@example.com
FOUNDER_PASSWORD=replace-with-a-strong-password
FOUNDER_NAME=Your Name
ALLOW_LOCAL_PROD=1
```

Leave these empty in this setup:

- `DATABASE_URL`
- `REDIS_URL`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `MAIL_REPLY_TO`
- all `S3_*`

3. Install dependencies:

```powershell
cd d:\SSM
npm install
```

4. Start the production app locally:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-prod.ps1
```

5. Confirm the app is healthy:

- `http://localhost:3000/api/healthz`
- `http://localhost:3000/api/readyz`

## Create the tunnel

1. In Cloudflare, create a **remotely-managed tunnel**
2. Add a **Published application** route
3. Point the route to:

```text
http://localhost:3000
```

4. Copy the tunnel token
5. In a new PowerShell window:

```powershell
$env:CLOUDFLARE_TUNNEL_TOKEN="paste-the-token-here"
powershell -ExecutionPolicy Bypass -File .\scripts\run-cloudflare-tunnel.ps1
```

After that, your app should be live at the hostname you configured in Cloudflare.

## Daily operating workflow

1. Start the app with `scripts/start-local-prod.ps1`
2. Start the tunnel with `scripts/run-cloudflare-tunnel.ps1`
3. Open your public `APP_URL`
4. Log in as founder
5. Run engagements normally

## Backups

Run this before major changes and at least once per day if customer data matters:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-local-data.ps1
```

This archives:

- `.pglite`
- `storage`

Because this mode uses inline execution instead of a queue-backed worker, invite delivery and report notifications may complete during the same request. The portal reflects that directly rather than pretending the work always happens in the background.

If you are showing the product to prospects, use a real hostname behind a named tunnel. Quick Tunnel URLs are fine for private testing and bad for anything customer-facing.

## Practical hardening

- Use a dedicated machine if possible
- Disable automatic sleep
- Keep Windows updated
- Use a strong `SESSION_SECRET`
- Do not store customer production credentials on this host
- Keep uploads limited to scoped pilot artifacts until you move to managed storage

## When to move off this setup

Move to paid infrastructure when any of these become true:

- You have a live paying customer
- You need reliable uptime while away from your machine
- You need transactional email instead of manual invite sharing
- You need persistent object storage for evidence
- You need real queue workers or browser automation at scale
