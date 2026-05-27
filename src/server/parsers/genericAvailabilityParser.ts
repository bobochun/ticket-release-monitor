import * as cheerio from "cheerio";
import type { ParsedAvailability, ParsedTicketArea, Target } from "../../shared/types";
import { getPlatformDefault, type PlatformDefault } from "../../shared/platformDefaults";
import { keywordHits, normalizeText } from "../text";
import type { AvailabilityParser, AvailabilityParserInput } from "./types";

const MEANINGFUL_TICKET_KEYWORDS = [
  "票區",
  "區域",
  "座位區",
  "票價",
  "價格",
  "空位",
  "剩餘",
  "狀態",
  "熱賣中",
  "可購買",
  "可訂購",
  "售完",
  "餘票",
  "剩餘座位",
  "可售",
  "尚有座位",
  "內野",
  "外野",
  "a區",
  "b區",
  "c區",
  "d區",
  "area",
  "price",
  "remaining",
  "status",
  "available",
  "sold out"
];

const AREA_HINTS = ["區", "area", "內野", "外野", "熱區", "特區", "看台", "座位"];
const PRICE_PATTERN = /(?:NT\$?\s*)?\d{2,5}(?:\s*元)?/i;

type ParserOptions = {
  parserId: string;
  platform: PlatformDefault;
};

export function hasMeaningfulTicketContent(input: { text: string; html?: string }): boolean {
  const haystack = `${input.text}\n${input.html || ""}`;
  if (keywordHits(haystack, MEANINGFUL_TICKET_KEYWORDS).length > 0) return true;

  if (input.html) {
    const $ = cheerio.load(input.html);
    const tableText = $("table, [role='table']").text();
    if (keywordHits(tableText, ["票區", "票價", "空位", "剩餘", "狀態", "Area", "Price", "Remaining"]).length >= 2) {
      return true;
    }
  }

  return splitCandidateLines(input.text).some((line) => parseLineToArea(line, undefined, defaultOptions("generic")));
}

export const genericAvailabilityParser: AvailabilityParser = (input) =>
  parseWithPlatform(input, "generic");

export function parseWithPlatform(input: AvailabilityParserInput, platformId: string): ParsedAvailability {
  const platform = getPlatformDefault(platformId);
  return parseWithOptions(input, { parserId: platform.parserId || platformId, platform });
}

export function parseWithOptions(input: AvailabilityParserInput, options: ParserOptions): ParsedAvailability {
  const pageSignals = keywordHits(input.text, [
    ...options.platform.includeKeywords,
    ...options.platform.rowAvailableKeywords,
    ...options.platform.rowSoldOutKeywords,
    ...options.platform.tableHeaderKeywords
  ]);
  const areas = dedupeAreas([
    ...parseTables(input, options),
    ...parseListLikeNodes(input, options),
    ...parseTextLines(input, options)
  ]);

  return {
    ...extractEventMeta(input.html, input.text),
    areas,
    pageSignals,
    hasTicketContent:
      areas.length > 0 ||
      pageSignals.length > 0 ||
      hasMeaningfulTicketContent({ text: input.text, html: input.html }),
    parserId: options.parserId
  };
}

function defaultOptions(platformId: string): ParserOptions {
  const platform = getPlatformDefault(platformId);
  return { parserId: platform.parserId || platformId, platform };
}

function parseTables(input: AvailabilityParserInput, options: ParserOptions): ParsedTicketArea[] {
  if (!input.html) return [];
  const $ = cheerio.load(input.html);
  const areas: ParsedTicketArea[] = [];

  $("table").each((_, table) => {
    const rows = $(table).find("tr").toArray();
    if (rows.length === 0) return;

    const firstCells = cellTexts($, rows[0]);
    const hasHeader = keywordHits(firstCells.join(" "), options.platform.tableHeaderKeywords).length > 0;
    const headerMap = buildHeaderMap(firstCells);

    rows.slice(hasHeader ? 1 : 0).forEach((row) => {
      const cells = cellTexts($, row);
      if (cells.length < 2) return;
      const parsed = parseCellsToArea(cells, headerMap, input.target, options);
      if (parsed) areas.push(parsed);
    });
  });

  return areas;
}

function parseListLikeNodes(input: AvailabilityParserInput, options: ParserOptions): ParsedTicketArea[] {
  if (!input.html) return [];
  const $ = cheerio.load(input.html);
  const areas: ParsedTicketArea[] = [];
  const selector = "li, [class*=row], [class*=ticket], [class*=area], [class*=zone], [class*=seat]";

  $(selector).each((_, node) => {
    const text = compact($(node).text());
    if (text.length < 6 || text.length > 180) return;
    const parsed = parseLineToArea(text, input.target, options, "list");
    if (parsed) areas.push(parsed);
  });

  return areas;
}

function parseTextLines(input: AvailabilityParserInput, options: ParserOptions): ParsedTicketArea[] {
  const text = input.text.includes("<") && input.text.includes(">") ? cheerio.load(input.text).text() : input.text;
  return splitCandidateLines(text)
    .map((line) => parseLineToArea(line, input.target, options, line.includes("OCR 公開") ? "ocr" : "text"))
    .filter((area): area is ParsedTicketArea => Boolean(area));
}

function cellTexts($: cheerio.CheerioAPI, row: Parameters<cheerio.CheerioAPI>[0]): string[] {
  return $(row)
    .find("th, td")
    .toArray()
    .map((cell) => compact($(cell).text()))
    .filter(Boolean);
}

function buildHeaderMap(headers: string[]) {
  const normalized = headers.map(normalizeText);
  const findIndex = (keywords: string[]) => normalized.findIndex((header) => keywords.some((keyword) => header.includes(normalizeText(keyword))));
  return {
    area: findIndex(["票區", "區域", "座位", "area", "zone"]),
    price: findIndex(["票價", "價格", "price"]),
    status: findIndex(["空位", "剩餘", "狀態", "status", "remaining", "available"])
  };
}

function parseCellsToArea(
  cells: string[],
  headerMap: ReturnType<typeof buildHeaderMap>,
  target: Target,
  options: ParserOptions
): ParsedTicketArea | null {
  const areaName = cells[headerMap.area >= 0 ? headerMap.area : 0];
  const price = cells[headerMap.price >= 0 ? headerMap.price : 1]?.match(PRICE_PATTERN)?.[0] || cells[1];
  const statusText =
    cells[headerMap.status >= 0 ? headerMap.status : Math.min(cells.length - 1, 2)] ||
    cells.slice(2).join(" ");
  return buildArea({
    areaName,
    price,
    statusText,
    rowText: cells.join(" "),
    target,
    options,
    source: "table"
  });
}

function parseLineToArea(
  line: string,
  target: Target | undefined,
  options: ParserOptions,
  source: ParsedTicketArea["source"] = "text"
): ParsedTicketArea | null {
  const cleaned = compact(line);
  if (!cleaned || cleaned.length < 5) return null;
  if (keywordHits(cleaned, options.platform.tableHeaderKeywords).length >= 2 && !PRICE_PATTERN.test(cleaned)) return null;

  const slashParts = cleaned.split(/\s*(?:\/|｜|\||,|，)\s*/).map(compact).filter(Boolean);
  if (slashParts.length >= 3 && PRICE_PATTERN.test(slashParts[1])) {
    return buildArea({
      areaName: slashParts[0],
      price: slashParts[1],
      statusText: slashParts.slice(2).join(" "),
      rowText: cleaned,
      target,
      options,
      source
    });
  }

  const match = cleaned.match(/^(.+?)\s+((?:NT\$?\s*)?\d{2,5}(?:\s*元)?)\s+(.+)$/i);
  if (!match) return null;
  const [, areaName, price, statusText] = match;
  if (!looksLikeArea(areaName)) return null;

  return buildArea({
    areaName,
    price,
    statusText,
    rowText: cleaned,
    target,
    options,
    source
  });
}

function buildArea(input: {
  areaName: string;
  price?: string;
  statusText: string;
  rowText: string;
  target?: Target;
  options: ParserOptions;
  source: ParsedTicketArea["source"];
}): ParsedTicketArea | null {
  const areaName = compact(input.areaName);
  const price = compact(input.price || "");
  const statusText = compact(input.statusText);
  const rowText = compact(input.rowText);
  if (!areaName || !looksLikeArea(areaName)) return null;

  const remainingCount = parseRemainingCount(statusText || rowText);
  const soldOutHits = keywordHits(rowText, input.options.platform.rowSoldOutKeywords);
  const availableHits = keywordHits(rowText, input.options.platform.rowAvailableKeywords);
  const isSoldOut = soldOutHits.length > 0 || remainingCount === 0;
  const numericStatus = /^\d+$/.test(statusText);
  const isAvailable = !isSoldOut && (availableHits.length > 0 || numericStatus || (remainingCount ?? 0) > 0);

  if (!isSoldOut && !isAvailable && availableHits.length === 0 && soldOutHits.length === 0) return null;

  return {
    areaName,
    price: price || undefined,
    statusText,
    remainingText: remainingCount !== undefined ? statusText : undefined,
    remainingCount,
    isAvailable,
    isSoldOut,
    matchedAreaKeywords: input.target ? keywordHits(areaName, input.target.areaKeywords) : [],
    matchedPriceKeywords: input.target ? keywordHits(price, input.target.priceKeywords) : [],
    source: input.source
  };
}

function parseRemainingCount(text: string): number | undefined {
  const normalized = text.replace(/,/g, "");
  const explicit = normalized.match(/(?:剩餘|尚餘|餘票|空位|remaining)\s*[:：]?\s*(\d+)/i);
  if (explicit) return Number(explicit[1]);
  const countWithUnit = normalized.match(/(\d+)\s*(?:張|席|位)/);
  if (countWithUnit) return Number(countWithUnit[1]);
  if (/^\d+$/.test(normalized.trim())) return Number(normalized.trim());
  return undefined;
}

function splitCandidateLines(text: string): string[] {
  return text
    .split(/\r?\n|(?<=售完)|(?<=熱賣中)|(?<=Available)|(?<=Unavailable)/)
    .map(compact)
    .filter((line) => line.length >= 5 && line.length <= 220);
}

function looksLikeArea(value: string): boolean {
  const normalized = normalizeText(value);
  return AREA_HINTS.some((hint) => normalized.includes(normalizeText(hint))) || /[a-z]\d?(?:區)?/i.test(value);
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function dedupeAreas(areas: ParsedTicketArea[]): ParsedTicketArea[] {
  const seen = new Set<string>();
  return areas.filter((area) => {
    const key = [area.areaName, area.price || "", area.statusText].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractEventMeta(html: string, text: string): Pick<ParsedAvailability, "eventTitle" | "eventDate" | "venue"> {
  const $ = cheerio.load(html || "");
  const title =
    compact($("h1, h2, .title, [class*=title]").first().text()) ||
    splitCandidateLines(text).find((line) => /職棒|演唱會|@|vs/i.test(line));
  const date = text.match(/\d{4}[/-]\d{1,2}[/-]\d{1,2}(?:\(.+?\))?(?:\s+\d{1,2}:\d{2})?/)?.[0];
  const venue = splitCandidateLines(text).find((line) => /球場|巨蛋|場館|中心|Legacy|Zepp/i.test(line) && line.length <= 50);
  return {
    eventTitle: title || undefined,
    eventDate: date,
    venue
  };
}
