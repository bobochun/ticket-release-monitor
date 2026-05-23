import { db, jsonParseArray, jsonStringify } from "./db.js";
import type { Target } from "./types.js";

function mapTarget(row: any): Target {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    url: row.url,
    enabled: Boolean(row.enabled),
    checkIntervalSeconds: row.check_interval_seconds,
    timeoutMs: row.timeout_ms,
    includeKeywords: jsonParseArray(row.include_keywords_json),
    excludeKeywords: jsonParseArray(row.exclude_keywords_json),
    areaKeywords: jsonParseArray(row.area_keywords_json),
    areaBlacklist: jsonParseArray(row.area_blacklist_json),
    priceKeywords: jsonParseArray(row.price_keywords_json),
    notes: row.notes,
    lastCheckedAt: row.last_checked_at,
    nextCheckAt: row.next_check_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function listTargets(): Target[] {
  const rows = db.prepare("SELECT * FROM targets ORDER BY id DESC").all();
  return rows.map(mapTarget);
}

export function getTarget(id: number): Target | null {
  const row = db.prepare("SELECT * FROM targets WHERE id = ?").get(id);
  return row ? mapTarget(row) : null;
}

export type TargetInput = {
  name: string;
  platform?: string;
  url: string;
  enabled?: boolean;
  checkIntervalSeconds?: number;
  timeoutMs?: number;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  areaKeywords?: string[];
  areaBlacklist?: string[];
  priceKeywords?: string[];
  notes?: string | null;
};

export function createTarget(input: TargetInput): Target {
  const safeInterval = Math.max(input.checkIntervalSeconds ?? 180, 120);
  const result = db.prepare(`
    INSERT INTO targets (
      name, platform, url, enabled, check_interval_seconds, timeout_ms,
      include_keywords_json, exclude_keywords_json, area_keywords_json,
      area_blacklist_json, price_keywords_json, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.name,
    input.platform ?? "generic",
    input.url,
    input.enabled === false ? 0 : 1,
    safeInterval,
    input.timeoutMs ?? 45000,
    jsonStringify(input.includeKeywords ?? ["立即購票", "可購買", "剩餘"]),
    jsonStringify(input.excludeKeywords ?? ["已售完", "暫無票券", "尚未開賣"]),
    jsonStringify(input.areaKeywords ?? []),
    jsonStringify(input.areaBlacklist ?? []),
    jsonStringify(input.priceKeywords ?? []),
    input.notes ?? null
  );

  const target = getTarget(Number(result.lastInsertRowid));
  if (!target) throw new Error("Target was not created");
  return target;
}

export function updateTarget(id: number, input: Partial<TargetInput>): Target | null {
  const current = getTarget(id);
  if (!current) return null;

  const next = {
    name: input.name ?? current.name,
    platform: input.platform ?? current.platform,
    url: input.url ?? current.url,
    enabled: input.enabled ?? current.enabled,
    checkIntervalSeconds: Math.max(input.checkIntervalSeconds ?? current.checkIntervalSeconds, 120),
    timeoutMs: input.timeoutMs ?? current.timeoutMs,
    includeKeywords: input.includeKeywords ?? current.includeKeywords,
    excludeKeywords: input.excludeKeywords ?? current.excludeKeywords,
    areaKeywords: input.areaKeywords ?? current.areaKeywords,
    areaBlacklist: input.areaBlacklist ?? current.areaBlacklist,
    priceKeywords: input.priceKeywords ?? current.priceKeywords,
    notes: input.notes === undefined ? current.notes : input.notes
  };

  db.prepare(`
    UPDATE targets SET
      name = ?, platform = ?, url = ?, enabled = ?, check_interval_seconds = ?, timeout_ms = ?,
      include_keywords_json = ?, exclude_keywords_json = ?, area_keywords_json = ?,
      area_blacklist_json = ?, price_keywords_json = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    next.name,
    next.platform,
    next.url,
    next.enabled ? 1 : 0,
    next.checkIntervalSeconds,
    next.timeoutMs,
    jsonStringify(next.includeKeywords),
    jsonStringify(next.excludeKeywords),
    jsonStringify(next.areaKeywords),
    jsonStringify(next.areaBlacklist),
    jsonStringify(next.priceKeywords),
    next.notes,
    id
  );

  return getTarget(id);
}

export function deleteTarget(id: number): void {
  db.prepare("DELETE FROM targets WHERE id = ?").run(id);
}

export function markTargetChecked(id: number, intervalSeconds: number): void {
  const nextCheck = new Date(Date.now() + Math.max(intervalSeconds, 120) * 1000).toISOString();
  db.prepare("UPDATE targets SET last_checked_at = CURRENT_TIMESTAMP, next_check_at = ? WHERE id = ?").run(nextCheck, id);
}
