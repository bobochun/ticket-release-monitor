import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = process.env.DATABASE_URL?.startsWith("file:")
  ? process.env.DATABASE_URL.replace("file:", "")
  : process.env.DATABASE_URL || "./data/ticket-radar.sqlite";

const resolvedDbPath = path.resolve(process.cwd(), dbPath);
fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });

export const db = new Database(resolvedDbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function jsonStringify(value: unknown): string {
  return JSON.stringify(value ?? []);
}

export function jsonParseArray(value: unknown): string[] {
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'generic',
      url TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      check_interval_seconds INTEGER NOT NULL DEFAULT 180,
      timeout_ms INTEGER NOT NULL DEFAULT 45000,
      include_keywords_json TEXT NOT NULL DEFAULT '[]',
      exclude_keywords_json TEXT NOT NULL DEFAULT '[]',
      area_keywords_json TEXT NOT NULL DEFAULT '[]',
      area_blacklist_json TEXT NOT NULL DEFAULT '[]',
      price_keywords_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      last_checked_at TEXT,
      next_check_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS check_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_id INTEGER,
      target_name TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      matched_keywords_json TEXT NOT NULL DEFAULT '[]',
      matched_areas_json TEXT NOT NULL DEFAULT '[]',
      matched_prices_json TEXT NOT NULL DEFAULT '[]',
      bot_check_detected INTEGER NOT NULL DEFAULT 0,
      checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      FOREIGN KEY(target_id) REFERENCES targets(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS discovery_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS discovered_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id INTEGER,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'generic',
      score INTEGER NOT NULL DEFAULT 0,
      matched_keywords_json TEXT NOT NULL DEFAULT '[]',
      source_url TEXT NOT NULL,
      discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      added_to_targets INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(rule_id) REFERENCES discovery_rules(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notification_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function seedDb(): void {
  const count = db.prepare("SELECT COUNT(*) as count FROM targets").get() as { count: number };
  if (count.count > 0) return;

  const insert = db.prepare(`
    INSERT INTO targets (
      name, platform, url, enabled, check_interval_seconds, timeout_ms,
      include_keywords_json, exclude_keywords_json, area_keywords_json,
      area_blacklist_json, price_keywords_json, notes
    ) VALUES (
      @name, @platform, @url, @enabled, @checkIntervalSeconds, @timeoutMs,
      @includeKeywords, @excludeKeywords, @areaKeywords, @areaBlacklist,
      @priceKeywords, @notes
    )
  `);

  insert.run({
    name: "中信兄弟售票範例",
    platform: "ctbc_brothers",
    url: "https://tix.ctbcsports.com/BROTHERS/UTK0204_?PERFORMANCE_ID=P16BP6ZZ&PRODUCT_ID=P16ANF0N",
    enabled: 1,
    checkIntervalSeconds: 180,
    timeoutMs: 45000,
    includeKeywords: jsonStringify(["立即購票", "我要購票", "可購買", "剩餘"]),
    excludeKeywords: jsonStringify(["已售完", "暫無票券", "尚未開賣", "截止販售"]),
    areaKeywords: jsonStringify(["熱區", "A1", "B1"]),
    areaBlacklist: jsonStringify(["身障", "視線不良"]),
    priceKeywords: jsonStringify([]),
    notes: "只通知，不自動登入、不自動購買。"
  });
}
