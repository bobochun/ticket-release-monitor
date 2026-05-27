import { describe, expect, it } from "vitest";
import { detectFromText } from "../src/server/detector";
import { isUnsafeOcrImageMetadata } from "../src/server/ocr";
import type { Target } from "../src/shared/types";

const baseTarget: Target = {
  id: 1,
  name: "Test target",
  platform: "generic",
  url: "https://example.com",
  enabled: true,
  checkIntervalSeconds: 300,
  timeoutMs: 30000,
  includeKeywords: ["立即購票", "Available", "餘票"],
  excludeKeywords: ["已售完", "Sold Out", "剩餘 0"],
  areaKeywords: ["A1"],
  areaBlacklist: ["視線不良"],
  priceKeywords: [],
  notes: null,
  isTemplate: false,
  lastCheckedAt: null,
  nextCheckAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe("detectFromText", () => {
  it("detects available ticket signals with area constraints", () => {
    const result = detectFromText(baseTarget, "A1 熱區 Available 立即購票");

    expect(result.status).toBe("AVAILABLE");
    expect(result.matchedKeywords).toContain("立即購票");
    expect(result.matchedAreas).toContain("A1");
  });

  it("detects availability signals recovered from public image OCR text", () => {
    const result = detectFromText(
      baseTarget,
      "OCR 公開票況圖片文字如下：A1 熱區 餘票 2 張"
    );

    expect(result.status).toBe("AVAILABLE");
    expect(result.matchedKeywords).toContain("餘票");
    expect(result.matchedAreas).toContain("A1");
  });

  it("blocks matches when negative wording exists", () => {
    const result = detectFromText(baseTarget, "A1 立即購票 但已售完");

    expect(result.status).toBe("UNAVAILABLE");
  });

  it("stops on CAPTCHA or bot checks before matching availability", () => {
    const result = detectFromText(baseTarget, "Cloudflare verify you are human captcha 立即購票");

    expect(result.status).toBe("BOT_CHECK");
    expect(result.botCheckDetected).toBe(true);
  });

  it("stops on queue pages", () => {
    const result = detectFromText(baseTarget, "waiting room 請稍候");

    expect(result.status).toBe("QUEUE_DETECTED");
  });

  it("stops on login requirements", () => {
    const result = detectFromText(baseTarget, "會員登入 login");

    expect(result.status).toBe("LOGIN_REQUIRED");
  });
});

describe("OCR safety metadata", () => {
  it("treats CAPTCHA image metadata as unsafe for OCR", () => {
    expect(isUnsafeOcrImageMetadata("captcha-image verify you are human")).toBe(true);
  });

  it("allows ordinary public seat map image metadata", () => {
    expect(isUnsafeOcrImageMetadata("seat-map ticket availability remaining")).toBe(false);
  });
});
