import postgres from "postgres";
import type { DatabaseClient, QueryParam } from "./schema";

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function createPostgresClient(url: string): DatabaseClient {
  const sql = postgres(url, {
    max: envNumber("DB_MAX_CONNECTIONS", 1),
    idle_timeout: envNumber("DB_IDLE_TIMEOUT_SECONDS", 5),
    connect_timeout: envNumber("DB_CONNECT_TIMEOUT_SECONDS", 10),
    prepare: false,
    onnotice: () => undefined
  });

  return {
    kind: "postgres",
    async query<T>(query: string, params: QueryParam[] = []) {
      return (await sql.unsafe(query, params)) as T[];
    },
    async queryOne<T>(query: string, params: QueryParam[] = []) {
      const rows = (await sql.unsafe(query, params)) as T[];
      return rows[0] ?? null;
    },
    async execute(query: string, params: QueryParam[] = []) {
      await sql.unsafe(query, params);
    },
    async close() {
      await sql.end({ timeout: 5 });
    }
  };
}
