# Ticket Radar Safety Policy

Ticket Radar only performs low-frequency monitoring of public ticket pages.

It does not:

- login
- select seats
- add tickets to cart
- submit checkout forms
- submit orders
- pay
- bypass CAPTCHA, reCAPTCHA, hCaptcha, Cloudflare Turnstile, bot checks, queues, or waiting rooms
- use stealth browser patches
- rotate proxies
- use CAPTCHA solvers
- use OCR verification
- simulate human behavior to avoid protection
- use multiple accounts, sessions, or IPs to bypass limits

If CAPTCHA, Cloudflare, Turnstile, hCaptcha, reCAPTCHA, bot checks, queue pages, waiting rooms, or login requirements are detected, the current target check stops and records a safety status for manual handling.

Every alert includes:

```text
Manual purchase required. No login, seat selection, checkout, or payment automation was performed.
```

Users must follow each ticketing site's terms of service and applicable law.

Ticket Radar does not guarantee tickets and does not increase inventory. It only helps users notice public-page changes at a conservative frequency.
