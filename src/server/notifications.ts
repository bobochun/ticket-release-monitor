import { db } from "./db.js";
import type { CheckResult } from "./types.js";

function alertBody(result: CheckResult): string {
  return [
    `🎫 Ticket Radar Alert`,
    `Target: ${result.targetName}`,
    `Status: ${result.status}`,
    `Matched: ${[...result.matchedKeywords, ...result.matchedAreas, ...result.matchedPrices].join(", ") || "none"}`,
    `Checked: ${result.checkedAt}`,
    `URL: ${result.url}`,
    "",
    "Manual purchase required. No login, seat selection, checkout, or payment automation was performed."
  ].join("\n");
}

function shouldNotify(result: CheckResult): boolean {
  return ["AVAILABLE", "POSSIBLE_MATCH", "BOT_CHECK", "QUEUE_DETECTED", "LOGIN_REQUIRED", "ERROR"].includes(result.status);
}

function saveNotification(channel: string, result: CheckResult, status: string, error?: string): void {
  db.prepare(`
    INSERT INTO notification_events (type, channel, status, title, body, url, error)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run("check_result", channel, status, `${result.status}: ${result.targetName}`, alertBody(result), result.url, error ?? null);
}

async function sendTelegram(result: CheckResult): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: alertBody(result), disable_web_page_preview: false })
  });

  if (!response.ok) {
    throw new Error(`Telegram failed: ${response.status} ${await response.text().catch(() => "")}`);
  }
}

async function sendDiscord(result: CheckResult): Promise<void> {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: alertBody(result) })
  });

  if (!response.ok) {
    throw new Error(`Discord failed: ${response.status} ${await response.text().catch(() => "")}`);
  }
}

export async function notifyCheckResult(result: CheckResult): Promise<void> {
  if (!shouldNotify(result)) return;

  for (const [channel, sender] of [
    ["telegram", sendTelegram],
    ["discord", sendDiscord]
  ] as const) {
    try {
      await sender(result);
      saveNotification(channel, result, "sent");
    } catch (error) {
      saveNotification(channel, result, "error", error instanceof Error ? error.message : String(error));
    }
  }

  console.log(alertBody(result));
}

export async function sendTestNotification(): Promise<void> {
  const result: CheckResult = {
    targetName: "Test Notification",
    url: "https://example.com",
    status: "POSSIBLE_MATCH",
    message: "This is a Ticket Radar test notification.",
    matchedKeywords: ["test"],
    matchedAreas: [],
    matchedPrices: [],
    botCheckDetected: false,
    checkedAt: new Date().toISOString(),
    durationMs: 0
  };
  await notifyCheckResult(result);
}
