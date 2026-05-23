import type { TextDetectionResult } from "../types.js";

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function detectTicketAvailability(
  pageText: string,
  keywords: string[],
  negativeKeywords: string[]
): TextDetectionResult {
  const normalizedText = normalize(pageText);

  const matchedKeywords = keywords.filter((keyword) =>
    normalizedText.includes(normalize(keyword))
  );

  const blockedByNegativeKeywords = negativeKeywords.filter((keyword) =>
    normalizedText.includes(normalize(keyword))
  );

  return {
    matched: matchedKeywords.length > 0 && blockedByNegativeKeywords.length === 0,
    matchedKeywords,
    blockedByNegativeKeywords
  };
}
