import * as cheerio from "cheerio";
import { getEnvNumber } from "./settings";
import { keywordHits, normalizeText } from "./text";

const OCR_UNSAFE_IMAGE_TEXT = [
  "captcha",
  "recaptcha",
  "hcaptcha",
  "turnstile",
  "cloudflare",
  "challenge",
  "verify",
  "verification",
  "robot",
  "security",
  "auth",
  "login",
  "驗證碼",
  "人機驗證",
  "安全驗證",
  "安全性檢查",
  "機器人",
  "登入"
];

const IMAGE_CANDIDATE_ATTRS = [
  "src",
  "data-src",
  "data-original",
  "data-lazy-src",
  "data-url"
];

export type OcrImageCandidate = {
  url: string;
  metadata: string;
};

export type OcrExtractionResult = {
  text: string;
  used: boolean;
  candidateImages: number;
  scannedImages: number;
  skippedImages: Array<{ url: string; reason: string }>;
  warnings: string[];
};

export function isOcrEnabled(): boolean {
  return (process.env.OCR_ENABLED || "false").toLowerCase() === "true";
}

export function isUnsafeOcrImageMetadata(metadata: string): boolean {
  return keywordHits(metadata, OCR_UNSAFE_IMAGE_TEXT).length > 0;
}

export function extractImageMetadataText(html: string): string {
  const $ = cheerio.load(html);
  const parts: string[] = [];

  $("img").each((_, element) => {
    const image = $(element);
    const attrs = [
      image.attr("src"),
      image.attr("data-src"),
      image.attr("alt"),
      image.attr("title"),
      image.attr("aria-label"),
      image.attr("id"),
      image.attr("class")
    ];
    const text = attrs.filter(Boolean).join(" ");
    if (text.trim()) parts.push(text);
  });

  return parts.join("\n");
}

export async function extractPublicImageText(options: {
  html: string;
  pageUrl: string;
  timeoutMs: number;
  userAgent: string;
}): Promise<OcrExtractionResult> {
  const empty: OcrExtractionResult = {
    text: "",
    used: false,
    candidateImages: 0,
    scannedImages: 0,
    skippedImages: [],
    warnings: []
  };

  if (!isOcrEnabled()) return empty;
  if ((process.env.OCR_MODE || "tesseract").toLowerCase() !== "tesseract") {
    return {
      ...empty,
      warnings: ["OCR_MODE 目前只支援 tesseract。"]
    };
  }

  const candidates = collectImageCandidates(options.html, options.pageUrl);
  const maxImages = getEnvNumber("OCR_MAX_IMAGES_PER_CHECK", 1);
  const maxBytes = getEnvNumber("OCR_MAX_IMAGE_BYTES", 800000);
  const timeoutMs = Math.min(
    getEnvNumber("OCR_TIMEOUT_MS", 12000),
    Math.max(1000, options.timeoutMs)
  );
  const lang = process.env.OCR_LANG || "eng+chi_tra";
  const selected = candidates.slice(0, Math.max(0, maxImages));
  const texts: string[] = [];
  const skippedImages: OcrExtractionResult["skippedImages"] = [];
  const warnings: string[] = [];

  for (const candidate of selected) {
    try {
      const image = await fetchImage(candidate.url, options.userAgent, timeoutMs, maxBytes);
      if (!image.ok) {
        skippedImages.push({ url: candidate.url, reason: image.reason });
        continue;
      }

      const text = await recognizeImageText(image.buffer, lang, timeoutMs);
      const cleaned = cleanOcrText(text);
      if (cleaned) texts.push(cleaned);
    } catch (error) {
      warnings.push(
        `OCR 圖片辨識失敗：${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return {
    text: texts.join("\n"),
    used: texts.length > 0,
    candidateImages: candidates.length,
    scannedImages: selected.length - skippedImages.length,
    skippedImages,
    warnings
  };
}

function collectImageCandidates(html: string, pageUrl: string): OcrImageCandidate[] {
  const $ = cheerio.load(html);
  const candidates: OcrImageCandidate[] = [];
  const base = new URL(pageUrl);
  const allowCrossOrigin = (process.env.OCR_ALLOW_CROSS_ORIGIN || "true").toLowerCase() === "true";
  const minArea = getEnvNumber("OCR_MIN_IMAGE_AREA", 5000);

  $("img").each((_, element) => {
    const image = $(element);
    const metadata = [
      image.attr("src"),
      image.attr("data-src"),
      image.attr("alt"),
      image.attr("title"),
      image.attr("aria-label"),
      image.attr("id"),
      image.attr("class")
    ]
      .filter(Boolean)
      .join(" ");

    if (isUnsafeOcrImageMetadata(metadata)) return;
    if (isLikelyTinyImage(image.attr("width"), image.attr("height"), minArea)) return;

    const rawUrl = IMAGE_CANDIDATE_ATTRS.map((attr) => image.attr(attr)).find(Boolean);
    if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) return;

    try {
      const resolved = new URL(rawUrl, base);
      if (!["http:", "https:"].includes(resolved.protocol)) return;
      if (!allowCrossOrigin && resolved.origin !== base.origin) return;
      candidates.push({ url: resolved.toString(), metadata });
    } catch {
      // Ignore malformed image URLs.
    }
  });

  return dedupeCandidates(candidates);
}

function isLikelyTinyImage(width: string | undefined, height: string | undefined, minArea: number): boolean {
  const parsedWidth = Number.parseInt(width || "", 10);
  const parsedHeight = Number.parseInt(height || "", 10);
  if (!Number.isFinite(parsedWidth) || !Number.isFinite(parsedHeight)) return false;
  return parsedWidth * parsedHeight < minArea;
}

function dedupeCandidates(candidates: OcrImageCandidate[]): OcrImageCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
}

async function fetchImage(
  url: string,
  userAgent: string,
  timeoutMs: number,
  maxBytes: number
): Promise<{ ok: true; buffer: Buffer } | { ok: false; reason: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": userAgent,
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });

    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/") || contentType.includes("svg")) {
      return { ok: false, reason: "不是可 OCR 的點陣圖片" };
    }

    const contentLength = Number.parseInt(response.headers.get("content-length") || "0", 10);
    if (contentLength > maxBytes) {
      return { ok: false, reason: `圖片超過大小限制 ${maxBytes} bytes` };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      return { ok: false, reason: `圖片超過大小限制 ${maxBytes} bytes` };
    }

    return { ok: true, buffer };
  } finally {
    clearTimeout(timer);
  }
}

async function recognizeImageText(buffer: Buffer, lang: string, timeoutMs: number): Promise<string> {
  const tesseract = (await import("tesseract.js")) as unknown as {
    recognize: (
      image: Buffer,
      lang: string,
      options?: Record<string, unknown>
    ) => Promise<{ data?: { text?: string } }>;
  };

  const task = tesseract.recognize(buffer, lang, {});
  const result = await withTimeout(task, timeoutMs, "OCR 辨識逾時");
  return result.data?.text || "";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function cleanOcrText(text: string): string {
  return normalizeText(text)
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
