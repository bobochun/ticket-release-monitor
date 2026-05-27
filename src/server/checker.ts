import * as cheerio from "cheerio";
import type { CheckResult, Target } from "@/src/shared/types";
import { detectFromText, errorResult } from "./detector";
import { getEnvNumber } from "./settings";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 TicketRadar/1.0";

function timeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

async function fetchText(target: Target): Promise<string> {
  const response = await fetch(target.url, {
    redirect: "follow",
    signal: timeoutSignal(target.timeoutMs),
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "zh-TW,zh;q=0.9,en;q=0.8"
    }
  });

  const html = await response.text();
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const visibleText = $("body").text() || $.root().text();
  return `${response.status} ${response.statusText}\n${visibleText}`;
}

async function playwrightText(target: Target): Promise<string> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: USER_AGENT });

  try {
    await page.goto(target.url, {
      waitUntil: "domcontentloaded",
      timeout: target.timeoutMs || getEnvNumber("NAVIGATION_TIMEOUT_MS", 30000)
    });
    return await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
  } finally {
    await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

export async function checkTarget(target: Target): Promise<CheckResult> {
  const startedAt = Date.now();

  if (!target.enabled) {
    return detectFromText(target, "", startedAt);
  }

  try {
    const mode = process.env.CHECK_MODE || "fetch";
    const text = mode === "playwright" ? await playwrightText(target) : await fetchText(target);
    return detectFromText(target, text, startedAt);
  } catch (error) {
    return errorResult(target, error, startedAt);
  }
}
