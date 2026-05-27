import type { CheckResult, CheckRun, MatchSummary, ParsedTicketArea } from "@/src/shared/types";
import { boolFromDb, ensureDb, getDb, jsonParseArray, jsonParseValue, jsonStringify } from "./db";

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
  parsed_areas_json: string | null;
  event_title: string | null;
  event_date: string | null;
  venue: string | null;
  best_available_area_json: string | null;
  available_area_count: number | null;
  sold_out_area_count: number | null;
  source: CheckRun["source"] | null;
  match_mode: CheckRun["matchMode"] | null;
  notify_on: CheckRun["notifyOn"] | null;
  notify_decision: CheckRun["notifyDecision"];
  notify_skip_reason: string | null;
  unmet_conditions_json: string | null;
  matching_available_areas_json: string | null;
  non_matching_available_areas_json: string | null;
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
    parsedAreas: jsonParseValue<ParsedTicketArea[]>(row.parsed_areas_json, []),
    eventTitle: row.event_title,
    eventDate: row.event_date,
    venue: row.venue,
    bestAvailableArea: jsonParseValue<ParsedTicketArea | null>(row.best_available_area_json, null),
    availableAreaCount: Number(row.available_area_count ?? 0),
    soldOutAreaCount: Number(row.sold_out_area_count ?? 0),
    source: row.source ?? "auto_fetch",
    matchMode: row.match_mode ?? "strict",
    notifyOn: row.notify_on ?? "available_only",
    notifyDecision: row.notify_decision ?? null,
    notifySkipReason: row.notify_skip_reason,
    unmetConditions: jsonParseArray(row.unmet_conditions_json),
    matchingAvailableAreas: jsonParseValue<ParsedTicketArea[]>(row.matching_available_areas_json, []),
    nonMatchingAvailableAreas: jsonParseValue<ParsedTicketArea[]>(row.non_matching_available_areas_json, []),
    matchSummary: deriveMatchSummary(row),
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
      parsed_areas_json, event_title, event_date, venue, best_available_area_json,
      available_area_count, sold_out_area_count, source,
      match_mode, notify_on, notify_decision, notify_skip_reason,
      unmet_conditions_json, matching_available_areas_json, non_matching_available_areas_json,
      bot_check_detected, checked_at, duration_ms, error
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
      $24, $25, $26, $27
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
      jsonStringify(result.parsedAreas),
      result.eventTitle ?? null,
      result.eventDate ?? null,
      result.venue ?? null,
      result.bestAvailableArea ? JSON.stringify(result.bestAvailableArea) : null,
      result.availableAreaCount,
      result.soldOutAreaCount,
      result.source,
      result.matchMode,
      result.notifyOn,
      result.notifyDecision,
      result.notifySkipReason,
      jsonStringify(result.unmetConditions),
      jsonStringify(result.matchingAvailableAreas),
      jsonStringify(result.nonMatchingAvailableAreas),
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

function deriveMatchSummary(row: CheckRunRow): MatchSummary {
  const matching = jsonParseValue<ParsedTicketArea[]>(row.matching_available_areas_json, []);
  const nonMatching = jsonParseValue<ParsedTicketArea[]>(row.non_matching_available_areas_json, []);
  const unmet = jsonParseArray(row.unmet_conditions_json);
  return {
    hasAnyAvailableArea: matching.length + nonMatching.length > 0 || Number(row.available_area_count ?? 0) > 0,
    hasAreaConstraint: unmet.some((item) => item.startsWith("area:")),
    hasPriceConstraint: unmet.some((item) => item.startsWith("price:")),
    hasDateConstraint: unmet.some((item) => item.startsWith("date:")),
    hasVenueConstraint: unmet.some((item) => item.startsWith("venue:")),
    exactAreaMatched: matching.some((area) => area.matchedAreaKeywords.length > 0),
    exactPriceMatched: matching.some((area) => area.matchedPriceKeywords.length > 0),
    exactSameRowMatched: matching.length > 0
  };
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
