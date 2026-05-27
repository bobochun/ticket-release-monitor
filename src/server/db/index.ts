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

export function boolFromDb(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}
