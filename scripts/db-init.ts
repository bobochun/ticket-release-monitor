import { initDb } from "../src/server/db/index";
import { getDbEnvInfo, loadLocalEnvFiles, printEnvLoadSummary } from "./db-env";

const loadedFiles = loadLocalEnvFiles();
printEnvLoadSummary(loadedFiles);

const info = getDbEnvInfo();
console.log(`Database: ${info.label}`);
if (info.kind === "sqlite") {
  console.warn(
    "WARNING: No POSTGRES_URL or postgres DATABASE_URL was found. Initializing SQLite fallback only; Neon/Postgres production DB was NOT initialized."
  );
}

await initDb();
console.log("Ticket Radar database schema initialized.");
