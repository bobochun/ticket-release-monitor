# Codex Prompt: Rewrite ticket-release-monitor into Ticket Radar

You are a senior full-stack engineer, cloud worker architect, product designer, and safety-conscious automation engineer.

Repository:

```txt
bobochun/ticket-release-monitor
```

Goal:

Rewrite this repository into **Ticket Radar / 票券釋票雷達**: a safe, cloud-deployable, 24/7 ticket availability monitoring system with a responsive web dashboard and mobile-friendly interface.

Important safety requirements:

- Do not implement ticket purchasing automation.
- Do not implement login automation.
- Do not implement seat selection automation.
- Do not implement checkout/payment automation.
- Do not bypass CAPTCHA, Cloudflare, Turnstile, hCaptcha, reCAPTCHA, queue systems, or rate limits.
- Do not implement stealth browser patches, proxy rotation, or CAPTCHA solving.
- If CAPTCHA, queue, login wall, or bot check is detected, stop checking that target and notify the user for manual handling.
- Use conservative check intervals. Enforce a minimum interval of 120 seconds.

Read and follow:

```txt
docs/TICKET_RADAR_REWRITE_SPEC.md
```

## Target platforms

Support a generic adapter first, then build platform adapter stubs for:

- TixCraft / 拓元
- Teamear
- Ticketmaster
- Indievox
- KKTIX
- TicketPlus / 遠大
- iBon
- 年代售票
- 寬宏售票 / KHAM
- Cityline 買飛
- HKTicketing 快達票
- FamiTicket / FamiLife
- FANSI GO
- FunOne
- 中職六大隊售票網站：富邦悍將、中信兄弟、統一獅、樂天桃猿、味全龍、台鋼雄鷹

## Required MVP implementation

Create a working monorepo-like Next.js app in the existing repository.

Use:

- Next.js App Router
- TypeScript
- Tailwind CSS
- SQLite for local persistence
- A small database helper layer; Prisma is allowed but keep it simple
- Playwright for rendered page checks
- Telegram notification
- Discord webhook notification
- Dockerfile and docker-compose for cloud/VPS deployment

## Required scripts

Update `package.json` to support:

```bash
npm run dev
npm run worker
npm run check
npm run discover
npm run db:init
npm run test
npm run typecheck
npm run lint
```

## Required UI pages

Build a responsive dashboard that works well on mobile:

1. `/` Dashboard
   - Worker health card
   - Active target count
   - Recent alerts
   - Recent check results

2. `/targets`
   - Target list
   - Add/edit target form
   - Manual check button
   - Enable/disable switch
   - Platform selector
   - URL field
   - Include/exclude keywords
   - Area keywords
   - Price keywords

3. `/discovery`
   - Discovery rules list
   - Add/edit rule form
   - Run discovery button
   - Candidate links
   - Add candidate as target

4. `/history`
   - Check run table
   - Status filter
   - Target filter
   - Export JSON/CSV button if reasonable

5. `/settings`
   - Telegram configured status only
   - Discord configured status only
   - Default interval
   - Safety settings
   - Send test notification button

Add mobile bottom navigation and PWA manifest.

## Required API routes

Implement:

- GET `/api/health`
- GET/POST `/api/targets`
- PATCH/DELETE `/api/targets/[id]`
- POST `/api/targets/[id]/check`
- GET `/api/runs`
- GET/POST `/api/discovery-rules`
- POST `/api/discovery-rules/[id]/run`
- POST `/api/candidates/[id]/add-target`
- GET/PATCH `/api/settings`
- POST `/api/notifications/test`

## Required worker

Create `scripts/worker.ts`.

Worker behavior:

- Runs forever until process exits
- Loads enabled targets from DB
- Checks each target only when due
- Enforces minimum interval and per-host concurrency
- Writes `check_runs`
- Sends Telegram/Discord notifications on AVAILABLE, POSSIBLE_MATCH, BOT_CHECK, LOGIN_REQUIRED, QUEUE_DETECTED, ERROR
- Deduplicate repeated notifications where possible

## Required database

Implement SQLite tables:

- targets
- discovery_rules
- check_runs
- discovered_candidates
- notification_events
- app_settings

Provide `npm run db:init`.

## Required detector

Implement conservative detector:

1. Open page with Playwright
2. Detect CAPTCHA / bot check / queue / login wall
3. Extract visible body text
4. Match include keywords
5. Remove matches if exclude keywords appear
6. Match area keywords and price keywords
7. Return status:
   - AVAILABLE
   - POSSIBLE_MATCH
   - UNAVAILABLE
   - BOT_CHECK
   - LOGIN_REQUIRED
   - QUEUE_DETECTED
   - ERROR

## Required examples

Include safe example data for:

- FamiLife / Guardians
- CTBC Brothers
- iBon
- KKTIX placeholder
- TixCraft placeholder
- 年代 placeholder

## Required deployment files

Add:

- Dockerfile
- docker-compose.yml
- `.env.example`
- `README.md` rewritten for Ticket Radar

Docker Compose should run:

- web service
- worker service
- shared data volume for SQLite

## Important implementation style

- Keep code clear and maintainable.
- Use full files, not fragments.
- Avoid overengineering.
- Build a working MVP first.
- Do not break safety boundaries.
- Do not store secrets in DB responses or show token values in UI.
- Add comments where behavior is safety-sensitive.

## Final validation commands

Run or make sure these can run:

```bash
npm install
npm run db:init
npm run typecheck
npm run lint
npm run test
npm run dev
npm run worker
```

If any command cannot run due to environment limitations, document why and what the user should run locally or in Codespaces.
