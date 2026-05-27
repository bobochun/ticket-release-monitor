import * as cheerio from "cheerio";
import { z } from "zod";
import type { DiscoveredCandidate, DiscoveryRule, DiscoveryRuleInput } from "@/src/shared/types";
import { boolFromDb, ensureDb, getDb, jsonParseArray, jsonStringify } from "./db";
import { createTarget } from "./targets";
import { keywordHits } from "./detector";
import { AppError } from "./apiErrors";

const discoveryRuleSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean().default(false),
  platform: z.string().min(1).default("generic"),
  seedUrls: z.array(z.string().url()).default([]),
  includeKeywords: z.array(z.string()).default([]),
  optionalKeywords: z.array(z.string()).default([]),
  excludeKeywords: z.array(z.string()).default([]),
  dateKeywords: z.array(z.string()).default([]),
  venueKeywords: z.array(z.string()).default([]),
  teamKeywords: z.array(z.string()).default([]),
  seatKeywords: z.array(z.string()).default([]),
  maxCandidates: z.number().int().positive().max(100).default(20)
});

type DiscoveryRuleRow = {
  id: number;
  name: string;
  enabled: boolean | number;
  platform: string;
  seed_urls_json: string;
  include_keywords_json: string;
  optional_keywords_json: string;
  exclude_keywords_json: string;
  date_keywords_json: string;
  venue_keywords_json: string;
  team_keywords_json: string;
  seat_keywords_json: string;
  max_candidates: number;
  created_at: string;
  updated_at: string;
};

type CandidateRow = {
  id: number;
  rule_id: number | null;
  title: string;
  url: string;
  platform: string;
  score: number;
  matched_keywords_json: string;
  source_url: string;
  discovered_at: string;
  added_to_targets: boolean | number;
};

function mapRule(row: DiscoveryRuleRow): DiscoveryRule {
  return {
    id: row.id,
    name: row.name,
    enabled: boolFromDb(row.enabled),
    platform: row.platform,
    seedUrls: jsonParseArray(row.seed_urls_json),
    includeKeywords: jsonParseArray(row.include_keywords_json),
    optionalKeywords: jsonParseArray(row.optional_keywords_json),
    excludeKeywords: jsonParseArray(row.exclude_keywords_json),
    dateKeywords: jsonParseArray(row.date_keywords_json),
    venueKeywords: jsonParseArray(row.venue_keywords_json),
    teamKeywords: jsonParseArray(row.team_keywords_json),
    seatKeywords: jsonParseArray(row.seat_keywords_json),
    maxCandidates: row.max_candidates,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCandidate(row: CandidateRow): DiscoveredCandidate {
  return {
    id: row.id,
    ruleId: row.rule_id,
    title: row.title,
    url: row.url,
    platform: row.platform,
    score: row.score,
    matchedKeywords: jsonParseArray(row.matched_keywords_json),
    sourceUrl: row.source_url,
    discoveredAt: row.discovered_at,
    addedToTargets: boolFromDb(row.added_to_targets)
  };
}

export async function listDiscoveryRules(): Promise<DiscoveryRule[]> {
  await ensureDb();
  const db = await getDb();
  const rows = await db.query<DiscoveryRuleRow>("SELECT * FROM discovery_rules ORDER BY id DESC");
  return rows.map(mapRule);
}

export async function getDiscoveryRule(id: number): Promise<DiscoveryRule | null> {
  await ensureDb();
  const db = await getDb();
  const row = await db.queryOne<DiscoveryRuleRow>("SELECT * FROM discovery_rules WHERE id = $1", [id]);
  return row ? mapRule(row) : null;
}

export async function createDiscoveryRule(input: DiscoveryRuleInput): Promise<DiscoveryRule> {
  const parsed = discoveryRuleSchema.parse(input);
  await ensureDb();
  const db = await getDb();
  const row = await db.queryOne<{ id: number }>(
    `INSERT INTO discovery_rules (
      name, enabled, platform, seed_urls_json, include_keywords_json,
      optional_keywords_json, exclude_keywords_json, date_keywords_json,
      venue_keywords_json, team_keywords_json, seat_keywords_json, max_candidates
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    ) RETURNING id`,
    [
      parsed.name,
      db.kind === "postgres" ? parsed.enabled : parsed.enabled ? 1 : 0,
      parsed.platform,
      jsonStringify(parsed.seedUrls),
      jsonStringify(parsed.includeKeywords),
      jsonStringify(parsed.optionalKeywords),
      jsonStringify(parsed.excludeKeywords),
      jsonStringify(parsed.dateKeywords),
      jsonStringify(parsed.venueKeywords),
      jsonStringify(parsed.teamKeywords),
      jsonStringify(parsed.seatKeywords),
      parsed.maxCandidates
    ]
  );

  const rule = row ? await getDiscoveryRule(row.id) : null;
  if (!rule) throw new Error("Discovery rule was not created");
  return rule;
}

export async function listDiscoveredCandidates(ruleId?: number): Promise<DiscoveredCandidate[]> {
  await ensureDb();
  const db = await getDb();
  const rows = ruleId
    ? await db.query<CandidateRow>(
        "SELECT * FROM discovered_candidates WHERE rule_id = $1 ORDER BY discovered_at DESC, score DESC",
        [ruleId]
      )
    : await db.query<CandidateRow>(
        "SELECT * FROM discovered_candidates ORDER BY discovered_at DESC, score DESC LIMIT 50"
      );
  return rows.map(mapCandidate);
}

function absoluteUrl(href: string, sourceUrl: string): string | null {
  try {
    return new URL(href, sourceUrl).toString();
  } catch {
    return null;
  }
}

export async function runDiscoveryRule(id: number): Promise<DiscoveredCandidate[]> {
  const rule = await getDiscoveryRule(id);
  if (!rule) throw new AppError("TARGET_NOT_FOUND", "找不到候選搜尋規則。", 404);

  const db = await getDb();
  const found = new Map<string, Omit<DiscoveredCandidate, "id" | "discoveredAt" | "addedToTargets">>();

  for (const seedUrl of rule.seedUrls) {
    const response = await fetch(seedUrl, {
      headers: {
        "user-agent": "TicketRadar/1.0 public-link-discovery",
        accept: "text/html,application/xhtml+xml"
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    $("a[href]").each((_, element) => {
      const href = $(element).attr("href") || "";
      const url = absoluteUrl(href, seedUrl);
      const title = $(element).text().replace(/\s+/g, " ").trim() || url || "";
      if (!url || !title) return;

      const combined = `${title} ${url}`;
      const requiredHits = keywordHits(combined, rule.includeKeywords);
      const blocked = keywordHits(combined, rule.excludeKeywords);
      if (blocked.length > 0) return;
      if (rule.includeKeywords.length > 0 && requiredHits.length === 0) return;

      const optionalHits = keywordHits(combined, [
        ...rule.optionalKeywords,
        ...rule.dateKeywords,
        ...rule.venueKeywords,
        ...rule.teamKeywords,
        ...rule.seatKeywords
      ]);
      const matchedKeywords = [...new Set([...requiredHits, ...optionalHits])];
      const score = requiredHits.length * 10 + optionalHits.length * 3;

      found.set(url, {
        ruleId: rule.id,
        title,
        url,
        platform: rule.platform,
        score,
        matchedKeywords,
        sourceUrl: seedUrl
      });
    });
  }

  const candidates = [...found.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, rule.maxCandidates);

  await db.execute("DELETE FROM discovered_candidates WHERE rule_id = $1", [rule.id]);

  for (const candidate of candidates) {
    await db.execute(
      `INSERT INTO discovered_candidates (
        rule_id, title, url, platform, score, matched_keywords_json, source_url, added_to_targets
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        candidate.ruleId,
        candidate.title,
        candidate.url,
        candidate.platform,
        candidate.score,
        jsonStringify(candidate.matchedKeywords),
        candidate.sourceUrl,
        db.kind === "postgres" ? false : 0
      ]
    );
  }

  return listDiscoveredCandidates(rule.id);
}

export async function addCandidateAsTarget(id: number) {
  await ensureDb();
  const db = await getDb();
  const candidateRow = await db.queryOne<CandidateRow>(
    "SELECT * FROM discovered_candidates WHERE id = $1",
    [id]
  );
  if (!candidateRow) throw new AppError("TARGET_NOT_FOUND", "找不到候選連結。", 404);
  const candidate = mapCandidate(candidateRow);

  const target = await createTarget({
    name: candidate.title,
    platform: candidate.platform,
    url: candidate.url,
    enabled: false,
    isTemplate: false,
    checkIntervalSeconds: 300,
    timeoutMs: 30000,
    includeKeywords: ["立即購票", "可購買", "Available", "Buy Tickets"],
    excludeKeywords: ["已售完", "售完", "Sold Out", "Unavailable"],
    notes: "Added from discovery. Review keywords and enable manually."
  });

  await db.execute("UPDATE discovered_candidates SET added_to_targets = $1 WHERE id = $2", [
    db.kind === "postgres" ? true : 1,
    id
  ]);

  return target;
}
