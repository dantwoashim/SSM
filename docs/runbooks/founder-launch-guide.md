# Founder Launch Guide

This guide explains, in simple step-by-step language, what you need to do manually to run this product from your own Windows laptop.

It is written for the current setup:

- your code is in `d:\SSM`
- you are using your own machine
- you have a free Cloudflare account
- you want the cheapest possible   launch path

This guide is split into:

1. One-time setup
2. Starting the app each day
3. Keeping the app online
4. Backing up your data
5. Checking that everything works
6. Preparing for the first real customer
7. What you must upgrade later

## 1. Understand what you are running

Before doing anything else, understand these three basic ideas:

- The app itself runs on your laptop.
- Cloudflare Tunnel gives your laptop a public web address.
- Your laptop is the server.

That means:

- if your laptop turns off, the app goes offline
- if your internet disconnects, the app goes offline
- if you close the wrong window, the app can stop working

This setup is okay for a founder-operated early launch. It is not the same as paid cloud hosting.

## 2. What you need before launch

Make sure you have all of these:

- a Windows laptop or PC
- the charger connected while the app is running
- stable internet
- a Cloudflare account
- Node.js installed
- `cloudflared` installed
- the code already present at `d:\SSM`

You should also have:

- at least `15 GB` of free space on the drive
- a real email address you want to use as the founder login
- a strong password you will remember
- a notebook or file where you keep your important values

## 3. Decide your launch level

There are two ways to launch.

### Option A: Temporary launch

Use a random Cloudflare Quick Tunnel URL like:

`https://something.trycloudflare.com`

Use this if:

- you want to test immediately
- you do not own a domain name yet

Downside:

- the URL can change
- this is not ideal for real customer-facing launch

### Option B: Real launch

Use a real domain name, for example:

- `app.yourcompany.com`
- `assurance.yourcompany.com`

Use this if:

- you want a stable public URL
- you want something you can send to real customers

Downside:

- you need to own a domain name

If your goal is "completely ready for launch," Option B is the proper path.

## 4. One-time Windows setup

You must stop the laptop from going to sleep while it is plugged in.

### Step-by-step

1. Click the `Start` button.
2. Click `Settings`.
3. Click `System`.
4. Click `Power & battery`.
5. Find the section for `Screen, sleep, & hibernate timeouts`.
6. For the `When plugged in` settings:
   - set `Sleep` to `Never`
   - if you see `Hibernate`, set it to `Never`
7. Keep the laptop plugged in when the app is live.

Why:

- if Windows sleeps, your app goes offline

## 5. Set your founder account

This is the login you will use to enter the portal.

### Open the config file

1. Press `Start`.
2. Type `PowerShell`.
3. Open `Windows PowerShell`.
4. Copy and paste this command:

```powershell
notepad d:\SSM\apps\web\.env.local
```

5. Press `Enter`.

This opens the configuration file in Notepad.

### Change these lines

Find these lines and replace them with your real values:

```env
APP_URL=https://your-public-url
SESSION_SECRET=replace-this-with-a-long-random-secret
FOUNDER_EMAIL=you@example.com
FOUNDER_PASSWORD=replace-this-with-a-strong-password
FOUNDER_NAME=Your Name
ALLOW_LOCAL_PROD=1
```

### What each value means

- `APP_URL`
  This is the public website address people will use.
- `SESSION_SECRET`
  This protects login sessions.
- `FOUNDER_EMAIL`
  Your founder login email.
- `FOUNDER_PASSWORD`
  Your founder login password.
- `FOUNDER_NAME`
  Your display name inside the app.
- `ALLOW_LOCAL_PROD=1`
  This tells the app that you are intentionally running in local production mode.

### How to make a good `SESSION_SECRET`

Use a long random string.

Example:

```text
u7Sx1!mQ8z@pL4#nD2^vK9&cR5*wT0!aH3$yJ8
```

Do not use:

- your name
- your birthday
- `123456`
- `password`

### For the zero-budget path, leave these blank

Keep these empty for now:

```env
DATABASE_URL=
REDIS_URL=
JOB_EXECUTOR_TOKEN=
RESEND_API_KEY=
MAIL_FROM=
MAIL_REPLY_TO=
S3_ENDPOINT=
S3_BUCKET=
S3_REGION=auto
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

### Save the file

1. In Notepad, click `File`
2. Click `Save`
3. Close Notepad

## 6. Install dependencies if needed

You may already have done this. If not, do it now.

### Step-by-step

1. Open PowerShell.
2. Run:

```powershell
cd d:\SSM
npm install
```

3. Wait for it to finish.

What this does:

- it downloads the packages the app needs

## 7. Start the app locally

This starts the website on your own machine.

### Step-by-step

1. Open PowerShell.
2. Run:

```powershell
cd d:\SSM
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-prod.ps1
```

3. Wait.
4. Do not close this window.

Important:

- this PowerShell window must stay open
- if you close it, the app stops

### What success looks like

The app should start and listen on:

`http://localhost:3000`

## 8. Check that the local app is healthy

Before making the site public, confirm that the local app works.

### Step-by-step

1. Open your browser.
2. Visit:

- `http://localhost:3000/api/healthz`
- `http://localhost:3000/api/readyz`

### What success looks like

You should see JSON text in the browser.

For the current zero-budget setup, `/api/readyz` should show:

- `ok: true`
- `database: true`
- `redisConfigured: false`
- `storageConfigured: false`
- `emailConfigured: false`

That is normal for this local launch path.

## 9. Make the app public

Choose one of the two paths below.

## 10. Public URL path A: Quick Tunnel

Use this if you want the fastest path and do not have a domain name.

### Step-by-step

1. Open a second PowerShell window.
2. Run:

```powershell
cloudflared tunnel --url http://localhost:3000
```

3. Wait for Cloudflare to print a public URL.
4. It will look something like:

```text
https://random-words.trycloudflare.com
```

5. Copy that full URL.

### Put that URL into your app config

1. Go back to PowerShell.
2. Open the config file:

```powershell
notepad d:\SSM\apps\web\.env.local
```

3. Change:

```env
APP_URL=https://random-words.trycloudflare.com
```

4. Save the file.

### Restart the app

Because you changed `APP_URL`, restart the app:

1. Go to the PowerShell window running the app
2. Press `Ctrl + C`
3. Start it again:

```powershell
cd d:\SSM
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-prod.ps1
```

4. Keep the Quick Tunnel window open too

### Important warning

Quick Tunnel is fine for testing and founder-led demos.

It is not the best final launch path because:

- the URL can change
- it is less stable than a named tunnel on a real domain

## 11. Public URL path B: Real domain plus named tunnel

Use this if you want the proper launch setup.

You need a domain name first.

Examples:

- `yourcompany.com`
- `identityassurance.io`

If you do not own one yet, buy one first. This is the only non-zero-dollar part of a real stable launch.

### Part 1: Add the domain to Cloudflare

1. Go to `https://dash.cloudflare.com`
2. Log in.
3. Click `Add a site` or `Add`.
4. Type your domain name.
5. Choose the free plan.
6. Continue.
7. Cloudflare will show you two nameservers.
8. Go to the place where you bought the domain.
9. Find the DNS or nameserver settings.
10. Replace the old nameservers with the Cloudflare nameservers.
11. Save.
12. Wait for Cloudflare to show the domain as active.

This can take some time.

### Part 2: Create a named tunnel

1. In Cloudflare Dashboard, open `Zero Trust`
2. In the left menu, find `Networks`
3. Click `Tunnels`
4. Click `Create a tunnel`
5. Choose `Cloudflared`
6. Choose a `remotely-managed` tunnel
7. Give it a name like:

`founder-laptop-app`

8. Continue
9. Cloudflare will give you a tunnel token
10. Copy the token

### Part 3: Create the public hostname

1. Inside the tunnel setup, add a public hostname
2. Enter:
   - Subdomain: `app`
   - Domain: your real domain
3. For the service:
   - Type: `HTTP`
   - URL: `localhost:3000`
4. Save

This creates a public address like:

`https://app.yourdomain.com`

### Part 4: Put the real address into your config

1. Open:

```powershell
notepad d:\SSM\apps\web\.env.local
```

2. Set:

```env
APP_URL=https://app.yourdomain.com
```

3. Save the file

### Part 5: Start the named tunnel

1. Open PowerShell
2. Run:

```powershell
$env:CLOUDFLARE_TUNNEL_TOKEN="paste-your-token-here"
powershell -ExecutionPolicy Bypass -File d:\SSM\scripts\run-cloudflare-tunnel.ps1
```

3. Do not close this PowerShell window

### Part 6: Restart the app

Because you changed `APP_URL`, restart the app:

1. In the app PowerShell window, press `Ctrl + C`
2. Start it again:

```powershell
cd d:\SSM
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-prod.ps1
```

3. Keep both PowerShell windows open

## 12. Log into the public site

Now test the public website.

### Step-by-step

1. Open your browser
2. Visit your public `APP_URL`
3. Go to `/login` if needed
4. Enter:
   - your `FOUNDER_EMAIL`
   - your `FOUNDER_PASSWORD`
5. Click `Sign in`

### What success looks like

You should enter the founder portal dashboard.

## 13. Remove confusion before showing this to customers

Because this app includes sample/demo data, do these checks before using it for real customer work.

### Do this

1. Log in as founder
2. Look for demo engagements
3. Do not send demo pages or demo engagement links to real customers
4. Use `New engagement` to create real engagements for real work

If you want a clean environment later, you can reset or migrate data intentionally, but do not delete anything casually if you are already using real customer data.

## 14. Test the full founder flow yourself

Before launch, manually test the main path.

### Step-by-step

1. Log in as founder
2. Create a new engagement
3. Open that engagement
4. Click `Generate test plan`
5. Click `Draft report`
6. Click `Download PDF`
7. Add a message
8. Upload a small PDF or image
9. Create an invite for a customer contact

### What success looks like

- engagement is created
- scenarios appear
- report appears
- PDF downloads
- message posts
- upload works
- invite link is generated

## 15. Test the customer flow yourself

Do not assume invite flow works. Test it.

### Step-by-step

1. Create an invite from the founder portal
2. Copy the invite link
3. Open the invite link in:
   - a private browser window, or
   - another browser
4. Set a password
5. Log in as that invited user
6. Open the engagement

### What success looks like

The invited user should:

- see the engagement
- see shared messages
- see shared attachments
- see published reports

The invited user should not see:

- internal messages
- internal artifacts
- draft-only founder information

## 16. Set up backups

Your local database and files live on your machine. Backups are mandatory.

### Manual backup

Open PowerShell and run:

```powershell
cd d:\SSM
powershell -ExecutionPolicy Bypass -File .\scripts\backup-local-data.ps1
```

This backs up:

- `.pglite`
- `storage`

### When to run it

Run a backup:

- before major changes
- after important customer work
- at least once every day when using the app

## 17. Automate daily backups with Task Scheduler

This is strongly recommended.

### Step-by-step

1. Press `Start`
2. Type `Task Scheduler`
3. Open `Task Scheduler`
4. Click `Create Basic Task`
5. Name it:

`SSM Daily Backup`

6. Click `Next`
7. Choose `Daily`
8. Click `Next`
9. Choose a time when your laptop is usually on
10. Click `Next`
11. Choose `Start a program`
12. Click `Next`
13. In `Program/script`, enter:

```text
powershell.exe
```

14. In `Add arguments`, enter:

```text
-ExecutionPolicy Bypass -File "d:\SSM\scripts\backup-local-data.ps1"
```

15. Click `Next`
16. Click `Finish`

Now Windows will run the backup script automatically every day.

## 18. Know which windows must stay open

When the app is live, these things must stay running:

### Always required

- the app window

### Also required if public access is active

- the `cloudflared` window

If either one stops, your public app may stop working.

## 19. What to do after a reboot

If your computer restarts:

1. Plug in the charger
2. Connect to the internet
3. Open PowerShell
4. Start the app:

```powershell
cd d:\SSM
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-prod.ps1
```

5. Open another PowerShell
6. Start the tunnel:

For a named tunnel:

```powershell
$env:CLOUDFLARE_TUNNEL_TOKEN="your-token"
powershell -ExecutionPolicy Bypass -File d:\SSM\scripts\run-cloudflare-tunnel.ps1
```

For a Quick Tunnel:

```powershell
cloudflared tunnel --url http://localhost:3000
```

7. Test your public `APP_URL`

## 20. How to know the app is healthy each day

Check these every day before sending links to customers:

- `APP_URL/api/healthz`
- `APP_URL/api/readyz`
- log in as founder
- open one engagement

### What healthy means for the current local setup

`/api/readyz` should show:

- `ok: true`
- `database: true`

It is okay if these are false in the zero-budget setup:

- `redisConfigured`
- `storageConfigured`
- `emailConfigured`

## 21. Prepare the business side before the first paid pilot

The code is not enough. You also need the customer-facing assets ready.

### Read and prepare these files

- [Launch Checklist](launch-checklist.md)
- [Offers](../commercial/offers.md)
- [Report Structure](../commercial/report-structure.md)
- [MSA Template](../legal/msa-template.md)
- [Deal Rescue SOW Template](../legal/sow-deal-rescue-template.md)
- [DPA Outline](../legal/dpa-outline.md)
- [Targeting](../gtm/targeting.md)
- [Outbound Sequence](../gtm/outbound-sequence.md)

### What you need ready

Before you speak to real prospects, prepare:

- your exact offer
- your price
- your sample report
- your security page
- your agreement documents
- your first outreach list

## 22. Prepare identity test environments

If you want to sell this seriously, you need test environments.

At minimum, create:

- one Okta test tenant
- one Microsoft Entra test tenant
- one Google Workspace test tenant

Inside each one, create:

- test users
- test groups
- a few role mapping examples
- a deactivated user case

Why:

- you need realistic environments to validate flows
- you cannot rely only on the portal screens

## 23. Do one full internal dry run

Before you try to close a real customer, run one full pretend project.

### Use this path

1. Submit the public intake form yourself
2. Convert the lead to an engagement
3. Generate a test plan
4. Mark some scenarios as passed or failed
5. Draft a report
6. Publish the report
7. Invite a customer contact
8. Log in as that customer
9. Download the PDF

If you cannot do this cleanly yourself, do not launch yet.

## 24. The final "ready to launch" checklist

You are ready to launch when all of these are true:

- your founder email and password are real
- your `SESSION_SECRET` is real
- your public `APP_URL` works
- your laptop does not sleep while plugged in
- the app starts correctly
- the tunnel starts correctly
- public `/api/healthz` works
- public `/api/readyz` works
- you can log in as founder
- you can create an engagement
- you can generate a report
- you can download the PDF
- you can create an invite
- invited users can log in
- backups are running
- your sample report is ready
- your offer and contract documents are ready

## 25. What is still not "enterprise-grade" in this zero-budget setup

Be honest with yourself about the limits.

This setup still depends on:

- one laptop
- one internet connection
- local storage
- manual backups
- manual uptime

That is acceptable for early validation.

It is not your forever setup.

## 26. When you should upgrade to paid infrastructure

Upgrade when any one of these happens:

- a real paying customer depends on uptime
- you cannot stay near your laptop enough
- you need automatic emails
- you need reliable file storage
- you need worker queues in production
- you want browser automation at scale

When that happens, move to:

- managed Postgres
- managed Redis
- S3-compatible storage
- hosted web + worker services

## 27. Your simplest daily routine

If you want the shortest version, this is it.

### Every day

1. Plug in the laptop
2. Connect to the internet
3. Start the app
4. Start the tunnel
5. Open `APP_URL/api/healthz`
6. Open `APP_URL/api/readyz`
7. Log in
8. Work normally
9. Run a backup at the end of the day

## 28. If something stops working

Start with these checks:

1. Is the laptop still on
2. Is the charger connected
3. Is the internet working
4. Is the app PowerShell window still open
5. Is the tunnel PowerShell window still open
6. Does `http://localhost:3000/api/healthz` work
7. Does `APP_URL/api/healthz` work

If local works but public does not:

- the tunnel is the problem

If neither works:

- the app process stopped

If the app is broken and you need to restart:

1. Stop the app with `Ctrl + C`
2. Start it again with:

```powershell
cd d:\SSM
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-prod.ps1
```

3. Test local health
4. Then test public health

## 29. Recommended next move

If you have no domain yet:

- launch temporarily with a Quick Tunnel
- validate interest
- buy a domain as soon as you start serious outreach

If you already have a domain:

- create a named tunnel
- use a stable `APP_URL`
- use that as your real launch address

## 30. Where to look next

Related documents:

- [Launch Checklist](launch-checklist.md)
- [Cloudflare Tunnel Free Deployment](../deployment/cloudflare-tunnel-free.md)
- [Incident Response](incident-response.md)
- [Data Deletion](data-deletion.md)
