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
    return result(target, "DISABLED", "Target is disabled.", startedAt);
  }

  const botHits = keywordHits(text, BOT_CHECK_TEXT);
  if (botHits.length > 0) {
    return result(
      target,
      "BOT_CHECK",
      "Bot check or CAPTCHA detected. Manual handling required.",
      startedAt,
      botHits
    );
  }

  const queueHits = keywordHits(text, QUEUE_TEXT);
  if (queueHits.length > 0) {
    return result(
      target,
      "QUEUE_DETECTED",
      "Queue or waiting room detected. Manual handling required.",
      startedAt,
      queueHits
    );
  }

  const loginHits = keywordHits(text, LOGIN_TEXT);
  if (loginHits.length > 0) {
    return result(
      target,
      "LOGIN_REQUIRED",
      "Login wording detected. This app will not automate login.",
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
      "Negative keywords or blacklisted areas were found.",
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
      "Possible ticket availability detected. Purchase manually on the official site.",
      startedAt,
      includeHits,
      areaHits,
      priceHits
    );
  }

  return result(
    target,
    "UNAVAILABLE",
    "No matching availability signal detected.",
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
    "Target check failed.",
    startedAt,
    [],
    [],
    [],
    error instanceof Error ? error.message : String(error)
  );
}
