# Deploy Ticket Radar To Vercel

## B + C Plan: Vercel Hobby + External Scheduler

This project uses two deployment layers:

- B plan: Vercel Hobby runs the Dashboard and API. Built-in Vercel Cron is daily so deploys are not blocked by Hobby limits.
- C plan: an external scheduler calls `/api/cron/check` every 5 minutes for near 5-minute polling.

Vercel Hobby built-in Cron can run only daily. If `vercel.json` uses `*/5 * * * *`, Hobby deploys fail. Keep daily cron on Hobby.

## 1. Push Main To GitHub

Push the latest `main` branch to GitHub.

## 2. Import Project

1. Open Vercel Dashboard.
2. Click New Project.
3. Import the GitHub repository.
4. Framework preset: Next.js.

## 3. Add Environment Variables

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

Use Vercel Postgres, Neon Postgres, or another hosted Postgres provider. `POSTGRES_URL` or `DATABASE_URL` must point to Postgres in production.

## 4. Deploy

Deploy from Vercel. The app builds as a standard Next.js App Router project.

`vercel.json` is Hobby-safe:

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

This daily cron keeps the Vercel project deployable on Hobby. It is not intended to provide 5-minute monitoring by itself.

## 5. Initialize Database

After creating the production Postgres database, initialize schema from a trusted local machine:

```bash
POSTGRES_URL="postgres://..." npm run db:init
```

## 6. Seed Targets

```bash
POSTGRES_URL="postgres://..." npm run seed
```

Seed includes enabled examples, disabled templates, and disabled discovery rules. Do not enable placeholder URLs.

## 7. Confirm Dashboard

Open the production domain and confirm:

- `/` dashboard loads
- `/targets` shows targets
- `/history` loads
- `/settings` shows configured status without exposing secrets

## 8. Manual Cron Test

Header auth:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/check
```

Query secret auth:

```text
https://YOUR_DOMAIN/api/cron/check?secret=YOUR_SECRET
```

Then open `/history` and confirm check runs were added.

## 9. Configure External Scheduler

Set an external scheduler to call `/api/cron/check` every 5 minutes. Supported options include:

- cron-job.org
- UptimeRobot
- GitHub Actions schedule
- Render cron job
- Railway scheduled job
- VPS cron

See [EXTERNAL_SCHEDULER.md](EXTERNAL_SCHEDULER.md).

## 10. If You Upgrade To Vercel Pro

If you upgrade to Vercel Pro, you can change `vercel.json` back to 5-minute built-in Vercel Cron:

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

Hobby plan should keep the daily schedule, or deploy will fail.

## Production Fit

The Vercel Hobby version is ideal for:

- Dashboard
- Manual checks
- API endpoint for external scheduler polling
- Telegram and Discord alerts

For stronger 24/7 worker reliability, deploy a dedicated worker on Railway, Render, Fly.io, or a VPS.
