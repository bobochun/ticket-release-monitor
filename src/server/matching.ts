import type {
  CheckStatus,
  MatchMode,
  MatchSummary,
  ParsedAvailability,
  ParsedTicketArea,
  Target
} from "@/src/shared/types";
import { keywordHits, normalizeText } from "./text";

export type TargetMatchEvaluation = {
  status: Extract<CheckStatus, "AVAILABLE" | "POSSIBLE_MATCH" | "UNAVAILABLE">;
  message: string;
  bestAvailableArea?: ParsedTicketArea;
  matchingAvailableAreas: ParsedTicketArea[];
  nonMatchingAvailableAreas: ParsedTicketArea[];
  soldOutAreas: ParsedTicketArea[];
  parsedAreas: ParsedTicketArea[];
  unmetConditions: string[];
  matchSummary: MatchSummary;
};

export function normalizePrice(value: string): number | null {
  const normalized = value.normalize("NFKC").replace(/,/g, "");
  const match = normalized.match(/(?:NT\$|NTD|TWD|\$)?\s*(\d{1,6})(?:\s*元)?/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeAreaName(area: string): string {
  return area
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[（）]/g, "")
    .toLowerCase();
}

export function matchedAreaKeywordsForArea(areaName: string, keywords: string[]): string[] {
  return keywords.filter((keyword) => areaKeywordMatches(areaName, keyword));
}

export function matchedPriceKeywordsForArea(area: Pick<ParsedTicketArea, "areaName" | "price" | "statusText">, keywords: string[]): string[] {
  return keywords.filter((keyword) => priceKeywordMatches(area, keyword));
}

export function areaKeywordMatches(areaName: string, keyword: string): boolean {
  const area = normalizeAreaName(areaName);
  const rawKeyword = normalizeAreaName(keyword);
  if (!rawKeyword) return false;

  const keywordWithoutZone = rawKeyword.endsWith("區") ? rawKeyword.slice(0, -1) : rawKeyword;
  const candidates = unique([rawKeyword, keywordWithoutZone].filter(Boolean));

  for (const candidate of candidates) {
    const index = area.indexOf(candidate);
    if (index < 0) continue;
    if (/\d/.test(candidate)) {
      const before = area[index - 1] ?? "";
      const after = area[index + candidate.length] ?? "";
      if (/\d/.test(before) || /\d/.test(after)) continue;
    }
    return true;
  }

  return false;
}

function priceKeywordMatches(
  area: Pick<ParsedTicketArea, "areaName" | "price" | "statusText">,
  keyword: string
): boolean {
  const keywordPrice = normalizePrice(keyword);
  if (keywordPrice !== null && /\d/.test(keyword)) {
    const rowPrice = normalizePrice(area.price || "");
    return rowPrice === keywordPrice;
  }

  const haystack = normalizeText([area.price, area.statusText, area.areaName].filter(Boolean).join(" "));
  return haystack.includes(normalizeText(keyword));
}

export function evaluateTargetMatch(input: {
  target: Target;
  parsedAvailability: ParsedAvailability;
}): TargetMatchEvaluation {
  const { target, parsedAvailability } = input;
  const matchMode: MatchMode = target.matchMode ?? "strict";
  const parsedAreas = parsedAvailability.areas.map((area) => enrichAreaMatches(area, target));
  const rowAllowed = (area: ParsedTicketArea) =>
    matchedAreaKeywordsForArea(area.areaName, target.areaBlacklist).length === 0;
  const availableRows = parsedAreas.filter((area) => area.isAvailable && rowAllowed(area));
  const soldOutAreas = parsedAreas.filter((area) => area.isSoldOut);

  if (availableRows.length === 0) {
    return {
      status: "UNAVAILABLE",
      message: "已解析票區，但目前沒有可用票區。",
      matchingAvailableAreas: [],
      nonMatchingAvailableAreas: [],
      soldOutAreas,
      parsedAreas,
      unmetConditions: [],
      matchSummary: buildMatchSummary(target, availableRows, [], false, false)
    };
  }

  const eventOk = keywordConstraintSatisfied(parsedAvailability.eventTitle, target.eventKeywords);
  const dateOk = keywordConstraintSatisfied(parsedAvailability.eventDate, target.dateKeywords);
  const venueOk = keywordConstraintSatisfied(parsedAvailability.venue, target.venueKeywords);
  const globalOk = eventOk && dateOk && venueOk;
  const rowMatches = availableRows.filter((area) => rowMatchesByMode(area, target, matchMode));
  const matchingAvailableAreas = globalOk ? rowMatches : [];
  const nonMatchingAvailableAreas = availableRows.filter((area) => !matchingAvailableAreas.includes(area));
  const exactAreaMatched = availableRows.some((area) => area.matchedAreaKeywords.length > 0);
  const exactPriceMatched = availableRows.some((area) => area.matchedPriceKeywords.length > 0);
  const exactSameRowMatched = rowMatches.length > 0;
  const unmetConditions = buildUnmetConditions({
    target,
    eventOk,
    dateOk,
    venueOk,
    availableRows,
    exactAreaMatched,
    exactPriceMatched,
    exactSameRowMatched,
    matchingAvailableAreas
  });
  const bestAvailableArea = matchingAvailableAreas[0] ?? nonMatchingAvailableAreas[0];

  if (matchingAvailableAreas.length > 0) {
    return {
      status: "AVAILABLE",
      message: "解析到符合條件的可用票區，請開啟官方頁面人工確認。",
      bestAvailableArea,
      matchingAvailableAreas,
      nonMatchingAvailableAreas,
      soldOutAreas,
      parsedAreas,
      unmetConditions: [],
      matchSummary: buildMatchSummary(target, availableRows, rowMatches, exactAreaMatched, exactPriceMatched)
    };
  }

  return {
    status: "POSSIBLE_MATCH",
    message: possibleMatchMessage(target, unmetConditions),
    bestAvailableArea,
    matchingAvailableAreas,
    nonMatchingAvailableAreas,
    soldOutAreas,
    parsedAreas,
    unmetConditions,
    matchSummary: buildMatchSummary(target, availableRows, rowMatches, exactAreaMatched, exactPriceMatched)
  };
}

function enrichAreaMatches(area: ParsedTicketArea, target: Target): ParsedTicketArea {
  return {
    ...area,
    matchedAreaKeywords: matchedAreaKeywordsForArea(area.areaName, target.areaKeywords),
    matchedPriceKeywords: matchedPriceKeywordsForArea(area, target.priceKeywords)
  };
}

function rowMatchesByMode(area: ParsedTicketArea, target: Target, matchMode: MatchMode): boolean {
  const hasAreaConstraint = target.areaKeywords.length > 0;
  const hasPriceConstraint = target.priceKeywords.length > 0;
  const areaOk = !hasAreaConstraint || area.matchedAreaKeywords.length > 0;
  const priceOk = !hasPriceConstraint || area.matchedPriceKeywords.length > 0;

  if (matchMode === "strict") return areaOk && priceOk;
  if (matchMode === "normal") {
    if (hasAreaConstraint && hasPriceConstraint) {
      return area.matchedAreaKeywords.length > 0 || area.matchedPriceKeywords.length > 0;
    }
    return areaOk && priceOk;
  }
  return true;
}

function keywordConstraintSatisfied(value: string | undefined, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  if (!value) return false;
  return keywordHits(value, keywords).length > 0;
}

function buildUnmetConditions(input: {
  target: Target;
  eventOk: boolean;
  dateOk: boolean;
  venueOk: boolean;
  availableRows: ParsedTicketArea[];
  exactAreaMatched: boolean;
  exactPriceMatched: boolean;
  exactSameRowMatched: boolean;
  matchingAvailableAreas: ParsedTicketArea[];
}): string[] {
  const { target } = input;
  const unmet: string[] = [];
  if (target.eventKeywords.length > 0 && !input.eventOk) unmet.push(`event: ${target.eventKeywords.join("、")}`);
  if (target.dateKeywords.length > 0 && !input.dateOk) unmet.push(`date: ${target.dateKeywords.join("、")}`);
  if (target.venueKeywords.length > 0 && !input.venueOk) unmet.push(`venue: ${target.venueKeywords.join("、")}`);
  if (target.areaKeywords.length > 0 && !input.exactAreaMatched) unmet.push(`area: ${target.areaKeywords.join("、")}`);
  if (target.priceKeywords.length > 0 && !input.exactPriceMatched) unmet.push(`price: ${target.priceKeywords.join("、")}`);
  if (
    target.matchMode === "strict" &&
    target.areaKeywords.length > 0 &&
    target.priceKeywords.length > 0 &&
    input.exactAreaMatched &&
    input.exactPriceMatched &&
    !input.exactSameRowMatched
  ) {
    unmet.push("same_row: 票區與價格未出現在同一個可用票區");
  }
  if (unmet.length === 0 && input.availableRows.length > 0 && input.matchingAvailableAreas.length === 0) {
    unmet.push("condition: 未符合目前比對模式");
  }
  return unmet;
}

function buildMatchSummary(
  target: Target,
  availableRows: ParsedTicketArea[],
  matchingRows: ParsedTicketArea[],
  exactAreaMatched: boolean,
  exactPriceMatched: boolean
): MatchSummary {
  return {
    hasAnyAvailableArea: availableRows.length > 0,
    hasAreaConstraint: target.areaKeywords.length > 0,
    hasPriceConstraint: target.priceKeywords.length > 0,
    hasDateConstraint: target.dateKeywords.length > 0,
    hasVenueConstraint: target.venueKeywords.length > 0,
    exactAreaMatched,
    exactPriceMatched,
    exactSameRowMatched: matchingRows.length > 0
  };
}

function possibleMatchMessage(target: Target, unmetConditions: string[]): string {
  const price = unmetConditions.find((item) => item.startsWith("price:"));
  if (price) return `解析到可用票區，但未符合指定價格 ${target.priceKeywords.join("、")}。`;
  const area = unmetConditions.find((item) => item.startsWith("area:"));
  if (area) return `解析到可用票區，但未符合指定票區 ${target.areaKeywords.join("、")}。`;
  if (unmetConditions.length > 0) return `解析到可用票區，但未符合指定條件：${unmetConditions.join("；")}。`;
  return "解析到可用票區，但未完全符合指定條件。";
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
