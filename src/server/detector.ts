import type {
  CheckResult,
  CheckSource,
  CheckStatus,
  ParsedAvailability,
  Target
} from "@/src/shared/types";
import { getParserForPlatform } from "./parsers/parserRegistry";
import { hasMeaningfulTicketContent } from "./parsers/genericAvailabilityParser";
import { evaluateTargetMatch } from "./matching";
import { notificationSkipReason } from "./notificationPolicy";
import { keywordHits, normalizeText } from "./text";

export { keywordHits, normalizeText };

export const BOT_CHECK_TEXT = [
  "captcha",
  "recaptcha",
  "hcaptcha",
  "turnstile",
  "cloudflare",
  "robot check",
  "verify you are human",
  "unusual traffic",
  "bot check",
  "security check",
  "access denied",
  "challenge",
  "cf-challenge",
  "cf-ray",
  "challenge-platform",
  "checking your browser",
  "just a moment",
  "請完成驗證",
  "驗證碼",
  "機器人",
  "不是機器人",
  "人機驗證",
  "安全性檢查",
  "安全驗證"
];

export const QUEUE_TEXT = [
  "queue",
  "waiting room",
  "please wait",
  "waiting",
  "排隊",
  "等候室",
  "請稍候",
  "等候中"
];

export const LOGIN_TEXT = [
  "請先登入",
  "必須登入",
  "登入後才能",
  "會員登入後",
  "login required",
  "sign in required",
  "please log in",
  "please sign in"
];

export type AccessBarrierType =
  | "none"
  | "cloudflare"
  | "turnstile"
  | "captcha"
  | "queue"
  | "login_required";

export type AccessBarrier = {
  barrierType: AccessBarrierType;
  confidence: number;
  message: string;
};

export type DetectionInput = {
  target: Target;
  text: string;
  html?: string;
  startedAt?: number;
  source?: CheckSource;
};

export function detectAccessBarrier(input: {
  text: string;
  html?: string;
  url?: string;
}): AccessBarrier {
  const meaningful = hasMeaningfulTicketContent(input);
  if (meaningful) {
    return {
      barrierType: "none",
      confidence: 0,
      message: "頁面包含公開票區或票價資訊，繼續解析。"
    };
  }

  const haystack = `${input.url || ""}\n${input.text}\n${input.html || ""}`;
  const turnstileHits = keywordHits(haystack, ["turnstile", "cf-turnstile"]);
  if (turnstileHits.length > 0) {
    return {
      barrierType: "turnstile",
      confidence: 0.98,
      message: "偵測到 Cloudflare Turnstile 或人機驗證，已停止本次檢查。"
    };
  }

  const cloudflareHits = keywordHits(haystack, [
    "cloudflare",
    "just a moment",
    "checking your browser",
    "cf-challenge",
    "cf-ray",
    "challenge-platform"
  ]);
  if (cloudflareHits.length > 0) {
    return {
      barrierType: "cloudflare",
      confidence: 0.95,
      message: "偵測到 Cloudflare challenge，已停止本次檢查。"
    };
  }

  const captchaHits = keywordHits(haystack, BOT_CHECK_TEXT);
  if (captchaHits.length > 0) {
    return {
      barrierType: "captcha",
      confidence: 0.9,
      message: "偵測到 CAPTCHA 或 bot check，已停止本次檢查。"
    };
  }

  const queueHits = keywordHits(haystack, QUEUE_TEXT);
  if (queueHits.length > 0) {
    return {
      barrierType: "queue",
      confidence: 0.88,
      message: "偵測到排隊或 waiting room，已停止本次檢查。"
    };
  }

  const loginHits = keywordHits(haystack, LOGIN_TEXT);
  if (loginHits.length > 0) {
    return {
      barrierType: "login_required",
      confidence: 0.75,
      message: "頁面主要內容要求登入後才能查看，已停止本次檢查。"
    };
  }

  return { barrierType: "none", confidence: 0, message: "未偵測到存取阻擋。" };
}

export function detectSafetyStatus(text: string): { status: Extract<CheckStatus, "BOT_CHECK" | "QUEUE_DETECTED" | "LOGIN_REQUIRED">; hits: string[] } | null {
  const barrier = detectAccessBarrier({ text });
  if (barrier.barrierType === "queue") return { status: "QUEUE_DETECTED", hits: keywordHits(text, QUEUE_TEXT) };
  if (barrier.barrierType === "login_required") return { status: "LOGIN_REQUIRED", hits: keywordHits(text, LOGIN_TEXT) };
  if (["cloudflare", "turnstile", "captcha"].includes(barrier.barrierType)) {
    return { status: "BOT_CHECK", hits: keywordHits(text, BOT_CHECK_TEXT) };
  }
  return null;
}

function baseResult(
  target: Target,
  status: CheckStatus,
  message: string,
  startedAt: number,
  extras: Partial<CheckResult> = {}
): CheckResult {
  const skipReason =
    extras.notifySkipReason ??
    notificationSkipReason({
      status,
      notifyOn: extras.notifyOn ?? target.notifyOn ?? "available_only"
    });
  return {
    targetId: target.id,
    targetName: target.name,
    url: target.url,
    status,
    message,
    matchedKeywords: [],
    matchedAreas: [],
    matchedPrices: [],
    parsedAreas: [],
    eventTitle: null,
    eventDate: null,
    venue: null,
    bestAvailableArea: null,
    availableAreaCount: 0,
    soldOutAreaCount: 0,
    source: "auto_fetch",
    matchMode: target.matchMode ?? "strict",
    notifyOn: target.notifyOn ?? "available_only",
    unmetConditions: [],
    matchingAvailableAreas: [],
    nonMatchingAvailableAreas: [],
    matchSummary: {
      hasAnyAvailableArea: false,
      hasAreaConstraint: target.areaKeywords.length > 0,
      hasPriceConstraint: target.priceKeywords.length > 0,
      hasDateConstraint: target.dateKeywords.length > 0,
      hasVenueConstraint: target.venueKeywords.length > 0,
      exactAreaMatched: false,
      exactPriceMatched: false,
      exactSameRowMatched: false
    },
    botCheckDetected: status === "BOT_CHECK",
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    error: null,
    ...extras,
    notifyDecision: extras.notifyDecision ?? (skipReason ? "skipped" : null),
    notifySkipReason: extras.notifySkipReason ?? skipReason
  };
}

export function detectFromText(target: Target, text: string, startedAt = Date.now(), html = "", source: CheckSource = "auto_fetch"): CheckResult {
  return detectAvailability({ target, text, html, startedAt, source });
}

export function detectAvailability(input: DetectionInput): CheckResult {
  const startedAt = input.startedAt ?? Date.now();
  const source = input.source ?? "auto_fetch";
  const html = input.html ?? "";

  if (!input.target.enabled && source !== "manual_parse") {
    return baseResult(input.target, "DISABLED", "目標未啟用，本次略過。", startedAt, { source });
  }

  const parser = getParserForPlatform(input.target.platform);
  const parsed = parser({ target: input.target, html, text: input.text });

  if (parsed.areas.length > 0) {
    return resultFromParsedAvailability(input.target, input.text, parsed, startedAt, source);
  }

  const barrier = detectAccessBarrier({ text: input.text, html, url: input.target.url });
  if (barrier.barrierType !== "none") {
    const status =
      barrier.barrierType === "queue"
        ? "QUEUE_DETECTED"
        : barrier.barrierType === "login_required"
          ? "LOGIN_REQUIRED"
          : "BOT_CHECK";
    return baseResult(input.target, status, `${barrier.message} 可使用 Manual Parse 手動貼上公開票區內容解析。`, startedAt, {
      source,
      matchedKeywords: keywordHits(input.text, [...BOT_CHECK_TEXT, ...QUEUE_TEXT, ...LOGIN_TEXT]),
      botCheckDetected: status === "BOT_CHECK"
    });
  }

  return fallbackKeywordDetection(input.target, input.text, startedAt, parsed, source);
}

function resultFromParsedAvailability(
  target: Target,
  text: string,
  parsed: ParsedAvailability,
  startedAt: number,
  source: CheckSource
): CheckResult {
  const evaluation = evaluateTargetMatch({ target, parsedAvailability: parsed });
  const availableRows = [
    ...evaluation.matchingAvailableAreas,
    ...evaluation.nonMatchingAvailableAreas
  ];
  const bestAvailableArea = evaluation.bestAvailableArea ?? null;
  const includeHits = keywordHits(text, target.includeKeywords);
  const matchedAreaNames = (evaluation.matchingAvailableAreas.length > 0 ? evaluation.matchingAvailableAreas : availableRows)
    .slice(0, 10)
    .map((area) => area.areaName);
  const matchedPrices = (evaluation.matchingAvailableAreas.length > 0 ? evaluation.matchingAvailableAreas : availableRows)
    .map((area) => area.price)
    .filter((price): price is string => Boolean(price));
  const notifySkip = notificationSkipReason({
    status: evaluation.status,
    notifyOn: target.notifyOn ?? "available_only"
  });

  if (evaluation.status === "AVAILABLE") {
    return baseResult(target, "AVAILABLE", evaluation.message, startedAt, {
      matchedKeywords: unique([...includeHits, ...parsed.pageSignals, bestAvailableArea?.statusText || ""]),
      matchedAreas: unique(matchedAreaNames),
      matchedPrices: unique(matchedPrices),
      parsedAreas: evaluation.parsedAreas,
      eventTitle: parsed.eventTitle ?? null,
      eventDate: parsed.eventDate ?? null,
      venue: parsed.venue ?? null,
      bestAvailableArea,
      availableAreaCount: availableRows.length,
      soldOutAreaCount: evaluation.soldOutAreas.length,
      source: source === "auto_fetch" && parsed.areas.some((area) => area.source === "ocr") ? "ocr_assisted" : source,
      matchMode: target.matchMode ?? "strict",
      notifyOn: target.notifyOn ?? "available_only",
      notifySkipReason: notifySkip,
      notifyDecision: notifySkip ? "skipped" : null,
      unmetConditions: evaluation.unmetConditions,
      matchingAvailableAreas: evaluation.matchingAvailableAreas,
      nonMatchingAvailableAreas: evaluation.nonMatchingAvailableAreas,
      matchSummary: evaluation.matchSummary
    });
  }

  if (evaluation.status === "POSSIBLE_MATCH") {
    return baseResult(target, "POSSIBLE_MATCH", evaluation.message, startedAt, {
      matchedKeywords: unique([...includeHits, ...parsed.pageSignals, bestAvailableArea?.statusText || ""]),
      matchedAreas: unique(matchedAreaNames),
      matchedPrices: unique(matchedPrices),
      parsedAreas: evaluation.parsedAreas,
      eventTitle: parsed.eventTitle ?? null,
      eventDate: parsed.eventDate ?? null,
      venue: parsed.venue ?? null,
      bestAvailableArea,
      availableAreaCount: availableRows.length,
      soldOutAreaCount: evaluation.soldOutAreas.length,
      source: source === "auto_fetch" && parsed.areas.some((area) => area.source === "ocr") ? "ocr_assisted" : source,
      matchMode: target.matchMode ?? "strict",
      notifyOn: target.notifyOn ?? "available_only",
      notifySkipReason: notifySkip,
      notifyDecision: notifySkip ? "skipped" : null,
      unmetConditions: evaluation.unmetConditions,
      matchingAvailableAreas: evaluation.matchingAvailableAreas,
      nonMatchingAvailableAreas: evaluation.nonMatchingAvailableAreas,
      matchSummary: evaluation.matchSummary
    });
  }

  return baseResult(target, "UNAVAILABLE", evaluation.message, startedAt, {
    matchedKeywords: unique([...includeHits, ...parsed.pageSignals]),
    matchedAreas: [],
    matchedPrices: [],
    parsedAreas: evaluation.parsedAreas,
    eventTitle: parsed.eventTitle ?? null,
    eventDate: parsed.eventDate ?? null,
    venue: parsed.venue ?? null,
    bestAvailableArea: null,
    availableAreaCount: 0,
    soldOutAreaCount: evaluation.soldOutAreas.length,
    source,
    notifySkipReason: notifySkip,
    notifyDecision: notifySkip ? "skipped" : null,
    unmetConditions: evaluation.unmetConditions,
    matchingAvailableAreas: evaluation.matchingAvailableAreas,
    nonMatchingAvailableAreas: evaluation.nonMatchingAvailableAreas,
    matchSummary: evaluation.matchSummary
  });
}

function fallbackKeywordDetection(
  target: Target,
  text: string,
  startedAt: number,
  parsed: ParsedAvailability,
  source: CheckSource
): CheckResult {
  const includeHits = keywordHits(text, target.includeKeywords);
  const excludeHits = keywordHits(text, target.excludeKeywords);
  const areaHits = keywordHits(text, target.areaKeywords);
  const areaBlacklistHits = keywordHits(text, target.areaBlacklist);
  const priceHits = keywordHits(text, target.priceKeywords);

  if (excludeHits.length > 0 || areaBlacklistHits.length > 0) {
    return baseResult(target, "UNAVAILABLE", "命中全局排除條件，暫不通知。", startedAt, {
      matchedKeywords: [...includeHits, ...excludeHits],
      matchedAreas: [...areaHits, ...areaBlacklistHits],
      matchedPrices: priceHits,
      eventTitle: parsed.eventTitle ?? null,
      eventDate: parsed.eventDate ?? null,
      venue: parsed.venue ?? null,
      source
    });
  }

  const areaMatches = target.areaKeywords.length === 0 || areaHits.length > 0;
  const priceMatches = target.priceKeywords.length === 0 || priceHits.length > 0;

  if (includeHits.length > 0 && areaMatches && priceMatches) {
    return baseResult(
      target,
      areaHits.length > 0 || priceHits.length > 0 ? "AVAILABLE" : "POSSIBLE_MATCH",
      "未解析到逐列票區，但偵測到疑似可購買或餘票訊號，請人工確認。",
      startedAt,
      {
        matchedKeywords: includeHits,
        matchedAreas: areaHits,
        matchedPrices: priceHits,
        eventTitle: parsed.eventTitle ?? null,
        eventDate: parsed.eventDate ?? null,
        venue: parsed.venue ?? null,
        source
      }
    );
  }

  return baseResult(target, "UNAVAILABLE", "尚未偵測到符合條件的釋票訊號。", startedAt, {
    matchedKeywords: includeHits,
    matchedAreas: areaHits,
    matchedPrices: priceHits,
    eventTitle: parsed.eventTitle ?? null,
    eventDate: parsed.eventDate ?? null,
    venue: parsed.venue ?? null,
    source
  });
}

export function errorResult(target: Target, error: unknown, startedAt: number): CheckResult {
  return baseResult(target, "ERROR", "檢查時發生錯誤，已記錄供後續排查。", startedAt, {
    error: error instanceof Error ? error.message : String(error)
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
