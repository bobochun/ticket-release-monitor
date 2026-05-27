import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export type DbEnvInfo = {
  kind: "postgres" | "sqlite";
  key: "POSTGRES_URL" | "DATABASE_URL" | "fallback";
  url?: string;
  label: string;
};

export function loadLocalEnvFiles(): string[] {
  const loaded: string[] = [];
  for (const file of [".env.local", ".env"]) {
    const resolved = path.resolve(process.cwd(), file);
    if (!fs.existsSync(resolved)) continue;
    dotenv.config({ path: resolved, override: false });
    loaded.push(file);
  }
  return loaded;
}

export function getDbEnvInfo(): DbEnvInfo {
  const postgresUrl = process.env.POSTGRES_URL;
  if (postgresUrl && isPostgresUrl(postgresUrl)) {
    return {
      kind: "postgres",
      key: "POSTGRES_URL",
      url: postgresUrl,
      label: `postgres via POSTGRES_URL (${maskDatabaseUrl(postgresUrl)})`
    };
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && isPostgresUrl(databaseUrl)) {
    return {
      kind: "postgres",
      key: "DATABASE_URL",
      url: databaseUrl,
      label: `postgres via DATABASE_URL (${maskDatabaseUrl(databaseUrl)})`
    };
  }

  return {
    kind: "sqlite",
    key: "fallback",
    label: "sqlite fallback"
  };
}

export function isPostgresUrl(url: string): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const maskedHost =
      host.length <= 8
        ? "****"
        : `${host.slice(0, 4)}****${host.slice(Math.max(4, host.length - 4))}`;
    return `${parsed.protocol}//${parsed.username ? "****@" : ""}${maskedHost}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname ? "/…" : ""}`;
  } catch {
    return `${url.slice(0, 12)}****`;
  }
}

export function printEnvLoadSummary(loadedFiles: string[]): void {
  console.log(`Env files loaded: ${loadedFiles.length > 0 ? loadedFiles.join(", ") : "none"}`);
}
