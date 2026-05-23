# Ticket Radar Rewrite Spec

## Product direction

Rewrite this repository into a safe ticket availability radar:

- 24/7 cloud monitoring worker
- Responsive web dashboard that also works well on mobile browsers
- Optional PWA-style installable mobile experience
- Telegram and Discord notifications
- Multi-platform event discovery and availability monitoring
- Manual purchase only

This project must never implement automatic ticket purchasing, automatic login, seat selection, checkout, payment, queue bypass, CAPTCHA solving, anti-bot evasion, proxy rotation, or stealth browser behavior.

## Core product name

English: Ticket Radar

Chinese: 票券釋票雷達

## Safety boundaries

Allowed:

- Low-frequency public page monitoring
- Public event page discovery from configured seed pages
- Keyword and visible text parsing
- Ticket area / price / availability filtering
- Notification when a possible match appears
- User manually opens the official ticket page

Not allowed:

- Bypassing CAPTCHA, Cloudflare, Turnstile, hCaptcha, reCAPTCHA, queue systems, or rate limits
- Automated login
- Automated account creation
- Automated seat selection
- Automated add-to-cart
- Automated checkout or payment
- High-frequency scraping
- Stealth browser patches
- Proxy rotation to avoid limits
- Third-party CAPTCHA solving

If a CAPTCHA, queue, bot check, or login wall appears, the worker must stop checking that page and notify the user to handle it manually.

## Target platforms

The system should support generic monitoring first, then add platform-specific adapters.

Initial platform list:

1. TixCraft / 拓元
2. Teamear
3. Ticketmaster
4. Indievox
5. KKTIX
6. TicketPlus / 遠大
7. iBon
8. 年代售票
9. 寬宏售票 / KHAM
10. Cityline 買飛
11. HKTicketing 快達票
12. FamiTicket / FamiLife
13. FANSI GO
14. FunOne
15. CPBL six-team ticketing sites

CPBL six-team ticketing targets should include configurable entries for:

- 富邦悍將
- 中信兄弟
- 統一獅
- 樂天桃猿
- 味全龍
- 台鋼雄鷹

Do not assume all teams share the same website structure. Model them as platform adapters or generic public page targets.

## Recommended architecture

Use a monorepo-style single repository.

```txt
ticket-release-monitor/
├─ app/                         # Next.js dashboard and API routes
├─ components/                  # UI components
├─ src/
│  ├─ server/
│  │  ├─ db/                    # SQLite/Postgres abstraction
│  │  ├─ monitor/               # worker, scheduler, detector
│  │  ├─ platforms/             # platform adapters
│  │  ├─ notifications/         # Telegram, Discord
│  │  └─ safety/                # rate limits, bot-check detection
│  ├─ shared/                   # shared types/schema
│  └─ cli/                      # CLI commands
├─ scripts/
│  └─ worker.ts                 # long-running worker entry
├─ config/
│  ├─ platforms.example.yml
│  ├─ targets.example.yml
│  └─ discovery.example.yml
├─ data/                        # local SQLite database, gitignored
├─ Dockerfile
├─ docker-compose.yml
├─ railway.json / render.yaml   # optional deployment templates
└─ README.md
```

## Runtime model

The application should have two long-lived processes in cloud deployment:

1. Web process
   - Next.js dashboard
   - Responsive mobile UI
   - API routes for targets, rules, logs, notifications, and manual checks

2. Worker process
   - Runs 24/7
   - Loads targets and discovery rules from database
   - Checks targets at safe intervals
   - Writes results to database
   - Sends notifications

For simple deployment, Docker Compose can run both processes.

For cloud deployment, use a platform that supports background workers, such as a VPS, Railway, Render worker service, Fly.io, or similar. Vercel alone is not ideal for 24/7 workers because it is optimized for request/response and scheduled functions rather than persistent background monitoring.

## Database model

Start with SQLite for local and small cloud deployments. Keep schema portable so Postgres can be added later.

Tables:

### targets

- id
- name
- platform
- url
- enabled
- check_interval_seconds
- timeout_ms
- include_keywords_json
- exclude_keywords_json
- area_keywords_json
- area_blacklist_json
- price_keywords_json
- notes
- created_at
- updated_at

### discovery_rules

- id
- name
- enabled
- platform
- seed_urls_json
- include_keywords_json
- optional_keywords_json
- exclude_keywords_json
- date_keywords_json
- venue_keywords_json
- team_keywords_json
- seat_keywords_json
- max_candidates
- created_at
- updated_at

### check_runs

- id
- target_id
- status
- message
- matched_keywords_json
- matched_areas_json
- matched_prices_json
- bot_check_detected
- checked_at
- duration_ms
- error

### discovered_candidates

- id
- rule_id
- title
- url
- platform
- score
- matched_keywords_json
- source_url
- discovered_at
- added_to_targets

### notification_events

- id
- type
- channel
- status
- title
- body
- url
- created_at
- error

### app_settings

- key
- value
- updated_at

## Platform adapter interface

Each platform adapter should implement a conservative interface:

```ts
export type PlatformAdapter = {
  id: string;
  label: string;
  hosts: string[];
  discover?: (context: DiscoverContext) => Promise<DiscoveredCandidate[]>;
  parseAvailability: (context: ParseContext) => Promise<AvailabilityResult>;
};
```

Generic adapter should work for unknown websites using visible text and keyword matching.

Platform-specific adapters can improve area and price parsing, but they must not click through purchase flows, bypass queues, or submit forms.

## Detector behavior

The checker should:

1. Open public page with Playwright or normal fetch when possible
2. Wait briefly for normal rendering
3. Detect CAPTCHA / bot check / queue / login wall
4. If detected, stop and notify manual handling
5. Extract visible text
6. Extract links and simple table/list rows when possible
7. Match include keywords
8. Apply exclude keywords
9. Match area keywords
10. Apply area blacklist
11. Match price keywords
12. Save result
13. Notify only when status changes or availability is detected

## Status values

- AVAILABLE
- UNAVAILABLE
- POSSIBLE_MATCH
- BOT_CHECK
- LOGIN_REQUIRED
- QUEUE_DETECTED
- ERROR
- DISABLED

## Notification channels

Minimum:

- Telegram Bot
- Discord Webhook
- Console logs

Optional later:

- Email
- Push notification through PWA service worker

Notification content:

```txt
🎫 Ticket Radar Alert
Target: 中信兄弟 6/15 熱區
Status: POSSIBLE_MATCH
Matched: 熱區, A1, 1000
URL: https://...
Checked: 2026-05-23 15:00
Note: Manual purchase required. No automation was performed.
```

## Web and mobile UI

Use Next.js App Router + Tailwind CSS.

Pages:

### Dashboard

- Overall status
- Active targets
- Last checked time
- Last result
- Recent alerts
- Worker health

### Targets

- Add/edit/delete targets
- Platform select
- URL
- Check interval
- Include keywords
- Exclude keywords
- Area keywords
- Area blacklist
- Price keywords
- Enabled switch
- Manual check button

### Discovery

- Add discovery rule
- Platform
- Seed URLs
- Date / venue / team / seat keywords
- Run discovery button
- Candidate list
- One-click add candidate as target

### History

- Check runs
- Status filters
- Target filters
- Export CSV/JSON

### Settings

- Telegram token status only, never expose token value
- Telegram chat ID status only
- Discord webhook status only
- Worker interval defaults
- Safety limits

Mobile design:

- Bottom navigation
- Large cards
- One-column layout
- Big action buttons
- One-tap open ticket URL
- PWA manifest

## API routes

- GET /api/health
- GET /api/targets
- POST /api/targets
- PATCH /api/targets/:id
- DELETE /api/targets/:id
- POST /api/targets/:id/check
- GET /api/runs
- GET /api/discovery-rules
- POST /api/discovery-rules
- POST /api/discovery-rules/:id/run
- POST /api/candidates/:id/add-target
- GET /api/settings
- PATCH /api/settings
- POST /api/notifications/test

## CLI commands

Keep CLI for server use:

```bash
npm run dev            # web dashboard
npm run worker         # 24/7 monitor worker
npm run check          # one-time check all enabled targets
npm run discover       # one-time discovery all enabled rules
npm run db:init        # initialize database
npm run test
npm run typecheck
npm run lint
```

## Deployment

Preferred deployment options:

### Simple VPS / Docker Compose

- One container for web
- One container for worker
- Shared volume for SQLite data

### Railway / Render / Fly.io

- Web service
- Worker service
- Persistent disk or Postgres

### Vercel

- Dashboard only
- Not recommended as the only runtime for 24/7 worker

## Environment variables

```env
DATABASE_URL=file:./data/ticket-radar.sqlite
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DISCORD_WEBHOOK_URL=
DEFAULT_CHECK_INTERVAL_SECONDS=180
MIN_CHECK_INTERVAL_SECONDS=120
MAX_CONCURRENT_CHECKS=2
MAX_CONCURRENT_PER_HOST=1
BROWSER_NAME=chromium
NAVIGATION_TIMEOUT_MS=45000
```

## First rewrite milestone

Build a functional MVP with:

1. Next.js dashboard
2. SQLite database
3. Add/edit/delete targets
4. One-time manual check from UI
5. Worker process for enabled targets
6. Telegram + Discord notifications
7. Generic adapter
8. FamiTicket / CTBC / iBon examples
9. PWA mobile-friendly UI
10. Dockerfile and docker-compose

## Second milestone

Add:

1. Discovery rules UI
2. Candidate event links
3. One-click candidate-to-target
4. Platform adapters for TixCraft, KKTIX, TicketPlus, iBon, FamiTicket, CTBC
5. CSV/JSON export
6. Better history charts

## Third milestone

Add:

1. More platform adapters
2. Postgres support
3. PWA push notifications
4. Team/venue/date helper templates for CPBL
5. Alert deduplication and quiet hours

## Acceptance criteria

- The app runs locally with `npm run dev` and `npm run worker`
- The dashboard is usable on mobile width
- The worker can run continuously in a container
- No secrets are committed
- CAPTCHA/bot check results in notification and no bypass attempt
- A target can be created from the UI
- A manual check can be triggered from the UI
- A possible availability match creates a check_runs entry and notification event
- All purchase actions remain manual
