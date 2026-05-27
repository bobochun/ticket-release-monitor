export type DbKind = "postgres" | "sqlite";

export type QueryParam = string | number | boolean | null;

export type DatabaseClient = {
  kind: DbKind;
  query<T>(sql: string, params?: QueryParam[]): Promise<T[]>;
  queryOne<T>(sql: string, params?: QueryParam[]): Promise<T | null>;
  execute(sql: string, params?: QueryParam[]): Promise<void>;
  close?(): Promise<void>;
};

const POSTGRES_BOOLEAN = "BOOLEAN";
const SQLITE_BOOLEAN = "INTEGER";

function schema(
  booleanType: string,
  idType: string,
  nowDefault: string,
  trueDefault: string,
  falseDefault: string
): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS targets (
      id ${idType},
      name TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'generic',
      url TEXT NOT NULL,
      enabled ${booleanType} NOT NULL DEFAULT ${trueDefault},
      check_interval_seconds INTEGER NOT NULL DEFAULT 180,
      timeout_ms INTEGER NOT NULL DEFAULT 30000,
      include_keywords_json TEXT NOT NULL DEFAULT '[]',
      exclude_keywords_json TEXT NOT NULL DEFAULT '[]',
      event_keywords_json TEXT NOT NULL DEFAULT '[]',
      date_keywords_json TEXT NOT NULL DEFAULT '[]',
      venue_keywords_json TEXT NOT NULL DEFAULT '[]',
      area_keywords_json TEXT NOT NULL DEFAULT '[]',
      area_blacklist_json TEXT NOT NULL DEFAULT '[]',
      price_keywords_json TEXT NOT NULL DEFAULT '[]',
      match_mode TEXT NOT NULL DEFAULT 'strict',
      notify_on TEXT NOT NULL DEFAULT 'available_only',
      notes TEXT,
      is_template ${booleanType} NOT NULL DEFAULT ${falseDefault},
      last_checked_at TEXT,
      next_check_at TEXT,
      created_at TEXT NOT NULL DEFAULT ${nowDefault},
      updated_at TEXT NOT NULL DEFAULT ${nowDefault}
    )`,
    `CREATE TABLE IF NOT EXISTS check_runs (
      id ${idType},
      target_id INTEGER,
      target_name TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      matched_keywords_json TEXT NOT NULL DEFAULT '[]',
      matched_areas_json TEXT NOT NULL DEFAULT '[]',
      matched_prices_json TEXT NOT NULL DEFAULT '[]',
      parsed_areas_json TEXT NOT NULL DEFAULT '[]',
      event_title TEXT,
      event_date TEXT,
      venue TEXT,
      best_available_area_json TEXT,
      available_area_count INTEGER NOT NULL DEFAULT 0,
      sold_out_area_count INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'auto_fetch',
      match_mode TEXT NOT NULL DEFAULT 'strict',
      notify_on TEXT NOT NULL DEFAULT 'available_only',
      notify_decision TEXT,
      notify_skip_reason TEXT,
      unmet_conditions_json TEXT NOT NULL DEFAULT '[]',
      matching_available_areas_json TEXT NOT NULL DEFAULT '[]',
      non_matching_available_areas_json TEXT NOT NULL DEFAULT '[]',
      bot_check_detected ${booleanType} NOT NULL DEFAULT ${falseDefault},
      checked_at TEXT NOT NULL DEFAULT ${nowDefault},
      duration_ms INTEGER NOT NULL DEFAULT 0,
      error TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS discovery_rules (
      id ${idType},
      name TEXT NOT NULL,
      enabled ${booleanType} NOT NULL DEFAULT ${falseDefault},
      platform TEXT NOT NULL DEFAULT 'generic',
      seed_urls_json TEXT NOT NULL DEFAULT '[]',
      include_keywords_json TEXT NOT NULL DEFAULT '[]',
      optional_keywords_json TEXT NOT NULL DEFAULT '[]',
      exclude_keywords_json TEXT NOT NULL DEFAULT '[]',
      date_keywords_json TEXT NOT NULL DEFAULT '[]',
      venue_keywords_json TEXT NOT NULL DEFAULT '[]',
      team_keywords_json TEXT NOT NULL DEFAULT '[]',
      seat_keywords_json TEXT NOT NULL DEFAULT '[]',
      max_candidates INTEGER NOT NULL DEFAULT 20,
      created_at TEXT NOT NULL DEFAULT ${nowDefault},
      updated_at TEXT NOT NULL DEFAULT ${nowDefault}
    )`,
    `CREATE TABLE IF NOT EXISTS discovered_candidates (
      id ${idType},
      rule_id INTEGER,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'generic',
      score INTEGER NOT NULL DEFAULT 0,
      matched_keywords_json TEXT NOT NULL DEFAULT '[]',
      source_url TEXT NOT NULL,
      discovered_at TEXT NOT NULL DEFAULT ${nowDefault},
      added_to_targets ${booleanType} NOT NULL DEFAULT ${falseDefault}
    )`,
    `CREATE TABLE IF NOT EXISTS notification_events (
      id ${idType},
      type TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      url TEXT,
      created_at TEXT NOT NULL DEFAULT ${nowDefault},
      error TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT ${nowDefault}
    )`,
    "CREATE INDEX IF NOT EXISTS idx_targets_due ON targets (enabled, is_template, next_check_at)",
    "CREATE INDEX IF NOT EXISTS idx_runs_checked_at ON check_runs (checked_at)",
    "CREATE INDEX IF NOT EXISTS idx_candidates_rule ON discovered_candidates (rule_id)"
  ];
}

export const POSTGRES_SCHEMA = schema(
  POSTGRES_BOOLEAN,
  "SERIAL PRIMARY KEY",
  "CURRENT_TIMESTAMP",
  "TRUE",
  "FALSE"
);

export const SQLITE_SCHEMA = schema(
  SQLITE_BOOLEAN,
  "INTEGER PRIMARY KEY AUTOINCREMENT",
  "CURRENT_TIMESTAMP",
  "1",
  "0"
);
