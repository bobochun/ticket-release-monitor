# 票券釋票雷達 / Ticket Radar

票券釋票雷達是一個安全、低頻率、通知型的公開售票頁監控系統。它會檢查你設定的官方售票頁，解析公開票區、票價與狀態；若偵測到疑似釋票、排隊、驗證或錯誤，就寫入紀錄並通知 Telegram / Discord。

這不是搶票機器人，也不是自動購票工具。購票仍需自行開啟官方頁面手動完成。

## 主要能力

- 公開售票頁低頻率檢查
- 逐列解析票區、票價、剩餘數量與售完狀態
- `strict` / `normal` / `loose` 比對模式
- `available_only` 等通知門檻，避免有票但不符條件時誤通知
- Telegram / Discord 通知與內容去重
- CAPTCHA、Cloudflare、排隊、登入需求偵測後停止
- 安全版公開票況圖片 OCR，預設關閉
- Vercel + PostgreSQL 部署
- 省資源 scheduler gate，減少 serverless database 被頻繁喚醒
- Shallow / deep health check

## 安全限制

本工具不會：

- 自動登入
- 自動選位
- 自動加入購物車
- 自動送出訂單或付款
- 繞過 CAPTCHA、reCAPTCHA、hCaptcha、Cloudflare Turnstile
- 繞過 queue / waiting room
- 使用 stealth browser patch、proxy rotation 或第三方 CAPTCHA solver
- 高頻刷新或模擬真人行為規避網站防護

若偵測到驗證、排隊或登入需求，會停止本次檢查並記錄 `BOT_CHECK`、`QUEUE_DETECTED` 或 `LOGIN_REQUIRED`。

## 公開票區逐列解析

Ticket Radar 會優先解析公開票區 row，而不是單純以整頁關鍵字判定：

```txt
內野南A區下層 400 熱賣中
內野西C區下層 500 8
內野D區下層 500 售完
```

`售完` 只代表該列售完，不會讓整場直接判為 unavailable。若你指定 `C區`，系統可命中 `內野西C區下層 / 500 / 剩餘 8`。

相關文件：

- [逐列票區判斷](docs/ROW_LEVEL_AVAILABILITY.md)
- [平台 Parser](docs/PLATFORM_PARSERS.md)
- [Manual Parse](docs/MANUAL_PARSE.md)

## 精準比對與通知

Target 預設使用 `strict` 與 `available_only`：

- 同一個可用 row 符合票區與價格 → `AVAILABLE`，才通知
- 頁面有票，但不符合指定票區、價格、日期或場館 → `POSSIBLE_MATCH`，預設只寫 History
- 完全沒有可用票區 → `UNAVAILABLE`

價格採 exact numeric match。設定 `900` 不會匹配 `90`、`550` 或 `1900`。

## 建議使用流程

1. 到 `/targets` 新增監控目標。
2. 選平台或快速模板。
3. 貼上實際官方售票頁 URL。
4. 調整 include / exclude / 票區 / 價格 / 日期 / 場館。
5. 先按「立即檢查」確認解析結果。
6. 啟用 target。
7. 設定外部 scheduler。
8. 到 `/settings` 測試通知並確認資料庫與 scheduler 狀態。

不要啟用 `YOUR_EVENT_URL`、`YOUR_EVENT_ID` 或 `example.com` 這類 placeholder URL。

## 省資源 Scheduler Profile

外部 scheduler 可能每幾分鐘打一次 endpoint，但 Ticket Radar 會在**連資料庫之前**先判斷 scheduler gate。被 gate 略過的請求會直接回 200，不喚醒 PostgreSQL。

### balanced（Vercel 預設）

```bash
SCHEDULER_PROFILE=balanced
```

只允許每小時的第 `0`、`30` 分鐘進入資料庫，適合日常長期監控。

### eco

```bash
SCHEDULER_PROFILE=eco
```

只允許每小時第 `0` 分鐘，適合最省額度模式。

### burst

```bash
SCHEDULER_PROFILE=burst
```

不限制分鐘桶，完全依外部 scheduler 頻率。只建議活動接近釋票高峰時短暫使用。

### custom

```bash
SCHEDULER_PROFILE=custom
SCHEDULER_ALLOWED_MINUTES=5,20,35,50
```

自訂每小時允許進入資料庫的分鐘。

若啟用安靜時段，`SCHEDULER_SKIP_QUIET_HOURS=true` 會在該時段直接略過 scheduler，不連資料庫。手動檢查預設可繞過 gate。

## 外部 Scheduler

推薦使用 Authorization header：

```bash
curl \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://YOUR_DOMAIN/api/cron/check
```

平常建議：

- `balanced`：外部 scheduler 每 30 分鐘
- `eco`：每 60 分鐘
- `burst`：只有短期需要時才用 5–10 分鐘

Query secret 只保留相容性，可用下列設定關閉：

```bash
ALLOW_CRON_SECRET_QUERY=false
```

不要把完整 secret 放進公開文件、截圖、GitHub issue 或公開網址。

## Vercel Hobby

`vercel.json` 保留每日一次內建 Cron：

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

更頻繁的檢查使用 cron-job.org、GitHub Actions、UptimeRobot 或其他外部 scheduler。

## 資料庫

Production 必須使用 PostgreSQL 相容連線字串：

```bash
POSTGRES_URL=postgresql://...
```

或：

```bash
DATABASE_URL=postgresql://...
```

可使用 Neon、Supabase、Prisma Postgres、Railway、Render、AWS RDS 等 PostgreSQL 服務。Vercel production 不使用 SQLite fallback。

### Production migration

Production 預設：

```bash
AUTO_DB_MIGRATE=false
```

這可避免每個 serverless cold start 都重跑 `CREATE TABLE`、`ALTER TABLE` 與 backfill。建立新資料庫或程式更新 schema 後，請手動執行一次：

```bash
npx vercel env pull .env.local --environment=production
npm install
npm run db:diagnose
npm run db:init
npm run db:diagnose
```

必要時再執行：

```bash
npm run seed
```

## 健康檢查

不連資料庫的 shallow check：

```text
GET /api/health
```

它只回報資料庫是否已設定、scheduler gate 與通知設定，不會喚醒 DB。

需實際連 DB 的 deep check，必須提供 Cron Secret：

```bash
curl \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://YOUR_DOMAIN/api/health?deep=1"
```

## 建議 Production 環境變數

```bash
DATABASE_URL=
POSTGRES_URL=
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

Production 使用 `CHECK_MODE=fetch`。`CHECK_MODE=playwright` 只建議 local / Docker。

## 本機執行

本機預設使用 SQLite，並允許自動初始化：

```bash
npm install
npm run db:init
npm run seed
npm run dev
```

## 通知去重

建議預設：

- 同 target + 同 status + 同命中內容，60 分鐘內不重複通知
- `ERROR` 60 分鐘內不重複通知
- 命中內容改變時可再次通知
- 被去重的通知仍寫入 `notification_events`

## OCR

本專案有參考 `bouob/tickets_hunter` 的平台化票務偵測思路，但沒有移植它的搶票流程、登入、點擊、驗證碼 OCR 或 GPL 程式碼。

Ticket Radar 的 OCR：

- 預設關閉
- 只讀公開售票頁上少量票況圖片文字
- 先偵測 CAPTCHA、Cloudflare、排隊與登入頁
- 跳過可能是驗證碼、challenge 或安全驗證的圖片
- OCR 命中後仍只發通知，購票需人工完成

詳見 [OCR 文件](docs/OCR.md)。

## 文件

- [Vercel 部署](docs/DEPLOY_VERCEL.md)
- [外部 Scheduler](docs/EXTERNAL_SCHEDULER.md)
- [Telegram 設定](docs/TELEGRAM_SETUP.md)
- [Discord 設定](docs/DISCORD_SETUP.md)
- [公開票況圖片 OCR](docs/OCR.md)
- [Manual Parse](docs/MANUAL_PARSE.md)
- [平台 Parser](docs/PLATFORM_PARSERS.md)
- [逐列票區判斷](docs/ROW_LEVEL_AVAILABILITY.md)
- [安全政策](docs/SAFETY.md)

## 免責

本工具只做公開資訊監控與通知，不保證票券庫存、通知即時性或購票成功率。使用者需自行確認官方售票網站規則並手動完成購票。
