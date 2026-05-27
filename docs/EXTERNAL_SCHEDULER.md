# 外部 Scheduler 設定

Vercel Hobby 內建 Cron 只能 daily。若你想每 5 分鐘檢查一次，請用外部 scheduler 呼叫受保護的 cron endpoint：

```text
https://YOUR_DOMAIN/api/cron/check?secret=YOUR_SECRET
```

或：

```bash
curl -H "Authorization: Bearer YOUR_SECRET" https://YOUR_DOMAIN/api/cron/check
```

建議 `MAX_TARGETS_PER_CRON=1` 或 `2`，避免單次 Vercel function 執行太久。

## Option 1：cron-job.org

1. 到 cron-job.org 註冊。
2. Create cronjob。
3. URL 填：

   ```text
   https://YOUR_DOMAIN/api/cron/check?secret=YOUR_SECRET
   ```

4. Method: GET。
5. Schedule: every 5 minutes。
6. Save。
7. 到 Ticket Radar `/history` 確認 check runs 有新增。

## Option 2：UptimeRobot

1. Create monitor。
2. Monitor type: HTTP(s)。
3. URL 填：

   ```text
   https://YOUR_DOMAIN/api/cron/check?secret=YOUR_SECRET
   ```

4. Monitoring interval: 5 minutes。
5. Save。

UptimeRobot 是 uptime monitor，不是正式 cron system，但可用於低頻率觸發。若 response 非 200，可能被視為 down。

## Option 3：GitHub Actions schedule

本 repo 已包含 `.github/workflows/external-cron.yml`：

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

到 GitHub repo secrets 設：

- `TICKET_RADAR_CRON_SECRET`：與 Vercel `CRON_SECRET` 相同
- `TICKET_RADAR_CRON_URL`：例如 `https://YOUR_DOMAIN/api/cron/check`

GitHub Actions schedule 不是精準即時系統，可能延遲，但適合免費測試。

## Option 4：Render / Railway / VPS

只要定時執行：

```bash
curl -H "Authorization: Bearer YOUR_SECRET" https://YOUR_DOMAIN/api/cron/check
```

即可。未來也可以把真正長期 worker 拆到 Render / Railway / Fly.io / VPS。
