# Deploy Ticket Radar To Vercel

## 1. Push To GitHub

Commit and push the repository to GitHub.

## 2. Import Project

1. Open Vercel Dashboard.
2. Click New Project.
3. Import the GitHub repository.
4. Framework preset: Next.js.

## 3. Add Environment Variables

Required:

```bash
POSTGRES_URL=postgres://...
CRON_SECRET=use-a-long-random-secret
CHECK_MODE=fetch
MAX_TARGETS_PER_CRON=2
```

Optional notifications:

```bash
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DISCORD_WEBHOOK_URL=
```

Other tuning:

```bash
DEFAULT_CHECK_INTERVAL_SECONDS=180
MIN_CHECK_INTERVAL_SECONDS=120
MAX_CONCURRENT_CHECKS=1
NAVIGATION_TIMEOUT_MS=30000
```

Use Vercel Postgres, Neon Postgres, or another hosted Postgres provider. `POSTGRES_URL` or `DATABASE_URL` must point to Postgres in production.

## 4. Deploy

Deploy from Vercel. The app builds as a standard Next.js App Router project.

## 5. Initialize Database

After creating the production Postgres database, initialize schema from a trusted local machine:

```bash
POSTGRES_URL="postgres://..." npm run db:init
POSTGRES_URL="postgres://..." npm run seed
```

The app also defensively creates missing tables when API routes run, but explicit initialization is recommended.

## 6. Cron

`vercel.json` configures:

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

Vercel Cron triggers `/api/cron/check` every 5 minutes. Each invocation checks only due targets and checks at most `MAX_TARGETS_PER_CRON` targets. Target-level `check_interval_seconds` still applies, but the real minimum trigger granularity is limited by the cron schedule.

This is cron polling, not a permanent background worker.

## 7. Manual Cron Test

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/check
```

Or:

```text
https://YOUR_DOMAIN/api/cron/check?secret=YOUR_SECRET
```

## 8. Production Fit

The Vercel version is ideal for:

- Dashboard
- Manual checks
- Safe low-frequency cron polling
- Telegram and Discord alerts

For higher reliability 24/7 worker needs, deploy a dedicated worker on Railway, Render, Fly.io, or a VPS.
