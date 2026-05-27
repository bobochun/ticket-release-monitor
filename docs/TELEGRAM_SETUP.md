# Telegram 通知設定

## 1. 建立 Bot

1. 在 Telegram 找 `@BotFather`。
2. 傳送 `/newbot`。
3. 依照指示輸入 bot 名稱與 username。
4. BotFather 會回傳 `TELEGRAM_BOT_TOKEN`。

## 2. 取得 Chat ID

常見方式：

1. 先對你的 bot 傳一則訊息。
2. 在瀏覽器打開：

   ```text
   https://api.telegram.org/botYOUR_TOKEN/getUpdates
   ```

3. 找到 `chat.id`，那就是 `TELEGRAM_CHAT_ID`。

如果你要傳到群組，請把 bot 加入群組並傳一則訊息，再用 `getUpdates` 找群組 chat id。

## 3. 加到 Vercel Env

在 Vercel Project Settings → Environment Variables 新增：

```bash
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## 4. Redeploy

設定 env 後請 Redeploy，讓 serverless function 讀到新值。

## 5. 測試

到 Ticket Radar `/settings`，按「測試 Telegram」。

若測試失敗，請確認：

- bot token 是否正確
- chat id 是否正確
- 你是否已經先對 bot 傳過訊息
- Vercel 是否已 redeploy
