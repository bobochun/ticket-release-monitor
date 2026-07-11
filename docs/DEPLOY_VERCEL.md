# Vercel 部署教學

## 架構

本專案採用：

- Vercel Hobby：Dashboard、API routes、健康檢查
- PostgreSQL：Neon、Supabase、Prisma Postgres、Railway、Render、AWS RDS 等
- 外部 scheduler：平常每 30 分鐘，必要時才短暫提高頻率

Vercel Hobby 內建 Cron 保持 daily：

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

## 1. Push main 到 GitHub

確認 main branch 已 push，並讓 Vercel 連接該 repo。

## 2. Vercel New Project

1. 打開 Vercel Dashboard。
2. New Project。
3. Import GitHub repo。
4. Framework 選 Next.js。

## 3. 建立 PostgreSQL

取得有效的：

```text
postgresql://...
```

Production 必須設定其中一個：

- `POSTGRES_URL`
- `DATABASE_URL`

Vercel production 不使用 SQLite fallback。

## 4. 設定 Vercel Env

推薦值：

```bash
POSTGRES_URL=
DATABASE_URL=
AUTO_DB_MIGRATE=false
DB_MAX_CONNECTIONS=1
DB_IDLE_TIMEOUT_SECONDS=5
DB_CONNECT_TIMEOUT_SECONDS=10

CRON_SECRET=
ALLOW_CRON_SECRET_QUERY=true
SCHEDULER_ENABLED=true
SCHEDULER_PROFILE=balanced
SCHEDULER_ALLOWED_MINUTES=0,30
SCHEDULER_SKIP_QUIET_HOURS=true
MANUAL_CHECK_BYPASS_SCHEDULER_GATE=true
EXTERNAL_SCHEDULER_INTERVAL_MINUTES=30

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DISCORD_WEBHOOK_URL=

DEFAULT_CHECK_INTERVAL_SECONDS=1800
MIN_CHECK_INTERVAL_SECONDS=900
MAX_TARGETS_PER_CRON=1
MAX_CONCURRENT_CHECKS=1
CHECK_MODE=fetch
NAVIGATION_TIMEOUT_MS=30000
NOTIFICATION_DEDUPE_MINUTES=60
ERROR_DEDUPE_MINUTES=60

QUIET_HOURS_ENABLED=true
QUIET_HOURS_START=23:30
QUIET_HOURS_END=07:30
QUIET_HOURS_TIMEZONE=Asia/Taipei

OCR_ENABLED=false
OCR_MODE=tesseract
OCR_LANG=eng+chi_tra
OCR_MAX_IMAGES_PER_CHECK=1
OCR_MAX_IMAGE_BYTES=800000
OCR_TIMEOUT_MS=12000
OCR_ALLOW_CROSS_ORIGIN=true
OCR_MIN_IMAGE_AREA=5000
```

`CRON_SECRET` 請使用長隨機字串。不要放到公開網址、文件、截圖或前端程式碼。

Production 使用 `CHECK_MODE=fetch`。Playwright 只建議 local / Docker。

## 5. Deploy / Redeploy

設定或修改 env 後必須 Redeploy，舊 deployment 不會自動取得新值。

## 6. 初始化 DB

Production 預設 `AUTO_DB_MIGRATE=false`，避免每次 serverless cold start 重跑 DDL 與 backfill。

從可信任的本機執行一次：

```bash
npx vercel env pull .env.local --environment=production
npm install
npm run db:diagnose
npm run db:init
npm run db:diagnose
```

確認 `db:diagnose` 顯示 `postgres via POSTGRES_URL` 或 `postgres via DATABASE_URL`。若看到 `sqlite fallback`，代表未連到 production PostgreSQL。

必要時才執行：

```bash
npm run seed
```

不要在資料仍可能存在時重複 seed 或建立新 DB，以免把「連錯資料庫」誤認成資料遺失。

## 7. 健康檢查

Shallow health check 不連 DB：

```text
GET https://YOUR_DOMAIN/api/health
```

Deep health check 會實際連 DB，需 Cron Secret：

```bash
curl \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://YOUR_DOMAIN/api/health?deep=1"
```

## 8. 確認頁面

- `/`：Dashboard
- `/targets`：目標管理
- `/history`：檢查紀錄
- `/manual-parse`：手動解析公開票區文字
- `/settings`：資料庫、scheduler、通知狀態
- `/api/health`：shallow health

若資料庫無法使用，首頁會進安全降級模式，其他 route 會顯示中文 error boundary，不會直接暴露完整 server error。

## 9. 手動測試 Cron

優先使用 header：

```bash
curl \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://YOUR_DOMAIN/api/cron/check
```

如果目前不在 scheduler profile 的允許分鐘，會回：

```json
{
  "ok": true,
  "skipped": true,
  "message": "本次排程由省資源閘門略過，未連線資料庫。"
}
```

若要手動呼叫並預設繞過 gate，可使用 query secret；完成設定後建議改成 `ALLOW_CRON_SECRET_QUERY=false`。

## 10. 外部 Scheduler

日常建議：

- `balanced`：每 30 分鐘
- `eco`：每 60 分鐘
- `burst`：只在短期釋票高峰使用 5–10 分鐘

GitHub Actions workflow 已改為：

```yaml
- cron: "0,30 * * * *"
```

詳見 [EXTERNAL_SCHEDULER.md](EXTERNAL_SCHEDULER.md)。

## 資料庫服務暫停時

若 Neon、Supabase 或其他 provider 暫停：

1. 不要刪除原 project。
2. 先確認 provider quota / compute / billing。
3. 恢復後用 SQL 確認：

```sql
select count(*) from targets;
select count(*) from check_runs;
select count(*) from notification_events;
```

4. 再確認 Vercel 的 `POSTGRES_URL` / `DATABASE_URL` 指向同一個 database。

## 升級 Vercel Pro

即使 Pro 支援更密集的 Vercel Cron，也不建議整月維持每 5 分鐘，因為主要成本通常來自資料庫持續被喚醒。優先保留 scheduler profile 與 quiet-hours gate。
