# External Scheduler Setup

Vercel Hobby built-in Cron can run only daily. To check every 5 minutes, use an external scheduler to call the protected cron endpoint:

```text
https://YOUR_DOMAIN/api/cron/check?secret=YOUR_SECRET
```

Or:

```bash
curl -H "Authorization: Bearer YOUR_SECRET" https://YOUR_DOMAIN/api/cron/check
```

Keep `MAX_TARGETS_PER_CRON=1` or `2` to avoid long Vercel function invocations.

## Option 1: cron-job.org

1. Register at cron-job.org.
2. Create cronjob.
3. URL:

   ```text
   https://YOUR_DOMAIN/api/cron/check?secret=YOUR_SECRET
   ```

4. Method: GET.
5. Schedule: every 5 minutes.
6. Save.
7. Open Ticket Radar `/history` and confirm check runs were added.

## Option 2: UptimeRobot

1. Create monitor.
2. Monitor type: HTTP(s).
3. URL:

   ```text
   https://YOUR_DOMAIN/api/cron/check?secret=YOUR_SECRET
   ```

4. Monitoring interval: 5 minutes.
5. Save.

UptimeRobot is an uptime monitor, not a formal cron system. It works for low-frequency triggering, but non-200 responses may be treated as downtime.

## Option 3: GitHub Actions Schedule

This repository includes `.github/workflows/external-cron.yml`:

```yaml
name: External Cron Check

on:
  schedule:
    - cron: "*/5 * * * *"
  workflow_dispatch:

jobs:
  call-cron:
    runs-on: ubuntu-latest
    steps:
      - name: Call Ticket Radar cron endpoint
        run: |
          curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$TICKET_RADAR_CRON_URL"
        env:
          CRON_SECRET: ${{ secrets.TICKET_RADAR_CRON_SECRET }}
          TICKET_RADAR_CRON_URL: ${{ secrets.TICKET_RADAR_CRON_URL }}
```

Set these GitHub repository secrets:

- `TICKET_RADAR_CRON_SECRET`: same value as Vercel `CRON_SECRET`
- `TICKET_RADAR_CRON_URL`: `https://YOUR_DOMAIN/api/cron/check`

GitHub Actions schedules are not exact real-time systems and can be delayed, but they are useful for free testing.

## Option 4: Render / Railway / VPS

Run a scheduled command:

```bash
curl -H "Authorization: Bearer YOUR_SECRET" https://YOUR_DOMAIN/api/cron/check
```

Render, Railway, Fly.io, or a VPS can also host a dedicated long-running worker later. The MVP keeps Vercel as the dashboard and API host.
