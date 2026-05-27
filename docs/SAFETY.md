# 安全政策

票券釋票雷達只做公開售票頁的低頻率監控與通知。

系統會優先解析公開可見的票區、票價、空位與活動資訊。頁首出現「登入」或「會員」不會單獨造成阻擋；只有在沒有任何公開票區內容，且主內容明確要求登入時，才會回 `LOGIN_REQUIRED`。

本工具不會：

- 自動登入
- 自動選位
- 自動加入購物車
- 自動提交購票表單
- 自動送出訂單
- 自動付款
- 繞過 CAPTCHA、reCAPTCHA、hCaptcha、Cloudflare Turnstile
- 繞過 bot check、queue、waiting room
- 使用 stealth browser patch
- 使用 proxy rotation
- 使用第三方 CAPTCHA solver
- 使用 OCR 驗證碼
- 模擬真人行為規避網站防護
- 使用多帳號、多 session、多 IP 規避限制

## OCR 使用邊界

本專案的 OCR 只允許用在公開售票頁上的票況圖片文字，例如「餘票」、「剩餘座位」、「熱區」或票區名稱。OCR 預設關閉，必須透過 `OCR_ENABLED=true` 才會啟用。

OCR 不會用於：

- 驗證碼圖片
- CAPTCHA / reCAPTCHA / hCaptcha
- Cloudflare Turnstile 或 challenge
- queue / waiting room 繞過
- 登入流程或購票流程

系統會先做安全偵測；如果頁面出現驗證、排隊或登入要求，會直接停止該 target 本次檢查，不會進入 OCR。

若偵測到 CAPTCHA、Cloudflare、Turnstile、hCaptcha、reCAPTCHA、bot check、queue、waiting room 或 login required，該 target 本次檢查會停止，並記錄安全狀態：

- `BOT_CHECK`
- `QUEUE_DETECTED`
- `LOGIN_REQUIRED`

通知會提醒：

```text
本工具只提供通知。請自行開啟官方售票頁手動購票；系統沒有登入、選位、結帳、付款，也沒有繞過驗證或排隊。
```

使用者仍須遵守各售票網站服務條款與所在地法律。本工具不保證買到票，也不會增加票券庫存。
