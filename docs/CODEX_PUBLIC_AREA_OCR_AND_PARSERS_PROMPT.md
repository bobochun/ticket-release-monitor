# Codex Prompt：公開票區解析、平台客製化 Parser、公開座位圖 OCR 強化

你現在是我的 senior Next.js engineer、ticketing platform parser engineer、OCR engineer、Vercel engineer、database engineer、繁體中文 UX designer。

Repo：

```txt
https://github.com/bobochun/ticket-release-monitor
```

Production：

```txt
https://full-stack-engineer-next-js-enginee.vercel.app/
```

參考 repo：

```txt
https://github.com/bouob/tickets_hunter
```

重要：`tickets_hunter` / MaxBot 類型專案有許多自動購票、OCR 驗證碼、stealth、proxy、登入、選位、送單等功能。本專案不要搬那些功能。本專案只做「公開售票頁 / 公開票區 / 公開座位圖」解析與通知。

同時請注意授權問題：不要直接複製 `tickets_hunter` 的原始碼到本專案。只可參考它的平台覆蓋範圍、平台名稱、常見 URL pattern、關鍵字策略、票區/價格/狀態解析思路，並以 clean-room 方式重新實作 TypeScript parser。

---

## 0. 本次任務目標

請直接在現有 main branch 上強化 Ticket Radar，不要重寫成新專案。

本次要完成：

1. 大幅強化各售票平台的客製化 preset。
2. 建立 row-level 票區 / 票價 / 餘票 parser。
3. 不再因頁首有登入 icon / 購物車 icon 就誤判 LOGIN_REQUIRED。
4. 針對 CPBL 中信兄弟售票頁這類公開表格，解析每列票區狀態。
5. 建立公開座位圖 OCR 功能，但只允許用於公開座位圖、公開票區圖，不可用於驗證碼。
6. History / notification 要顯示可用票區、售完票區、最佳命中票區、剩餘數量。
7. 保持 Vercel Hobby 可部署，`vercel.json` 不要改回高頻 cron。
8. 保持安全邊界：不登入、不選位、不購買、不繞驗證、不繞排隊。

---

## 1. 安全邊界：更精準，不要過度敏感

目前 detector 不能太保守，否則很多公開可見餘票頁會被誤判。例如使用者提供的中信兄弟售票頁，頁首有會員 icon / 購物車 icon，流程條也有「訂單結帳」，但目前畫面公開顯示票區、票價、空位，所以應該正常解析。

### 允許解析

以下情況應該繼續解析：

- 頁首有登入 icon、會員 icon、購物車 icon。
- 頁面上方有流程文字「劃區選位 / 訂單結帳 / 完成訂購」，但目前停在公開劃區選位頁。
- 公開頁面顯示票區列表、票價、空位、熱賣中、售完、剩餘數字。
- 公開座位圖、SVG、image map、票區圖顯示座位區名稱。
- 公開活動資訊頁、場次頁、活動列表頁。

### 需要停止並回傳 BOT_CHECK / LOGIN_REQUIRED / QUEUE_DETECTED

只有下列情況才停止：

- 主要內容被 CAPTCHA / Cloudflare / Turnstile / hCaptcha / reCAPTCHA 擋住。
- 頁面主內容是 queue / waiting room，沒有活動資訊與票區表格。
- 頁面主內容明確要求先登入後才能看票區，且沒有任何可解析票區資訊。
- fetch / Playwright 取得的主內容只有驗證頁，沒有活動標題、票區、價格、餘票欄位。

### 新增 helper

請新增：

```ts
export function hasMeaningfulTicketContent(input: {
  text: string;
  html?: string;
}): boolean;
```

它要判斷是否看得到：

- 活動標題
- 場次日期
- 場館
- 票區 / 票價 / 空位 / 剩餘 / 狀態
- 熱賣中 / 售完 / 剩餘數字
- table / list / row 形式的票區資料

只要 `hasMeaningfulTicketContent` 為 true，就不要因 header 裡的「登入」直接回 LOGIN_REQUIRED。

---

## 2. Row-level availability parser

請新增 parser 架構：

```txt
src/server/parsers/
  types.ts
  parserRegistry.ts
  genericAvailabilityParser.ts
  cpblCtbcBrothersParser.ts
  cpblFubonGuardiansParser.ts
  ibonParser.ts
  famiticketParser.ts
  tixcraftParser.ts
  kktixParser.ts
  ticketPlusParser.ts
  eraTicketParser.ts
  khamParser.ts
  citylineParser.ts
  hkticketingParser.ts
  indievoxParser.ts
  seatMapOcr.ts
```

### 型別

請建立或擴充：

```ts
export type ParsedTicketArea = {
  areaName: string;
  price?: string;
  statusText: string;
  remainingText?: string;
  remainingCount?: number;
  isAvailable: boolean;
  isSoldOut: boolean;
  matchedAreaKeywords: string[];
  matchedPriceKeywords: string[];
  source: "table" | "list" | "text" | "svg" | "image-map" | "ocr";
};

export type ParsedAvailability = {
  eventTitle?: string;
  eventDate?: string;
  venue?: string;
  areas: ParsedTicketArea[];
  pageSignals: string[];
  hasTicketContent: boolean;
  parserId: string;
};
```

`CheckResult` 請擴充：

- parsedAreas
- eventTitle
- eventDate
- venue
- bestAvailableArea
- availableAreaCount
- soldOutAreaCount

DB schema idempotent 新增欄位：

- parsed_areas_json TEXT
- event_title TEXT
- event_date TEXT
- venue TEXT
- best_available_area_json TEXT
- available_area_count INTEGER DEFAULT 0
- sold_out_area_count INTEGER DEFAULT 0

請保持 migration 向後相容，不要清掉資料。

---

## 3. Generic parser：公開表格、列表、重複 row

`genericAvailabilityParser` 要能解析常見公開票區表格。

支援欄位關鍵字：

- 票區
- 區域
- 座位區
- 票價
- 價格
- 空位
- 剩餘
- 狀態
- Available
- Remaining
- Status
- Price
- Area

支援狀態判斷：

### Available

- 熱賣中
- 可購買
- 可訂購
- 剩餘
- 空位
- Available
- Buy
- Buy Tickets
- Register
- 數字，例如 `8`、`12`、`剩餘 8`

### Sold out

- 售完
- 已售完
- 銷售一空
- 暫無票券
- Sold Out
- Unavailable
- Not Available

重點：不要因整頁出現「售完」就把整場判定 unavailable。很多頁面會同時有某些區售完、某些區熱賣中。

判斷順序：

1. 先解析 row-level areas。
2. 若有可用 rows，根據 areaKeywords / priceKeywords 判 AVAILABLE 或 POSSIBLE_MATCH。
3. 若全部 row-level sold out，才回 UNAVAILABLE。
4. 若沒有 row-level areas，再 fallback 到整頁 include / exclude keywords。
5. areaBlacklist 只排除該 row，不排除整頁。
6. excludeKeywords 只有在沒有任何可用 row 時才作為整頁 unavailable 判斷。

---

## 4. CPBL 中信兄弟 parser

請針對這類頁面強化：

```txt
https://tix.ctbcsports.com/BROTHERS/UTK0204_?PERFORMANCE_ID=...&PRODUCT_ID=...
```

畫面常見公開欄位：

- 票區
- 票價
- 空位

範例 row：

```txt
內野南A區下層 / 400 / 熱賣中
內野南B區下層 / 400 / 熱賣中
內野C區下層 / 500 / 8
內野D區下層 / 500 / 售完
```

Parser 要做到：

1. 擷取活動標題，例如：中華職棒37年例行賽樂天桃猿vs中信兄弟 @ 洲際棒球場。
2. 擷取日期時間，例如：2026/06/05 18:35。
3. 擷取場館，例如：臺中洲際棒球場。
4. 擷取每個票區 row。
5. 空位欄若是數字，`remainingCount` 設為該數字，`isAvailable=true`。
6. 空位欄若是熱賣中，`isAvailable=true`。
7. 空位欄若是售完，`isSoldOut=true`。
8. 通知要列出最佳命中區域。

---

## 5. 其他平台 parser MVP

請為以下平台建立可擴充 parser。MVP 可先繼承 generic parser，但要有平台特定 keywords 與欄位 alias。

- cpbl_ctbc_brothers → cpblCtbcBrothersParser
- cpbl_fubon_guardians → cpblFubonGuardiansParser
- ibon → ibonParser
- famiticket → famiticketParser
- tixcraft → tixcraftParser
- kktix → kktixParser
- ticketplus → ticketPlusParser
- era_ticket → eraTicketParser
- kham → khamParser
- cityline → citylineParser
- hkticketing → hkticketingParser
- indievox → indievoxParser
- generic → genericAvailabilityParser

Parser registry：

```ts
export function getParserForPlatform(platformId: string): AvailabilityParser;
```

---

## 6. 平台 preset 全部客製化

請大幅強化 `src/shared/platformDefaults.ts`。

每個平台至少包含：

```ts
type PlatformDefault = {
  id: string;
  labelZh: string;
  labelEn?: string;
  category: "cpbl" | "concert" | "sports" | "hk" | "generic";
  parserId: string;
  urlHints: string[];
  defaultUrlPlaceholder: string;
  includeKeywords: string[];
  excludeKeywords: string[];
  areaKeywords: string[];
  areaBlacklist: string[];
  priceKeywords: string[];
  rowAvailableKeywords: string[];
  rowSoldOutKeywords: string[];
  tableHeaderKeywords: string[];
  notes: string;
  warning?: string;
};
```

請為這些平台客製化：

- generic
- tixcraft
- teamear
- ticketmaster
- indievox
- kktix
- ticketplus
- ibon
- era_ticket
- kham
- cityline
- hkticketing
- famiticket
- fansi_go
- funone
- cpbl_fubon_guardians
- cpbl_ctbc_brothers
- cpbl_unilions
- cpbl_rakuten_monkeys
- cpbl_weichuan_dragons
- cpbl_tsg_hawks

不要全部套 generic。每個平台至少要有自己的 `urlHints`、`tableHeaderKeywords`、`rowAvailableKeywords`、`rowSoldOutKeywords`、`notes`。

---

## 7. 公開座位圖 OCR：只允許非驗證碼

使用者要求加入 OCR，但限制非常明確：

```txt
OCR 只可用於公開座位圖文字解析，不可用於驗證碼。
```

請實作 `seatMapOcr.ts`，但安全設計如下：

### 7.1 允許 OCR 的內容

- 公開座位圖
- 球場座位圖
- 演唱會票區圖
- SVG / PNG / JPG 上的公開票區名稱
- 使用者手動指定的公開座位圖 URL
- 售票頁公開顯示的座位圖圖片，但不得是驗證碼

### 7.2 禁止 OCR 的內容

絕對不可 OCR：

- CAPTCHA 圖片
- 驗證碼圖片
- reCAPTCHA / hCaptcha / Turnstile 相關圖片
- 包含「請輸入驗證碼」「captcha」「verify」附近的圖片
- 表單驗證區塊內的圖片
- 登入 / 付款 / 結帳流程內的圖片

### 7.3 安全檢查

新增：

```ts
export function isLikelyCaptchaImage(input: {
  src?: string;
  alt?: string;
  nearbyText?: string;
  width?: number;
  height?: number;
}): boolean;
```

如果以下任一成立，禁止 OCR：

- src / alt / nearbyText 包含 captcha、verify、verification、驗證碼、驗證、我不是機器人、人機驗證
- image 在 input 欄位附近
- image 尺寸很小且旁邊有驗證碼輸入框
- image 位於 login / checkout / payment 表單內

### 7.4 OCR 預設關閉

新增 env：

```env
ENABLE_PUBLIC_SEATMAP_OCR=false
SEATMAP_OCR_MAX_IMAGES_PER_CHECK=2
SEATMAP_OCR_CACHE_HOURS=24
```

`.env.example` 補上。

Settings 頁顯示：

- 公開座位圖 OCR：已啟用 / 未啟用
- 說明：只辨識公開座位圖，不辨識驗證碼。

### 7.5 OCR 實作建議

優先順序：

1. 先解析 SVG text、image map `<area title>`、alt、aria-label，不需 OCR。
2. 再解析公開 seat map image 的 URL / alt / nearby text。
3. 只有 `ENABLE_PUBLIC_SEATMAP_OCR=true` 時才跑 OCR。
4. OCR 結果只作為 `pageSignals` 與 `areaKeywords` 輔助，不可觸發任何購票動作。

可使用 `tesseract.js` 或其他 JS OCR library，但要考量 Vercel bundle size 與 serverless runtime。如果太重，請先設計接口與 mock / optional dynamic import，不要讓 build 爆掉。

不要使用外部 OCR API，除非文件中明確說明需要額外 API key；MVP 先避免外部服務。

### 7.6 OCR UI

在 target 設定新增 optional 欄位：

- seatMapImageUrl
- enableSeatMapOcrForThisTarget

如果不想改 DB 太多，MVP 可以先在 notes 中保存，但建議正式加欄位：

- seat_map_image_url TEXT
- enable_seat_map_ocr BOOLEAN DEFAULT false
- seat_map_ocr_result_json TEXT
- seat_map_ocr_checked_at TEXT

---

## 8. 通知強化：顯示 row-level areas

Telegram / Discord 通知要顯示：

```txt
🎫 票券釋票雷達通知

狀態：疑似有票
目標：中信兄弟 6/5 內野 C 區
活動：中華職棒37年例行賽樂天桃猿vs中信兄弟 @ 洲際棒球場
時間：2026/06/05 18:35
場館：臺中洲際棒球場

最佳命中：內野西C區下層 / 500 / 剩餘 8
可用票區：
- 內野南A區下層 / 400 / 熱賣中
- 內野西C區下層 / 500 / 剩餘 8

售完票區：
- 內野C區下層 / 500 / 售完

官方頁面：https://...

提醒：本工具只通知，請自行到官方售票頁手動購票。
```

Discord embed 也要加入 parsed areas fields。

通知 dedupe hash 要包含：

- targetId
- status
- bestAvailableArea
- available area names
- remaining counts

如果同 target 從「熱賣中」變成「剩餘 8」或新區域釋出，應該再通知。

---

## 9. History UI 強化

`/history` 顯示：

- 活動標題
- 日期
- 場館
- 可用票區數
- 售完票區數
- 最佳命中區
- 展開 row 查看 parsed areas
- 可複製官方 URL

狀態判斷：

- AVAILABLE：疑似有票
- POSSIBLE_MATCH：其他區有票
- UNAVAILABLE：未偵測到
- BOT_CHECK：偵測到驗證
- QUEUE_DETECTED：偵測到排隊
- LOGIN_REQUIRED：需要登入
- ERROR：檢查錯誤

---

## 10. Targets UI 強化

`/targets`：

1. 選平台後顯示：
   - URL 範例
   - 可解析欄位
   - 平台 notes
   - 安全提醒
2. 快速模板更多：
   - 中信兄弟洲際球場
   - 中信兄弟大巨蛋
   - 富邦新莊
   - 統一獅台南
   - 樂天桃園
   - 味全天母
   - 台鋼澄清湖
   - TixCraft 演唱會
   - KKTIX 活動
   - iBon 球賽 / 演唱會
   - TicketPlus
   - 年代售票
   - 寬宏 KHAM
   - FamiTicket
   - Cityline
   - HKTicketing
3. 新增公開座位圖 OCR 區塊：
   - seatMapImageUrl
   - 是否啟用公開座位圖 OCR
   - 說明：不可用於驗證碼
4. 如果 URL 是 placeholder，不可啟用。
5. 手動檢查完成後顯示 parsed areas summary。

---

## 11. API / Cron 回傳強化

`/api/cron/check` 回傳每個 result 要包含：

- eventTitle
- eventDate
- venue
- availableAreaCount
- soldOutAreaCount
- bestAvailableArea
- parsedAreas summary

如果 dueTargets=0，回傳：

```json
{
  "ok": true,
  "message": "目前沒有到期需要檢查的目標。",
  "dueTargets": 0
}
```

---

## 12. 測試資料與測試

新增 unit tests：

1. CPBL 中信兄弟票區表格解析：
   - 熱賣中 → available
   - 數字 8 → available + remainingCount=8
   - 售完 → soldOut
2. mixed sold-out / available page 不應整頁 unavailable。
3. header 有登入 icon 但有票區表格，不應 LOGIN_REQUIRED。
4. captcha image 不可進 OCR。
5. public seat map image 才可 OCR candidate。
6. placeholder URL enabled 應被阻擋。

測試 fixture 可放：

```txt
tests/fixtures/cpbl-brothers-public-area.html
```

---

## 13. 文件更新

更新 README / docs：

- 說明 row-level 票區解析。
- 說明公開座位圖 OCR 僅限非驗證碼。
- 說明不支援 stealth / proxy / CAPTCHA OCR / 自動購票。
- 說明各平台 preset。
- 說明中信兄弟頁面如何設定 areaKeywords：內野、C區、熱區、下層等。

新增：

```txt
docs/PUBLIC_SEATMAP_OCR.md
```

內容：

- 功能用途
- 如何啟用 `ENABLE_PUBLIC_SEATMAP_OCR=true`
- 為什麼預設關閉
- 不會辨識 CAPTCHA
- 支援座位圖 URL
- 限制與 Vercel bundle size 注意事項

---

## 14. 保持 Vercel Hobby 可部署

不要修改 `vercel.json` 為 `*/5 * * * *`。

保持：

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

外部 scheduler 才負責每 5 分鐘。

不要新增 production while-loop worker。

---

## 15. 驗證

請跑：

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```

請確認：

- `/` 可 render。
- `/targets` 可新增、編輯、手動檢查。
- `/history` 顯示 parsed areas。
- `/settings` 顯示 OCR env 狀態。
- `/api/cron/check` 可回傳 parsed areas summary。
- `tests` 通過。
- Vercel build 不爆。

---

## 16. Commit / Push

完成後 commit 並 push 到 main。

建議 commit message：

```txt
Add public area parsers and safe seat map OCR
```

最後回報：

1. 修改檔案。
2. 平台 parser 完成範圍。
3. 中信兄弟公開票區表格解析結果。
4. OCR 功能如何啟用，且如何防止 OCR 驗證碼。
5. 通知顯示新增哪些欄位。
6. History 新增哪些欄位。
7. build / test 是否通過。
8. push commit hash。
