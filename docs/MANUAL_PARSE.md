# Manual Parse 手動票區解析

Manual Parse 是 Ticket Radar 的備援模式。當 Vercel serverless fetch 看不到完整公開內容，例如平台需要瀏覽器 session、頁面被 queue 擋住、或 iBon 類頁面回傳內容不足時，你可以自行在瀏覽器打開官方售票頁，把公開可見的票區文字或 HTML 貼到 `/manual-parse`。

Manual Parse 會使用和 cron 相同的 parserRegistry，不登入、不點擊、不購買、不繞過驗證。

## 使用方式

1. 到官方售票頁。
2. 只複製公開可見的票區、票價、空位、剩餘或狀態內容。
3. 打開 Ticket Radar 的 `/manual-parse`。
4. 選平台，例如 `CPBL 中信兄弟`、`iBon`、`FamiTicket / FamiLife`。
5. 貼上官方 URL。
6. 選內容類型：`text` 或 `html`。
7. 選擇是否儲存到 History、是否發送通知。
8. 按「開始解析」。

## 支援範例

```txt
內野南A區下層 400 熱賣中
內野西C區下層 500 8
內野D區下層 500 售完
```

解析結果會顯示：

- 可用票區數
- 售完票區數
- 最佳命中票區
- 每列票區的票價、狀態、剩餘數與來源

## 安全限制

如果貼上的內容包含 CAPTCHA、驗證碼、Turnstile、reCAPTCHA、hCaptcha、Cloudflare challenge、queue 或 login wall，系統會拒絕解析並提示你只貼公開票區內容。
