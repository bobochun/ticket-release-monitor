import type { DatabaseClient } from "./schema";
import { POSTGRES_SCHEMA, SQLITE_SCHEMA } from "./schema";

let clientPromise: Promise<DatabaseClient> | null = null;
let initializedPromise: Promise<void> | null = null;

function databaseUrl(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

function usePostgres(): boolean {
  const url = databaseUrl();
  return Boolean(url?.startsWith("postgres://") || url?.startsWith("postgresql://"));
}

export async function getDb(): Promise<DatabaseClient> {
  if (!clientPromise) {
    clientPromise = usePostgres()
      ? import("./postgres").then(({ createPostgresClient }) => createPostgresClient(databaseUrl()!))
      : import("./sqlite").then(({ createSqliteClient }) => createSqliteClient());
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
    ["source", "TEXT", "'auto_fetch'"]
  ] as const;

  if (db.kind === "postgres") {
    for (const [name, type, defaultValue] of columns) {
      await db.execute(
        `ALTER TABLE check_runs ADD COLUMN IF NOT EXISTS ${name} ${type}${defaultValue ? ` DEFAULT ${defaultValue}` : ""}`
      );
    }
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
}
