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
