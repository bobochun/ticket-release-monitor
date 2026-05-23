import type { Page } from "playwright";
import type { CaptchaDetectionResult } from "../types.js";

const CAPTCHA_TEXT_PATTERNS = [
  "captcha",
  "recaptcha",
  "hcaptcha",
  "turnstile",
  "cloudflare",
  "robot check",
  "verify you are human",
  "are you human",
  "unusual traffic",
  "security check",
  "請完成驗證",
  "機器人",
  "不是機器人",
  "驗證您是真人",
  "安全性檢查",
  "請稍候",
  "人機驗證"
];

const CAPTCHA_SELECTOR_PATTERNS = [
  'iframe[src*="recaptcha"]',
  'iframe[src*="hcaptcha"]',
  'iframe[src*="challenges.cloudflare.com"]',
  'iframe[title*="captcha" i]',
  'iframe[title*="recaptcha" i]',
  'iframe[title*="hcaptcha" i]',
  ".g-recaptcha",
  ".h-captcha",
  "[data-sitekey]"
];

export async function detectCaptchaOrBotCheck(page: Page): Promise<CaptchaDetectionResult> {
  const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  const normalized = bodyText.replace(/\s+/g, " ").toLowerCase();

  for (const pattern of CAPTCHA_TEXT_PATTERNS) {
    if (normalized.includes(pattern.toLowerCase())) {
      return { detected: true, reason: `Page text contains bot-check keyword: ${pattern}` };
    }
  }

  for (const selector of CAPTCHA_SELECTOR_PATTERNS) {
    const count = await page.locator(selector).count().catch(() => 0);
    if (count > 0) {
      return { detected: true, reason: `Page contains bot-check selector: ${selector}` };
    }
  }

  return { detected: false };
}
