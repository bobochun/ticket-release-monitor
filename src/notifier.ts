import type { MonitorResult } from "./types.js";

export type Notifier = {
  notify(result: MonitorResult): Promise<void>;
};

function formatTelegramMessage(result: MonitorResult): string {
  const lines = [
    `🎫 Ticket monitor: ${result.status}`,
    `Target: ${result.targetName}`,
    `URL: ${result.url}`,
    `Checked at: ${result.checkedAt}`,
    "",
    result.message
  ];

  if (result.matchedKeywords?.length) {
    lines.push("", `Matched keywords: ${result.matchedKeywords.join(", ")}`);
  }

  if (result.blockedByNegativeKeywords?.length) {
    lines.push("", `Negative keywords: ${result.blockedByNegativeKeywords.join(", ")}`);
  }

  if (result.error) {
    lines.push("", `Error: ${result.error}`);
  }

  return lines.join("\n");
}

export class ConsoleNotifier implements Notifier {
  async notify(result: MonitorResult): Promise<void> {
    console.log("=".repeat(80));
    console.log(formatTelegramMessage(result));
    console.log("=".repeat(80));
  }
}

export class TelegramNotifier implements Notifier {
  constructor(
    private readonly botToken: string,
    private readonly chatId: string
  ) {}

  async notify(result: MonitorResult): Promise<void> {
    const message = formatTelegramMessage(result);
    const endpoint = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: message,
        disable_web_page_preview: false
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Telegram notification failed: ${response.status} ${body}`);
    }
  }
}

export function createNotifier(): Notifier {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (token && chatId) {
    return new TelegramNotifier(token, chatId);
  }

  return new ConsoleNotifier();
}
