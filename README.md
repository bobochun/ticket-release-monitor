# Ticket Radar / 票券釋票雷達

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
- Vercel Cron route at `/api/cron/check`
- Postgres production database with local SQLite fallback
- Recent check history
- Telegram and Discord notifications
- Public-link discovery rules for manual candidate search

## Supported Platforms

MVP uses a generic public-page detector for all platforms:

`generic`, `tixcraft`, `teamear`, `ticketmaster`, `indievox`, `kktix`, `ticketplus`, `ibon`, `era_ticket`, `kham`, `cityline`, `hkticketing`, `famiticket`, `fansi_go`, `funone`, `cpbl_fubon_guardians`, `cpbl_ctbc_brothers`, `cpbl_unilions`, `cpbl_rakuten_monkeys`, `cpbl_weichuan_dragons`, `cpbl_tsg_hawks`.

## Seed Data

`npm run seed` creates:

- Enabled examples: 中信兄弟、富邦悍將 FamiLife、iBon
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

Vercel Cron runs every 5 minutes and calls `/api/cron/check`. Each invocation checks only due targets, capped by `MAX_TARGETS_PER_CRON`.

For more stable 24/7 or higher-volume workers, use Railway, Render, Fly.io, or a VPS. The Vercel version is best for dashboard plus safe low-frequency cron polling.

## Environment Variables

```bash
POSTGRES_URL=
DATABASE_URL=
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

## Cron Test

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/check
```

Or:

```text
https://YOUR_DOMAIN/api/cron/check?secret=YOUR_SECRET
```

## Telegram

Create a bot with BotFather, set `TELEGRAM_BOT_TOKEN`, send a message to the bot, and set `TELEGRAM_CHAT_ID`.

## Discord

Create a channel webhook and set `DISCORD_WEBHOOK_URL`.

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
- VPS/Railway/Render/Fly.io worker mode
- Richer candidate scoring
- Alert deduplication and quiet hours
