import { getDb } from "../src/server/db/index";
import { getDbEnvInfo, loadLocalEnvFiles, printEnvLoadSummary } from "./db-env";

const REQUIRED_CHECK_RUN_COLUMNS = [
  "parsed_areas_json",
  "event_title",
  "event_date",
  "venue",
  "best_available_area_json",
  "available_area_count",
  "sold_out_area_count",
  "source",
  "match_mode",
  "notify_on",
  "notify_decision",
  "notify_skip_reason",
  "unmet_conditions_json",
  "matching_available_areas_json",
  "non_matching_available_areas_json"
];

const REQUIRED_TARGET_COLUMNS = [
  "event_keywords_json",
  "date_keywords_json",
  "venue_keywords_json",
  "match_mode",
  "notify_on"
];

const loadedFiles = loadLocalEnvFiles();
printEnvLoadSummary(loadedFiles);

const info = getDbEnvInfo();
console.log(`Database: ${info.label}`);
if (info.kind === "sqlite") {
  console.warn(
    "WARNING: SQLite fallback is active. If you expected Neon/Postgres, pull or set POSTGRES_URL/DATABASE_URL before running db:init."
  );
}

const db = await getDb();
console.log(`Runtime DB client: ${db.kind}`);

try {
  const columns = await listCheckRunsColumns();
  if (columns.length === 0) {
    console.warn("check_runs table: not found");
  } else {
    console.log(`check_runs columns: ${columns.length}`);
  }

  for (const column of REQUIRED_CHECK_RUN_COLUMNS) {
    console.log(`${columns.includes(column) ? "OK" : "MISSING"} ${column}`);
  }

  const targetColumns = await listTableColumns("targets");
  console.log(`targets columns: ${targetColumns.length || "not found"}`);
  for (const column of REQUIRED_TARGET_COLUMNS) {
    console.log(`${targetColumns.includes(column) ? "OK" : "MISSING"} targets.${column}`);
  }

  const missing = [
    ...REQUIRED_CHECK_RUN_COLUMNS.filter((column) => !columns.includes(column)),
    ...REQUIRED_TARGET_COLUMNS.filter((column) => !targetColumns.includes(column)).map((column) => `targets.${column}`)
  ];
  if (missing.length > 0) {
    console.warn("Migration status: incomplete. Run npm run db:init, then npm run db:diagnose again.");
  } else {
    console.log("Migration status: check_runs parsed-area columns are complete.");
  }
} finally {
  await db.close?.();
}

async function listCheckRunsColumns(): Promise<string[]> {
  return listTableColumns("check_runs");
}

async function listTableColumns(tableName: string): Promise<string[]> {
  if (db.kind === "postgres") {
    const rows = await db.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = $1
       ORDER BY ordinal_position`,
      [tableName]
    );
    return rows.map((row) => row.column_name);
  }

  const rows = await db.query<{ name: string }>(`PRAGMA table_info(${tableName})`);
  return rows.map((row) => row.name);
}
