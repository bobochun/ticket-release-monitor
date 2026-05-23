# ticket-release-monitor

A conservative ticket release monitoring notifier.

This project checks public ticket pages at a low frequency and notifies you when a page appears to show ticket availability. It does **not** bypass CAPTCHA, does **not** automate purchases, and does **not** submit orders.

## What this project does

- Opens configured public ticket pages.
- Checks page text for availability keywords.
- Checks negative keywords such as sold out / unavailable.
- Detects common CAPTCHA or bot-check signals.
- Sends a Telegram notification when:
  - possible ticket availability is detected;
  - CAPTCHA / bot check is detected;
  - a target check errors.
- Lets you manually open the link and purchase by yourself.

## What this project does not do

This project intentionally does not support:

- bypassing CAPTCHA, reCAPTCHA, hCaptcha, Cloudflare Turnstile, or similar checks;
- automated login;
- automated queue bypass;
- automated seat selection;
- automated order submission;
- automated payment;
- high-frequency scraping;
- stealth browser patches or anti-bot evasion.

You are responsible for following each ticket website's terms of service.

## Quick start

```bash
npm install
npx playwright install chromium
cp .env.example .env
cp config/targets.example.yml config/targets.yml
```

Edit `config/targets.yml`:

```yml
targets:
  - name: "My Ticket Page"
    url: "https://example.com/tickets"
    enabled: true
    checkIntervalSeconds: 180
    timeoutMs: 30000
    keywords:
      - "Buy now"
      - "Available"
      - "立即購票"
      - "可購買"
    negativeKeywords:
      - "Sold out"
      - "已售完"
      - "暫無票券"
```

Run a single check:

```bash
npm run check
```

Run local watch mode:

```bash
npm run watch
```

## Telegram notification setup

1. Create a bot using Telegram `@BotFather`.
2. Put the bot token in `.env`:

```env
TELEGRAM_BOT_TOKEN=your_token_here
```

3. Get your chat ID.
4. Put it in `.env`:

```env
TELEGRAM_CHAT_ID=your_chat_id_here
```

When Telegram settings are not provided, the app logs notifications to the console.

## GitHub Actions

This project includes a manual-only workflow:

```txt
.github/workflows/manual-check.yml
```

It uses `workflow_dispatch`, so it only runs when you manually trigger it from the GitHub Actions tab.

The workflow does **not** include a high-frequency cron schedule by default.

## Recommended safety settings

- Keep `checkIntervalSeconds` at least 180 seconds for each target.
- Avoid monitoring many pages from the same website at once.
- Stop monitoring if the website asks you not to automate access.
- If CAPTCHA appears, handle it manually in your browser.
- Do not use this tool for automated checkout.

## Scripts

```bash
npm run check      # one-time check
npm run watch      # local watch mode
npm run test       # unit tests
npm run typecheck  # TypeScript type check
npm run lint       # ESLint
```

## Repository upload

Create a new GitHub repository named:

```txt
ticket-release-monitor
```

Then push this folder:

```bash
git init
git add .
git commit -m "Initial safe ticket release monitor"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ticket-release-monitor.git
git push -u origin main
```

## License

MIT
