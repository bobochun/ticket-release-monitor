import type { CheckResult, CheckRun } from "@/src/shared/types";
import { boolFromDb, ensureDb, getDb, jsonParseArray, jsonStringify } from "./db";

type CheckRunRow = {
  id: number;
  target_id: number | null;
  target_name: string;
  url: string;
  status: CheckRun["status"];
  message: string;
  matched_keywords_json: string;
  matched_areas_json: string;
  matched_prices_json: string;
  bot_check_detected: boolean | number;
  checked_at: string;
  duration_ms: number;
  error: string | null;
};

function mapRun(row: CheckRunRow): CheckRun {
  return {
    id: row.id,
    targetId: row.target_id,
    targetName: row.target_name,
    url: row.url,
    status: row.status,
    message: row.message,
    matchedKeywords: jsonParseArray(row.matched_keywords_json),
    matchedAreas: jsonParseArray(row.matched_areas_json),
    matchedPrices: jsonParseArray(row.matched_prices_json),
    botCheckDetected: boolFromDb(row.bot_check_detected),
    checkedAt: row.checked_at,
    durationMs: row.duration_ms,
    error: row.error
  };
}

export async function saveCheckRun(result: CheckResult): Promise<CheckRun> {
  await ensureDb();
  const db = await getDb();
  const row = await db.queryOne<{ id: number }>(
    `INSERT INTO check_runs (
      target_id, target_name, url, status, message,
      matched_keywords_json, matched_areas_json, matched_prices_json,
      bot_check_detected, checked_at, duration_ms, error
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    ) RETURNING id`,
    [
      result.targetId ?? null,
      result.targetName,
      result.url,
      result.status,
      result.message,
      jsonStringify(result.matchedKeywords),
      jsonStringify(result.matchedAreas),
      jsonStringify(result.matchedPrices),
      db.kind === "postgres" ? result.botCheckDetected : result.botCheckDetected ? 1 : 0,
      result.checkedAt,
      result.durationMs,
      result.error ?? null
    ]
  );

  const saved = row ? await getRun(row.id) : null;
  if (!saved) throw new Error("Check run was not saved");
  return saved;
}

export async function getRun(id: number): Promise<CheckRun | null> {
  await ensureDb();
  const db = await getDb();
  const row = await db.queryOne<CheckRunRow>("SELECT * FROM check_runs WHERE id = $1", [id]);
  return row ? mapRun(row) : null;
}

export async function listRuns(limit = 50): Promise<CheckRun[]> {
  await ensureDb();
  const db = await getDb();
  const rows = await db.query<CheckRunRow>(
    "SELECT * FROM check_runs ORDER BY checked_at DESC, id DESC LIMIT $1",
    [limit]
  );
  return rows.map(mapRun);
}

export async function countRecentRuns(): Promise<number> {
  await ensureDb();
  const db = await getDb();
  const row = await db.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM check_runs");
  return Number(row?.count ?? 0);
}

export async function countAlerts(): Promise<number> {
  await ensureDb();
  const db = await getDb();
  const row = await db.queryOne<{ count: number }>(
    "SELECT COUNT(*) AS count FROM check_runs WHERE status IN ('AVAILABLE','POSSIBLE_MATCH','BOT_CHECK','QUEUE_DETECTED','LOGIN_REQUIRED','ERROR')"
  );
  return Number(row?.count ?? 0);
}
