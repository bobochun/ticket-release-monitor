# 公開票況圖片 OCR

Ticket Radar 現在支援可選的 OCR 輔助辨識，用來讀取公開售票頁上少量「票況圖片」的文字，例如「餘票」、「剩餘座位」、「A1 熱區」等。

這個功能參考了 `bouob/tickets_hunter` 的平台化票務辨識思路，但沒有移植其自動購票、登入、點擊、驗證碼辨識或 GPL 程式碼。Ticket Radar 的 OCR 是重新實作的安全版，只做通知型監控。

## 安全邊界

OCR 不會用於：

- CAPTCHA / reCAPTCHA / hCaptcha / Cloudflare Turnstile
- 驗證碼圖片
- queue / waiting room 繞過
- 登入頁處理
- 自動選位、自動加入購物車、自動結帳或自動付款

檢查流程會先偵測 CAPTCHA、Cloudflare、排隊與登入訊號；一旦命中，就停止該 target 本次檢查並通知人工處理，不會進入 OCR。

## 啟用方式

Production 預設建議先保持關閉：

```bash
OCR_ENABLED=false
```

若你要啟用，請在 Vercel env 或本機 `.env` 加上：

```bash
OCR_ENABLED=true
OCR_MODE=tesseract
OCR_LANG=eng+chi_tra
OCR_MAX_IMAGES_PER_CHECK=1
OCR_MAX_IMAGE_BYTES=800000
OCR_TIMEOUT_MS=12000
OCR_ALLOW_CROSS_ORIGIN=true
OCR_MIN_IMAGE_AREA=5000
```

Vercel Hobby 上建議：

- `MAX_TARGETS_PER_CRON=1`
- `OCR_MAX_IMAGES_PER_CHECK=1`
- 外部 scheduler 維持低頻率
- 只對少量重要 target 啟用監控

OCR 會增加 serverless function 的 CPU 與執行時間。若你要大量或長期 OCR，建議把 worker 放到 Render / Railway / VPS。

## 怎麼提高辨識率

在 target 的關鍵字加入：

- `餘票`
- `剩餘`
- `剩餘座位`
- `可售`
- `尚有座位`
- 票區，例如 `熱區`、`A1`、`B1`

OCR 文字會跟頁面文字一起進入既有 detector，所以命中規則、排除關鍵字、票區限制、價格限制都照常生效。
若 OCR 解析到公開票況圖上的 row-like 文字，例如 `內野西C區下層 500 8`，會進入 row-level availability，不會因為同頁其他圖片或文字出現 `售完` 就判整場沒票。

## 不會辨識驗證碼

如果圖片的 `src`、`alt`、`title`、`id`、`class` 等 metadata 看起來像 CAPTCHA、verification、challenge、Cloudflare 或登入相關圖片，系統會跳過該圖片。若頁面文字已顯示驗證或排隊，整次 check 會直接停止。
