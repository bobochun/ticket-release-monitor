import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectAccessBarrier, detectAvailability, detectFromText } from "../src/server/detector";
import { isUnsafeOcrImageMetadata } from "../src/server/ocr";
import { isPlaceholderUrl } from "../src/shared/platformDefaults";
import type { Target } from "../src/shared/types";

function fixture(name: string): string {
  return fs.readFileSync(path.join(process.cwd(), "tests", "fixtures", name), "utf8");
}

function target(overrides: Partial<Target> = {}): Target {
  return {
    id: 1,
    name: "Test target",
    platform: "generic",
    url: "https://example.com",
    enabled: true,
    checkIntervalSeconds: 300,
    timeoutMs: 30000,
    includeKeywords: ["立即購票", "Available", "餘票", "票區", "空位", "熱賣中"],
    excludeKeywords: ["尚未開賣", "截止販售", "活動已結束"],
    areaKeywords: ["A1"],
    areaBlacklist: ["視線不良"],
    priceKeywords: [],
    notes: null,
    isTemplate: false,
    lastCheckedAt: null,
    nextCheckAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe("row-level availability detector", () => {
  it("does not mark a public CPBL area page as LOGIN_REQUIRED just because the header has login text", () => {
    const html = fixture("cpbl-brothers-public-area.html");
    const result = detectAvailability({
      target: target({ platform: "cpbl_ctbc_brothers", areaKeywords: ["C區"] }),
      text: html,
      html
    });

    expect(result.status).toBe("AVAILABLE");
    expect(result.bestAvailableArea?.areaName).toBe("內野西C區下層");
    expect(result.bestAvailableArea?.remainingCount).toBe(8);
  });

  it("does not treat one sold-out row as whole-page unavailable", () => {
    const html = fixture("cpbl-brothers-public-area.html");
    const result = detectAvailability({
      target: target({ platform: "cpbl_ctbc_brothers", areaKeywords: ["內野"] }),
      text: html,
      html
    });

    expect(result.status).toBe("AVAILABLE");
    expect(result.availableAreaCount).toBeGreaterThan(0);
    expect(result.soldOutAreaCount).toBeGreaterThan(0);
  });

  it("parses numeric remaining counts as available", () => {
    const html = fixture("cpbl-brothers-public-area.html");
    const result = detectAvailability({
      target: target({ platform: "cpbl_ctbc_brothers", areaKeywords: ["西C區"] }),
      text: html,
      html
    });

    expect(result.bestAvailableArea?.areaName).toBe("內野西C區下層");
    expect(result.bestAvailableArea?.price).toBe("500");
    expect(result.bestAvailableArea?.remainingCount).toBe(8);
    expect(result.bestAvailableArea?.isAvailable).toBe(true);
  });

  it("keeps sold-out rows sold out without blocking other rows", () => {
    const html = fixture("cpbl-brothers-public-area.html");
    const result = detectAvailability({
      target: target({ platform: "cpbl_ctbc_brothers", areaKeywords: ["內野"] }),
      text: html,
      html
    });
    const soldOut = result.parsedAreas.find((area) => area.areaName === "內野D區下層");

    expect(soldOut?.isSoldOut).toBe(true);
    expect(result.status).toBe("AVAILABLE");
  });

  it("applies areaBlacklist to a row instead of the whole page", () => {
    const html = fixture("familife-public-area.html");
    const result = detectAvailability({
      target: target({
        platform: "cpbl_fubon_guardians",
        areaKeywords: ["C1"],
        areaBlacklist: ["視線不良"]
      }),
      text: html,
      html
    });

    expect(result.status).toBe("POSSIBLE_MATCH");
    expect(result.parsedAreas.some((area) => area.areaName.includes("視線不良") && area.isAvailable)).toBe(true);
  });

  it("parses iBon mixed row status", () => {
    const html = fixture("ibon-public-area.html");
    const result = detectAvailability({
      target: target({ platform: "ibon", areaKeywords: ["B1"] }),
      text: html,
      html
    });

    expect(result.status).toBe("AVAILABLE");
    expect(result.bestAvailableArea?.areaName).toBe("B1 看台");
    expect(result.bestAvailableArea?.remainingCount).toBe(12);
    expect(result.soldOutAreaCount).toBe(1);
  });

  it("parses FamiLife mixed row status", () => {
    const html = fixture("familife-public-area.html");
    const result = detectAvailability({
      target: target({ platform: "famiticket", areaKeywords: ["B1"] }),
      text: html,
      html
    });

    expect(result.status).toBe("AVAILABLE");
    expect(result.bestAvailableArea?.areaName).toBe("內野 B1");
  });

  it("manual parse text uses the same parser pipeline", () => {
    const text = "內野南A區下層 400 熱賣中\n內野西C區下層 500 8\n內野D區下層 500 售完";
    const result = detectAvailability({
      target: target({ platform: "cpbl_ctbc_brothers", areaKeywords: ["C區"] }),
      text,
      source: "manual_parse"
    });

    expect(result.status).toBe("AVAILABLE");
    expect(result.source).toBe("manual_parse");
    expect(result.bestAvailableArea?.remainingCount).toBe(8);
  });

  it("does not OCR captcha-like image metadata", () => {
    expect(isUnsafeOcrImageMetadata("captcha-image verify you are human")).toBe(true);
    expect(isUnsafeOcrImageMetadata("seat-map ticket availability remaining")).toBe(false);
  });

  it("identifies placeholder URLs", () => {
    expect(isPlaceholderUrl("https://example.com/YOUR_EVENT_URL")).toBe(true);
  });

  it("falls back to whole-page keywords when there are no row-level areas", () => {
    const result = detectFromText(
      target({ areaKeywords: [] }),
      "活動頁顯示 Available 立即購票，但沒有票區表格。"
    );

    expect(result.status).toBe("POSSIBLE_MATCH");
  });

  it("does not return login barrier when public ticket content is meaningful", () => {
    const html = fixture("cpbl-brothers-public-area.html");
    const barrier = detectAccessBarrier({ text: html, html });

    expect(barrier.barrierType).toBe("none");
  });

  it("returns login barrier only when main ticket content is absent", () => {
    const barrier = detectAccessBarrier({ text: "請先登入會員後才能查看活動內容 login required" });

    expect(barrier.barrierType).toBe("login_required");
  });
});
