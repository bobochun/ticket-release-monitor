# Vercel 部署教學

## B + C Plan：Vercel Hobby + 外部 Scheduler

本專案採用：

- B plan：Vercel Hobby 部署 Dashboard、API routes、資料庫連線。
- C plan：外部 scheduler 每 5 分鐘呼叫 `/api/cron/check`。

Vercel Hobby 內建 Cron 只能 daily，所以 `vercel.json` 必須保持：

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

如果改成 `*/5 * * * *`，Hobby deploy 會失敗。

## 1. Push main 到 GitHub

確認 main branch 已 push。

## 2. Vercel New Project

1. 打開 Vercel Dashboard。
2. New Project。
3. Import GitHub repo。
4. Framework 選 Next.js。

## 3. 建立 Postgres

可用：

- Neon Postgres
- Vercel Postgres
- 其他 hosted Postgres

取得 `POSTGRES_URL` 或 `DATABASE_URL`。

## 4. 設定 Vercel Env

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
NOTIFICATION_DEDUPE_MINUTES=30
ERROR_DEDUPE_MINUTES=15
QUIET_HOURS_ENABLED=false
QUIET_HOURS_START=23:30
QUIET_HOURS_END=07:30
QUIET_HOURS_TIMEZONE=Asia/Taipei
OCR_ENABLED=false
OCR_MODE=tesseract
OCR_LANG=eng+chi_tra
OCR_MAX_IMAGES_PER_CHECK=3
OCR_MAX_IMAGE_BYTES=800000
OCR_TIMEOUT_MS=12000
OCR_ALLOW_CROSS_ORIGIN=true
OCR_MIN_IMAGE_AREA=5000
```

`CRON_SECRET` 請用長一點的隨機字串。不要把 secret 放在公開文件或前端畫面。
Vercel Hobby 上 OCR 建議先保持 `OCR_ENABLED=false`。若要啟用，請把 `MAX_TARGETS_PER_CRON=1`、`OCR_MAX_IMAGES_PER_CHECK=1`，並觀察 function duration。

## 5. Deploy / Redeploy

設定 env 後部署。若有改 env，請 Redeploy，讓 serverless functions 讀到新值。

## 6. 初始化 DB

從可信任的本機執行：

```bash
POSTGRES_URL="postgres://..." npm run db:init
```

## 7. Seed 預設資料

```bash
POSTGRES_URL="postgres://..." npm run seed
```

Seed 會建立 enabled examples、disabled templates、discovery rules。不要直接啟用 placeholder URL。

## 8. 確認 production domain

打開 production domain，確認：

- `/` Dashboard 可開
- `/targets` 可新增 target
- `/history` 可看紀錄
- `/settings` 可測試通知

## 9. 手動測試 Cron

Header 驗證：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/check
```

Query secret：

```text
https://YOUR_DOMAIN/api/cron/check?secret=YOUR_SECRET
```

成功回應會包含：

```json
{
  "ok": true,
  "trigger": "manual",
  "checked": 0,
  "skipped": 0,
  "results": []
}
```

## 10. 設定外部 Scheduler

每 5 分鐘呼叫：

```text
https://YOUR_DOMAIN/api/cron/check?secret=YOUR_SECRET
```

或用 header：

```bash
curl -H "Authorization: Bearer YOUR_SECRET" https://YOUR_DOMAIN/api/cron/check
```

請看 [EXTERNAL_SCHEDULER.md](EXTERNAL_SCHEDULER.md)。

## 升級 Vercel Pro 後

如果未來升級 Vercel Pro，可以把 `vercel.json` 改回：

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

Hobby plan 請保持 daily，否則 deploy 會失敗。
