import fs from "node:fs";
import path from "node:path";
import type { DatabaseClient, QueryParam } from "./schema";

function sqlitePath(): string {
  const url = process.env.DATABASE_URL;
  const configured = url?.startsWith("file:") ? url.replace("file:", "") : undefined;
  const dbPath = configured || process.env.SQLITE_PATH || "./data/ticket-radar.sqlite";
  return path.resolve(process.cwd(), dbPath);
}

function normalizeSql(sql: string): string {
  return sql.replace(/\$\d+/g, "?");
}

function normalizeParams(params: QueryParam[]): (string | number | null)[] {
  return params.map((param) => (typeof param === "boolean" ? (param ? 1 : 0) : param));
}

export async function createSqliteClient(): Promise<DatabaseClient> {
  const { DatabaseSync } = await import("node:sqlite");
  const resolved = sqlitePath();
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  const db = new DatabaseSync(resolved);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  return {
    kind: "sqlite",
    async query<T>(sql: string, params: QueryParam[] = []) {
      return db.prepare(normalizeSql(sql)).all(...normalizeParams(params)) as T[];
    },
    async queryOne<T>(sql: string, params: QueryParam[] = []) {
      return (db.prepare(normalizeSql(sql)).get(...normalizeParams(params)) as T | undefined) ?? null;
    },
    async execute(sql: string, params: QueryParam[] = []) {
      db.prepare(normalizeSql(sql)).run(...normalizeParams(params));
    },
    async close() {
      db.close();
    }
  };
}
