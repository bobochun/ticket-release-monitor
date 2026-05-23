import { describe, expect, it } from "vitest";
import { detectTicketAvailability } from "../src/detectors/textDetector.js";

describe("detectTicketAvailability", () => {
  it("detects positive keyword when no negative keyword exists", () => {
    const result = detectTicketAvailability(
      "Tonight's event: Buy now. Seats are available.",
      ["Buy now", "Available"],
      ["Sold out"]
    );

    expect(result.matched).toBe(true);
    expect(result.matchedKeywords).toContain("Buy now");
  });

  it("blocks availability when negative keyword exists", () => {
    const result = detectTicketAvailability(
      "Buy now button is visible, but the section says Sold out.",
      ["Buy now"],
      ["Sold out"]
    );

    expect(result.matched).toBe(false);
    expect(result.blockedByNegativeKeywords).toContain("Sold out");
  });

  it("handles Chinese keywords", () => {
    const result = detectTicketAvailability(
      "目前熱區剩餘座位，請點立即購票。",
      ["立即購票", "熱區"],
      ["已售完"]
    );

    expect(result.matched).toBe(true);
    expect(result.matchedKeywords).toEqual(["立即購票", "熱區"]);
  });
});
