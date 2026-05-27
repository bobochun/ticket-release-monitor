# Discord 通知設定

## 1. 建立 Webhook

1. 到 Discord server。
2. 選擇要接收通知的 channel。
3. Edit Channel。
4. Integrations。
5. Webhooks。
6. New Webhook。
7. Copy Webhook URL。

## 2. 加到 Vercel Env

在 Vercel Project Settings → Environment Variables 新增：

```bash
DISCORD_WEBHOOK_URL=
```

不要把 webhook URL 放到前端、README 或公開 issue。

## 3. Redeploy

設定 env 後請 Redeploy。

## 4. 測試

到 Ticket Radar `/settings`，按「測試 Discord」。

Discord 通知會用 embed 格式顯示：

- 狀態
- 目標
- 平台
- 命中關鍵字
- 命中票區
- 命中價格
- 檢查時間
- 官方頁面連結
