import type { CheckResult } from "@/src/shared/types";
import { ensureDb, getDb } from "./db";

export const NOTIFY_STATUSES = [
  "AVAILABLE",
  "POSSIBLE_MATCH",
  "BOT_CHECK",
  "QUEUE_DETECTED",
  "LOGIN_REQUIRED",
  "ERROR"
] as const;

export function shouldNotify(result: CheckResult): boolean {
  return NOTIFY_STATUSES.includes(result.status as (typeof NOTIFY_STATUSES)[number]);
}

export function alertBody(result: CheckResult): string {
  const matched = [
    ...result.matchedKeywords,
    ...result.matchedAreas,
    ...result.matchedPrices
  ].join(", ");

  return [
    "🎫 Ticket Radar Alert",
    `Target: ${result.targetName}`,
    `Status: ${result.status}`,
    `Matched: ${matched || "none"}`,
    `URL: ${result.url}`,
    `Checked: ${result.checkedAt}`,
    "",
    "Manual purchase required. No login, seat selection, checkout, or payment automation was performed."
  ].join("\n");
}

async function saveNotification(
  channel: string,
  result: CheckResult,
  status: string,
  error?: string
): Promise<void> {
  await ensureDb();
  const db = await getDb();
  await db.execute(
    `INSERT INTO notification_events (type, channel, status, title, body, url, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      "check_result",
      channel,
      status,
      `${result.status}: ${result.targetName}`,
      alertBody(result),
      result.url,
      error ?? null
    ]
  );
}

async function sendTelegram(result: CheckResult): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: alertBody(result),
      disable_web_page_preview: false
    })
  });

  if (!response.ok) {
    throw new Error(`Telegram failed: ${response.status} ${await response.text().catch(() => "")}`);
  }

  return true;
}

async function sendDiscord(result: CheckResult): Promise<boolean> {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return false;

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: alertBody(result) })
  });

  if (!response.ok) {
    throw new Error(`Discord failed: ${response.status} ${await response.text().catch(() => "")}`);
  }

  return true;
}

export async function notifyCheckResult(result: CheckResult): Promise<void> {
  if (!shouldNotify(result)) return;

  for (const [channel, sender] of [
    ["telegram", sendTelegram],
    ["discord", sendDiscord]
  ] as const) {
    try {
      const sent = await sender(result);
      await saveNotification(channel, result, sent ? "sent" : "skipped");
    } catch (error) {
      await saveNotification(
        channel,
        result,
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  console.log(alertBody(result));
}

export async function sendTestNotification(): Promise<void> {
  await notifyCheckResult({
    targetId: null,
    targetName: "Ticket Radar Test",
    url: "https://example.com",
    status: "POSSIBLE_MATCH",
    message: "This is a Ticket Radar test notification.",
    matchedKeywords: ["test"],
    matchedAreas: [],
    matchedPrices: [],
    botCheckDetected: false,
    checkedAt: new Date().toISOString(),
    durationMs: 0,
    error: null
  });
}
