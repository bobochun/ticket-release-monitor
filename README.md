# 票券釋票雷達 / Ticket Radar

票券釋票雷達是一個安全、低頻率、通知型的公開售票頁監控系統。它會檢查你設定的官方售票頁，若偵測到疑似釋票、排隊、驗證或錯誤，就寫入紀錄並通知 Telegram / Discord。

這不是搶票機器人，也不是自動購票工具。購票仍需你自行開啟官方頁面手動完成。

## 這次 OCR 升級做了什麼

我有參考 `bouob/tickets_hunter` 的平台化票務偵測思路，但沒有移植它的搶票流程、登入、點擊、驗證碼 OCR 或 GPL 程式碼。Ticket Radar 新增的是安全版「公開票況圖片 OCR」：

- 預設關閉，使用 `OCR_ENABLED=true` 才會啟用。
- 只讀公開售票頁上少量圖片文字，例如 `餘票`、`剩餘座位`、`A1 熱區`。
- 先偵測 CAPTCHA、Cloudflare、排隊與登入頁；命中就停止，不做 OCR。
- 會跳過看起來像驗證碼、challenge、登入或安全驗證的圖片。
- OCR 文字只會進入既有 detector，觸發通知後仍需人工購票。

詳細設定請看 [docs/OCR.md](docs/OCR.md)。

## 公開票區逐列解析

Ticket Radar 現在會優先解析公開票區 row，而不是先用整頁關鍵字一刀切。這修正了常見誤判：頁首有「登入 / 會員 / 購物車」，但主內容其實已公開顯示票區、票價、空位時，不會再直接判 `LOGIN_REQUIRED`。

新的 row-level availability 會逐列判斷：

```txt
內野南A區下層 400 熱賣中
內野西C區下層 500 8
內野D區下層 500 售完
```

`售完` 只代表該列售完，不會讓整場變成 unavailable。若你指定 `C區`，系統會命中 `內野西C區下層 / 500 / 剩餘 8`。

支援範圍請看：

- [docs/ROW_LEVEL_AVAILABILITY.md](docs/ROW_LEVEL_AVAILABILITY.md)
- [docs/PLATFORM_PARSERS.md](docs/PLATFORM_PARSERS.md)
- [docs/MANUAL_PARSE.md](docs/MANUAL_PARSE.md)

## 安全限制

本工具不會：

- 自動登入
- 自動選位
- 自動加入購物車
- 自動送出訂單
- 自動付款
- 繞過 CAPTCHA、reCAPTCHA、hCaptcha、Cloudflare Turnstile
- 繞過 queue / waiting room
- 使用 stealth browser patch、proxy rotation、OCR、第三方 CAPTCHA solver
- 高頻刷新或模擬真人行為規避網站防護

若偵測到驗證、排隊或登入需求，會停止該 target 本次檢查，記錄 `BOT_CHECK` / `QUEUE_DETECTED` / `LOGIN_REQUIRED`，並通知人工處理。

## 如何使用

1. 到 `/targets` 新增監控目標。
2. 選平台或快速模板。
3. 貼上實際官方售票頁 URL。
4. 調整有票關鍵字、排除關鍵字、票區與價格。
5. 先按「立即檢查」確認結果。
6. 啟用 target。
7. 設定外部 scheduler 每 5 分鐘呼叫 `/api/cron/check`。
8. 到 `/settings` 測試 Telegram / Discord 通知。

不要啟用 `YOUR_EVENT_URL`、`YOUR_EVENT_ID` 或 `example.com` 這類 placeholder URL。

## 平台預設與快速模板

`/targets` 提供平台預設與快速建立：

- 中信兄弟熱區模板
- 富邦悍將熱區模板
- TixCraft / 拓元演唱會模板
- KKTIX 活動模板
- iBon 售票模板
- TicketPlus 遠大售票模板
- 年代售票模板
- 寬宏 KHAM 模板
- FamiTicket 模板

平台預設會帶入 include / exclude / area / blacklist / notes。平台名稱只代表分類與預設，真正監控仍需要實際官方售票頁 URL。

## Vercel Hobby + 外部 Scheduler

Vercel Hobby 內建 Cron 只能 daily，因此本專案的 `vercel.json` 保持：

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

若要每 5 分鐘檢查，使用外部 scheduler 呼叫：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/check
```

或：

```text
https://YOUR_DOMAIN/api/cron/check?secret=YOUR_SECRET
```

推薦組合：

1. Vercel Hobby：Dashboard + API
2. Neon / Vercel Postgres：資料庫
3. cron-job.org / UptimeRobot / GitHub Actions：每 5 分鐘觸發

請將 `MAX_TARGETS_PER_CRON` 設為 `1` 或 `2`，避免單次 function 執行太久。

## 環境變數

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
NOTIFICATION_DEDUPE_MINUTES=30
ERROR_DEDUPE_MINUTES=15
QUIET_HOURS_ENABLED=false
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

Production 請使用 `CHECK_MODE=fetch`。`CHECK_MODE=playwright` 只建議 local / Docker 使用。
Vercel Hobby 若啟用 OCR，建議把 `MAX_TARGETS_PER_CRON=1`、`OCR_MAX_IMAGES_PER_CHECK=1`，避免單次 function 太久。

## 初始化資料庫與 seed

本機 SQLite：

```bash
npm install
npm run db:init
npm run seed
npm run dev
```

Production Postgres：

```bash
npx vercel env pull .env.local --environment=production
npm run db:diagnose
npm run db:init
npm run db:diagnose
npm run seed
```

`db:init` 會明確先讀 `.env.local`、再讀 `.env`，並顯示目前使用 `postgres via POSTGRES_URL`、`postgres via DATABASE_URL` 或 `sqlite fallback`。如果看到 SQLite fallback，代表沒有連到 Neon/Postgres，production DB 沒有被初始化。

## Telegram 設定

請看 [docs/TELEGRAM_SETUP.md](docs/TELEGRAM_SETUP.md)。

簡要流程：

1. 用 BotFather 建 bot。
2. 取得 `TELEGRAM_BOT_TOKEN`。
3. 取得 `TELEGRAM_CHAT_ID`。
4. 加到 Vercel env。
5. Redeploy。
6. 到 `/settings` 按「測試 Telegram」。

## Discord 設定

請看 [docs/DISCORD_SETUP.md](docs/DISCORD_SETUP.md)。

簡要流程：

1. 到 Discord channel 的 Integrations。
2. 建立 Webhook。
3. 複製 webhook URL。
4. 加到 Vercel env `DISCORD_WEBHOOK_URL`。
5. Redeploy。
6. 到 `/settings` 按「測試 Discord」。

## 外部 Scheduler

請看 [docs/EXTERNAL_SCHEDULER.md](docs/EXTERNAL_SCHEDULER.md)。

常用方式：

- cron-job.org：每 5 分鐘 GET `/api/cron/check?secret=...`
- UptimeRobot：HTTP(s) monitor，每 5 分鐘
- GitHub Actions schedule：使用 repo secrets 呼叫 endpoint
- Render / Railway / VPS：排程執行 curl

## 通知去重

預設規則：

- 同 target + 同 status + 同命中關鍵字 / 票區 / 價格，30 分鐘內不重複通知。
- `ERROR` 預設 15 分鐘內不重複通知。
- 若命中內容改變，會再次通知。
- 被去重的通知仍會寫入 `notification_events`，狀態為 `deduped`。

## 常見問題

### 為什麼 Vercel Cron 不是每 5 分鐘？

Vercel Hobby 內建 Cron 只能 daily。要每 5 分鐘請用外部 scheduler，或升級 Vercel Pro 後把 `vercel.json` 改回 `*/5 * * * *`。

### 可以保證買到票嗎？

不能。本工具只提供通知，不能增加庫存，也不會自動購票。

### 可以繞過驗證或排隊嗎？

不行。偵測到驗證、排隊或登入需求會停止檢查並通知人工處理。

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
