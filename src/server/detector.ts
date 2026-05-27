import type { CheckResult, CheckStatus, Target } from "@/src/shared/types";

export const BOT_CHECK_TEXT = [
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

export const QUEUE_TEXT = ["queue", "waiting room", "排隊", "等候室", "請稍候", "waiting"];

export const LOGIN_TEXT = ["登入", "會員登入", "login", "sign in"];

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function keywordHits(text: string, keywords: string[]): string[] {
  const normalized = normalizeText(text);
  return keywords
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .filter((keyword) => normalized.includes(normalizeText(keyword)));
}

function result(
  target: Target,
  status: CheckStatus,
  message: string,
  startedAt: number,
  matchedKeywords: string[] = [],
  matchedAreas: string[] = [],
  matchedPrices: string[] = [],
  error?: string
): CheckResult {
  return {
    targetId: target.id,
    targetName: target.name,
    url: target.url,
    status,
    message,
    matchedKeywords,
    matchedAreas,
    matchedPrices,
    botCheckDetected: status === "BOT_CHECK",
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    error: error ?? null
  };
}

export function detectFromText(target: Target, text: string, startedAt = Date.now()): CheckResult {
  if (!target.enabled) {
    return result(target, "DISABLED", "監控目標未啟用。", startedAt);
  }

  const botHits = keywordHits(text, BOT_CHECK_TEXT);
  if (botHits.length > 0) {
    return result(
      target,
      "BOT_CHECK",
      "偵測到驗證或 bot check，已停止本次檢查，請人工處理。",
      startedAt,
      botHits
    );
  }

  const queueHits = keywordHits(text, QUEUE_TEXT);
  if (queueHits.length > 0) {
    return result(
      target,
      "QUEUE_DETECTED",
      "偵測到排隊或 waiting room，已停止本次檢查，請人工處理。",
      startedAt,
      queueHits
    );
  }

  const loginHits = keywordHits(text, LOGIN_TEXT);
  if (loginHits.length > 0) {
    return result(
      target,
      "LOGIN_REQUIRED",
      "偵測到登入需求，本工具不會自動登入，請人工處理。",
      startedAt,
      loginHits
    );
  }

  const includeHits = keywordHits(text, target.includeKeywords);
  const excludeHits = keywordHits(text, target.excludeKeywords);
  const areaHits = keywordHits(text, target.areaKeywords);
  const areaBlacklistHits = keywordHits(text, target.areaBlacklist);
  const priceHits = keywordHits(text, target.priceKeywords);

  if (excludeHits.length > 0 || areaBlacklistHits.length > 0) {
    return result(
      target,
      "UNAVAILABLE",
      "命中排除關鍵字或排除票區。",
      startedAt,
      [...includeHits, ...excludeHits],
      [...areaHits, ...areaBlacklistHits],
      priceHits
    );
  }

  const areaMatches = target.areaKeywords.length === 0 || areaHits.length > 0;
  const priceMatches = target.priceKeywords.length === 0 || priceHits.length > 0;

  if (includeHits.length > 0 && areaMatches && priceMatches) {
    return result(
      target,
      areaHits.length > 0 || priceHits.length > 0 ? "AVAILABLE" : "POSSIBLE_MATCH",
      "偵測到可能有票訊號，請自行開啟官方頁面手動購票。",
      startedAt,
      includeHits,
      areaHits,
      priceHits
    );
  }

  return result(
    target,
    "UNAVAILABLE",
    "未偵測到符合條件的釋票訊號。",
    startedAt,
    includeHits,
    areaHits,
    priceHits
  );
}

export function errorResult(target: Target, error: unknown, startedAt: number): CheckResult {
  return result(
    target,
    "ERROR",
    "檢查目標時發生錯誤。",
    startedAt,
    [],
    [],
    [],
    error instanceof Error ? error.message : String(error)
  );
}
