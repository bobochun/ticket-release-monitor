import * as cheerio from "cheerio";
import type { CheckResult, Target } from "@/src/shared/types";
import { detectAccessBarrier, detectAvailability, detectFromText, errorResult } from "./detector";
import { extractImageMetadataText, extractPublicImageText } from "./ocr";
import { getEnvNumber } from "./settings";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 TicketRadar/1.0";

function timeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

type PageSnapshot = {
  html: string;
  text: string;
  ocrUsed: boolean;
};

function extractVisibleText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const visibleText = $("body").text() || $.root().text();
  const imageMetadataText = extractImageMetadataText(html);
  return [visibleText, imageMetadataText].filter(Boolean).join("\n");
}

async function appendSafeOcrText(target: Target, html: string, text: string): Promise<string> {
  const barrier = detectAccessBarrier({ text, html, url: target.url });
  if (barrier.barrierType !== "none") return text;

  const ocr = await extractPublicImageText({
    html,
    pageUrl: target.url,
    timeoutMs: target.timeoutMs,
    userAgent: USER_AGENT
  });

  if (!ocr.text) return text;

  return [
    text,
    "OCR 公開票況圖片文字如下。這不是驗證碼辨識，也不會繞過驗證或排隊。",
    ocr.text
  ].join("\n");
}

async function fetchSnapshot(target: Target): Promise<PageSnapshot> {
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
  const visibleText = extractVisibleText(html);
  const text = `${response.status} ${response.statusText}\n${visibleText}`;
  const withOcr = await appendSafeOcrText(target, html, text);
  return { html, text: withOcr, ocrUsed: withOcr !== text };
}

async function playwrightSnapshot(target: Target): Promise<PageSnapshot> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: USER_AGENT });

  try {
    await page.goto(target.url, {
      waitUntil: "domcontentloaded",
      timeout: target.timeoutMs || getEnvNumber("NAVIGATION_TIMEOUT_MS", 30000)
    });
    const [bodyText, html] = await Promise.all([
      page.locator("body").innerText({ timeout: 10000 }).catch(() => ""),
      page.content().catch(() => "")
    ]);
    const text = [bodyText, extractImageMetadataText(html)].filter(Boolean).join("\n");
    const withOcr = html ? await appendSafeOcrText(target, html, text) : text;
    return { html, text: withOcr, ocrUsed: withOcr !== text };
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
    const snapshot = mode === "playwright" ? await playwrightSnapshot(target) : await fetchSnapshot(target);
    return detectAvailability({
      target,
      text: snapshot.text,
      html: snapshot.html,
      startedAt,
      source: snapshot.ocrUsed ? "ocr_assisted" : "auto_fetch"
    });
  } catch (error) {
    return errorResult(target, error, startedAt);
  }
}
