import { chromium, firefox, webkit, type Browser, type BrowserType } from "playwright";
import type { CheckResult, Target } from "./types.js";

const BOT_TEXT = [
  "captcha",
  "recaptcha",
  "hcaptcha",
  "turnstile",
  "cloudflare",
  "robot check",
  "verify you are human",
  "unusual traffic",
  "請完成驗證",
  "機器人",
  "不是機器人",
  "人機驗證",
  "安全性檢查"
];

const QUEUE_TEXT = ["queue", "waiting room", "排隊", "等候室", "請稍候", "waiting"];
const LOGIN_TEXT = ["登入", "會員登入", "login", "sign in"];

function nowIso(): string {
  return new Date().toISOString();
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function hits(text: string, keywords: string[]): string[] {
  const n = normalize(text);
  return keywords.filter((keyword) => n.includes(normalize(keyword)));
}

function getBrowserType(): BrowserType {
  const browserName = process.env.BROWSER_NAME ?? "chromium";
  if (browserName === "firefox") return firefox;
  if (browserName === "webkit") return webkit;
  return chromium;
}

export async function createBrowser(): Promise<Browser> {
  return getBrowserType().launch({ headless: true });
}

export async function checkTarget(target: Target, browser?: Browser): Promise<CheckResult> {
  const started = Date.now();
  const ownsBrowser = !browser;
  const activeBrowser = browser ?? (await createBrowser());
  const checkedAt = nowIso();

  if (!target.enabled) {
    return {
      targetId: target.id,
      targetName: target.name,
      url: target.url,
      status: "DISABLED",
      message: "Target is disabled.",
      matchedKeywords: [],
      matchedAreas: [],
      matchedPrices: [],
      botCheckDetected: false,
      checkedAt,
      durationMs: 0
    };
  }

  const page = await activeBrowser.newPage();

  try {
    await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: target.timeoutMs });
    await page.waitForTimeout(2500);

    const bodyText = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
    const pageText = normalize(bodyText);

    const botHits = hits(pageText, BOT_TEXT);
    if (botHits.length > 0) {
      return {
        targetId: target.id,
        targetName: target.name,
        url: target.url,
        status: "BOT_CHECK",
        message: "Bot check or CAPTCHA detected. Manual handling required.",
        matchedKeywords: botHits,
        matchedAreas: [],
        matchedPrices: [],
        botCheckDetected: true,
        checkedAt,
        durationMs: Date.now() - started
      };
    }

    const queueHits = hits(pageText, QUEUE_TEXT);
    if (queueHits.length > 0) {
      return {
        targetId: target.id,
        targetName: target.name,
        url: target.url,
        status: "QUEUE_DETECTED",
        message: "Queue or waiting room detected. Open manually if needed.",
        matchedKeywords: queueHits,
        matchedAreas: [],
        matchedPrices: [],
        botCheckDetected: false,
        checkedAt,
        durationMs: Date.now() - started
      };
    }

    const loginHits = hits(pageText, LOGIN_TEXT);
    if (loginHits.length > 0 && target.includeKeywords.length === 0) {
      return {
        targetId: target.id,
        targetName: target.name,
        url: target.url,
        status: "LOGIN_REQUIRED",
        message: "Login wording detected. This app will not automate login.",
        matchedKeywords: loginHits,
        matchedAreas: [],
        matchedPrices: [],
        botCheckDetected: false,
        checkedAt,
        durationMs: Date.now() - started
      };
    }

    const includeHits = hits(pageText, target.includeKeywords);
    const excludeHits = hits(pageText, target.excludeKeywords);
    const areaHits = hits(pageText, target.areaKeywords);
    const areaBlacklistHits = hits(pageText, target.areaBlacklist);
    const priceHits = hits(pageText, target.priceKeywords);

    if (excludeHits.length > 0 || areaBlacklistHits.length > 0) {
      return {
        targetId: target.id,
        targetName: target.name,
        url: target.url,
        status: "UNAVAILABLE",
        message: "Negative keywords or blacklisted areas were found.",
        matchedKeywords: [...includeHits, ...excludeHits],
        matchedAreas: [...areaHits, ...areaBlacklistHits],
        matchedPrices: priceHits,
        botCheckDetected: false,
        checkedAt,
        durationMs: Date.now() - started
      };
    }

    const hasAvailability = includeHits.length > 0;
    const hasArea = target.areaKeywords.length === 0 || areaHits.length > 0;
    const hasPrice = target.priceKeywords.length === 0 || priceHits.length > 0;

    if (hasAvailability && hasArea && hasPrice) {
      return {
        targetId: target.id,
        targetName: target.name,
        url: target.url,
        status: areaHits.length > 0 || priceHits.length > 0 ? "AVAILABLE" : "POSSIBLE_MATCH",
        message: "Possible ticket availability detected. Purchase manually on the official site.",
        matchedKeywords: includeHits,
        matchedAreas: areaHits,
        matchedPrices: priceHits,
        botCheckDetected: false,
        checkedAt,
        durationMs: Date.now() - started
      };
    }

    return {
      targetId: target.id,
      targetName: target.name,
      url: target.url,
      status: "UNAVAILABLE",
      message: "No matching availability signal detected.",
      matchedKeywords: includeHits,
      matchedAreas: areaHits,
      matchedPrices: priceHits,
      botCheckDetected: false,
      checkedAt,
      durationMs: Date.now() - started
    };
  } catch (error) {
    return {
      targetId: target.id,
      targetName: target.name,
      url: target.url,
      status: "ERROR",
      message: "Target check failed.",
      matchedKeywords: [],
      matchedAreas: [],
      matchedPrices: [],
      botCheckDetected: false,
      checkedAt,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    await page.close().catch(() => undefined);
    if (ownsBrowser) await activeBrowser.close().catch(() => undefined);
  }
}
