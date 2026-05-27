import postgres from "postgres";
import type { DatabaseClient, QueryParam } from "./schema";

export function createPostgresClient(url: string): DatabaseClient {
  const sql = postgres(url, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 20
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
