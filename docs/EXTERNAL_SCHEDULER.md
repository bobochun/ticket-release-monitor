# 外部 Scheduler 設定

Vercel Hobby 內建 Cron 只能 daily。日常建議使用外部 scheduler 每 30 分鐘呼叫受保護的 cron endpoint：

```bash
curl -H "Authorization: Bearer YOUR_SECRET" https://YOUR_DOMAIN/api/cron/check
```

優先使用 Authorization header，不要把 secret 放在公開網址、瀏覽器紀錄或截圖中。Query secret 僅保留相容性，可用 `ALLOW_CRON_SECRET_QUERY=false` 關閉。

## 省資源 Profile

### balanced（推薦）

```bash
SCHEDULER_PROFILE=balanced
EXTERNAL_SCHEDULER_INTERVAL_MINUTES=30
```

只在每小時第 `0`、`30` 分鐘連資料庫。

### eco

```bash
SCHEDULER_PROFILE=eco
EXTERNAL_SCHEDULER_INTERVAL_MINUTES=60
```

只在每小時第 `0` 分鐘連資料庫。

### burst

```bash
SCHEDULER_PROFILE=burst
EXTERNAL_SCHEDULER_INTERVAL_MINUTES=5
```

完全依外部 scheduler 頻率。只建議活動接近釋票高峰時短暫使用，結束後立即切回 balanced。

### custom

```bash
SCHEDULER_PROFILE=custom
SCHEDULER_ALLOWED_MINUTES=5,20,35,50
```

即使外部 scheduler 誤設得較頻繁，不在允許分鐘的請求也會在連 DB 前直接回 200 skipped。

## Option 1：cron-job.org

1. 到 cron-job.org 註冊。
2. Create cronjob。
3. URL：

   ```text
   https://YOUR_DOMAIN/api/cron/check
   ```

4. Method：GET。
5. Header：`Authorization: Bearer YOUR_SECRET`。
6. Schedule：every 30 minutes。
7. 到 Ticket Radar `/history` 確認 check runs 有新增。

## Option 2：UptimeRobot

UptimeRobot 是 uptime monitor，不是正式 cron system。若使用：

1. Create monitor。
2. Monitor type：HTTP(s)。
3. URL：`https://YOUR_DOMAIN/api/cron/check`。
4. 設定 Authorization header。
5. Monitoring interval：30 或 60 分鐘。

若 response 非 200，可能被視為 down。Scheduler gate 略過時仍回 200。

## Option 3：GitHub Actions schedule

本 repo 的 `.github/workflows/external-cron.yml` 預設每 30 分鐘執行：

```yaml
on:
  schedule:
    - cron: "0,30 * * * *"
```

到 GitHub repo secrets 設定：

- `TICKET_RADAR_CRON_SECRET`：與 Vercel `CRON_SECRET` 相同
- `TICKET_RADAR_CRON_URL`：例如 `https://YOUR_DOMAIN/api/cron/check`

GitHub Actions schedule 可能延遲，不是精準即時系統。

## Option 4：Render / Railway / VPS

定時執行：

```bash
curl --fail --show-error --silent \
  --retry 2 \
  --max-time 55 \
  -H "Authorization: Bearer YOUR_SECRET" \
  https://YOUR_DOMAIN/api/cron/check
```

## 建議 Production 設定

```bash
MAX_TARGETS_PER_CRON=1
MIN_CHECK_INTERVAL_SECONDS=900
DEFAULT_CHECK_INTERVAL_SECONDS=1800
SCHEDULER_ENABLED=true
SCHEDULER_PROFILE=balanced
SCHEDULER_SKIP_QUIET_HOURS=true
QUIET_HOURS_ENABLED=true
QUIET_HOURS_START=23:30
QUIET_HOURS_END=07:30
QUIET_HOURS_TIMEZONE=Asia/Taipei
```

若需要 24 小時監控，將 `SCHEDULER_SKIP_QUIET_HOURS=false`，但資料庫 compute 用量會增加。
