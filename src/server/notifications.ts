import type { CheckResult, CheckStatus, NotificationEvent } from "@/src/shared/types";
import { statusLabel } from "@/src/shared/status";
import { platformLabel } from "./platforms";
import { ensureDb, getDb } from "./db";
import { getEnvNumber } from "./settings";
import { notificationSkipReason, notificationThresholdAllows } from "./notificationPolicy";

export const NOTIFY_STATUSES: CheckStatus[] = [
  "AVAILABLE",
  "POSSIBLE_MATCH",
  "BOT_CHECK",
  "QUEUE_DETECTED",
  "LOGIN_REQUIRED",
  "ERROR"
];

export type NotificationChannel = "telegram" | "discord" | "all";

export type NotificationSendResult = {
  channel: "telegram" | "discord" | "console";
  status: "sent" | "skipped" | "deduped" | "quiet_hours" | "error";
  error?: string;
};

type NotificationEventRow = {
  id: number;
  type: string;
  channel: string;
  status: string;
  title: string;
  body: string;
  url: string | null;
  created_at: string;
  error: string | null;
};

function mapNotification(row: NotificationEventRow): NotificationEvent {
  return {
    id: row.id,
    type: row.type,
    channel: row.channel,
    status: row.status,
    title: row.title,
    body: row.body,
    url: row.url,
    createdAt: row.created_at,
    error: row.error
  };
}

export function shouldNotify(result: CheckResult): boolean {
  return NOTIFY_STATUSES.includes(result.status) && notificationThresholdAllows(result);
}

function matchedText(result: CheckResult): string {
  return [
    ...result.matchedKeywords,
    ...result.matchedAreas,
    ...result.matchedPrices
  ].join("、");
}

function areaLine(area: NonNullable<CheckResult["bestAvailableArea"]>): string {
  return [
    area.areaName,
    area.price,
    area.remainingCount !== undefined ? `剩餘 ${area.remainingCount}` : area.statusText
  ]
    .filter(Boolean)
    .join(" / ");
}

function areaList(areas: CheckResult["parsedAreas"], available: boolean): string {
  const filtered = areas
    .filter((area) => (available ? area.isAvailable : area.isSoldOut))
    .slice(0, 8)
    .map((area) => `- ${areaLine(area)}`);
  return filtered.length > 0 ? filtered.join("\n") : "- 無";
}

function areaListDirect(areas: CheckResult["parsedAreas"]): string {
  const filtered = areas.slice(0, 8).map((area) => `- ${areaLine(area)}`);
  return filtered.length > 0 ? filtered.join("\n") : "- 無";
}

function formatTaipeiTime(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function alertBody(result: CheckResult, platform = "generic"): string {
  return [
    "🎫 票券釋票雷達通知",
    "",
    `狀態：${statusLabel(result.status)}`,
    `目標：${result.targetName}`,
    result.eventTitle ? `活動：${result.eventTitle}` : null,
    result.eventDate ? `時間：${result.eventDate}` : null,
    result.venue ? `場館：${result.venue}` : null,
    `平台：${platformLabel(platform)}`,
    `來源：${result.source}`,
    `命中：${matchedText(result) || "無"}`,
    result.bestAvailableArea ? `最佳命中：${areaLine(result.bestAvailableArea)}` : null,
    result.matchingAvailableAreas.length > 0 ? `\n符合條件票區：\n${areaListDirect(result.matchingAvailableAreas)}` : null,
    result.nonMatchingAvailableAreas.length > 0 && result.status === "POSSIBLE_MATCH"
      ? `\n有票但未符合條件：\n${areaListDirect(result.nonMatchingAvailableAreas)}`
      : null,
    result.unmetConditions.length > 0 ? `\n未符合：\n- ${result.unmetConditions.join("\n- ")}` : null,
    `可用票區：${result.availableAreaCount}`,
    `售完票區：${result.soldOutAreaCount}`,
    result.parsedAreas.length > 0 ? `\n可用票區列表：\n${areaList(result.parsedAreas, true)}` : null,
    result.parsedAreas.length > 0 ? `\n售完票區列表：\n${areaList(result.parsedAreas, false)}` : null,
    `檢查時間：${formatTaipeiTime(result.checkedAt)}`,
    `官方頁面：${result.url}`,
    "",
    "提醒：",
    "本工具只提供通知。請自行開啟官方售票頁手動購票；系統沒有登入、選位、結帳、付款，也沒有繞過驗證或排隊。"
  ].filter(Boolean).join("\n");
}

function notificationFingerprint(result: CheckResult): string {
  return JSON.stringify({
    targetId: result.targetId ?? result.targetName,
    status: result.status,
    bestAvailableArea: result.bestAvailableArea
      ? {
          areaName: result.bestAvailableArea.areaName,
          remainingCount: result.bestAvailableArea.remainingCount,
          statusText: result.bestAvailableArea.statusText
        }
      : null,
    availableAreas: result.parsedAreas
      .filter((area) => area.isAvailable)
      .map((area) => [area.areaName, area.remainingCount ?? "", area.statusText].join(":"))
      .sort(),
    source: result.source,
    keywords: [...result.matchedKeywords].sort(),
    areas: [...result.matchedAreas].sort(),
    prices: [...result.matchedPrices].sort(),
    matchingAreas: result.matchingAvailableAreas
      .map((area) => [area.areaName, area.price ?? "", area.remainingCount ?? "", area.statusText].join(":"))
      .sort(),
    unmetConditions: [...result.unmetConditions].sort()
  });
}

function notificationTitle(result: CheckResult): string {
  return `${result.status}: ${result.targetName}: ${notificationFingerprint(result)}`;
}

async function saveNotification(
  channel: string,
  result: CheckResult,
  status: string,
  body: string,
  error?: string,
  type = "check_result"
): Promise<void> {
  await ensureDb();
  const db = await getDb();
  await db.execute(
    `INSERT INTO notification_events (type, channel, status, title, body, url, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      type,
      channel,
      status,
      notificationTitle(result),
      body,
      result.url,
      error ?? null
    ]
  );
}

async function wasRecentlyNotified(channel: string, result: CheckResult): Promise<boolean> {
  await ensureDb();
  const db = await getDb();
  const minutes =
    result.status === "ERROR"
      ? getEnvNumber("ERROR_DEDUPE_MINUTES", 15)
      : getEnvNumber("NOTIFICATION_DEDUPE_MINUTES", 30);
  const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);
  const row = await db.queryOne<{ id: number }>(
    `SELECT id FROM notification_events
     WHERE type = $1
       AND channel = $2
       AND title = $3
       AND url = $4
       AND status IN ('sent', 'deduped', 'quiet_hours')
       AND created_at >= $5
     ORDER BY created_at DESC
     LIMIT 1`,
    ["check_result", channel, notificationTitle(result), result.url, cutoff]
  );

  return Boolean(row);
}

function isQuietHoursNow(): boolean {
  if ((process.env.QUIET_HOURS_ENABLED || "false") !== "true") return false;
  const timeZone = process.env.QUIET_HOURS_TIMEZONE || "Asia/Taipei";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const now = hour * 60 + minute;
  const [startHour, startMinute] = (process.env.QUIET_HOURS_START || "23:30").split(":").map(Number);
  const [endHour, endMinute] = (process.env.QUIET_HOURS_END || "07:30").split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  return start <= end ? now >= start && now < end : now >= start || now < end;
}

function shouldSkipForQuietHours(status: CheckStatus): boolean {
  if (!isQuietHoursNow()) return false;
  return status !== "AVAILABLE" && status !== "POSSIBLE_MATCH";
}

async function sendTelegram(result: CheckResult, platform: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: alertBody(result, platform),
      disable_web_page_preview: false
    })
  });

  if (!response.ok) {
    throw new Error(`Telegram failed: ${response.status} ${await response.text().catch(() => "")}`);
  }

  return true;
}

async function sendDiscord(result: CheckResult, platform: string): Promise<boolean> {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return false;

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "🎫 票券釋票雷達",
          description: `${statusLabel(result.status)}｜${result.targetName}`,
          url: result.url,
          color: result.status === "ERROR" ? 0xdc2626 : result.status === "AVAILABLE" ? 0x16a34a : 0x2563eb,
          fields: [
            { name: "平台", value: platformLabel(platform), inline: true },
            { name: "活動", value: result.eventTitle || "未擷取", inline: false },
            { name: "時間", value: result.eventDate || "未擷取", inline: true },
            { name: "場館", value: result.venue || "未擷取", inline: true },
            { name: "來源", value: result.source, inline: true },
            { name: "比對 / 通知", value: `${result.matchMode} / ${result.notifyOn}`, inline: true },
            { name: "最佳命中", value: result.bestAvailableArea ? areaLine(result.bestAvailableArea) : "無", inline: false },
            { name: "符合條件票區", value: areaListDirect(result.matchingAvailableAreas).slice(0, 1000), inline: false },
            ...(result.status === "POSSIBLE_MATCH"
              ? [
                  { name: "有票但未符合條件", value: areaListDirect(result.nonMatchingAvailableAreas).slice(0, 1000), inline: false },
                  { name: "未符合", value: result.unmetConditions.join("、") || "無", inline: false }
                ]
              : []),
            { name: "可用 / 售完票區", value: `${result.availableAreaCount} / ${result.soldOutAreaCount}`, inline: true },
            { name: "命中關鍵字", value: result.matchedKeywords.join("、") || "無", inline: false },
            { name: "命中票區", value: result.matchedAreas.join("、") || "無", inline: true },
            { name: "命中價格", value: result.matchedPrices.join("、") || "無", inline: true },
            ...(result.parsedAreas.length > 0
              ? [
                  { name: "可用票區", value: areaList(result.parsedAreas, true).slice(0, 1000), inline: false },
                  { name: "售完票區", value: areaList(result.parsedAreas, false).slice(0, 1000), inline: false }
                ]
              : []),
            { name: "檢查時間", value: formatTaipeiTime(result.checkedAt), inline: false }
          ],
          footer: {
            text: "Manual purchase only. No bypass automation."
          }
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Discord failed: ${response.status} ${await response.text().catch(() => "")}`);
  }

  return true;
}

async function notifyChannel(
  channel: "telegram" | "discord",
  result: CheckResult,
  platform: string
): Promise<NotificationSendResult> {
  const body = alertBody(result, platform);

  if (shouldSkipForQuietHours(result.status)) {
    await saveNotification(channel, result, "quiet_hours", body, "安靜時段略過非緊急通知。");
    return { channel, status: "quiet_hours" };
  }

  if (await wasRecentlyNotified(channel, result)) {
    await saveNotification(channel, result, "deduped", body, "去重規則：同目標、同狀態、同命中內容於時間窗內不重複通知。");
    return { channel, status: "deduped" };
  }

  try {
    const sent = channel === "telegram" ? await sendTelegram(result, platform) : await sendDiscord(result, platform);
    await saveNotification(channel, result, sent ? "sent" : "skipped", body);
    return { channel, status: sent ? "sent" : "skipped" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await saveNotification(channel, result, "error", body, message);
    return { channel, status: "error", error: message };
  }
}

export async function notifyCheckResult(
  result: CheckResult,
  platform = "generic"
): Promise<NotificationSendResult[]> {
  if (!NOTIFY_STATUSES.includes(result.status)) return [];

  const thresholdSkip = notificationSkipReason(result);
  if (thresholdSkip) {
    result.notifyDecision = "skipped";
    result.notifySkipReason = thresholdSkip;
    await saveNotification("policy", result, "skipped", alertBody(result, platform), thresholdSkip);
    return [{ channel: "console", status: "skipped", error: thresholdSkip }];
  }

  const results: NotificationSendResult[] = [];
  results.push(await notifyChannel("telegram", result, platform));
  results.push(await notifyChannel("discord", result, platform));
  result.notifyDecision = summarizeNotificationDecision(results);
  result.notifySkipReason = result.notifyDecision === "sent" ? null : results.find((item) => item.error)?.error ?? result.notifySkipReason;

  console.log(alertBody(result, platform));
  return results;
}

function summarizeNotificationDecision(results: NotificationSendResult[]): CheckResult["notifyDecision"] {
  if (results.some((result) => result.status === "sent")) return "sent";
  if (results.some((result) => result.status === "error")) return "error";
  if (results.some((result) => result.status === "quiet_hours")) return "quiet_hours";
  if (results.some((result) => result.status === "deduped")) return "deduped";
  if (results.some((result) => result.status === "skipped")) return "skipped";
  return null;
}

export async function sendTestNotification(
  channel: NotificationChannel = "all"
): Promise<NotificationSendResult[]> {
  const result: CheckResult = {
    targetId: null,
    targetName: "測試通知",
    url: "https://example.com",
    status: "POSSIBLE_MATCH",
    message: "這是一則票券釋票雷達測試通知。",
    matchedKeywords: ["測試", "立即購票"],
    matchedAreas: ["A1"],
    matchedPrices: [],
    parsedAreas: [],
    eventTitle: "測試活動",
    eventDate: null,
    venue: null,
    bestAvailableArea: null,
    availableAreaCount: 0,
    soldOutAreaCount: 0,
    source: "auto_fetch",
    matchMode: "strict",
    notifyOn: "available_and_possible",
    notifyDecision: null,
    notifySkipReason: null,
    unmetConditions: [],
    matchingAvailableAreas: [],
    nonMatchingAvailableAreas: [],
    matchSummary: {
      hasAnyAvailableArea: false,
      hasAreaConstraint: false,
      hasPriceConstraint: false,
      hasDateConstraint: false,
      hasVenueConstraint: false,
      exactAreaMatched: false,
      exactPriceMatched: false,
      exactSameRowMatched: false
    },
    botCheckDetected: false,
    checkedAt: new Date().toISOString(),
    durationMs: 0,
    error: null
  };

  const channels = channel === "all" ? (["telegram", "discord"] as const) : ([channel] as const);
  const results: NotificationSendResult[] = [];
  for (const targetChannel of channels) {
    results.push(await notifyChannel(targetChannel, result, "generic"));
  }
  results.push({ channel: "console", status: "sent" });
  console.log(alertBody(result, "generic"));
  return results;
}

export async function listNotificationEvents(limit = 50): Promise<NotificationEvent[]> {
  await ensureDb();
  const db = await getDb();
  const rows = await db.query<NotificationEventRow>(
    "SELECT * FROM notification_events ORDER BY created_at DESC, id DESC LIMIT $1",
    [limit]
  );
  return rows.map(mapNotification);
}
