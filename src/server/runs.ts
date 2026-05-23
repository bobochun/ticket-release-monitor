import { db, jsonParseArray, jsonStringify } from "./db.js";
import type { CheckResult } from "./types.js";

export function saveCheckRun(result: CheckResult): void {
  db.prepare(`
    INSERT INTO check_runs (
      target_id, target_name, url, status, message,
      matched_keywords_json, matched_areas_json, matched_prices_json,
      bot_check_detected, checked_at, duration_ms, error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    result.targetId ?? null,
    result.targetName,
    result.url,
    result.status,
    result.message,
    jsonStringify(result.matchedKeywords),
    jsonStringify(result.matchedAreas),
    jsonStringify(result.matchedPrices),
    result.botCheckDetected ? 1 : 0,
    result.checkedAt,
    result.durationMs,
    result.error ?? null
  );
}

export function listRuns(limit = 50): any[] {
  const rows = db.prepare("SELECT * FROM check_runs ORDER BY checked_at DESC, id DESC LIMIT ?").all(limit);
  return rows.map((row: any) => ({
    id: row.id,
    targetId: row.target_id,
    targetName: row.target_name,
    url: row.url,
    status: row.status,
    message: row.message,
    matchedKeywords: jsonParseArray(row.matched_keywords_json),
    matchedAreas: jsonParseArray(row.matched_areas_json),
    matchedPrices: jsonParseArray(row.matched_prices_json),
    botCheckDetected: Boolean(row.bot_check_detected),
    checkedAt: row.checked_at,
    durationMs: row.duration_ms,
    error: row.error
  }));
}

export function countActiveTargets(): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM targets WHERE enabled = 1").get() as { count: number };
  return row.count;
}

export function countAlerts(): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM check_runs WHERE status IN ('AVAILABLE','POSSIBLE_MATCH','BOT_CHECK','QUEUE_DETECTED','LOGIN_REQUIRED','ERROR')").get() as { count: number };
  return row.count;
}
