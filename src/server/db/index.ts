import type { DatabaseClient } from "./schema";
import { POSTGRES_SCHEMA, SQLITE_SCHEMA } from "./schema";

let clientPromise: Promise<DatabaseClient> | null = null;
let initializedPromise: Promise<void> | null = null;

function databaseUrl(): string | undefined {
  const postgresUrl = process.env.POSTGRES_URL;
  if (postgresUrl?.startsWith("postgres://") || postgresUrl?.startsWith("postgresql://")) {
    return postgresUrl;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl?.startsWith("postgres://") || databaseUrl?.startsWith("postgresql://")) {
    return databaseUrl;
  }

  return undefined;
}

function usePostgres(): boolean {
  const url = databaseUrl();
  return Boolean(url?.startsWith("postgres://") || url?.startsWith("postgresql://"));
}

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

function missingVercelDatabaseError(): Error {
  return new Error(
    "Database is not configured for Vercel. Set POSTGRES_URL or DATABASE_URL to a valid postgres:// or postgresql:// connection string in Vercel Environment Variables, then redeploy. SQLite fallback is local-development only."
  );
}

export async function getDb(): Promise<DatabaseClient> {
  if (!clientPromise) {
    if (!usePostgres() && isVercelRuntime()) {
      clientPromise = Promise.reject(missingVercelDatabaseError());
    } else {
      clientPromise = usePostgres()
        ? import("./postgres").then(({ createPostgresClient }) => createPostgresClient(databaseUrl()!))
        : import("./sqlite").then(({ createSqliteClient }) => createSqliteClient());
    }
  }

  return clientPromise;
}

export async function initDb(): Promise<void> {
  const db = await getDb();
  const statements = db.kind === "postgres" ? POSTGRES_SCHEMA : SQLITE_SCHEMA;

  for (const statement of statements) {
    await db.execute(statement);
  }

  await migrateCheckRunsColumns(db);
  await migrateTargetColumns(db);
}

export async function ensureDb(): Promise<void> {
  initializedPromise ??= initDb();
  await initializedPromise;
}

export function jsonStringify(value: unknown): string {
  return JSON.stringify(value ?? []);
}

export function jsonParseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function jsonParseValue<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "string") return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function boolFromDb(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

async function migrateCheckRunsColumns(db: DatabaseClient): Promise<void> {
  const columns = [
    ["parsed_areas_json", "TEXT", "'[]'"],
    ["event_title", "TEXT", null],
    ["event_date", "TEXT", null],
    ["venue", "TEXT", null],
    ["best_available_area_json", "TEXT", null],
    ["available_area_count", "INTEGER", "0"],
    ["sold_out_area_count", "INTEGER", "0"],
    ["source", "TEXT", "'auto_fetch'"],
    ["match_mode", "TEXT", "'strict'"],
    ["notify_on", "TEXT", "'available_only'"],
    ["notify_decision", "TEXT", null],
    ["notify_skip_reason", "TEXT", null],
    ["unmet_conditions_json", "TEXT", "'[]'"],
    ["matching_available_areas_json", "TEXT", "'[]'"],
    ["non_matching_available_areas_json", "TEXT", "'[]'"]
  ] as const;

  if (db.kind === "postgres") {
    for (const [name, type, defaultValue] of columns) {
      await db.execute(
        `ALTER TABLE check_runs ADD COLUMN IF NOT EXISTS ${name} ${type}${defaultValue ? ` DEFAULT ${defaultValue}` : ""}`
      );
    }
    await backfillCheckRunsMigrationDefaults(db);
    await db.execute("CREATE INDEX IF NOT EXISTS idx_runs_source ON check_runs (source)");
    return;
  }

  const existing = await db.query<{ name: string }>("PRAGMA table_info(check_runs)");
  const existingNames = new Set(existing.map((column) => column.name));
  for (const [name, type, defaultValue] of columns) {
    if (!existingNames.has(name)) {
      await db.execute(
        `ALTER TABLE check_runs ADD COLUMN ${name} ${type}${defaultValue ? ` DEFAULT ${defaultValue}` : ""}`
      );
    }
  }
  await backfillCheckRunsMigrationDefaults(db);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_runs_source ON check_runs (source)");
}

async function backfillCheckRunsMigrationDefaults(db: DatabaseClient): Promise<void> {
  await db.execute("UPDATE check_runs SET parsed_areas_json = '[]' WHERE parsed_areas_json IS NULL");
  await db.execute("UPDATE check_runs SET available_area_count = 0 WHERE available_area_count IS NULL");
  await db.execute("UPDATE check_runs SET sold_out_area_count = 0 WHERE sold_out_area_count IS NULL");
  await db.execute("UPDATE check_runs SET source = 'auto_fetch' WHERE source IS NULL");
  await db.execute("UPDATE check_runs SET match_mode = 'strict' WHERE match_mode IS NULL");
  await db.execute("UPDATE check_runs SET notify_on = 'available_only' WHERE notify_on IS NULL");
  await db.execute("UPDATE check_runs SET unmet_conditions_json = '[]' WHERE unmet_conditions_json IS NULL");
  await db.execute("UPDATE check_runs SET matching_available_areas_json = '[]' WHERE matching_available_areas_json IS NULL");
  await db.execute("UPDATE check_runs SET non_matching_available_areas_json = '[]' WHERE non_matching_available_areas_json IS NULL");
}

async function migrateTargetColumns(db: DatabaseClient): Promise<void> {
  const columns = [
    ["event_keywords_json", "TEXT", "'[]'"],
    ["date_keywords_json", "TEXT", "'[]'"],
    ["venue_keywords_json", "TEXT", "'[]'"],
    ["match_mode", "TEXT", "'strict'"],
    ["notify_on", "TEXT", "'available_only'"]
  ] as const;

  if (db.kind === "postgres") {
    for (const [name, type, defaultValue] of columns) {
      await db.execute(
        `ALTER TABLE targets ADD COLUMN IF NOT EXISTS ${name} ${type}${defaultValue ? ` DEFAULT ${defaultValue}` : ""}`
      );
    }
    await backfillTargetMigrationDefaults(db);
    return;
  }

  const existing = await db.query<{ name: string }>("PRAGMA table_info(targets)");
  const existingNames = new Set(existing.map((column) => column.name));
  for (const [name, type, defaultValue] of columns) {
    if (!existingNames.has(name)) {
      await db.execute(
        `ALTER TABLE targets ADD COLUMN ${name} ${type}${defaultValue ? ` DEFAULT ${defaultValue}` : ""}`
      );
    }
  }
  await backfillTargetMigrationDefaults(db);
}

async function backfillTargetMigrationDefaults(db: DatabaseClient): Promise<void> {
  await db.execute("UPDATE targets SET event_keywords_json = '[]' WHERE event_keywords_json IS NULL");
  await db.execute("UPDATE targets SET date_keywords_json = '[]' WHERE date_keywords_json IS NULL");
  await db.execute("UPDATE targets SET venue_keywords_json = '[]' WHERE venue_keywords_json IS NULL");
  await db.execute("UPDATE targets SET match_mode = 'strict' WHERE match_mode IS NULL");
  await db.execute("UPDATE targets SET notify_on = 'available_only' WHERE notify_on IS NULL");
}
