import { z } from "zod";
import type { Target, TargetInput } from "@/src/shared/types";
import { boolFromDb, ensureDb, getDb, jsonParseArray, jsonStringify } from "./db";
import { defaultCheckIntervalSeconds, normalizeCheckInterval } from "./settings";

const targetSchema = z.object({
  name: z.string().min(1),
  platform: z.string().min(1).default("generic"),
  url: z.string().url(),
  enabled: z.boolean().default(true),
  checkIntervalSeconds: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().default(30000),
  includeKeywords: z.array(z.string()).default([]),
  excludeKeywords: z.array(z.string()).default([]),
  areaKeywords: z.array(z.string()).default([]),
  areaBlacklist: z.array(z.string()).default([]),
  priceKeywords: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
  isTemplate: z.boolean().default(false)
});

type TargetRow = {
  id: number;
  name: string;
  platform: string;
  url: string;
  enabled: boolean | number;
  check_interval_seconds: number;
  timeout_ms: number;
  include_keywords_json: string;
  exclude_keywords_json: string;
  area_keywords_json: string;
  area_blacklist_json: string;
  price_keywords_json: string;
  notes: string | null;
  is_template: boolean | number;
  last_checked_at: string | null;
  next_check_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapTarget(row: TargetRow): Target {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    url: row.url,
    enabled: boolFromDb(row.enabled),
    checkIntervalSeconds: row.check_interval_seconds,
    timeoutMs: row.timeout_ms,
    includeKeywords: jsonParseArray(row.include_keywords_json),
    excludeKeywords: jsonParseArray(row.exclude_keywords_json),
    areaKeywords: jsonParseArray(row.area_keywords_json),
    areaBlacklist: jsonParseArray(row.area_blacklist_json),
    priceKeywords: jsonParseArray(row.price_keywords_json),
    notes: row.notes,
    isTemplate: boolFromDb(row.is_template),
    lastCheckedAt: row.last_checked_at,
    nextCheckAt: row.next_check_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function parseTargetInput(input: unknown): TargetInput {
  const parsed = targetSchema.parse(input);
  return {
    ...parsed,
    checkIntervalSeconds: normalizeCheckInterval(
      parsed.checkIntervalSeconds ?? defaultCheckIntervalSeconds()
    ),
    notes: parsed.notes ?? null
  };
}

export async function listTargets(): Promise<Target[]> {
  await ensureDb();
  const db = await getDb();
  const rows = await db.query<TargetRow>("SELECT * FROM targets ORDER BY id DESC");
  return rows.map(mapTarget);
}

export async function listDueTargets(limit: number): Promise<Target[]> {
  await ensureDb();
  const db = await getDb();
  const now = new Date().toISOString();
  const rows = await db.query<TargetRow>(
    `SELECT * FROM targets
     WHERE enabled = $1
       AND is_template = $2
       AND (next_check_at IS NULL OR next_check_at <= $3)
     ORDER BY COALESCE(next_check_at, created_at) ASC, id ASC
     LIMIT $4`,
    db.kind === "postgres" ? [true, false, now, limit] : [1, 0, now, limit]
  );
  return rows.map(mapTarget);
}

export async function getTarget(id: number): Promise<Target | null> {
  await ensureDb();
  const db = await getDb();
  const row = await db.queryOne<TargetRow>("SELECT * FROM targets WHERE id = $1", [id]);
  return row ? mapTarget(row) : null;
}

export async function createTarget(input: TargetInput): Promise<Target> {
  const parsed = parseTargetInput(input);
  await ensureDb();
  const db = await getDb();
  const now = new Date().toISOString();
  const row = await db.queryOne<{ id: number }>(
    `INSERT INTO targets (
      name, platform, url, enabled, check_interval_seconds, timeout_ms,
      include_keywords_json, exclude_keywords_json, area_keywords_json,
      area_blacklist_json, price_keywords_json, notes, is_template, next_check_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    ) RETURNING id`,
    [
      parsed.name,
      parsed.platform ?? "generic",
      parsed.url,
      db.kind === "postgres" ? Boolean(parsed.enabled) : parsed.enabled === false ? 0 : 1,
      normalizeCheckInterval(parsed.checkIntervalSeconds),
      parsed.timeoutMs ?? 30000,
      jsonStringify(parsed.includeKeywords ?? []),
      jsonStringify(parsed.excludeKeywords ?? []),
      jsonStringify(parsed.areaKeywords ?? []),
      jsonStringify(parsed.areaBlacklist ?? []),
      jsonStringify(parsed.priceKeywords ?? []),
      parsed.notes ?? null,
      db.kind === "postgres" ? Boolean(parsed.isTemplate) : parsed.isTemplate ? 1 : 0,
      now
    ]
  );

  if (!row) throw new Error("Target was not created");
  const target = await getTarget(row.id);
  if (!target) throw new Error("Target was not found after insert");
  return target;
}

export async function updateTarget(id: number, input: Partial<TargetInput>): Promise<Target | null> {
  const current = await getTarget(id);
  if (!current) return null;

  const next = {
    name: input.name ?? current.name,
    platform: input.platform ?? current.platform,
    url: input.url ?? current.url,
    enabled: input.enabled ?? current.enabled,
    checkIntervalSeconds: normalizeCheckInterval(
      input.checkIntervalSeconds ?? current.checkIntervalSeconds
    ),
    timeoutMs: input.timeoutMs ?? current.timeoutMs,
    includeKeywords: input.includeKeywords ?? current.includeKeywords,
    excludeKeywords: input.excludeKeywords ?? current.excludeKeywords,
    areaKeywords: input.areaKeywords ?? current.areaKeywords,
    areaBlacklist: input.areaBlacklist ?? current.areaBlacklist,
    priceKeywords: input.priceKeywords ?? current.priceKeywords,
    notes: input.notes === undefined ? current.notes : input.notes,
    isTemplate: input.isTemplate ?? current.isTemplate
  };

  targetSchema.partial().parse(next);
  const db = await getDb();
  await db.execute(
    `UPDATE targets SET
      name = $1,
      platform = $2,
      url = $3,
      enabled = $4,
      check_interval_seconds = $5,
      timeout_ms = $6,
      include_keywords_json = $7,
      exclude_keywords_json = $8,
      area_keywords_json = $9,
      area_blacklist_json = $10,
      price_keywords_json = $11,
      notes = $12,
      is_template = $13,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $14`,
    [
      next.name,
      next.platform,
      next.url,
      db.kind === "postgres" ? next.enabled : next.enabled ? 1 : 0,
      next.checkIntervalSeconds,
      next.timeoutMs,
      jsonStringify(next.includeKeywords),
      jsonStringify(next.excludeKeywords),
      jsonStringify(next.areaKeywords),
      jsonStringify(next.areaBlacklist),
      jsonStringify(next.priceKeywords),
      next.notes ?? null,
      db.kind === "postgres" ? next.isTemplate : next.isTemplate ? 1 : 0,
      id
    ]
  );

  return getTarget(id);
}

export async function deleteTarget(id: number): Promise<void> {
  await ensureDb();
  const db = await getDb();
  await db.execute("DELETE FROM targets WHERE id = $1", [id]);
}

export async function markTargetChecked(id: number, intervalSeconds: number): Promise<void> {
  await ensureDb();
  const db = await getDb();
  const nextCheck = new Date(
    Date.now() + normalizeCheckInterval(intervalSeconds) * 1000
  ).toISOString();
  await db.execute(
    "UPDATE targets SET last_checked_at = $1, next_check_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
    [new Date().toISOString(), nextCheck, id]
  );
}

export async function countTargets() {
  await ensureDb();
  const db = await getDb();
  const [enabled, active, templates] = await Promise.all([
    db.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM targets WHERE enabled = $1", [
      db.kind === "postgres" ? true : 1
    ]),
    db.queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM targets WHERE enabled = $1 AND is_template = $2",
      db.kind === "postgres" ? [true, false] : [1, 0]
    ),
    db.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM targets WHERE is_template = $1", [
      db.kind === "postgres" ? true : 1
    ])
  ]);

  return {
    enabledTargets: Number(enabled?.count ?? 0),
    activeTargets: Number(active?.count ?? 0),
    disabledTemplates: Number(templates?.count ?? 0)
  };
}
