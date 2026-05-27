import { describe, expect, it } from "vitest";
import { detectFromText } from "../src/server/detector";
import type { Target } from "../src/shared/types";

const baseTarget: Target = {
  id: 1,
  name: "Test target",
  platform: "generic",
  url: "https://example.com",
  enabled: true,
  checkIntervalSeconds: 300,
  timeoutMs: 30000,
  includeKeywords: ["立即購票", "Available"],
  excludeKeywords: ["已售完", "Sold Out"],
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

  it("blocks matches when negative wording exists", () => {
    const result = detectFromText(baseTarget, "A1 立即購票 但是 已售完");

    expect(result.status).toBe("UNAVAILABLE");
  });

  it("stops on CAPTCHA or bot checks", () => {
    const result = detectFromText(baseTarget, "Cloudflare verify you are human captcha");

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
