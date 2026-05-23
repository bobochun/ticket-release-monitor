import { chromium, firefox, webkit, type Browser, type BrowserType, type Page } from "playwright";
import { detectCaptchaOrBotCheck } from "./detectors/captchaDetector.js";
import { detectTicketAvailability } from "./detectors/textDetector.js";
import { getEnvNumber } from "./config.js";
import type { MonitorResult, TargetConfig } from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

function getBrowserType(): BrowserType {
  const browserName = process.env.BROWSER_NAME ?? "chromium";
  if (browserName === "firefox") return firefox;
  if (browserName === "webkit") return webkit;
  return chromium;
}

async function openTargetPage(page: Page, target: TargetConfig): Promise<void> {
  const timeout = target.timeoutMs || getEnvNumber("NAVIGATION_TIMEOUT_MS", 30000);

  await page.goto(target.url, {
    waitUntil: "domcontentloaded",
    timeout
  });

  await page.waitForTimeout(2500);
}

export async function checkTarget(browser: Browser, target: TargetConfig): Promise<MonitorResult> {
  if (!target.enabled) {
    return {
      targetName: target.name,
      url: target.url,
      status: "DISABLED",
      checkedAt: nowIso(),
      message: "Target is disabled."
    };
  }

  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });

  try {
    await openTargetPage(page, target);

    const captcha = await detectCaptchaOrBotCheck(page);
    if (captcha.detected) {
      return {
        targetName: target.name,
        url: target.url,
        status: "CAPTCHA_OR_BOT_CHECK",
        checkedAt: nowIso(),
        message:
          "Captcha or bot check detected. The monitor will not attempt to bypass it. Please open the page manually.",
        error: captcha.reason
      };
    }

    const text = await page.locator("body").innerText({ timeout: 10000 });
    const detection = detectTicketAvailability(text, target.keywords, target.negativeKeywords);

    if (detection.matched) {
      return {
        targetName: target.name,
        url: target.url,
        status: "AVAILABLE",
        checkedAt: nowIso(),
        message: "Possible ticket availability detected. Please open the page and purchase manually.",
        matchedKeywords: detection.matchedKeywords,
        blockedByNegativeKeywords: detection.blockedByNegativeKeywords
      };
    }

    return {
      targetName: target.name,
      url: target.url,
      status: "UNAVAILABLE",
      checkedAt: nowIso(),
      message: "No availability signal detected.",
      matchedKeywords: detection.matchedKeywords,
      blockedByNegativeKeywords: detection.blockedByNegativeKeywords
    };
  } catch (error) {
    return {
      targetName: target.name,
      url: target.url,
      status: "ERROR",
      checkedAt: nowIso(),
      message: "Failed to check target.",
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}

export async function createBrowser(): Promise<Browser> {
  const browserType = getBrowserType();
  return browserType.launch({ headless: true });
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
