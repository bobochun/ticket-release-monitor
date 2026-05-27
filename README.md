# Ticket Radar / Ticket Release Radar

Ticket Radar is a safe, legal, low-frequency ticket release monitoring MVP. It watches public ticket pages, records recent checks, and sends Telegram or Discord notifications when a page looks interesting or requires manual attention.

It is not a ticket-buying bot. Manual purchase is always required.

## Safety Limits

Ticket Radar does not:

- login
- select seats
- add tickets to cart
- submit orders
- pay
- bypass CAPTCHA, reCAPTCHA, hCaptcha, Turnstile, Cloudflare, queues, or waiting rooms
- use stealth browser patches, proxy rotation, CAPTCHA solvers, OCR, multi-account, multi-IP, or high-frequency refresh behavior

If a target appears to require CAPTCHA, queue handling, or login, the check stops and records `BOT_CHECK`, `QUEUE_DETECTED`, or `LOGIN_REQUIRED`.

## Features

- Next.js App Router dashboard
- Mobile-friendly PWA-style UI
- Targets with include, exclude, area, area blacklist, and price keywords
- Manual check for one target
- Vercel-compatible `/api/cron/check` endpoint
- Postgres production database with local SQLite fallback
- Recent check history
- Telegram and Discord notifications
- Public-link discovery rules for manual candidate search

## Deployment Strategy: Vercel Hobby + External Scheduler

Vercel Hobby built-in Cron can run only daily. This project keeps `vercel.json` on a daily schedule so the Dashboard, API routes, and database connection can deploy successfully on Vercel Hobby.

For near 5-minute polling, use an external scheduler to call `/api/cron/check` every 5 minutes.

Recommended setup:

1. Vercel: Dashboard, API routes, and database connection
2. Neon Postgres or Vercel Postgres: production database
3. cron-job.org, UptimeRobot, GitHub Actions schedule, Render, Railway, or VPS: 5-minute external trigger

The cron endpoint is protected by `CRON_SECRET`. Keep `MAX_TARGETS_PER_CRON=1` or `2` so each Vercel function invocation stays short. Do not enable too many targets, and do not enable placeholder templates.

Header auth:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/check
```

Query secret auth:

```text
https://YOUR_DOMAIN/api/cron/check?secret=YOUR_SECRET
```

See [docs/EXTERNAL_SCHEDULER.md](docs/EXTERNAL_SCHEDULER.md) for setup examples.

## Supported Platforms

MVP uses a generic public-page detector for all platforms:

`generic`, `tixcraft`, `teamear`, `ticketmaster`, `indievox`, `kktix`, `ticketplus`, `ibon`, `era_ticket`, `kham`, `cityline`, `hkticketing`, `famiticket`, `fansi_go`, `funone`, `cpbl_fubon_guardians`, `cpbl_ctbc_brothers`, `cpbl_unilions`, `cpbl_rakuten_monkeys`, `cpbl_weichuan_dragons`, `cpbl_tsg_hawks`.

## Seed Data

`npm run seed` creates:

- Enabled examples: CTBC Brothers, Fubon Guardians FamiLife, iBon
- Disabled templates: CPBL teams and common concert/event platforms
- Disabled discovery rules: CPBL and concert public-link candidate searches

Do not enable placeholder URLs. Replace templates with real official event URLs first.

## Local Development

```bash
npm install
npm run db:init
npm run seed
npm run dev
```

Open `http://localhost:3000`.

Local default database is `./data/ticket-radar.sqlite` unless `DATABASE_URL` or `POSTGRES_URL` points to Postgres.

## Vercel Deployment

See [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md).

`vercel.json` uses daily built-in Cron for Vercel Hobby compatibility:

```json
{
  "crons": [
    {
      "path": "/api/cron/check",
      "schedule": "0 1 * * *"
    }
  ]
}
```

If you upgrade to Vercel Pro, you may change the schedule back to every 5 minutes:

```json
{
  "crons": [
    {
      "path": "/api/cron/check",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Environment Variables

```bash
DATABASE_URL=
POSTGRES_URL=
CRON_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DISCORD_WEBHOOK_URL=
DEFAULT_CHECK_INTERVAL_SECONDS=180
MIN_CHECK_INTERVAL_SECONDS=120
MAX_TARGETS_PER_CRON=2
MAX_CONCURRENT_CHECKS=1
CHECK_MODE=fetch
NAVIGATION_TIMEOUT_MS=30000
```

`CHECK_MODE=fetch` is the production default. `CHECK_MODE=playwright` is local or Docker only.

## How To Use

1. Go to `/targets`.
2. Add or edit an official ticket page.
3. Keep intervals low-frequency. Values below `MIN_CHECK_INTERVAL_SECONDS` are corrected.
4. Click `Check` for a manual check.
5. Review `/history` for recent results.
6. Use `/settings` to test notifications.

Use discovery manually from `/discovery`; it only reads public links from seed pages and adds candidates as disabled targets for review.

## Why Not Build A Buying Bot?

Ticket Radar is designed for safety, fairness, and compliance. Buying automation can violate ticketing site terms, harm other fans, and trigger bot defenses. This app only notifies you when manual review may be useful.

## Roadmap

- Better platform-specific text extraction
- User accounts and per-user settings
- More notification channels
- Dedicated Render, Railway, Fly.io, or VPS worker mode
- Richer candidate scoring
- Alert deduplication and quiet hours
